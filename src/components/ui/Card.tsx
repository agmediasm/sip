import { colors, borderRadius, shadows } from '@/styles/theme'
import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glow'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hoverable, children, style, ...props }, ref) => {
    const paddingValues = { none: '0', sm: '12px', md: '20px', lg: '28px' }

    const variantStyles = {
      default: {
        background: colors.onyx,
        border: `1px solid ${colors.border}`,
      },
      elevated: {
        background: colors.charcoal,
        boxShadow: shadows.md,
      },
      outlined: {
        background: 'transparent',
        border: `1px solid ${colors.borderLight}`,
      },
      glow: {
        background: colors.onyx,
        border: `1px solid ${colors.champagne}30`,
        boxShadow: `0 0 20px ${colors.glowChampagne}`,
      },
    }

    const baseStyle: React.CSSProperties = {
      borderRadius: borderRadius.lg,
      padding: paddingValues[padding],
      transition: hoverable ? 'all 0.2s ease' : undefined,
      cursor: hoverable ? 'pointer' : undefined,
      ...variantStyles[variant],
    }

    return (
      <div ref={ref} style={{ ...baseStyle, ...style }} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
