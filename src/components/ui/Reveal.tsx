import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { EASE_OUT_EXPO } from '../../lib/motion'

type RevealProps = {
  children: ReactNode
  /** 同一组元素依次入场时用 0.06 的倍数做错峰 */
  delay?: number
  distance?: number
  className?: string
  as?: 'div' | 'li'
}

const viewport = { once: true, amount: 0.25 }

/**
 * 进入视口时淡入上移。开启"减少动态效果"时直接渲染静态节点,
 * 不依赖库自身的降级行为,免得哪次漏判就动个不停。
 */
export function Reveal({ children, delay = 0, distance = 20, className, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return as === 'li' ? <li className={className}>{children}</li> : <div className={className}>{children}</div>
  }

  if (as === 'li') {
    return (
      <motion.li
        className={className}
        initial={{ opacity: 0, y: distance }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.62, delay, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.li>
    )
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.62, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  )
}
