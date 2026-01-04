import { colors, borderRadius } from '@/styles/theme'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth, style, ...props }, ref) => {
    return (
      <div style={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: '15px',
            background: colors.charcoal,
            border: `1px solid ${error ? colors.error : colors.border}`,
            borderRadius: borderRadius.md,
            color: colors.ivory,
            outline: 'none',
            transition: 'border-color 0.2s',
            ...style,
          }}
          {...props}
        />
        {error && (
          <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: colors.error }}>
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
