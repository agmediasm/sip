import { colors } from '@/styles/theme'

interface SectionProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Section({ title, subtitle, children, action, padding = 'md' }: SectionProps) {
  const paddingValues = { none: '0', sm: '16px 0', md: '24px 0', lg: '32px 0' }

  return (
    <section style={{ padding: paddingValues[padding] }}>
      {(title || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div>
            {title && (
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.ivory }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
