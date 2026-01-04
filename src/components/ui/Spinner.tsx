import { colors } from '@/styles/theme'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function Spinner({ size = 'md', color = colors.champagne }: SpinnerProps) {
  const sizeValues = { sm: 16, md: 24, lg: 40 }
  const dimension = sizeValues[size]

  return (
    <div
      style={{
        width: dimension,
        height: dimension,
        border: `2px solid ${colors.border}`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )
}
