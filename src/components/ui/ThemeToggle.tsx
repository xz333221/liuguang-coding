import { MoonStars, SunDim } from '@phosphor-icons/react'

/**
 * 深浅主题切换。图标用 CSS 跟着 html[data-theme] 走,组件本身不持状态,
 * 这样服务端渲染和客户端首次渲染完全一致,不会有水合不匹配。
 */
export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('lg-theme', next)
    } catch {
      // 隐私模式下写不了 localStorage,忽略即可
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换深浅主题"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <SunDim size={17} aria-hidden="true" className="hidden [html[data-theme=dark]_&]:block" />
      <MoonStars size={17} aria-hidden="true" className="hidden [html[data-theme=light]_&]:block" />
    </button>
  )
}
