import { colors } from '@/styles/theme'
import { Button } from '@/components/ui'

interface AdminHeaderProps {
  admin: {
    name: string
    email: string
    role: string
  }
  onLogout: () => void
}

export function AdminHeader({ admin, onLogout }: AdminHeaderProps) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: colors.noir,
      borderBottom: `1px solid ${colors.border}`,
      padding: '12px 20px',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        maxWidth: '1600px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ 
            margin: 0,
            fontSize: '20px', 
            fontWeight: 300, 
            letterSpacing: '8px', 
            color: colors.champagne,
          }}>
            S I P
          </h1>
          <span style={{ color: colors.border }}>|</span>
          <span style={{ 
            fontSize: '11px', 
            letterSpacing: '3px', 
            color: colors.error,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            ADMIN
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: colors.ivory }}>{admin.name}</div>
            <div style={{ fontSize: '11px', color: colors.textMuted }}>{admin.email}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Ieșire
          </Button>
        </div>
      </div>
    </header>
  )
}
