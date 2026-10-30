import { useEffect, useState } from 'react'
import { apiLogout, getUser, onAuthChange, openAuthDialog, type AuthUser } from '../lib/auth'

/**
 * 页头上的登录入口:没登录是一颗「登录」,登录了显示昵称加一颗「退出」。
 * 昵称做成纯文本(标题属性里放邮箱),不做悬浮菜单 —— 页头放不下二层交互。
 */
export function AuthButton() {
  const [user, setUser] = useState<AuthUser | null>(getUser)

  useEffect(() => onAuthChange(() => setUser(getUser())), [])

  if (!user) {
    return (
      <button type="button" className="lg-auth-entry" onClick={openAuthDialog}>
        登录
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2">
      <span className="hidden text-[0.82rem] text-muted sm:inline" title={user.email}>
        {user.displayName}
      </span>
      <button type="button" className="lg-auth-entry" onClick={() => void apiLogout()}>
        退出
      </button>
    </span>
  )
}
