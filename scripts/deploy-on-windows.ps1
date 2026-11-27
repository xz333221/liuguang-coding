<#
.SYNOPSIS
    在 Windows 服务器上发布 coding.flowdash.cn。

.DESCRIPTION
    拉 main → 清掉过期的 Astro 内容缓存 → npm ci → 构建 dist → 健康检查 → 服务没起来就拉起来。

    为什么不复用 deploy-on-server.sh:
      - 那台机器是 Windows,cmd / PowerShell 里没有 bash;
      - 旧脚本里 `sudo systemctl restart` 依赖 systemd,Windows 上不存在;
      - 站点由 server/index.mjs(Express)直读 dist 提供,nginx 只做反代,
        构建完静态文件即时生效,通常不需要重启进程。

.PARAMETER AppDir
    仓库根目录,默认取脚本所在目录的上一级(scripts\..)。

.PARAMETER Branch
    要发布的远程分支,默认 main。

.PARAMETER Port
    服务端监听端口,默认 8787(与 nginx 反代目标一致)。

.PARAMETER SkipInstall
    跳过 npm ci(只改了几篇正文时可用,省三四分钟)。

.PARAMETER SkipBuild
    跳过构建,只做拉取与健康检查。

.PARAMETER SkipHealth
    不做健康检查,也不尝试拉起服务。

.PARAMETER RestartQueue
    保活重启队列文件的路径。默认取环境变量 FLOWDASH_RESTART_QUEUE,再退到
    C:\Users\000000\.flowdash-restart-queue。该文件存在时,健康检查前会优先通过
    它触发保活脚本重启后端(见第 6 步注释);文件不存在则完全忽略这条通道。

.PARAMETER RestartTask
    执行保活重启的计划任务名,默认 FlowdashSites(与队列文件配套)。

.PARAMETER AllowDirty
    工作区有未提交改动时仍然继续(默认停下并列出改动,避免覆盖别人正在写的东西)。

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-on-windows.ps1

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-on-windows.ps1 -SkipInstall

.NOTES
    环境变量从仓库根的 .env 读取(server/env.mjs 负责加载),脚本不碰它。
#>
[CmdletBinding()]
param(
    [string]$AppDir = '',
    [string]$Branch = 'main',
    [int]$Port = 8787,
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$SkipHealth,
    [string]$RestartQueue = '',
    [string]$RestartTask = 'FlowdashSites',
    [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# 保活队列通道的参数默认值:env 变量优先,再退到服务器上的固定路径。
# 放在 param 外面解析,和 $AppDir 同一个原因(PS 5.1 的求值时机问题 + 要读环境变量)。
if (-not $RestartQueue) {
    $RestartQueue = $env:FLOWDASH_RESTART_QUEUE
}
if (-not $RestartQueue) {
    $RestartQueue = 'C:\Users\000000\.flowdash-restart-queue'
}
# 队列文件里写的 pm2 应用名,与 pm2 start --name 保持一致。
$RestartApp = 'liuguang-coding'

# param 的默认值里拿不到 $PSScriptRoot(PS 5.1 的求值时机问题),放到这里解析。
if (-not $AppDir) {
    if ($PSScriptRoot) {
        $AppDir = Split-Path -Parent $PSScriptRoot
    }
    else {
        $AppDir = (Get-Location).Path
    }
}
$AppDir = [System.IO.Path]::GetFullPath($AppDir)

# 状态行同时写进日志:脚本常以后台隐藏窗口跑,只看日志时得知道走到哪一步、有没有失败。
$script:logPath = $null

function Write-LogLine {
    param([string]$Text)
    if (-not $script:logPath) { return }
    try {
        Add-Content -Path $script:logPath -Value $Text -Encoding utf8
    }
    catch {
        # 日志写不进去不该影响发布本身。
    }
}

function Write-Step {
    param([int]$Index, [string]$Text)
    $line = ("==> [{0}] {1}" -f $Index, $Text)
    Write-Host ''
    Write-Host $line -ForegroundColor Cyan
    Write-LogLine $line
}

function Write-Ok {
    param([string]$Text)
    Write-Host ("    " + $Text) -ForegroundColor Green
    Write-LogLine ("    OK  " + $Text)
}

function Write-Warn {
    param([string]$Text)
    Write-Host ("    " + $Text) -ForegroundColor Yellow
    Write-LogLine ("    WARN " + $Text)
}

function Write-Err {
    param([string]$Text)
    Write-Host ("    " + $Text) -ForegroundColor Red
    Write-LogLine ("    ERR " + $Text)
}

# 跑一个外部命令并收集输出。PS 5.1 里 `2>&1` 会把 stderr 变成 ErrorRecord,
# 全局 ErrorActionPreference=Stop 时直接抛异常,所以这里临时降成 Continue,
# 只看退出码判断成败。
function Invoke-Capture {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [string[]]$Arguments = @(),
        [string]$WorkDir
    )

    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($WorkDir) { Push-Location -Path $WorkDir }
        $output = & $Exe @Arguments 2>&1 | ForEach-Object { $_.ToString() }
        $code = $LASTEXITCODE
    }
    finally {
        if ($WorkDir) { Pop-Location }
        $ErrorActionPreference = $prev
    }

    $lines = @($output)
    return [pscustomobject]@{
        Lines = $lines
        Code  = $code
        Text  = ($lines -join "`n")
    }
}

