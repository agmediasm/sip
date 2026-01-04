import { useState, useEffect } from 'react'
import { Card, Badge, Spinner, EmptyState, Button } from '@/components/ui'
import { Section, Grid } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { colors } from '@/styles/theme'
import type { ActiveSession } from '@/types'

interface ActiveSessionsProps {
  venueId: string | null
}

export function ActiveSessions({ venueId }: ActiveSessionsProps) {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
    const interval = setInterval(loadSessions, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [venueId])

  const loadSessions = async () => {
    try {
      let query = supabase
        .from('active_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (venueId) {
        query = query.eq('venue_id', venueId)
      }

      const { data } = await query
      if (data) setSessions(data)
    } catch (err) {
      console.error('Load sessions error:', err)
    } finally {
      setLoading(false)
    }
  }

  const userTypeIcons = {
    staff: '👨‍🍳',
    manager: '👔',
    admin: '🔐',
    guest: '👤',
  }

  const userTypeColors = {
    staff: colors.normal,
    manager: colors.champagne,
    admin: colors.error,
    guest: colors.textMuted,
  }

  // Group by user type
  const staffSessions = sessions.filter(s => s.user_type === 'staff')
  const managerSessions = sessions.filter(s => s.user_type === 'manager')
  const guestSessions = sessions.filter(s => s.user_type === 'guest')

  return (
    <div>
      <Section
        title={`👥 Sesiuni Active (${sessions.length})`}
        action={
          <Button variant="ghost" size="sm" onClick={loadSessions}>
            🔃 Refresh
          </Button>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Nicio sesiune activă"
            description="Nu există utilizatori conectați momentan"
          />
        ) : (
          <>
            {/* Stats */}
            <Grid cols={4} gap="md" style={{ marginBottom: '24px' }}>
              <StatCard
                label="Total online"
                value={String(sessions.length)}
                icon="🌐"
                color={colors.champagne}
              />
              <StatCard
                label="Staff"
                value={String(staffSessions.length)}
                icon="👨‍🍳"
                color={colors.normal}
              />
              <StatCard
                label="Manageri"
                value={String(managerSessions.length)}
                icon="👔"
                color={colors.champagne}
              />
              <StatCard
                label="Clienți"
                value={String(guestSessions.length)}
                icon="👤"
                color={colors.success}
              />
            </Grid>

            {/* Sessions list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sessions.map((session) => {
                const lastActivity = new Date(session.last_activity)
                const minutesAgo = Math.floor((Date.now() - lastActivity.getTime()) / 60000)
                const isRecent = minutesAgo < 5

                return (
                  <Card key={session.id} variant="default" padding="md">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>
                          {userTypeIcons[session.user_type]}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: colors.ivory, fontWeight: 500 }}>
                              {session.user_name || 'Anonim'}
                            </span>
                            <Badge 
                              variant={session.user_type === 'manager' ? 'vip' : session.user_type === 'staff' ? 'normal' : 'premium'}
                              size="sm"
                            >
                              {session.user_type.toUpperCase()}
                            </Badge>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.textMuted }}>
                            {session.device_info || 'Unknown device'}
                          </p>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          color: isRecent ? colors.success : colors.textMuted,
                          fontSize: '12px',
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isRecent ? colors.success : colors.warning,
                          }} />
                          {minutesAgo === 0 ? 'Acum' : `${minutesAgo}m în urmă`}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.textMuted }}>
                          Conectat: {new Date(session.started_at).toLocaleTimeString('ro-RO')}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </Section>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Card variant="default" padding="md">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color }}>
            {value}
          </div>
        </div>
      </div>
    </Card>
  )
}
