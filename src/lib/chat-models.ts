// 模型配置的存取,以及"没有中间件也能用"时的本地兜底。
//
// 配置界面直接用 ai-model-form 的 <AddModelForm>(Vue 组件),它需要三条后端路由:
//   GET  {apiBase}/models?endpoint=   拉该端点的模型列表
//   POST {apiBase}/test               测连接
//   POST {apiBase}/models             保存
// 部署了 ai-model-form 的 Express 中间件就直接用它;没部署时用下面的本地实现顶掉,
// 表单照样能用(模型列表拉不到就手填),配置存在浏览器里。

export interface SavedModel {
  id: string
  endpoint: string
  modelName: string
  displayName: string
  apiKey: string
  savedAt?: number
  /** true 表示这条来自服务端(密钥在服务端,浏览器只拿得到掩码) */
  server?: boolean
}

const MODELS_KEY = 'lg-chat-models'
const CURRENT_KEY = 'lg-chat-current-model'

/** 本地兜底用的假后端前缀,只用它自己的请求 */
export const LOCAL_API_BASE = '__lg-model-api__'

export function loadModels(): SavedModel[] {
  try {
    const raw = localStorage.getItem(MODELS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedModel[]
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.modelName) : []
  } catch {
    return []
  }
}

export function saveModels(list: SavedModel[]): void {
  try {
    localStorage.setItem(MODELS_KEY, JSON.stringify(list))
  } catch {
    // 忽略
  }
}

export function upsertModel(model: SavedModel): SavedModel[] {
  const list = loadModels()
  const index = list.findIndex((item) => item.id === model.id)
  const next = index >= 0 ? list.map((item, at) => (at === index ? model : item)) : [...list, model]
  saveModels(next)
  return next
}

export function removeModel(id: string): SavedModel[] {
  const next = loadModels().filter((item) => item.id !== id)
  saveModels(next)
  return next
}

export function loadCurrentId(): string {
  try {
    return localStorage.getItem(CURRENT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveCurrentId(id: string): void {
  try {
    localStorage.setItem(CURRENT_KEY, id)
  } catch {
    // 忽略
  }
}

export function pickModel(models: SavedModel[], id: string): SavedModel | null {
  if (models.length === 0) return null
  return models.find((item) => item.id === id) ?? models[models.length - 1] ?? null
}

/** 配置界面用的后端地址:build 时注入的优先,其次是本地面板里填的 */
export const BUILD_MODEL_API: string = import.meta.env.PUBLIC_MODEL_API ?? ''

export function resolveModelApiBase(override: string): string {
  const configured = override.trim() || BUILD_MODEL_API
  // 没配真实中间件时,用本地兜底(相对路径,拦截器认得)
  return configured || LOCAL_API_BASE
}

/** 是否接了真正的服务端(服务端存的模型,密钥不下发到浏览器) */
export function hasServerModelApi(): boolean {
  return Boolean(BUILD_MODEL_API)
}

/** 拉服务端存的模型列表;拉不到就返回空数组(本地兜底时属于正常) */
export async function fetchServerModels(signal?: AbortSignal): Promise<SavedModel[]> {
  if (!BUILD_MODEL_API) return []
  try {
    const response = await fetch(`${BUILD_MODEL_API.replace(/\/+$/, '')}/models/saved`, { signal })
    if (!response.ok) return []
    const data = (await response.json()) as { models?: Partial<SavedModel>[] }
    return (data.models ?? [])
      .filter((item) => item?.id && item.modelName)
      .map((item) => ({
        id: String(item.id),
        endpoint: item.endpoint ?? '',
        modelName: item.modelName ?? '',
        displayName: item.displayName || item.modelName || '',
        apiKey: '',
        server: true,
      }))
  } catch {
    return []
  }
}

/**
 * 装一个只认 LOCAL_API_BASE 的 fetch 拦截器,把三条路由在浏览器里实现掉。
 * 返回卸载函数。
 */
export function installLocalModelBackend(): () => void {
  if (typeof window === 'undefined') return () => {}
  const original = window.fetch.bind(window)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.includes(LOCAL_API_BASE)) return original(input as RequestInfo, init)

    const path = url.slice(url.indexOf(LOCAL_API_BASE) + LOCAL_API_BASE.length)
    const method = (init?.method ?? 'GET').toUpperCase()

    // 拉模型列表:直接问端点的 /models(能不能过要看对方给不给 CORS)
    if (method === 'GET' && path.startsWith('/models')) {
      const query = url.slice(url.indexOf('?') + 1)
      const endpoint = decodeURIComponent(new URLSearchParams(query).get('endpoint') ?? '')
      if (!endpoint) return json({ models: [] })
      const key = (init?.headers as Record<string, string> | undefined)?.['x-api-key'] ?? ''
      try {
        const response = await original(`${endpoint.replace(/\/+$/, '')}/models`, {
          headers: key ? { Authorization: `Bearer ${key}` } : {},
        })
        if (!response.ok) return json({ models: [], note: `端点返回 ${response.status}` })
        const data = (await response.json()) as { data?: { id?: string }[]; models?: { id?: string }[] }
        const ids = (data.data ?? data.models ?? [])
          .map((item) => (typeof item === 'string' ? item : item?.id))
          .filter((id): id is string => Boolean(id))
        return json({ models: ids })
      } catch {
        return json({ models: [], note: '浏览器直连被拦下,手填模型名也可以' })
      }
    }

    // 测连接:发一个只要 1 个 token 的真实请求
    if (method === 'POST' && path.startsWith('/test')) {
      const payload = JSON.parse(String(init?.body ?? '{}')) as SavedModel
      const endpoint = (payload.endpoint ?? '').replace(/\/+$/, '')
      if (!endpoint) return json({ ok: false, message: '先填接口地址' })
      try {
        const response = await original(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${payload.apiKey ?? ''}`,
          },
          body: JSON.stringify({
            model: payload.modelName,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          }),
        })
        if (response.ok) return json({ ok: true, message: '连接成功' })
        const detail = await response.text().catch(() => '')
        return json({ ok: false, message: `返回 ${response.status}:${detail.slice(0, 160)}` })
      } catch (error) {
        return json({
          ok: false,
          message: `浏览器直连失败(多半是跨域):${error instanceof Error ? error.message : ''}`,
        })
      }
    }

    // 保存:写进本机 localStorage
    if (method === 'POST' && path.startsWith('/models')) {
      const payload = JSON.parse(String(init?.body ?? '{}')) as SavedModel
      const id = payload.id || `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      upsertModel({ ...payload, id, savedAt: Date.now() })
      return json({ id })
    }

    return json({ error: '未实现' }, 404)
  }

  return () => {
    window.fetch = original
  }
}
