// 登录态:token 存 localStorage,接口统一带 Authorization: Bearer。
// 站点和接口同源(生产同域、开发走 vite 代理),所以这里全用相对路径 /api/...。

export interface AuthUser {
  id: number
  email: string
  displayName: string
}

const TOKEN_KEY = 'lg-auth-token'
const USER_KEY = 'lg-auth-user'
/** 登录/退出/被别人(另一个标签页)改掉,都派发这个事件 */
export const AUTH_EVENT = 'lg-auth:changed'
/** 打开登录弹窗的事件,页头按钮和游戏里的"去登录"都派发它 */
export const AUTH_OPEN_EVENT = 'lg-auth:open'

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    return parsed && typeof parsed.id === 'number' ? parsed : null
  } catch {
    return null
  }
}

/** 写登录态并广播;token 为空表示登出 */
export function setSession(token: string, user: AuthUser | null): void {
  try {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  } catch {
    // 隐私模式下写不进去:当次会话仍然有效(内存里还有 user),只是刷新就没了
  }
  document.dispatchEvent(new CustomEvent(AUTH_EVENT))
}

export function clearSession(): void {
  setSession('', null)
}

/** 请求头:登录了就带上 Bearer,没登录就是空对象 */
export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** 打开登录弹窗 */
export function openAuthDialog(): void {
  document.dispatchEvent(new CustomEvent(AUTH_OPEN_EVENT))
}

/** 订阅登录态变化;返回取消订阅函数 */
export function onAuthChange(listener: () => void): () => void {
  const handler = () => listener()
  document.addEventListener(AUTH_EVENT, handler)
  // 另一个标签页退出登录时,这边也跟着退
  window.addEventListener('storage', handler)
  return () => {
    document.removeEventListener(AUTH_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string }
    return data.message ?? fallback
  } catch {
    return fallback
  }
}

/** 带登录态的 JSON 请求;非 2xx 抛 Error(消息用服务端返回的中文) */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!response.ok) throw new Error(await readError(response, `请求失败（${response.status}）`))
  return (await response.json()) as T
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<{ token: string; user: AuthUser }> {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })
}

export async function apiLogout(): Promise<void> {
  try {
    await apiFetch<{ message: string }>('/api/auth/logout', { method: 'POST' })
  } catch {
    // 服务端删不掉(比如库挂了)也照常登出:本地态清掉,会话留着等服务端自己过期
  }
  clearSession()
}

/** 拿当前登录用户;token 没了/失效了返回 null 并清掉本地态 */
export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null
  try {
    const data = await apiFetch<{ user: AuthUser }>('/api/auth/me')
    return data.user
  } catch {
    clearSession()
    return null
  }
}
