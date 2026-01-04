import { colors, borderRadius } from '@/styles/theme'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, children, disabled, style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      border: 'none',
      borderRadius: borderRadius.md,
      fontWeight: 600,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      transition: 'all 0.2s ease',
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'inherit',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    }

    const sizeStyles = {
      sm: { padding: '8px 16px', fontSize: '11px' },
      md: { padding: '12px 24px', fontSize: '12px' },
      lg: { padding: '16px 32px', fontSize: '14px' },
    }

    const variantStyles = {
      primary: {
        background: `linear-gradient(135deg, ${colors.champagne}, ${colors.champagneLight})`,
        color: colors.noir,
      },
      secondary: {
        background: colors.charcoal,
        color: colors.ivory,
        border: `1px solid ${colors.border}`,
      },
      ghost: {
        background: 'transparent',
        color: colors.ivory,
        border: `1px solid ${colors.border}`,
      },
      danger: {
        background: colors.error,
        color: '#fff',
      },
      success: {
        background: colors.success,
        color: '#fff',
      },
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{ ...baseStyle, ...sizeStyles[size], ...variantStyles[variant], ...style }}
        {...props}
      >
        {loading ? <span className="spinner" /> : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
