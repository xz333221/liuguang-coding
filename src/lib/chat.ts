// 知识库问答面板的服务端无关部分:配置、提示词、SSE 流式读取。
// 这里不碰 DOM,方便单独推逻辑;面板组件只负责界面。

import { loadCurrentId, loadModels, pickModel, saveCurrentId } from './chat-models'

export interface ChatSettings {
  /** 代理地址。填了就走它,浏览器里不需要 API Key(推荐,见 README 的 chat-proxy) */
  proxyUrl: string
  /** 下面三项来自「模型配置」里选中的那条,由 ai-model-form 负责编辑 */
  baseUrl: string
  apiKey: string
  model: string
  /** 选中模型的 id,存 localStorage 用 */
  modelId: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ArticleContext {
  /** 当前文章的 id,用来按篇存对话 */
  id: string
  title: string
  summary: string
  categoryName: string
  /** 正文的原始 markdown */
  body: string
}

const PROXY_KEY = 'lg-chat-proxy'
/** 构建时注入的代理地址(Astro 的 PUBLIC_ 前缀会带到浏览器) */
export const BUILD_PROXY: string = import.meta.env.PUBLIC_CHAT_PROXY ?? ''

/** 正文太长就截断,别把上下文撑爆 */
const MAX_BODY_CHARS = 12000

const EMPTY_SETTINGS: ChatSettings = {
  proxyUrl: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  modelId: '',
}

/** 代理地址 + 选中的模型,合成这一轮要用的配置 */
export function loadSettings(): ChatSettings {
  if (typeof localStorage === 'undefined') return EMPTY_SETTINGS
  try {
    const proxyUrl = localStorage.getItem(PROXY_KEY) ?? ''
    const models = loadModels()
    const selected = pickModel(models, loadCurrentId())
    return {
      proxyUrl,
      baseUrl: selected?.endpoint ?? '',
      apiKey: selected?.apiKey ?? '',
      model: selected?.modelName ?? '',
      modelId: selected?.id ?? '',
    }
  } catch {
    return EMPTY_SETTINGS
  }
}

export function saveSettings(settings: ChatSettings): void {
  try {
    localStorage.setItem(PROXY_KEY, settings.proxyUrl)
    if (settings.modelId) saveCurrentId(settings.modelId)
  } catch {
    // 隐私模式下写不了,忽略
  }
}

export function resolveEndpoint(settings: ChatSettings): string {
  const proxy = settings.proxyUrl.trim() || BUILD_PROXY
  if (proxy) return proxy
  return `${settings.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`
}

export function usesProxy(settings: ChatSettings): boolean {
  return Boolean(settings.proxyUrl.trim() || BUILD_PROXY)
}

export function isConfigured(settings: ChatSettings): boolean {
  // 走代理时模型名可以由代理兜底,浏览器这边不强制填
  if (usesProxy(settings)) return true
  return Boolean(settings.baseUrl.trim() && settings.model.trim())
}

function trimBody(body: string): string {
  if (body.length <= MAX_BODY_CHARS) return body
  return `${body.slice(0, MAX_BODY_CHARS)}\n\n（正文过长，以上为前 ${MAX_BODY_CHARS} 字。）`
}

/**
 * 拼这一轮发给模型的 messages。
 * 文章作为"请求级上下文"注入 system,不进对话历史 —— 和 zen-gitsync 里
 * openFilePath 的做法一致:翻页换文章不会污染上一轮的记录。
 */
export function buildMessages(
  article: ArticleContext | null,
  history: ChatMessage[],
  question: string,
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const rules = [
    '你是「流光 coding」编程知识库的答疑助手。',
    '读者正在看知识库里的页面，你可以看到他正在读的那篇文章。',
    '要求：用中文回答；直接回答问题本身，不要复述问题；涉及代码时给出可以运行的例子；',
    '文章里没有依据的内容，明确说不确定，并指出可以查什么；回答尽量短，读者要求展开时再展开。',
  ]

  const parts = [rules.join('\n')]
  if (article) {
    parts.push(
      [
        '',
        `读者正在读的文章：《${article.title}》（分类：${article.categoryName}）`,
        `摘要：${article.summary}`,
        '',
        '正文：',
        '```markdown',
        trimBody(article.body),
        '```',
      ].join('\n'),
    )
  }

  return [
    { role: 'system' as const, content: parts.join('\n') },
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user' as const, content: question },
  ]
}

function explainHttpError(status: number, detail: string): string {
  const short = detail.slice(0, 300)
  if (status === 401 || status === 403) return `密钥被拒绝（HTTP ${status}）。检查 API Key 是否填对、是否有权限。${short}`
  if (status === 404) return `接口地址不对（HTTP 404）。检查 Base URL 是否以 /v1 结尾。${short}`
  if (status === 429) return `触发限流或余额不足（HTTP 429）。${short}`
  return `请求失败（HTTP ${status}）。${short}`
}

/** 把浏览器直连被 CORS 拦下这类"看不懂的报错"翻译成人话 */
export function explainNetworkError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return ''
  const message = error instanceof Error ? error.message : String(error)
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return '请求发不出去。多半是浏览器直连被跨域（CORS）拦下了：官方接口通常不允许网页直接调用。填一个代理地址最省事（见仓库 README 的 chat-proxy）。'
  }
  return message
}

export interface StreamOptions {
  settings: ChatSettings
  messages: ReturnType<typeof buildMessages>
  signal: AbortSignal
  onDelta: (chunk: string) => void
}

/** 发一轮请求并流式回吐正文增量。SSE 逐行解析,兼容 data: 后跟 JSON 或 [DONE] */
export async function streamChat({ settings, messages, signal, onDelta }: StreamOptions): Promise<void> {
  const endpoint = resolveEndpoint(settings)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  if (!usesProxy(settings)) headers.Authorization = `Bearer ${settings.apiKey.trim()}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: settings.model.trim(), messages, stream: true }),
      signal,
    })
  } catch (error) {
    throw new Error(explainNetworkError(error))
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '')
    throw new Error(explainHttpError(response.status, detail))
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const event = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[]
          error?: { message?: string }
        }
        if (event.error?.message) throw new Error(event.error.message)
        const chunk = event.choices?.[0]?.delta?.content
        if (chunk) onDelta(chunk)
      } catch (error) {
        if (error instanceof Error && error.message && !/JSON/i.test(error.message)) throw error
      }
    }
  }
}
