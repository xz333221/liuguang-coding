// 问答接口:浏览器 -> 这里 -> 模型服务,SSE 透传。
// 密钥只留在服务端(来自模型仓库或环境变量),浏览器从头到尾拿不到。
import { findModel, listModels } from './store.mjs'

const UPSTREAM_BASE_URL = (process.env.UPSTREAM_BASE_URL ?? '').replace(/\/+$/, '')
const UPSTREAM_API_KEY = process.env.UPSTREAM_API_KEY ?? ''
const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? ''
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? ''
const RATE_LIMIT = Number(process.env.RATE_LIMIT ?? 60)
const MAX_TOKENS = Number(process.env.MAX_TOKENS ?? 1024)
const MAX_BODY_CHARS = 120_000

/** ip -> 本小时窗口内的请求数 */
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

function fail(res, status, message) {
  res.status(status).json({ error: { message } })
}

/** 解析这一轮该用哪个模型:请求里点的 > 仓库里第一条 > 环境变量 */
export function resolveModel(modelId) {
  const stored = modelId ? findModel(modelId) : undefined
  const fallback = stored ?? listModels().find((item) => item.apiKey) ?? listModels()[0]
  if (fallback) {
    return { endpoint: fallback.endpoint, apiKey: fallback.apiKey, model: fallback.modelName, from: 'store' }
  }
  return { endpoint: UPSTREAM_BASE_URL, apiKey: UPSTREAM_API_KEY, model: DEFAULT_MODEL, from: 'env' }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null
  let total = 0
  const clean = []
  for (const item of messages) {
    const role = item?.role
    const content = typeof item?.content === 'string' ? item.content : ''
    if (!['system', 'user', 'assistant'].includes(role) || !content) return null
    total += content.length
    clean.push({ role, content })
  }
  if (total > MAX_BODY_CHARS) return null
  return clean
}

export function createChatHandler() {
  return async function handleChat(req, res) {
    // 同源部署时浏览器一般不带 Origin;带了就必须在白名单里
    const origin = req.headers.origin
    if (ALLOWED_ORIGIN && origin && origin !== ALLOWED_ORIGIN) {
      return fail(res, 403, '来源不在白名单里')
    }

    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '')
      .split(',')[0]
      .trim()
    if (rateLimited(ip)) return fail(res, 429, '请求太频繁，过一会儿再试')

    const messages = normalizeMessages(req.body?.messages)
    if (!messages) return fail(res, 400, 'messages 不合法或太长')

    const config = resolveModel(req.body?.modelId)
    if (!config.endpoint || !config.model) {
      return fail(res, 503, '服务端还没配置模型：先在站点的「设置 → 添加模型」里存一条，或给服务设 UPSTREAM_BASE_URL / DEFAULT_MODEL')
    }

    const controller = new AbortController()
    // 注意:req 的 close 在请求体读完时就会触发,不能用它判断"客户端断开"。
    // res 的 close 正常写完也会触发,所以只在响应没写完时才算断开。
    res.on('close', () => {
      if (!res.writableEnded) controller.abort()
    })

    let upstream
    try {
      upstream = await fetch(`${config.endpoint.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
          max_tokens: Math.min(Number(req.body?.max_tokens) || MAX_TOKENS, MAX_TOKENS),
        }),
        signal: controller.signal,
      })
    } catch (error) {
      return fail(res, 502, `连不上模型服务：${error instanceof Error ? error.message : String(error)}`)
    }

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '')
      return fail(res, upstream.status, detail.slice(0, 400) || `模型服务返回 ${upstream.status}`)
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const reader = upstream.body.getReader()
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        res.write(value)
      }
    } catch {
      // 客户端断开或上游中断,收尾即可
    }
    res.end()
  }
}
