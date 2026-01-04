import { colors, borderRadius } from '@/styles/theme'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
}

export function QuantitySelector({ 
  value, 
  onChange, 
  min = 0, 
  max = 99,
  size = 'md' 
}: QuantitySelectorProps) {
  const buttonSize = size === 'sm' ? '28px' : '36px'
  const fontSize = size === 'sm' ? '14px' : '16px'

  const handleDecrement = () => {
    if (value > min) onChange(value - 1)
  }

  const handleIncrement = () => {
    if (value < max) onChange(value + 1)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        style={{
          width: buttonSize,
          height: buttonSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.charcoal,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.sm,
          color: value <= min ? colors.textMuted : colors.ivory,
          fontSize: fontSize,
          fontWeight: 600,
          cursor: value <= min ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        −
      </button>
      <span style={{
        minWidth: buttonSize,
        textAlign: 'center',
        fontSize: fontSize,
        fontWeight: 600,
        color: value > 0 ? colors.champagne : colors.textMuted,
      }}>
        {value}
      </span>
      <button
        onClick={handleIncrement}
        disabled={value >= max}
        style={{
          width: buttonSize,
          height: buttonSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.charcoal,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.sm,
          color: value >= max ? colors.textMuted : colors.ivory,
          fontSize: fontSize,
          fontWeight: 600,
          cursor: value >= max ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        +
      </button>
    </div>
  )
}
