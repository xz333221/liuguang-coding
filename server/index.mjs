// 流光 coding 知识库的服务端:同一个进程既发站点,也发接口。
//
//   GET  /api/health                  健康检查(带数据库状态)
//   POST /api/auth/register           注册 {email, password, displayName}
//   POST /api/auth/login              登录 {email, password}
//   POST /api/auth/logout             退出(删会话)
//   GET  /api/auth/me                 当前登录用户
//   GET  /api/game/progress           闯关进度(需登录)
//   PUT  /api/game/progress           保存闯关进度(需登录)
//   POST /api/chat                    问答(SSE 透传,密钥不出服务端)
//   GET  /api/ai-model/providers      供应商预设          ← ai-model-form 中间件
//   GET  /api/ai-model/models         ?endpoint= 拉模型列表 ← ai-model-form 中间件
//   POST /api/ai-model/test           测连接              ← ai-model-form 中间件
//   POST /api/ai-model/models         保存模型配置(登录→用户库,匿名→全局落盘)
//   GET  /api/ai-model/models/saved   列出已保存(用户配置 + 全局,只回掩码)
//   DELETE /api/ai-model/models/:id   删除(先按登录用户的删,再按全局的删)
//   /*                                静态站点(dist)
//
// 跑法:
//   npm run build            # 构建站点(部署时带上 PUBLIC_CHAT_PROXY=/api/chat、PUBLIC_MODEL_API=/api/ai-model)
//   npm start                # 默认 8787 端口
//
// 环境变量:PORT / DATA_DIR / ALLOWED_ORIGIN / RATE_LIMIT / MAX_TOKENS
//          以及没有存模型时的兜底:UPSTREAM_BASE_URL / UPSTREAM_API_KEY / DEFAULT_MODEL
//          数据库(系统环境变量或仓库根 .env):DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
import './env.mjs' // 必须第一个 import:.env 要先于下面这些读环境变量的模块加载
import express from 'express'
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAiModelMiddleware } from 'ai-model-form/server'
import { createChatHandler } from './chat.mjs'
import { createTtsHandler } from './tts.mjs'
import { createUser, findUserByEmail, optionalUser, passwordMatches, publicUser, requireAuth, revokeToken, issueToken } from './auth.mjs'
import { allowed, clientKeyOf, note, reset } from './rate-limit.mjs'
import { dbInfo, dbReady, dbStatus, query, startDatabaseWithRetry } from './db.mjs'
import { normalizeGameProgress } from './game.mjs'
import {
  DATA_DIR,
  addModel,
  addUserModel,
  findUserModel,
  listModels,
  listUserModels,
  publicModel,
  removeModel,
  removeUserModel,
} from './store.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const DIST = process.env.DIST_DIR ?? join(here, '..', 'dist')
const PORT = Number(process.env.PORT ?? 8787)

// 构建标记:deploy-on-windows.ps1 在 npm run build 前创建(写入时间戳)、结束后删除。
// 全量构建只要十几分钟,标记超过 45 分钟就当无效——上次构建中途崩了没清干净时,
// 不能让站点永远钉在「正在更新」提示页上。
const BUILD_FLAG = join(here, '..', '.building')
const BUILD_FLAG_MAX_AGE_MS = 45 * 60 * 1000

function isBuilding() {
  try {
    return Date.now() - statSync(BUILD_FLAG).mtimeMs < BUILD_FLAG_MAX_AGE_MS
  } catch {
    // 标记不存在(绝大多数请求都走这里):不在构建中
    return false
  }
}

