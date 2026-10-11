import { MoonStars, SunDim } from '@phosphor-icons/react'
import { useState } from 'react'

type Theme = 'dark' | 'light'

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/** 深色是品牌基调,浅色给不喜欢深色页面的读者。选择记在 localStorage。 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
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
      aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {theme === 'dark' ? <SunDim size={17} /> : <MoonStars size={17} />}
    </button>
  )
}
