import { useState, useEffect } from 'react'
import { Card, Button, Spinner } from '@/components/ui'
import { Section, Grid } from '@/components/layout'
import { getAnalytics, getWaiterLeaderboard } from '@/lib/api'
import { colors, borderRadius } from '@/styles/theme'
import type { AnalyticsData, WaiterLeaderboard } from '@/types'

interface StatsTabProps {
  venueId: string
  eventId?: string
}

type Period = 'today' | 'week' | 'month' | 'all'

export function StatsTab({ venueId, eventId }: StatsTabProps) {
  const [period, setPeriod] = useState<Period>('month')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [leaderboard, setLeaderboard] = useState<WaiterLeaderboard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [venueId, eventId, period])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [analyticsRes, leaderboardRes] = await Promise.all([
        getAnalytics(venueId, { period, eventId }),
        getWaiterLeaderboard(venueId, { period, eventId }),
      ])

      if (analyticsRes.data) setAnalytics(analyticsRes.data)
      if (leaderboardRes.data) setLeaderboard(leaderboardRes.data)
    } catch (err) {
      console.error('Load stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const periods: { id: Period; label: string }[] = [
    { id: 'today', label: 'Azi' },
    { id: 'week', label: 'Săptămâna' },
    { id: 'month', label: 'Luna' },
    { id: 'all', label: 'Total' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {periods.map(p => (
          <Button
            key={p.id}
            variant={period === p.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Stats Grid */}
      <Grid cols={4} gap="md" style={{ marginBottom: '24px' }}>
        <StatCard
          label="Vânzări totale"
          value={`${analytics?.totalSales || 0} LEI`}
          color={colors.champagne}
        />
        <StatCard
          label="Comenzi"
          value={String(analytics?.totalOrders || 0)}
          color={colors.success}
        />
        <StatCard
          label="Medie/comandă"
          value={`${analytics?.avgOrderValue || 0} LEI`}
          color={colors.normal}
        />
        <StatCard
          label="Cash vs Card"
          value={`${Math.round(((analytics?.cashAmount || 0) / Math.max(analytics?.totalSales || 1, 1)) * 100)}% / ${Math.round(((analytics?.cardAmount || 0) / Math.max(analytics?.totalSales || 1, 1)) * 100)}%`}
          color={colors.bar}
        />
      </Grid>

      <Grid cols={2} gap="lg">
        {/* Top Products */}
        <Section title="🏆 Top Produse">
          <Card variant="default" padding="md">
            {analytics?.topProducts && analytics.topProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analytics.topProducts.map((product, idx) => (
                  <div key={product.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: idx < 3 ? colors.champagne : colors.slate,
                      color: idx < 3 ? colors.noir : colors.textMuted,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.ivory, fontWeight: 500 }}>{product.name}</div>
                      <div style={{ color: colors.textMuted, fontSize: '12px' }}>
                        {product.quantity} vândute
                      </div>
                    </div>
                    <span style={{ color: colors.champagne, fontWeight: 600 }}>
                      {product.revenue} LEI
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.textMuted, textAlign: 'center', padding: '20px' }}>
                Nicio vânzare în această perioadă
              </p>
            )}
          </Card>
        </Section>

        {/* Staff Leaderboard */}
        <Section title="👑 Performanță Staff">
          <Card variant="default" padding="md">
            {leaderboard.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaderboard.map((waiter, idx) => (
                  <div key={waiter.waiterId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: idx < 3 ? colors.champagne : colors.slate,
                      color: idx < 3 ? colors.noir : colors.textMuted,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.ivory, fontWeight: 500 }}>{waiter.waiterName}</div>
                      <div style={{ color: colors.textMuted, fontSize: '12px' }}>
                        {waiter.totalOrders} comenzi • {waiter.avgOrderValue} LEI/comandă
                      </div>
                    </div>
                    <span style={{ color: colors.champagne, fontWeight: 600, fontSize: '16px' }}>
                      {waiter.totalRevenue} LEI
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.textMuted, textAlign: 'center', padding: '20px' }}>
                Nicio activitate în această perioadă
              </p>
            )}
          </Card>
        </Section>
      </Grid>

      {/* Payment breakdown */}
      <Section title="💳 Metode de plată" padding="lg">
        <Grid cols={2} gap="md">
          <Card variant="default" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>💵</span>
              <div>
                <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Cash
                </div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: colors.success }}>
                  {analytics?.cashAmount || 0} LEI
                </div>
              </div>
            </div>
          </Card>
          <Card variant="default" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>💳</span>
              <div>
                <div style={{ fontSize: '12px', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Card
                </div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: colors.normal }}>
                  {analytics?.cardAmount || 0} LEI
                </div>
              </div>
            </div>
          </Card>
        </Grid>
      </Section>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card variant="default" padding="md">
      <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color, marginTop: '4px' }}>
        {value}
      </div>
    </Card>
  )
}
