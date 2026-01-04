import { useState } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { PageContainer } from '@/components/layout'
import { Button, Card, Input, Spinner, Tabs } from '@/components/ui'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { DashboardOverview } from '@/components/admin/DashboardOverview'
import { LiveLogs } from '@/components/admin/LiveLogs'
import { ErrorTracker } from '@/components/admin/ErrorTracker'
import { SystemHealth } from '@/components/admin/SystemHealth'
import { ActiveSessions } from '@/components/admin/ActiveSessions'
import { VenueSelector } from '@/components/admin/VenueSelector'
import { colors, borderRadius } from '@/styles/theme'

type AdminTab = 'overview' | 'logs' | 'errors' | 'health' | 'sessions'

export default function AdminPage() {
  const { admin, isAuthenticated, login, logout, loading, error } = useAdminAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  // Login form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    await login(email, password)
    setLoginLoading(false)
  }

  // Loading
  if (loading) {
    return (
      <PageContainer title="Admin">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}>
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <PageContainer title="Admin Login">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px',
          background: colors.noir,
        }}>
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 300, 
              letterSpacing: '12px', 
              color: colors.champagne,
              marginBottom: '8px'
            }}>
              S I P
            </h1>
            <span style={{ 
              fontSize: '11px', 
              letterSpacing: '4px', 
              color: colors.textMuted,
              textTransform: 'uppercase'
            }}>
              Admin Console
            </span>
          </div>

          <Card variant="elevated" padding="lg" style={{ width: '100%', maxWidth: '400px' }}>
            <form onSubmit={handleLogin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Email"
                  type="email"
                  placeholder="admin@sip-app.ro"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />

                <Input
                  label="Parolă"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />

                {error && (
                  <div style={{
                    padding: '12px',
                    background: `${colors.error}20`,
                    border: `1px solid ${colors.error}`,
                    borderRadius: borderRadius.sm,
                    color: colors.error,
                    fontSize: '13px',
                    textAlign: 'center',
                  }}>
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="primary" 
                  fullWidth 
                  loading={loginLoading}
                  disabled={!email || !password}
                >
                  Autentificare
                </Button>
              </div>
            </form>
          </Card>

          <p style={{ 
            marginTop: '24px', 
            fontSize: '12px', 
            color: colors.textMuted 
          }}>
            Acces restricționat. Doar administratori autorizați.
          </p>
        </div>
      </PageContainer>
    )
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'logs', label: '📋 Logs' },
    { id: 'errors', label: '🔴 Errors' },
    { id: 'health', label: '🖥️ System' },
    { id: 'sessions', label: '👥 Sessions' },
  ]

  return (
    <PageContainer title="Admin Dashboard" maxWidth="full" background="noir">
      <AdminHeader 
        admin={admin!}
        onLogout={logout}
      />

      <div style={{ padding: '20px' }}>
        {/* Top bar with venue selector */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as AdminTab)}
          />

          <VenueSelector
            selectedVenueId={selectedVenueId}
            onChange={setSelectedVenueId}
          />
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'overview' && (
            <DashboardOverview venueId={selectedVenueId} />
          )}
          {activeTab === 'logs' && (
            <LiveLogs venueId={selectedVenueId} />
          )}
          {activeTab === 'errors' && (
            <ErrorTracker venueId={selectedVenueId} />
          )}
          {activeTab === 'health' && (
            <SystemHealth />
          )}
          {activeTab === 'sessions' && (
            <ActiveSessions venueId={selectedVenueId} />
          )}
        </div>
      </div>
    </PageContainer>
  )
}