// 「正在更新」提示页:构建期间 dist 会被 Astro 先清空再逐页写回,这时候来的访客
// 既拿不到正文、也拿不到 404.html。给一个自包含的页面(纯内联 CSS/SVG,不依赖
// dist 里任何资源),靠 meta refresh 每 15 秒自动刷新,构建完成后自动回到正常站点。
function buildingPageHtml(heading, description) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="15">
<title>知识库正在更新 · 流光 coding 知识库</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #f7f4ee;
    color: #201c17;
    font-family: system-ui, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    text-align: center;
  }
  main { max-width: 26em; }
  .mark-rect { fill: #f0ece4; }
  .mark-dot { fill: #201c17; }
  h1 { margin: 1.4rem 0 0; font-size: 1.6rem; font-weight: 500; letter-spacing: -0.01em; }
  p { margin: 1rem auto 0; max-width: 24em; font-size: 0.92rem; line-height: 1.8; color: #6b645c; }
  .dots { margin-top: 1.6rem; display: flex; gap: 0.45rem; justify-content: center; }
  .dots span {
    width: 0.5rem; height: 0.5rem; border-radius: 50%;
    background: #e9a23b; animation: pulse 1.2s ease-in-out infinite;
  }
  .dots span:nth-child(2) { animation-delay: 0.2s }
  .dots span:nth-child(3) { animation-delay: 0.4s }
  @keyframes pulse {
    0%, 100% { opacity: 0.25; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }
  .btn {
    display: inline-block; margin-top: 2.4rem; padding: 0.72rem 1.5rem;
    border-radius: 999px; background: #e9a23b; color: #1a1408;
    font-size: 0.92rem; font-weight: 500; text-decoration: none;
  }
  .btn:hover { filter: brightness(1.05); }
  @media (prefers-color-scheme: dark) {
    body { background: #0b0a09; color: #f5f2ee; }
    .mark-rect { fill: #1c1917; }
    .mark-dot { fill: #f5f2ee; }
    p { color: #a9a29a; }
  }
</style>
</head>
<body>
<main>
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="15" class="mark-rect"/>
    <path d="M9 41 L55 17" stroke="#e9a23b" stroke-width="7" stroke-linecap="round"/>
    <path d="M15 55 L59 31" stroke="#e9a23b" stroke-width="7" stroke-linecap="round" opacity="0.34"/>
    <circle cx="21" cy="20" r="4.5" class="mark-dot"/>
  </svg>
  <h1>${heading}</h1>
  <p>${description}</p>
  <div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
  <a class="btn" href="/">回知识库首页</a>
</main>
</body>
</html>`
}

// 提示页统一走 503 + Retry-After:让浏览器和反代都知道这是临时状态
function respondBuilding(res, heading = '知识库正在更新', description = '站点正在重新构建，通常几分钟，最多十几分钟。这个页面会自动刷新，不用手动操作。') {
  res
    .status(503)
    .setHeader('Retry-After', '20')
    .type('html; charset=utf-8')
    .send(buildingPageHtml(heading, description))
}

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '512kb' }))

// 数据库连不上不阻塞启动:站点照发,需要库的接口回 503,后台重试
startDatabaseWithRetry()

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    models: listModels().length,
    dataDir: DATA_DIR,
    site: existsSync(DIST),
    uptime: Math.round(process.uptime()),
    db: dbStatus(),
    dbTarget: dbReady() ? `${dbInfo().host}:${dbInfo().port}/${dbInfo().database}` : null,
  })
})

// ---------------- 账号 ----------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 反滥用阈值(进程内滑动窗口,见 rate-limit.mjs)
const HOUR_MS = 60 * 60 * 1000
const REGISTER_PER_IP = 10 // 同一 IP 每小时建号上限
const REGISTER_GLOBAL = 50 // 全站每小时建号上限
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_FAILURES = 10 // 同一 email + IP 在 15 分钟内允许的失败次数

app.post('/api/auth/register', async (req, res, next) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const displayName = String(req.body?.displayName ?? '').trim()
  if (!email || email.length > 190 || !EMAIL_RE.test(email)) return res.status(400).json({ message: '邮箱格式不正确' })
  if (password.length < 8 || password.length > 72) return res.status(400).json({ message: '密码长度要在 8 到 72 位之间' })
  if (displayName.length > 60) return res.status(400).json({ message: '昵称最多 60 个字' })

  const ipKey = `register:ip:${clientKeyOf(req)}`
  const globalKey = 'register:global'
  if (!allowed(ipKey, REGISTER_PER_IP, HOUR_MS) || !allowed(globalKey, REGISTER_GLOBAL, HOUR_MS)) {
    return res.status(429).json({ message: '注册太频繁了，请稍后再试' })
  }
  try {
    if (await findUserByEmail(email)) {
      return res.status(409).json({ message: '这个邮箱已经注册过,直接登录吧' })
    }
    const user = await createUser({ email, password, displayName: displayName || email.split('@')[0] })
    const token = await issueToken(user.id)
    // 建号成功才记账:校验失败、邮箱重复都不该吃掉正常用户的额度
    note(ipKey)
    note(globalKey)
    res.status(201).json({ token, user: publicUser(user) })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: '这个邮箱已经注册过,直接登录吧' })
    next(error)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  if (!email || !password) return res.status(400).json({ message: '邮箱和密码都要填' })
  if (email.length > 190 || password.length > 72) return res.status(400).json({ message: '邮箱或密码不正确' })

  // 判锁放在查库之前:锁住时连密码哈希都不算
  const failKey = `login:${email}:${clientKeyOf(req)}`
  if (!allowed(failKey, LOGIN_FAILURES, LOGIN_WINDOW_MS)) {
    return res.status(429).json({ message: '尝试次数过多，请稍后再试' })
  }
  try {
    const user = await findUserByEmail(email)
    if (!user || !(await passwordMatches(user.password_hash, password))) {
      note(failKey)
      return res.status(401).json({ message: '邮箱或密码不正确' })
    }
    reset(failKey)
    const token = await issueToken(user.id)
    res.json({ token, user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', requireAuth, async (req, res, next) => {
  try {
    await revokeToken(req.token)
    res.json({ message: '已退出' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// ---------------- 闯关进度(按用户) ----------------

app.get('/api/game/progress', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await query('SELECT progress FROM game_progress WHERE user_id = ? LIMIT 1', [req.user.id])
    res.json({ progress: rows[0]?.progress ?? null })
  } catch (error) {
    next(error)
  }
})

app.put('/api/game/progress', requireAuth, async (req, res, next) => {
  const progress = normalizeGameProgress(req.body?.progress)
  if (!progress) return res.status(400).json({ message: '进度数据不合法' })
  try {
    await query(
      `INSERT INTO game_progress (user_id, progress) VALUES (?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE progress = VALUES(progress)`,
      [req.user.id, JSON.stringify(progress)],
    )
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.post('/api/chat', createChatHandler())

// 文章朗读:音色走 Edge 在线语音,结果按内容哈希缓存;失败时前端会自动回退浏览器朗读
app.post('/api/tts', createTtsHandler())

// 保存/列出/删除走自己的仓库(要拿明文 Key 才能替浏览器调模型)。
// 登录用户存自己名下(MySQL),匿名用户存全局文件,行为与从前一致。
app.post('/api/ai-model/models', async (req, res, next) => {
  const { endpoint, modelName, displayName, apiKey } = req.body ?? {}
  if (!endpoint || !modelName) return res.status(400).json({ message: '缺少必填参数: endpoint 或 modelName' })
  try {
    const url = new URL(endpoint)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol')
  } catch {
    return res.status(400).json({ message: '接口地址格式不正确' })
  }
  try {
    const user = await optionalUser(req)
    if (user) {
      const record = await addUserModel(user.id, { endpoint, modelName, displayName, apiKey })
      return res.status(201).json({ id: record.id, scope: 'user', message: '保存成功(存在你的账号下)' })
    }
    const record = addModel({ endpoint, modelName, displayName, apiKey })
    res.status(201).json({ id: record.id, scope: 'global', message: '保存成功' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/ai-model/models/saved', async (req, res, next) => {
  try {
    const user = await optionalUser(req)
    const own = user ? (await listUserModels(user.id)).map((item) => publicModel(item, 'user')) : []
    const global = listModels().map((item) => publicModel(item, 'global'))
    res.json({ models: [...own, ...global] })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/ai-model/models/:id', async (req, res, next) => {
  const id = req.params.id
  try {
    const user = await optionalUser(req)
    // 登录用户:先删自己名下的;删掉了就别再去动全局仓库
    if (user && (await findUserModel(user.id, id))) {
      await removeUserModel(user.id, id)
      return res.json({ message: '删除成功' })
    }
    if (id.startsWith('u_')) return res.status(404).json({ message: '模型不存在' })
    if (!removeModel(id)) return res.status(404).json({ message: '模型不存在' })
    res.json({ message: '删除成功' })
  } catch (error) {
    next(error)
  }
})

// 供应商预设 / 模型列表 / 测连接:直接用 ai-model-form 的实现
app.use('/api', createAiModelMiddleware())

// 站点
// 构建期间(Astro 正在清空重写 dist),浏览器导航一律给「正在更新」提示页:
// 就算某页恰好还搜得到,也可能是写到一半的文件,不如统一说明情况。
// 资源请求(非 HTML)不走这里,保持原有语义,避免前端脚本把 HTML 当 CSS/JS 解析报错。
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  if (isBuilding() && String(req.headers.accept ?? '').includes('text/html')) {
    return respondBuilding(res)
  }
  next()
})

if (existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: 'index.html',
      extensions: ['html'],
      setHeaders(res, filePath) {
        // 带内容哈希的构建产物可以长缓存;图片和导图留一小时;HTML 不缓存
        if (filePath.includes('/_astro/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        } else if (filePath.endsWith('search-index.json')) {
          // 索引跟着构建走,发布后要立刻能搜到新文章;保留 ETag,让浏览器发条件请求。
          res.setHeader('Cache-Control', 'no-cache')
        } else if (/\.(png|jpe?g|svg|webp|woff2?|json)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=3600')
        }
      },
    }),
  )
  app.use((req, res) => {
    // 只对浏览器导航(HTML 请求)区分「dist 不完整」和真 404;
    // 非 HTML 请求(静态资源)只回 404 状态,不给任何 HTML 页面。
    if (!String(req.headers.accept ?? '').includes('text/html')) {
      return res.status(404).type('text/plain; charset=utf-8').send('Not Found')
    }
    // 构建标记过期失效后,如果 index.html 仍缺席,说明 dist 被清空后没写回完
    // (比如构建崩了),同样给提示页而不是把「页面没找到」甩给访客
    if (!existsSync(join(DIST, 'index.html'))) {
      return respondBuilding(res)
    }
    // 404.html 自己也没了(dist 清空的窗口期)时,退化为提示页。
    // 用 root 写法而不是拼绝对路径:send 会拒绝路径里带「.」开头的目录
    // (比如从 .zen-worktrees 这类 worktree 目录里跑的时候),root 则不受影响。
    if (existsSync(join(DIST, '404.html'))) {
      return res.status(404).sendFile('404.html', { root: DIST })
    }
    respondBuilding(res)
  })
} else {
  app.use((_req, res) => {
    respondBuilding(res, '知识库正在更新', '站点还没准备好，正在构建，通常几分钟，最多十几分钟。这个页面会自动刷新，不用手动操作。')
  })
}

// 兜底:没被上面接住的错,统一翻成 JSON,别把堆栈甩给浏览器
app.use((error, _req, res, _next) => {
  if (error?.code === 'DB_UNAVAILABLE') {
    return res.status(503).json({ message: '服务端数据库还没就绪,过一会儿再试' })
  }
  console.error('[api]', error)
  res.status(500).json({ message: '服务端开小差了' })
})

app.listen(PORT, () => {
  const models = listModels().length
  console.log(
    `liuguang-coding 服务已启动:http://127.0.0.1:${PORT}  (模型 ${models} 条,数据目录 ${DATA_DIR},数据库 ${dbStatus()})`,
  )
})
