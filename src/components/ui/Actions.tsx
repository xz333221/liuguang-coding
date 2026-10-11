import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'ghost'

function ctaClass(variant: Variant) {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-medium transition-colors'
  if (variant === 'primary') {
    return `${base} bg-accent text-on-accent hover:brightness-105`
  }
  return `${base} border border-line-strong text-ink hover:border-highlight hover:text-highlight`
}

type ActionLinkProps = {
  href: string
  children: ReactNode
  variant?: Variant
  className?: string
}

export function ActionLink({ href, children, variant = 'primary', className = '' }: ActionLinkProps) {
  const reduce = useReducedMotion()

  return (
    <motion.a
      href={href}
      className={`${ctaClass(variant)} ${className}`}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      {children}
    </motion.a>
  )
}

type ActionButtonProps = {
  children: ReactNode
  variant?: Variant
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function ActionButton({
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
}: ActionButtonProps) {
  const reduce = useReducedMotion()

  return (
    <motion.button
      type={type}
      disabled={disabled}
      className={`${ctaClass(variant)} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      whileHover={reduce || disabled ? undefined : { y: -1 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      {children}
    </motion.button>
  )
}
