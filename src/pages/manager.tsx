import { useState, useEffect } from 'react'
import { useVenue } from '@/hooks/useVenue'
import { useAuth } from '@/hooks/useAuth'
import { useLogger } from '@/hooks/useLogger'
import { getEvents, getAnalytics, getWaiterLeaderboard } from '@/lib/api'
import { PageContainer, Header } from '@/components/layout'
import { Button, Card, Tabs, Spinner, EmptyState, Input } from '@/components/ui'
import { OverviewTab } from '@/components/manager/OverviewTab'
import { EventsTab } from '@/components/manager/EventsTab'
import { MenuTab } from '@/components/manager/MenuTab'
import { StaffTab } from '@/components/manager/StaffTab'
import { CRMTab } from '@/components/manager/CRMTab'
import { StatsTab } from '@/components/manager/StatsTab'
import { colors } from '@/styles/theme'
import type { Event, AnalyticsData, WaiterLeaderboard } from '@/types'

type ManagerTab = 'overview' | 'events' | 'menu' | 'staff' | 'crm' | 'stats'

export default function ManagerPage() {
  const { venue, loading: venueLoading } = useVenue()
  const { user, isAuthenticated, login, logout, loading: authLoading, error: authError } = useAuth('manager')
  const { log } = useLogger()

  const [activeTab, setActiveTab] = useState<ManagerTab>('overview')
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [leaderboard, setLeaderboard] = useState<WaiterLeaderboard[]>([])
  const [loading, setLoading] = useState(true)

  // Check if desktop
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load data
  useEffect(() => {
    if (venue && isAuthenticated) {
      loadData()
    }
  }, [venue, isAuthenticated])

  const loadData = async () => {
    if (!venue) return
    setLoading(true)

    try {
      const [eventsRes, analyticsRes, leaderboardRes] = await Promise.all([
        getEvents(venue.id),
        getAnalytics(venue.id, { period: 'month' }),
        getWaiterLeaderboard(venue.id, { period: 'month' }),
      ])

      if (eventsRes.data) {
        setEvents(eventsRes.data)
        if (eventsRes.data.length > 0) {
          setSelectedEvent(eventsRes.data[0])
        }
      }

      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data)
      }

      if (leaderboardRes.data) {
        setLeaderboard(leaderboardRes.data)
      }
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Loading
  if (venueLoading || authLoading) {
    return (
      <PageContainer title="Manager">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  // Desktop only warning
  if (!isDesktop && isAuthenticated) {
    return (
      <PageContainer title="Manager">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
        }}>
          <EmptyState
            icon="💻"
            title="Desktop Only"
            description="Manager dashboard-ul este disponibil doar pe desktop sau tabletă."
          />
        </div>
      </PageContainer>
    )
  }

  // Login
  if (!isAuthenticated) {
    return (
      <PageContainer title="Manager Login">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 300, 
            letterSpacing: '10px', 
            color: colors.champagne,
            marginBottom: '40px'
          }}>
            S I P
          </h1>
          <Card variant="elevated" padding="lg" style={{ width: '100%', maxWidth: '360px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 600, 
              color: colors.ivory,
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Manager Login
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: colors.textMuted,
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              {venue?.name}
            </p>
            <PinLogin onLogin={login} error={authError} />
          </Card>
        </div>
      </PageContainer>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Prezentare' },
    { id: 'events', label: 'Evenimente' },
    { id: 'menu', label: 'Meniu' },
    { id: 'staff', label: 'Staff' },
    { id: 'crm', label: 'CRM' },
    { id: 'stats', label: 'Statistici' },
  ]

  return (
    <PageContainer title="Manager Dashboard" maxWidth="full">
      <Header
        title="S I P"
        subtitle="Manager"
        user={{ name: 'Manager', role: 'manager' }}
        onLogout={logout}
        rightContent={
          selectedEvent ? (
            <select
              value={selectedEvent.id}
              onChange={(e) => {
                const event = events.find(ev => ev.id === e.target.value)
                setSelectedEvent(event || null)
              }}
              style={{
                padding: '8px 12px',
                background: colors.charcoal,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.ivory,
                fontSize: '13px',
              }}
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          ) : undefined
        }
      />

      <div style={{ padding: '20px' }}>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as ManagerTab)}
          variant="underline"
        />

        <div style={{ marginTop: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  venue={venue!}
                  event={selectedEvent}
                  analytics={analytics}
                  leaderboard={leaderboard}
                />
              )}
              {activeTab === 'events' && (
                <EventsTab
                  venueId={venue!.id}
                  events={events}
                  selectedEvent={selectedEvent}
                  onSelectEvent={setSelectedEvent}
                  onRefresh={loadData}
                />
              )}
              {activeTab === 'menu' && (
                <MenuTab venueId={venue!.id} eventId={selectedEvent?.id} />
              )}
              {activeTab === 'staff' && (
                <StaffTab venueId={venue!.id} eventId={selectedEvent?.id} />
              )}
              {activeTab === 'crm' && (
                <CRMTab venueId={venue!.id} />
              )}
              {activeTab === 'stats' && (
                <StatsTab venueId={venue!.id} eventId={selectedEvent?.id} />
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

// PIN Login for Manager
function PinLogin({ onLogin, error }: { onLogin: (creds: { phone: string; pin: string }) => Promise<boolean>; error?: string | null }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onLogin({ phone: '', pin })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="PIN Manager"
        type="password"
        placeholder="••••"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        maxLength={6}
        fullWidth
        error={error || undefined}
      />
      <Button 
        type="submit" 
        variant="primary" 
        fullWidth 
        loading={loading}
        disabled={!pin}
        style={{ marginTop: '16px' }}
      >
        Intră
      </Button>
    </form>
  )
}