# 跑命令 + 回显 + 落盘;非零退出码抛异常。
function Invoke-Exe {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [string[]]$Arguments = @(),
        [string]$WorkDir,
        [string]$LogFile,
        [string]$Label
    )

    $name = if ($Label) { $Label } else { $Exe }
    $result = Invoke-Capture -Exe $Exe -Arguments $Arguments -WorkDir $WorkDir

    if ($result.Lines.Count -gt 0) {
        $result.Lines | ForEach-Object { Write-Host ("    " + $_) }
        if ($LogFile) { $result.Lines | Out-File -FilePath $LogFile -Append -Encoding utf8 }
    }

    if ($result.Code -ne 0) {
        throw ("{0} 失败(退出码 {1})" -f $name, $result.Code)
    }

    return $result.Text
}

# git 的提交信息是 UTF-8,而 PS 5.1 按控制台代码页(中文系统一般是 GBK)解码直接拿到的
# 输出,中文会成乱码。这里用 .NET 进程直接指定 UTF-8 解码,顺带绕开 Start-Process 在
# 某些宿主里 "Path/PATH 重复键" 的报错。
function Get-CommitLine {
    param([string]$RepoDir)

    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'git'
        $psi.Arguments = '-C "' + $RepoDir + '" log -1 --format=%h|%s'
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8

        $proc = [System.Diagnostics.Process]::Start($psi)
        $text = $proc.StandardOutput.ReadToEnd()
        $proc.StandardError.ReadToEnd() | Out-Null
        $proc.WaitForExit()

        if ($proc.ExitCode -ne 0 -or -not $text) { return $null }
        return ($text.Trim() -replace '\|', ' · ')
    }
    catch {
        return $null
    }
}

function Test-Health {
    param([int]$TimeoutSec = 5)
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec $TimeoutSec
        return ($resp.StatusCode -eq 200)
    }
    catch {
        return $false
    }
}

function Wait-Health {
    param([int]$Seconds = 20)
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Health) { return $true }
        Start-Sleep -Seconds 1
    }
    return (Test-Health)
}

# 拿 /api/health 的 JSON 里的 uptime(秒)。拿不到(JSON 解析失败、服务没起)返回 $null,
# 调用方把 $null 当"未知"处理,不影响重启判断的主路径。
function Get-HealthUptime {
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:{0}/api/health" -f $Port) -TimeoutSec 5
        $json = $resp.Content | ConvertFrom-Json
        if ($null -ne $json.uptime) { return [double]$json.uptime }
        return $null
    }
    catch {
        return $null
    }
}

