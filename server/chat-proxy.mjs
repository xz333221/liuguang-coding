// 知识库问答用的最小代理:浏览器 -> 这里 -> 模型服务。
//
// 为什么需要它:大多数模型接口不允许网页直接调用(没有 CORS 头),而且密钥不能写进静态站点。
// 代理放在你自己的服务器上,密钥只存在服务器的环境变量里。
//
// 跑起来:
//   UPSTREAM_BASE_URL=https://api.openai.com/v1 \
//   UPSTREAM_API_KEY=sk-xxx \
//   ALLOWED_ORIGIN=https://xz333221.github.io \
//   node server/chat-proxy.mjs
//
// 然后把站点构建时的 PUBLIC_CHAT_PROXY 指到它,例如 https://你的域名/api/chat
//
// 公开站点上这个接口等于对所有人开放你的额度,所以内置了三道闸:
//   1) ALLOWED_ORIGIN  只回给指定来源的浏览器
//   2) 每 IP 每小时限流(默认 30 次)
//   3) 强制带上 max_tokens 上限(默认 1024),并且只允许 chat/completions
// 如果你只是自己用,可以再设 SITE_TOKEN,站点侧在代理地址后追加 ?token=xxx。

import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 8787)
const UPSTREAM_BASE_URL = (process.env.UPSTREAM_BASE_URL ?? '').replace(/\/+$/, '')
const UPSTREAM_API_KEY = process.env.UPSTREAM_API_KEY ?? ''
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'
const SITE_TOKEN = process.env.SITE_TOKEN ?? ''
const RATE_LIMIT = Number(process.env.RATE_LIMIT ?? 30)
const MAX_TOKENS = Number(process.env.MAX_TOKENS ?? 1024)
const MAX_BODY_BYTES = 256 * 1024

if (!UPSTREAM_BASE_URL || !UPSTREAM_API_KEY) {
  console.error('缺少 UPSTREAM_BASE_URL 或 UPSTREAM_API_KEY,先看文件顶部的说明。')
  process.exit(1)
}

/** ip -> 本小时内的请求数与窗口起点 */
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.start > 3600_000) {
    hits.set(ip, { start: now, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function send(res, status, text) {
  res.writeHead(status, { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: { message: text } }))
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders())
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (req.method !== 'POST' || url.pathname !== '/api/chat') {
    send(res, 404, 'not found')
    return
  }

  if (SITE_TOKEN && url.searchParams.get('token') !== SITE_TOKEN) {
    send(res, 401, 'token 不对')
    return
  }

  const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').toString().split(',')[0].trim()
  if (rateLimited(ip)) {
    send(res, 429, '请求太频繁,过一会儿再试')
    return
  }

  let body = ''
  let tooLarge = false
  for await (const chunk of req) {
    body += chunk
    if (body.length > MAX_BODY_BYTES) {
      tooLarge = true
      break
    }
  }
  if (tooLarge) {
    send(res, 413, '请求体太大')
    return
  }

  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    send(res, 400, '请求体不是合法 JSON')
    return
  }

  const upstream = await fetch(`${UPSTREAM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${UPSTREAM_API_KEY}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: payload.model,
      messages: payload.messages,
      stream: true,
      max_tokens: Math.min(Number(payload.max_tokens) || MAX_TOKENS, MAX_TOKENS),
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    send(res, upstream.status, detail.slice(0, 500) || `上游返回 ${upstream.status}`)
    return
  }

  res.writeHead(200, {
    ...corsHeaders(),
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const reader = upstream.body.getReader()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    res.write(value)
  }
  res.end()
})

server.listen(PORT, () => {
  console.log(`chat proxy listening on ${PORT} -> ${UPSTREAM_BASE_URL}`)
})
