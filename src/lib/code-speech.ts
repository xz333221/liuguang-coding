// 把代码块翻成能听懂的口语,供文章朗读使用。
//
// 目标不是逐字念代码,而是把「这行在干什么」说出来:
//   docker run -d --name redis -p 6379:6379 redis:8
//   → 运行一个 Docker 容器:后台运行,名字叫 redis,把本机 6379 端口映射到容器 6379 端口,镜像用 redis 第 8 版。
// 覆盖不到的语句走兜底:标识符保留原样(中英混读),符号换成「等于 / 冒号 / 并且」这类词。

const LANG_LABELS: Record<string, string> = {
  bash: '命令行',
  sh: '命令行',
  shell: '命令行',
  zsh: '命令行',
  console: '命令行',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  java: 'Java',
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  jsx: 'JavaScript',
  tsx: 'TypeScript',
  vue: 'Vue',
  python: 'Python',
  py: 'Python',
  sql: 'SQL',
  mysql: 'SQL',
  json: 'JSON',
  jsonc: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  conf: '配置',
  ini: '配置',
  properties: '配置',
  dockerfile: 'Dockerfile',
  text: '文本',
  plaintext: '文本',
}

/** 读代码块之前先报一句「下面是一段命令行代码」,上下文更清楚 */
export function codeLabel(lang: string): string {
  const key = (lang || '').toLowerCase()
  return key && LANG_LABELS[key] ? `下面是一段${LANG_LABELS[key]}代码。` : '下面是一段代码。'
}

/** 注释前缀按语言区分,避免把 URL 的 // 或 SQL 的 -- 误当注释 */
function commentMark(lang: string): string {
  const key = (lang || '').toLowerCase()
  if (key === 'python' || key === 'py' || key.startsWith('shell') || key === 'bash' || key === 'sh' || key === 'zsh' || key === 'yaml' || key === 'yml' || key === 'conf' || key === 'ini' || key === 'properties') {
    return '#'
  }
  if (key === 'sql' || key === 'mysql') return '--'
  if (key === 'html') return '<!--'
  return '//'
}