# 拿当前占用 $Port 的监听进程 PID,拿不到返回 $null。
function Get-ListenerPid {
    $l = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($l) { return $l.OwningProcess }
    return $null
}

# 优先重启通道:通过保活队列让 Session 0 里的计划任务替我们执行 pm2 restart。
# 为什么要这么做:
#   8787 的 node 进程由 pm2 守护,而 pm2 守护进程跑在 Session 0(计划任务 S4U 启动),
#   普通会话执行任何 pm2 命令都会 EPERM rpc.sock 连不上守护进程;
#   更糟的是 pm2 失败后,健康检查会被"旧进程回的 200"骗过 —— 部署看起来成功,
#   实际 server/index.mjs 的新代码根本没上线(2026-11-27 实测踩过)。
#   保活脚本(FlowdashSites 计划任务,同样在 Session 0)每 5 分钟读一次队列文件,
#   对文件里每行一个的 pm2 应用名逐个 restart;往队列写一行再 schtasks /run
#   可以立即触发,这条路实测 20 秒左右新进程就能起来。
# 只在计划任务确实存在时才走这条通道:其它机器没有这个任务就自然退回原逻辑。
# 不能用「队列文件是否存在」当开关 —— 保活 tick 消费完就把它删掉,正常状态下它永远
# 不在,那条分支就永远进不去(2026-11-27 演练踩到:脚本又退回去,被旧进程的 200 骗成发布成功)。
# 返回 $true 表示已确认新进程上线,调用方可以跳过原有的 pm2 / 直接拉起兜底。
function Restart-BackendViaKeepaliveQueue {
    $taskQuery = Invoke-Capture -Exe 'schtasks.exe' -Arguments @('/query', '/tn', $RestartTask)
    if ($taskQuery.Code -ne 0) {
        Write-Host ("    没有计划任务 " + $RestartTask + ",不走保活通道")
        return $false
    }

    Write-Host ("    检测到计划任务 " + $RestartTask + ",优先走保活通道重启后端")

    # 重启前先记录旧进程的 PID 和 uptime,轮询时用来判断"确实换了个新进程"。
    $prePid = Get-ListenerPid
    $preUptime = Get-HealthUptime
    $prePidText = if ($prePid) { $prePid } else { '?' }
    $preUptimeText = if ($null -ne $preUptime) { [math]::Round($preUptime, 1) } else { '?' }
    Write-Host ("    重启前:PID=" + $prePidText + " uptime=" + $preUptimeText)

    # 把本应用追加进队列。用 Add-Content 只追加,绝不覆盖文件里其它应用的行;
    # 最后一行已经是它就不重复追加,避免保活脚本连续两轮重启同一个应用。
    $needAppend = $true
    try {
        $lastLine = (Get-Content -LiteralPath $RestartQueue -Tail 1 -ErrorAction Stop)
        if ($lastLine -and $lastLine.Trim() -eq $RestartApp) { $needAppend = $false }
    }
    catch {
        # 读不出来(文件正被别的进程占用等)就按需要追加处理,Append 本身幂等。
    }
    if ($needAppend) {
        Add-Content -Path $RestartQueue -Value $RestartApp -Encoding ascii
        Write-Ok ("已把 " + $RestartApp + " 写入保活重启队列")
    }
    else {
        Write-Ok '队列里已有本应用,不重复追加'
    }

    # 立即触发计划任务;失败则放弃这条通道,退回原有的 pm2 / 直接拉起逻辑。
    $run = Invoke-Capture -Exe 'schtasks.exe' -Arguments @('/run', '/tn', $RestartTask)
    if ($run.Code -ne 0) {
        Write-Warn ("schtasks /run " + $RestartTask + " 失败,退回原重启逻辑: " + ($run.Lines -join ' | '))
        return $false
    }
    Write-Ok ("已触发计划任务 " + $RestartTask)

    # 轮询最多 90 秒。成功 = uptime 明显回落(小于重启前的值,或干脆从很小的值开始),
    # 或监听 PID 变了 —— 两条满足其一都说明旧进程确实被换掉了,不是旧进程在回 200。
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        $nowPid = Get-ListenerPid
        $nowUptime = Get-HealthUptime

        $pidChanged = ($null -ne $nowPid -and $null -ne $prePid -and $nowPid -ne $prePid)
        $uptimeDropped = ($null -ne $nowUptime -and (
                ($null -eq $preUptime -and $nowUptime -lt 60) -or
                ($null -ne $preUptime -and $nowUptime -lt $preUptime) -or
                ($nowUptime -lt 60)
            ))

        if ($pidChanged -or $uptimeDropped) {
            Write-Ok ("后端已通过保活队列重启(新PID=" + $(if ($nowPid) { $nowPid } else { '?' }) + " uptime=" + $(if ($null -ne $nowUptime) { [math]::Round($nowUptime, 1) } else { '?' }) + "),不用再试 pm2")
            return $true
        }
    }

    Write-Warn '等了 90 秒保活通道没有确认到新进程,继续走原有的 pm2 / 直接拉起兜底'
    return $false
}

