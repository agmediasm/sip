import { Card, Badge } from '@/components/ui'
import { Section, Grid } from '@/components/layout'
import { colors, borderRadius } from '@/styles/theme'
import type { Venue, Event, AnalyticsData, WaiterLeaderboard } from '@/types'

interface OverviewTabProps {
  venue: Venue
  event: Event | null
  analytics: AnalyticsData | null
  leaderboard: WaiterLeaderboard[]
}

export function OverviewTab({ venue, event, analytics, leaderboard }: OverviewTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats Cards */}
      <Grid cols={4} gap="md">
        <StatCard
          label="Vânzări totale"
          value={`${analytics?.totalSales || 0} LEI`}
          icon="💰"
          color={colors.champagne}
        />
        <StatCard
          label="Comenzi"
          value={String(analytics?.totalOrders || 0)}
          icon="📦"
          color={colors.success}
        />
        <StatCard
          label="Medie/comandă"
          value={`${analytics?.avgOrderValue || 0} LEI`}
          icon="📊"
          color={colors.normal}
        />
        <StatCard
          label="Cash / Card"
          value={`${analytics?.cashAmount || 0} / ${analytics?.cardAmount || 0}`}
          icon="💳"
          color={colors.bar}
        />
      </Grid>

      <Grid cols={2} gap="lg">
        {/* Top Products */}
        <Section title="🏆 Top Produse">
          <Card variant="default" padding="md">
            {analytics?.topProducts && analytics.topProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analytics.topProducts.slice(0, 5).map((product, idx) => (
                  <div key={product.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: idx < 3 ? colors.champagne : colors.slate,
                      color: idx < 3 ? colors.noir : colors.textMuted,
                      borderRadius: '6px',
                      fontSize: '12px',
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
                Nicio vânzare
              </p>
            )}
          </Card>
        </Section>

        {/* Leaderboard */}
        <Section title="👑 Top Staff">
          <Card variant="default" padding="md">
            {leaderboard.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaderboard.slice(0, 5).map((waiter, idx) => (
                  <div key={waiter.waiterId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: idx < 3 ? colors.champagne : colors.slate,
                      color: idx < 3 ? colors.noir : colors.textMuted,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.ivory, fontWeight: 500 }}>{waiter.waiterName}</div>
                      <div style={{ color: colors.textMuted, fontSize: '12px' }}>
                        {waiter.totalOrders} comenzi
                      </div>
                    </div>
                    <span style={{ color: colors.champagne, fontWeight: 600 }}>
                      {waiter.totalRevenue} LEI
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.textMuted, textAlign: 'center', padding: '20px' }}>
                Niciun staff activ
              </p>
            )}
          </Card>
        </Section>
      </Grid>

      {/* Event Info */}
      {event && (
        <Section title="📅 Eveniment curent">
          <Card variant="glow" padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: colors.ivory, fontSize: '20px' }}>
                  {event.name}
                </h3>
                <p style={{ margin: '8px 0 0', color: colors.textMuted }}>
                  {event.event_date} • {event.start_time}
                  {event.end_time && ` - ${event.end_time}`}
                </p>
              </div>
              <Badge variant={event.is_active ? 'success' : 'error'}>
                {event.is_active ? 'ACTIV' : 'INACTIV'}
              </Badge>
            </div>
          </Card>
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Card variant="default" padding="md">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