function stripCommentMarks(text: string): string {
  return text
    .replace(/^\/\*+/, '')
    .replace(/\*+\/$/, '')
    .replace(/^<!--/, '')
    .replace(/-->$/, '')
    .replace(/^\/\//, '')
    .replace(/^#+/, '')
    .replace(/^--+/, '')
    .replace(/^;+/, '')
    .replace(/^\*+\s*/, '')
    .trim()
}

/** 找出「整行都是注释」的内容 */
function pureComment(line: string, lang: string): string | null {
  const t = line.trim()
  const mark = commentMark(lang)
  if (mark === '<!--') {
    if (t.startsWith('<!--')) return stripCommentMarks(t)
    return null
  }
  if (t.startsWith(mark)) return stripCommentMarks(t)
  // Java 文档注释 * 开头
  if (lang.toLowerCase() === 'java' && t.startsWith('*')) return stripCommentMarks(t)
  return null
}

/** 拆出行尾注释(要求注释符前有空白,避免把 URL / 字符串里的符号切坏) */
function splitTrailingComment(line: string, lang: string): { body: string; comment: string } {
  const mark = commentMark(lang)
  if (mark === '<!--') return { body: line, comment: '' }
  const idx = line.indexOf(` ${mark}`)
  if (idx > 0) {
    return { body: line.slice(0, idx).trim(), comment: stripCommentMarks(line.slice(idx).trim()) }
  }
  return { body: line, comment: '' }
}

function unquote(text: string): string {
  return text.replace(/^["'`]/, '').replace(/["'`]$/, '')
}

/** 只在纯标识符上拆词,URL、包名(带 . / :)原样保留 */
function words(identifier: string): string {
  if (/[./:\\]/.test(identifier)) return identifier
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function symbolsToWords(text: string): string {
  return text
    .replace(/;\s*$/, '')
    .replace(/===?/g, ' 等于 ')
    .replace(/!==?/g, ' 不等于 ')
    .replace(/>=/g, ' 大于等于 ')
    .replace(/<=/g, ' 小于等于 ')
    .replace(/<>/g, ' 不等于 ')
    .replace(/\s>\s/g, ' 大于 ')
    .replace(/\s<\s/g, ' 小于 ')
    .replace(/&&/g, ' 并且 ')
    .replace(/\|\|/g, ' 或者 ')
    .replace(/=>/g, ' 给出 ')
    .replace(/->/g, ' 指向 ')
    .replace(/::/g, ' 的 ')
    .replace(/\s\+\s/g, ' 加 ')
    .replace(/\s-\s/g, ' 减 ')
    .replace(/\s\*\s/g, ' 乘 ')
    .replace(/\s\/\s/g, ' 除以 ')
    .replace(/=/g, ' 等于 ')
    .replace(/:/g, ' 冒号 ')
    .replace(/[(){}]/g, ' ')
    .replace(/!/g, ' 非 ')
    .replace(/\s+,|,\s*/g, '，')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function speakRedis(text: string): string | null {
  const rest = text.replace(/^.*?>\s*/, '').trim()
  const [rawCmd, ...args] = rest.split(/\s+/)
  if (!rawCmd) return null
  const cmd = rawCmd.toUpperCase()
  const a = args.map(unquote)
  switch (cmd) {
    case 'PING':
      return '执行 PING,检查连接是否正常'
    case 'SET':
      return a.length >= 2 ? `把 ${a[0]} 设为 ${a.slice(1).join(' ')}` : `执行 SET,参数是 ${a.join('、')}`
    case 'GET':
      return a.length ? `读取 ${a[0]}` : '执行 GET'
    case 'EXPIRE':
      return a.length >= 2 ? `给 ${a[0]} 设置 ${a[1]} 秒后过期` : '执行 EXPIRE'
    case 'TTL':
      return a.length ? `查看 ${a[0]} 还剩多少秒` : '查看剩余过期时间'
    case 'DEL':
      return a.length ? `删除 ${a.join('、')}` : '执行 DEL'
    case 'INCR':
      return a.length ? `把 ${a[0]} 加一` : '执行 INCR'
    case 'HSET':
      return a.length >= 3 ? `往 ${a[0]} 里写入字段 ${a[1]},值为 ${a[2]}` : '执行 HSET'
    case 'HGET':
      return a.length >= 2 ? `读取 ${a[0]} 的 ${a[1]} 字段` : '执行 HGET'
    case 'HGETALL':
      return a.length ? `取出 ${a[0]} 的全部字段` : '执行 HGETALL'
    case 'HINCRBY':
      return a.length >= 3 ? `把 ${a[0]} 的 ${a[1]} 字段增加 ${a[2]}` : '执行 HINCRBY'
    case 'LPUSH':
      return a.length >= 2 ? `把 ${a.slice(1).join('、')} 从左边推进列表 ${a[0]}` : '执行 LPUSH'
    case 'RPOP':
      return a.length ? `从右边取出列表 ${a[0]} 的一项` : '执行 RPOP'
    case 'BRPOP':
      return a.length ? `阻塞等待列表 ${a[0]} 的数据` : '执行 BRPOP'
    case 'SADD':
      return a.length >= 2 ? `把 ${a.slice(1).join('、')} 加入集合 ${a[0]}` : '执行 SADD'
    case 'SISMEMBER':
      return a.length >= 2 ? `判断 ${a[1]} 是否在集合 ${a[0]} 里` : '执行 SISMEMBER'
    case 'SINTER':
      return a.length >= 2 ? `求集合 ${a.join(' 和 ')} 的交集` : '执行 SINTER'
    case 'ZADD':
      return a.length >= 3 ? `往排行榜 ${a[0]} 里加入 ${a.slice(1).join('、')}` : '执行 ZADD'
    case 'ZREVRANGE':
      return a.length >= 3 ? `从排行榜 ${a[0]} 里按分数从高到低取第 ${a[1]} 到第 ${a[2]} 名` : '执行 ZREVRANGE'
    case 'ZINCRBY':
      return a.length >= 3 ? `给排行榜 ${a[0]} 的 ${a[2]} 增加 ${a[1]} 分` : '执行 ZINCRBY'
    case 'XADD':
      return a.length >= 1 ? `往消息流 ${a[0]} 追加一条消息` : '执行 XADD'
    case 'XREADGROUP':
      return '从消费组里读取新消息'
    case 'XACK':
      return '确认一条消息已经处理完'
    case 'KEYS':
      return '列出匹配的键'
    case 'SCAN':
      return '分批扫描键'
    case 'CONFIG':
      return a.length >= 2 ? (a[0].toUpperCase() === 'SET' ? `修改配置项 ${a[1]}` : `读取配置项 ${a[1]}`) : '执行 CONFIG'
    default:
      return `执行 ${rawCmd} 命令,参数是 ${a.join('、') || '无'}`
  }
}

/** 镜像名带 tag 时读成「redis 的 8 版」,比念冒号清楚 */
function formatImage(image: string): string {
  const [name, tag] = image.split(':')
  if (!tag) return name
  return `${name} 的 ${tag === 'latest' ? '最新版' : `${tag} 版`}`
}

function speakShell(text: string): string | null {
  const t = text.trim()

  // 管道与串联先拆开
  if (t.includes('|') && !t.includes('||')) {
    const parts = t.split('|').map((p) => p.trim()).filter(Boolean)
    return `先${parts.map((p) => speakShell(p) ?? speakGeneric(p)).join(',再把结果交给')}`
  }
  if (t.includes('&&')) {
    const parts = t.split('&&').map((p) => p.trim()).filter(Boolean)
    return parts.map((p) => speakShell(p) ?? speakGeneric(p)).join(',然后')
  }

  const tokens = t.split(/\s+/)
  const first = tokens[0]
  const rest = tokens.slice(1)

  if (first === 'docker' && rest[0] === 'run') {
    let background = false
    let name = ''
    let ports: string[] = []
    const images: string[] = []
    for (let i = 1; i < rest.length; i += 1) {
      const token = rest[i]
      if (token === '-d' || token === '--detach') background = true
      else if (token === '--name') name = unquote(rest[++i] ?? '')
      else if (token === '-p' || token === '--publish') {
        const value = unquote(rest[++i] ?? '')
        const [host, container] = value.split(':')
        ports.push(container ? `把本机 ${host} 端口映射到容器 ${container} 端口` : `映射端口 ${value}`)
      } else if (!token.startsWith('-')) images.push(token)
    }
    const bits = ['运行一个 Docker 容器']
    if (background) bits.push('后台运行')
    if (name) bits.push(`名字叫 ${name}`)
    bits.push(...ports)
    if (images.length) bits.push(`镜像用 ${images.map(formatImage).join('、')}`)
    return bits.join(',')
  }
  if (first === 'docker' && rest[0] === 'logs') {
    const follow = rest.includes('-f')
    const target = rest.filter((x) => !x.startsWith('-')).pop() ?? ''
    return `查看 ${target} 的日志${follow ? ',并持续跟踪输出' : ''}`
  }
  if (first === 'docker' && (rest[0] === 'ps' || rest[0] === 'build' || rest[0] === 'images')) {
    return `执行 docker ${rest[0]},${rest[0] === 'ps' ? '查看正在运行的容器' : rest[0] === 'build' ? '构建镜像' : '查看镜像列表'}`
  }
  if (/^(sudo\s+)?apt(-get)?$/.test(first) || (first === 'sudo' && /^apt(-get)?$/.test(rest[0] ?? ''))) {
    const sub = rest[rest.indexOf('apt') >= 0 ? rest.indexOf('apt') + 1 : 1] ?? rest[1]
    const pkgs = rest.filter((x) => !x.startsWith('-') && x !== sub).slice(1)
    if (sub === 'install' && pkgs.length) return `用 apt 安装 ${pkgs.join('、')}`
    if (sub === 'update') return '更新 apt 的软件包索引'
    if (sub) return `执行 apt ${sub}`
  }
  if (first === 'sudo' && rest[0] === 'systemctl') {
    const sub = rest[1] ?? ''
    const service = rest.filter((x) => !x.startsWith('-') && x !== sub).pop() ?? ''
    if (sub === 'enable' && rest.includes('--now')) return `设置 ${service} 开机自启,并立即启动`
    if (sub === 'enable') return `设置 ${service} 开机自启`
    if (sub === 'start') return `启动 ${service}`
    if (sub === 'stop') return `停止 ${service}`
    if (sub === 'status') return `查看 ${service} 的运行状态`
    if (sub === 'restart') return `重启 ${service}`
    return `用 systemctl ${sub} ${service}`
  }
  if (first === 'redis-cli') {
    const hostIndex = rest.indexOf('-h')
    const portIndex = rest.indexOf('-p')
    const host = hostIndex >= 0 ? rest[hostIndex + 1] : '本机'
    const port = portIndex >= 0 ? rest[portIndex + 1] : '6379'
    return `用 redis-cli 连接 ${host} 的 ${port} 端口`
  }
  if (first === 'cd') return `进入目录 ${unquote(rest[0] ?? '')}`
  if (first === 'mkdir') return `创建目录 ${rest.filter((x) => !x.startsWith('-')).join('、')}`
  if (first === 'cp') return `复制 ${rest.filter((x) => !x.startsWith('-')).join(' 到 ')}`
  if (first === 'mv') return `移动或重命名 ${rest.filter((x) => !x.startsWith('-')).join(' 到 ')}`
  if (first === 'rm') return `删除 ${rest.filter((x) => !x.startsWith('-')).join('、')}`
  if (first === 'chmod') return `修改权限 ${rest.join(' ')}`
  if (first === 'git') {
    const sub = rest[0] ?? ''
    const target = rest.filter((x) => !x.startsWith('-') && x !== sub)[0] ?? ''
    const map: Record<string, string> = {
      clone: `克隆仓库 ${target}`,
      pull: '拉取远端更新',
      push: '推送到远端',
      commit: '提交一次改动',
      status: '查看工作区状态',
      log: '查看提交历史',
      diff: '查看改动差异',
      add: `把 ${target || '改动'} 加入暂存区`,
      checkout: `切换到 ${target}`,
      branch: '查看或操作分支',
      merge: `合并分支 ${target}`,
    }
    return map[sub] ? `${map[sub]}${sub === 'pull' && rest.includes('--ff-only') ? ',只允许快进合并' : ''}` : `执行 git ${sub}`
  }
  if (first === 'npm' || first === 'pnpm' || first === 'yarn') {
    const sub = rest[0] ?? ''
    if (sub === 'install' || sub === 'i') return `安装依赖${rest[1] ? `,指定 ${rest[1]}` : ''}`
    if (sub === 'ci') return '按锁文件安装依赖'
    if (sub === 'run') return `运行 ${first} 的 ${rest[1] ?? ''} 脚本`
    if (sub === 'start') return '启动项目'
    return `执行 ${first} ${sub}`
  }
  if (first === 'node') return `用 Node 运行 ${rest.filter((x) => !x.startsWith('-')).pop() ?? '脚本'}`
  if (first === 'curl') {
    const url = rest.filter((x) => /^https?:\/\//.test(x)).pop()
    return url ? `用 curl 请求 ${url}` : '用 curl 发一次请求'
  }
  if (first === 'grep') return `搜索 ${unquote(rest.filter((x) => !x.startsWith('-')).pop() ?? '')}`
  if (first === 'export') return `设置环境变量 ${rest.join(' ')}`
  if (first === 'source') return `加载 ${rest[0] ?? '脚本'}`

  return null
}

function speakSql(text: string): string {
  const t = text.replace(/;\s*$/, '').trim()
  const select = t.match(/^select\s+(.+?)\s+from\s+(\S+)(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+(.+?))?(?:\s+limit\s+(\d+))?$/i)
  if (select) {
    const [, cols, table, where, order, limit] = select
    let out = `从 ${table} 表查询 ${cols.replace(/,\s*/g, '、')}`
    if (where) out += `,条件是 ${symbolsToWords(where)}`
    if (order) out += `,按 ${symbolsToWords(order)} 排序`
    if (limit) out += `,最多取 ${limit} 条`
    return out
  }
  const insert = t.match(/^insert\s+into\s+(\S+)\s*\((.+?)\)\s*values\s*\((.+?)\)$/i)
  if (insert) return `往 ${insert[1]} 表插入一条记录,字段是 ${insert[2]},值是 ${insert[3]}`
  const update = t.match(/^update\s+(\S+)\s+set\s+(.+?)(?:\s+where\s+(.+))?$/i)
  if (update) return `更新 ${update[1]} 表,把 ${symbolsToWords(update[2])}${update[3] ? `,条件是 ${symbolsToWords(update[3])}` : ''}`
  const del = t.match(/^delete\s+from\s+(\S+)(?:\s+where\s+(.+))?$/i)
  if (del) return `删除 ${del[1]} 表的记录${del[2] ? `,条件是 ${symbolsToWords(del[2])}` : ''}`
  const create = t.match(/^create\s+table\s+(\S+)/i)
  if (create) return `创建 ${create[1]} 表`
  return symbolsToWords(t)
}

function speakGeneric(input: string): string {
  let t = input.trim().replace(/;\s*$/, '')

  // 纯括号、注解、空语句不读
  if (/^[{}()[\]]+$/.test(t)) return ''
  if (t.startsWith('@') && !t.includes('=')) return ''

  const importFrom = t.match(/^import\s+(.+?)\s+from\s+['"](.+?)['"]$/)
  if (importFrom) return `从 ${importFrom[2]} 引入 ${unquote(importFrom[1])}`
  const requireFrom = t.match(/^(?:const|let|var)\s+(\w+)\s*=\s*require\(['"](.+?)['"]\)$/)
  if (requireFrom) return `引入 ${requireFrom[2]},命名为 ${requireFrom[1]}`

  const declare = t.match(/^(?:const|let|var)\s+([\w$]+)\s*=\s*(.+)$/)
  if (declare) return `定义 ${declare[1]},值为 ${speakExpression(declare[2])}`

  const assign = t.match(/^([\w$.[\]'"]+)\s*=\s*(.+)$/)
  if (assign) return `把 ${speakExpression(assign[2])} 赋给 ${assign[1]}`

  const ifLine = t.match(/^if\s*\((.+)\)\s*\{?$/)
  if (ifLine) return `如果 ${symbolsToWords(ifLine[1])},那么`
  if (/^\}\s*else\s*\{\s*$/.test(t) || /^else\s*\{\s*$/.test(t)) return '否则'
  if (/^\}\s*else\s+if\s*\((.+)\)\s*\{\s*$/.test(t)) {
    const cond = t.match(/\((.+)\)/)![1]
    return `否则如果 ${symbolsToWords(cond)},那么`
  }
  const forLine = t.match(/^for\s*\((.+)\)\s*\{?$/)
  if (forLine) return `循环:${symbolsToWords(forLine[1])}`
  const whileLine = t.match(/^while\s*\((.+)\)\s*\{?$/)
  if (whileLine) return `当 ${symbolsToWords(whileLine[1])} 时反复执行`
  const ret = t.match(/^return\b\s*(.*)$/)
  if (ret) return ret[1] ? `返回 ${speakExpression(ret[1])}` : '返回'
  const fn = t.match(/^(?:export\s+)?(?:async\s+)?function\s+([\w$]+)\s*\(([^)]*)\)/)
  if (fn) return `定义函数 ${fn[1]},参数是 ${fn[2] ? words(fn[2]) : '无'}`
  const def = t.match(/^def\s+([\w$]+)\s*\(([^)]*)\)/)
  if (def) return `定义函数 ${def[1]},参数是 ${def[2] ? words(def[2]) : '无'}`
  const cls = t.match(/^(?:export\s+)?(?:public\s+|private\s+|protected\s+)?(?:class|interface)\s+([\w$]+)/)
  if (cls) return `定义一个类或接口 ${cls[1]}`
  const method = t.match(/^(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?[\w<>[\].]+\s+([\w$]+)\s*\(([^)]*)\)/)
  if (method) return `定义方法 ${method[1]},参数是 ${method[2] ? words(method[2]) : '无'}`

  const log = t.match(/^(?:console\.log|print|println|System\.out\.println|logger\.info|log\.info)\s*\((.+)\)$/)
  if (log) return `输出 ${speakExpression(log[1])}`

  const call = t.match(/^([\w$.]+)\s*\(([^)]*)\)$/)
  if (call) return `调用 ${call[1]}${call[2].trim() ? `,参数是 ${call[2].split(',').map((x) => speakExpression(x)).join('、')}` : ''}`

  // 方法链 / 属性访问
  const chain = t.match(/^([\w$]+(?:\.[\w$]+|\.[\w$]+\([^)]*\))+)$/)
  if (chain) return `调用 ${chain[1].replace(/\./g, ' 的 ').replace(/\(([^)]*)\)/g, ' 参数 $1')}`

  return symbolsToWords(t)
}

/** 表达式:字符串去引号、函数调用说「调用」、其余符号口语化 */
function speakExpression(raw: string): string {
  const expr = raw.trim()
  if (!expr) return '空'
  if (/^(['"`]).*\1$/.test(expr)) return `“${unquote(expr)}”`
  // 混在表达式里的字符串:保留内容,去掉引号,避免读出「双引号」这种噪声
  const quoted = expr.replace(/(["'`])((?:\\.|(?!\1).)*)\1/g, '“$2”')
  const call = expr.match(/^([\w$.]+)\s*\(([^)]*)\)$/)
  if (call) {
    return `调用 ${call[1]}${call[2].trim() ? `,参数是 ${call[2].split(',').map((x) => speakExpression(x)).join('、')}` : ''}`
  }
  if (/^-?\d+(\.\d+)?$/.test(expr)) return expr.replace('-', '负')
  if (/^(true|false)$/i.test(expr)) return expr.toLowerCase() === 'true' ? '真' : '假'
  if (expr === 'null' || expr === 'undefined' || expr === 'None') return '空'
  return symbolsToWords(quoted)
}

/** 入口:一段代码 → 一段口语。每个逻辑行输出一句 */
export function codeToSpeech(code: string, lang = ''): string {
  const key = (lang || '').toLowerCase()
  const lines = code.replace(/\t/g, '  ').split(/\r?\n/)
  const out: string[] = []
  let inBlockComment = false

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) continue

    if (inBlockComment) {
      const end = line.indexOf('*/')
      if (end >= 0) {
        inBlockComment = false
        const text = stripCommentMarks(line.slice(0, end))
        if (text) out.push(`注释:${text}`)
      } else {
        const text = stripCommentMarks(line)
        if (text) out.push(`注释:${text}`)
      }
      continue
    }
    if (line.trim().startsWith('/*') && !line.includes('*/')) {
      inBlockComment = true
      const text = stripCommentMarks(line.trim())
      if (text) out.push(`注释:${text}`)
      continue
    }

    const commentOnly = pureComment(line, key)
    if (commentOnly !== null) {
      if (commentOnly) out.push(`注释:${commentOnly}`)
      continue
    }

    const { body, comment } = splitTrailingComment(line, key)
    if (!body.trim()) {
      if (comment) out.push(`注释:${comment}`)
      continue
    }

    const spoken = speakLine(body, key)
    if (!spoken) continue
    out.push(comment ? `${spoken}。注释:${comment}` : spoken)
  }

  const text = out.join('\n').replace(/\s{2,}/g, ' ').trim()
  return text || '这段代码没有可以朗读的内容。'
}

/** 命令回显/查询结果,读成「返回 ...」,不然一串 OK、PONG 很出戏 */
function speakOutput(text: string): string | null {
  if (/^(OK|PONG|QUEUED|nil)$/i.test(text)) return `返回 ${text}`
  const integer = text.match(/^\(integer\)\s*(-?\d+)$/)
  if (integer) return `返回 ${integer[1]}`
  if (/^-?\d+(\.\d+)?$/.test(text)) return `返回 ${text}`
  if (/^(["'`]).*\1$/.test(text)) return `返回 ${unquote(text)}`
  return null
}

function isConfLang(lang: string): boolean {
  return ['conf', 'ini', 'properties', 'yaml', 'yml'].includes(lang)
}

/** 配置行:`maxmemory 2gb` / `key: value` → 「把 maxmemory 设置为 2gb」 */
function speakConf(text: string): string | null {
  const match = text.match(/^([\w.-]+)\s*[:=]?\s+(.+)$/)
  if (!match) return null
  if (match[1].startsWith('-')) return null
  return `把 ${match[1]} 设置为 ${match[2]}`
}

function speakLine(line: string, lang: string): string {
  const t = line.trim()
  if (!t) return ''
  const output = speakOutput(t)
  if (output) return output
  const redis = t.match(/^\S+:\d+>\s*(.+)$/)
  if (redis) return speakRedis(redis[1]) ?? ''
  const shell = speakShell(t)
  if (shell) return shell
  if (lang === 'sql' || lang === 'mysql') return speakSql(t)
  if (isConfLang(lang)) {
    const conf = speakConf(t)
    if (conf) return conf
  }
  return speakGeneric(t)
}
