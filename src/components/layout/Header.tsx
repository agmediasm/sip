import { colors } from '@/styles/theme'
import { Button } from '@/components/ui'

interface HeaderProps {
  title?: string
  subtitle?: string
  venueSlug?: string
  user?: { name: string; role: 'staff' | 'manager' | 'admin' }
  onLogout?: () => void
  rightContent?: React.ReactNode
}

export function Header({ title = 'SIP', subtitle, venueSlug, user, onLogout, rightContent }: HeaderProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: colors.noir,
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 300,
              letterSpacing: '8px',
              color: colors.champagne,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <>
              <span style={{ color: colors.border }}>|</span>
              <span style={{ fontSize: '13px', color: colors.textMuted }}>{subtitle}</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {rightContent}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>
                {user.name}
              </span>
              {onLogout && (
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  Ieșire
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
