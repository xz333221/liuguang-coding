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
    [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

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

    # ---------- 6. 健康检查 ----------
    Write-Step 6 '健康检查'
    if ($SkipHealth) {
        Write-Warn '按 -SkipHealth 跳过'
    }
    else {
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
