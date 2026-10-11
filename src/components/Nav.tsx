import { List, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { navLinks } from '../data/site'
import { ActionLink } from './ui/Actions'
import { Mark } from './ui/Mark'
import { ThemeToggle } from './ui/ThemeToggle'

export function Nav() {
  const [open, setOpen] = useState(false)
  const [lifted, setLifted] = useState(false)

  useEffect(() => {
    // 只看页面顶部的小哨兵是否离开视口,不用 scroll 事件(每帧回调,代价高)
    const sentinel = document.getElementById('page-top')
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => setLifted(!entry.isIntersecting))
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        lifted ? 'border-line/70 bg-canvas/85 backdrop-blur-md' : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-5 md:px-8">
        <a href="#top" className="flex shrink-0 items-center gap-2.5">
          <Mark className="h-7 w-7" />
          <span className="text-[15px] font-medium tracking-tight">流光 coding</span>
        </a>

        <nav aria-label="页面导航" className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-muted transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {/* 用外层容器控制显隐:ActionLink 自身带 inline-flex,和 hidden 直接打架 */}
          <div className="hidden sm:block">
            <ActionLink href="#preview" className="px-5 py-2.5">
              免费开始学习
            </ActionLink>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? '收起菜单' : '展开菜单'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted md:hidden"
          >
            {open ? <X size={17} /> : <List size={17} />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-menu" className="border-t border-line/70 bg-canvas/95 backdrop-blur-md md:hidden">
          <nav aria-label="移动端导航" className="mx-auto flex max-w-[1200px] flex-col px-5 pb-5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/60 py-3.5 text-sm text-muted"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 sm:hidden">
              <ActionLink href="#preview">免费开始学习</ActionLink>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
