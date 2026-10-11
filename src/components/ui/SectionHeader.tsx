import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

type SectionHeaderProps = {
  title: ReactNode
  body?: string
  /** 全页只出现两次的小标签,注意别给每个区块都加 */
  eyebrow?: string
  titleId?: string
  className?: string
}

/** 区块标题:标题在上、说明在下,整条左对齐。不做"左大标题 + 右小段落"的分栏头。 */
export function SectionHeader({ title, body, eyebrow, titleId, className = '' }: SectionHeaderProps) {
  return (
    <Reveal className={className}>
      {eyebrow ? <p className="mb-4 text-[13px] text-highlight">{eyebrow}</p> : null}
      <h2
        id={titleId}
        className="text-[1.75rem] leading-[1.25] font-medium tracking-tight md:text-[2.1rem]"
      >
        {title}
      </h2>
      {body ? <p className="mt-4 max-w-[32em] text-[15px] leading-relaxed text-muted">{body}</p> : null}
    </Reveal>
  )
}
