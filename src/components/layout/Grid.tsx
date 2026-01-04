interface GridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}

export function Grid({ children, cols = 2, gap = 'md', style }: GridProps) {
  const gapValues = { sm: '12px', md: '20px', lg: '28px' }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: gapValues[gap],
        ...style,
      }}
    >
      {children}
    </div>
  )
}
