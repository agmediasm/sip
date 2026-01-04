import { colors } from '@/styles/theme'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.ivory }}>
        {title}
      </h3>
      {description && (
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: colors.textMuted }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '20px' }}>{action}</div>}
    </div>
  )
}
