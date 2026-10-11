/** 品牌图形:两道斜向的光带。几何标记,不走图标库。 */
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className} fill="none">
      <rect width="64" height="64" rx="15" className="fill-panel" />
      <path d="M9 41 L55 17" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
      <path d="M15 55 L59 31" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" opacity="0.34" />
      <circle cx="21" cy="20" r="4.5" className="fill-ink" />
    </svg>
  )
}
