import { useState, useEffect } from 'react'
import { Card, Spinner } from '@/components/ui'
import { Grid, Section } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { colors } from '@/styles/theme'

interface DashboardOverviewProps {
  venueId: string | null
}

interface Stats {
  totalVenues: number
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  ordersToday: number
  revenueToday: number
  activeEvents: number
  activeStaff: number
}

export function DashboardOverview({ venueId }: DashboardOverviewProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [venueId])

  const loadStats = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Build queries based on venue filter
      let venuesQuery = supabase.from('venues').select('id', { count: 'exact' })
      let ordersQuery = supabase.from('orders').select('total_amount', { count: 'exact' }).eq('payment_status', 'paid')
      let ordersTodayQuery = supabase.from('orders').select('total_amount', { count: 'exact' }).eq('payment_status', 'paid').gte('created_at', today)
      let customersQuery = supabase.from('customers').select('id', { count: 'exact' })
      let eventsQuery = supabase.from('events').select('id', { count: 'exact' }).eq('is_active', true)
      let staffQuery = supabase.from('waiters').select('id', { count: 'exact' }).eq('is_active', true)

      if (venueId) {
        ordersQuery = ordersQuery.eq('venue_id', venueId)
        ordersTodayQuery = ordersTodayQuery.eq('venue_id', venueId)
        customersQuery = customersQuery.eq('venue_id', venueId)
        eventsQuery = eventsQuery.eq('venue_id', venueId)
        staffQuery = staffQuery.eq('venue_id', venueId)
      }

      const [venuesRes, ordersRes, ordersTodayRes, customersRes, eventsRes, staffRes] = await Promise.all([
        venuesQuery,
        ordersQuery,
        ordersTodayQuery,
        customersQuery,
        eventsQuery,
        staffQuery,
      ])

      const totalRevenue = (ordersRes.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const revenueToday = (ordersTodayRes.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)

      setStats({
        totalVenues: venuesRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalRevenue,
        totalCustomers: customersRes.count || 0,
        ordersToday: ordersTodayRes.count || 0,
        revenueToday,
        activeEvents: eventsRes.count || 0,
        activeStaff: staffRes.count || 0,
      })
    } catch (err) {
      console.error('Load stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <Section title="📊 Statistici Generale">
        <Grid cols={4} gap="md">
          <StatCard
            label="Venue-uri"
            value={String(stats?.totalVenues || 0)}
            icon="🏢"
            color={colors.champagne}
          />
          <StatCard
            label="Comenzi totale"
            value={String(stats?.totalOrders || 0)}
            icon="📦"
            color={colors.success}
          />
          <StatCard
            label="Venituri totale"
            value={`${stats?.totalRevenue || 0} LEI`}
            icon="💰"
            color={colors.champagne}
          />
          <StatCard
            label="Clienți"
            value={String(stats?.totalCustomers || 0)}
            icon="👥"
            color={colors.normal}
          />
        </Grid>
      </Section>

      <Section title="📅 Astăzi">
        <Grid cols={4} gap="md">
          <StatCard
            label="Comenzi azi"
            value={String(stats?.ordersToday || 0)}
            icon="🛒"
            color={colors.warning}
          />
          <StatCard
            label="Venituri azi"
            value={`${stats?.revenueToday || 0} LEI`}
            icon="💵"
            color={colors.success}
          />
          <StatCard
            label="Evenimente active"
            value={String(stats?.activeEvents || 0)}
            icon="🎉"
            color={colors.vip}
          />
          <StatCard
            label="Staff activ"
            value={String(stats?.activeStaff || 0)}
            icon="👨‍🍳"
            color={colors.bar}
          />
        </Grid>
      </Section>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Card variant="default" padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '32px' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color }}>
            {value}
          </div>
        </div>
      </div>
    </Card>
  )
}
