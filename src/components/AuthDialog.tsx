import { useEffect, useState, type FormEvent } from 'react'
import {
  AUTH_OPEN_EVENT,
  apiLogin,
  apiRegister,
  fetchMe,
  setSession,
} from '../lib/auth'

/**
 * 登录 / 注册弹窗。谁都能派发 lg-auth:open 打开它(页头按钮、游戏里的"去登录")。
 * 挂载时校验一次本地 token:失效了就地清掉,别让页头挂着过期的登录态。
 */
export function AuthDialog() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetchMe()
  }, [])

  useEffect(() => {
    const onOpen = () => {
      setTab('login')
      setError('')
      setOpen(true)
    }
    document.addEventListener(AUTH_OPEN_EVENT, onOpen)
    return () => document.removeEventListener(AUTH_OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data =
        tab === 'login'
          ? await apiLogin(email.trim(), password)
          : await apiRegister(email.trim(), password, displayName.trim())
      setSession(data.token, data.user)
      setPassword('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '出了点问题，再试一次')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="lg-auth-modal"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
    >
      <div className="lg-auth-card" role="dialog" aria-modal="true" aria-label="登录 / 注册">
        <header className="lg-auth-head">
          <span className="lg-auth-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="lg-auth-title">~/auth — {tab === 'login' ? 'login' : 'register'}</span>
          <button type="button" className="lg-auth-close" aria-label="关闭" onClick={() => setOpen(false)}>
            ×
          </button>
        </header>

        <div className="lg-auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="lg-auth-tab"
            aria-selected={tab === 'login'}
            onClick={() => {
              setTab('login')
              setError('')
            }}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            className="lg-auth-tab"
            aria-selected={tab === 'register'}
            onClick={() => {
              setTab('register')
              setError('')
            }}
          >
            注册
          </button>
        </div>

        <form className="lg-auth-body" onSubmit={submit}>
          {tab === 'register' ? (
            <label className="lg-auth-field">
              <span>昵称</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="怎么称呼你"
                maxLength={40}
                autoComplete="nickname"
              />
            </label>
          ) : null}

          <label className="lg-auth-field">
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="lg-auth-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={tab === 'register' ? '至少 8 位' : '请输入密码'}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {error ? <p className="lg-auth-error">{error}</p> : null}

          <button type="submit" className="lg-auth-submit" disabled={busy}>
            {busy ? '请稍候…' : tab === 'login' ? '登 录' : '注 册'}
          </button>

          <p className="lg-auth-hint">
            {tab === 'login' ? '还没有账号？' : '已经有账号？'}
            <button
              type="button"
              onClick={() => {
                setTab(tab === 'login' ? 'register' : 'login')
                setError('')
              }}
            >
              {tab === 'login' ? '注册一个' : '去登录'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