try {
    Write-Host ''
    Write-Host '流光 coding 知识库 · Windows 发布' -ForegroundColor White
    Write-Host ("仓库: " + $AppDir)
    Write-Host ("分支: " + $Branch + "    端口: " + $Port)

    if (-not (Test-Path (Join-Path $AppDir '.git'))) {
        throw ("不是 git 仓库: " + $AppDir + "(用 -AppDir 指到仓库根目录)")
    }

    $logDir = Join-Path $AppDir 'logs'
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $logFile = Join-Path $logDir ("deploy-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".log")
    $script:logPath = $logFile
    Write-Host ("日志: " + $logFile)
    Write-LogLine ("# 发布开始 " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + "  " + $AppDir)

    # ---------- 1. 工作区干净检查 ----------
    Write-Step 1 '检查工作区'
    $status = Invoke-Capture -Exe 'git' -Arguments @('-C', $AppDir, 'status', '--porcelain')
    if ($status.Code -ne 0) { throw 'git status 失败,确认 git 已安装且在 PATH 里' }

    if ($status.Lines.Count -gt 0 -and $status.Lines[0] -ne '') {
        if (-not $AllowDirty) {
            Write-Err '工作区有未提交改动,已停下(不覆盖别人正在写的东西):'
            $status.Lines | ForEach-Object { Write-Err ("  " + $_) }
            throw '工作区不干净。提交或 stash 之后再跑;确实要带着改动发布,加 -AllowDirty。'
        }
        Write-Warn '工作区不干净,按 -AllowDirty 继续(冲突时 pull 仍会失败)'
    }
    else {
        Write-Ok '干净'
    }

    # ---------- 2. 拉代码 ----------
    Write-Step 2 ("拉取 origin/" + $Branch)
    Invoke-Exe -Exe 'git' -Arguments @('-C', $AppDir, 'fetch', '--prune', 'origin') -LogFile $logFile -Label 'git fetch' | Out-Null
    Invoke-Exe -Exe 'git' -Arguments @('-C', $AppDir, 'pull', '--ff-only', 'origin', $Branch) -LogFile $logFile -Label 'git pull' | Out-Null

    $head = Invoke-Capture -Exe 'git' -Arguments @('-C', $AppDir, 'log', '-1', '--format=%h')
    $commitHash = $head.Text.Trim()
    $commitLine = Get-CommitLine -RepoDir $AppDir
    if (-not $commitLine) { $commitLine = $commitHash }
    Write-Ok ("当前提交: " + $commitLine)

    # ---------- 3. 清理 Astro 内容缓存 ----------
    Write-Step 3 '清理过期内容缓存'
    $dataStore = Join-Path $AppDir 'node_modules\.astro\data-store.json'
    if (Test-Path $dataStore) {
        $mb = [math]::Round(((Get-Item $dataStore).Length / 1MB), 1)
        Remove-Item $dataStore -Force
        Write-Ok ("已删除 node_modules\.astro\data-store.json(" + $mb + " MB),避免构建读到旧正文")
    }
    else {
        Write-Ok '没有需要清理的缓存'
    }

    # ---------- 4. 安装依赖 ----------
    Write-Step 4 '安装依赖'
    if ($SkipInstall) {
        Write-Warn '按 -SkipInstall 跳过 npm ci'
    }
    else {
        Write-Host '    npm ci(几分钟;没改依赖时可用 -SkipInstall 跳过)'
        Invoke-Exe -Exe 'npm.cmd' -Arguments @('ci', '--no-audit', '--no-fund') -WorkDir $AppDir -LogFile $logFile -Label 'npm ci' | Out-Null
        Write-Ok '依赖就绪'
    }

    # ---------- 5. 构建站点 ----------
    Write-Step 5 '构建站点'
    $pages = $null
    if ($SkipBuild) {
        Write-Warn '按 -SkipBuild 跳过构建'
    }
    else {
        # 构建标记:server/index.mjs 看到它(且 mtime 够新鲜)就知道 dist 正在被
        # Astro 清空重写,对浏览器导航回「正在更新」提示页而不是 404。
        # 构建成败都要删掉标记,用 try/finally 保证,崩了也不能把站点钉在提示页上。
        $buildFlag = Join-Path $AppDir '.building'
        Set-Content -Path $buildFlag -Value (Get-Date -Format o) -Encoding ascii
        Write-Ok '已写入 .building 标记'
        try {
            $env:PUBLIC_CHAT_PROXY = '/api/chat'
            $env:PUBLIC_MODEL_API = '/api/ai-model'
            $buildOut = Invoke-Exe -Exe 'npm.cmd' -Arguments @('run', 'build') -WorkDir $AppDir -LogFile $logFile -Label 'npm run build'

            $match = [regex]::Match($buildOut, '(\d+)\s+page\(s\) built')
            if ($match.Success) {
                $pages = [int]$match.Groups[1].Value
                Write-Ok ("构建完成:" + $pages + " 页")
            }
            else {
                Write-Warn '构建结束,但没从输出里读到页面数(看日志确认)'
            }

            $indexFile = Join-Path $AppDir 'dist\index.html'
            if (-not (Test-Path $indexFile)) {
                throw 'dist\index.html 不存在,构建产物不完整(先看日志,别让服务对外)'
            }
            Write-Ok 'dist\index.html 就位'
        }
        finally {
            Remove-Item $buildFlag -Force -ErrorAction SilentlyContinue
            Write-Ok '已删除 .building 标记'
        }
    }

    # ---------- 6. 健康检查 ----------
    Write-Step 6 '健康检查'
    if ($SkipHealth) {
        Write-Warn '按 -SkipHealth 跳过'
    }
    else {
        # 构建成功 ≠ 新 server 代码已生效:旧进程的 /api/health 一样回 200,
        # 只做健康检查会把它当成"正常",于是新加的后端路由(比如 /api/tts)
        # 在线上一直 404 —— 2026-11-21 就是这么踩到的。
        # 所以部署完先无条件重启后端,再检查健康状态。

        # 首选通道:保活队列重启(仅当队列文件存在,即部署目标就是那台有
        # FlowdashSites 计划任务的服务器)。成功确认新进程上线后直接跳过
        # 下面的 pm2 分支 —— 普通会话连不上 Session 0 的 pm2 守护进程,
        # 在这里执行 pm2 命令只会 EPERM,然后被旧进程的 200 骗过去。
        $restartedViaQueue = Restart-BackendViaKeepaliveQueue

        if (-not $restartedViaQueue) {
        $pm2 = Get-Command 'pm2.cmd' -ErrorAction SilentlyContinue
        if ($pm2) {
            # 必须"干净重启"。历史部署可能留下一个不在 pm2 里的 node 进程占着端口:
            # 此时 pm2 restart 要么找不到应用,要么新进程 bind 失败立刻退出,
            # 旧进程继续服务,新加的路由(比如 /api/tts)就一直是 404。
            # 顺序:删掉 pm2 旧应用 → 清掉仍占端口的遗留 node → 重新 start。
            $list = Invoke-Capture -Exe $pm2.Source -Arguments @('jlist') -WorkDir $AppDir
            if ($list.Code -eq 0 -and (($list.Lines -join "`n") -match 'liuguang-coding')) {
                Invoke-Capture -Exe $pm2.Source -Arguments @('delete', 'liuguang-coding') -WorkDir $AppDir | Out-Null
                Start-Sleep -Seconds 1
            }

            $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($listener) {
                $old = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
                if ($old -and $old.ProcessName -like 'node*') {
                    Write-Host ("    停掉占用 {0} 的旧进程 PID {1}" -f $Port, $old.Id)
                    Stop-Process -Id $old.Id -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 1
                }
            }

            Write-Host '    重新拉起:pm2 start server/index.mjs --name liuguang-coding'
            $start = Invoke-Capture -Exe $pm2.Source -Arguments @('start', 'server/index.mjs', '--name', 'liuguang-coding') -WorkDir $AppDir
            if ($start.Code -eq 0) {
                Write-Ok '后端已重建并启动'
            }
            else {
                Write-Warn 'pm2 启动失败,继续走健康检查(会退到直接 node 拉起)'
            }
            Start-Sleep -Seconds 2
        }
        } # end if (-not $restartedViaQueue)

        if (Wait-Health -Seconds 5) {
            Write-Ok ("http://127.0.0.1:" + $Port + "/api/health 正常")
        }
        else {
            Write-Warn '服务没响应,尝试拉起 server/index.mjs'

            $started = $false
            $pm2 = Get-Command 'pm2.cmd' -ErrorAction SilentlyContinue
            if ($pm2) {
                Write-Host '    先试 pm2 restart liuguang-coding'
                $result = Invoke-Capture -Exe $pm2.Source -Arguments @('restart', 'liuguang-coding') -WorkDir $AppDir
                if ($result.Code -eq 0) {
                    $started = $true
                }
                else {
                    Write-Warn 'pm2 不可用(守护进程常出问题),改用直接启动'
                }
            }

            if (-not $started) {
                $node = Get-Command 'node' -ErrorAction SilentlyContinue
                if (-not $node) { throw '找不到 node,无法拉起服务' }

                $outLog = Join-Path $logDir 'server.out.log'
                $errLog = Join-Path $logDir 'server.err.log'
                Start-Process -FilePath $node.Source `
                    -ArgumentList 'server/index.mjs' `
                    -WorkingDirectory $AppDir `
                    -WindowStyle Hidden `
                    -RedirectStandardOutput $outLog `
                    -RedirectStandardError $errLog | Out-Null
                Write-Ok ("已后台启动(node server/index.mjs),输出在 " + $outLog)
            }

            if (Wait-Health -Seconds 20) {
                Write-Ok ("服务已就绪:http://127.0.0.1:" + $Port + "/api/health")
            }
            else {
                Write-Err '服务仍未响应,看 logs\server.err.log'
                throw '健康检查未通过'
            }
        }
    }

    # ---------- 收尾 ----------
    Write-Host ''
    Write-Host '==> 完成' -ForegroundColor Green
    Write-Host ("    提交: " + $commitLine)
    if ($pages) { Write-Host ("    页面: " + $pages) }
    Write-Host ("    线上: https://coding.flowdash.cn/  (nginx → 127.0.0.1:" + $Port + ")")
    Write-Host ("    日志: " + $logFile)
    Write-Host ''
    Write-Host '    静态站点由 express.static 直读 dist,构建完即时生效,一般不用重启进程。'
    Write-Host ''
    Write-LogLine ("# 发布成功 " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
}
catch {
    Write-Host ''
    Write-Err ('发布失败: ' + $_.Exception.Message)
    Write-Host ''
    exit 1
}

exit 0
