import { colors, borderRadius } from '@/styles/theme'

interface BadgeProps {
  variant: 'popular' | 'premium' | 'new' | 'recommended' | 'vip' | 'normal' | 'bar' | 'success' | 'warning' | 'error'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

export function Badge({ variant, children, size = 'sm' }: BadgeProps) {
  const variantStyles = {
    popular: { background: colors.error, color: '#fff' },
    premium: { background: colors.slate, color: colors.platinum },
    new: { background: colors.success, color: '#fff' },
    recommended: { background: colors.champagne, color: colors.noir },
    vip: { background: colors.vip, color: colors.noir },
    normal: { background: colors.normal, color: '#fff' },
    bar: { background: colors.bar, color: '#fff' },
    success: { background: colors.success, color: '#fff' },
    warning: { background: colors.warning, color: colors.noir },
    error: { background: colors.error, color: '#fff' },
  }

  const sizeStyles = {
    sm: { padding: '3px 8px', fontSize: '9px' },
    md: { padding: '5px 12px', fontSize: '11px' },
  }

  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: borderRadius.sm,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  )
}
