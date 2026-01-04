import { useState, useEffect } from 'react'
import { Card, Button, Badge, Input, EmptyState, Spinner } from '@/components/ui'
import { Section, Grid } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { colors } from '@/styles/theme'
import type { Customer } from '@/types'

interface CRMTabProps {
  venueId: string
}

export function CRMTab({ venueId }: CRMTabProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'vip'>('all')

  useEffect(() => {
    loadCustomers()
  }, [venueId])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('venue_id', venueId)
        .order('total_spent', { ascending: false })

      if (data) {
        setCustomers(data)
      }
    } catch (err) {
      console.error('Load customers error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleVip = async (customerId: string, isVip: boolean) => {
    try {
      await supabase
        .from('customers')
        .update({ is_vip: !isVip })
        .eq('id', customerId)
      loadCustomers()
    } catch (err) {
      console.error('Toggle VIP error:', err)
    }
  }

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    const matchesFilter = filter === 'all' || (filter === 'vip' && c.is_vip)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const vipCount = customers.filter(c => c.is_vip).length
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0)

  return (
    <div>
      {/* Stats */}
      <Grid cols={4} gap="md" style={{ marginBottom: '24px' }}>
        <Card variant="default" padding="md">
          <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Total clienți
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: colors.champagne }}>
            {customers.length}
          </div>
        </Card>
        <Card variant="default" padding="md">
          <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Clienți VIP
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: colors.vip }}>
            {vipCount}
          </div>
        </Card>
        <Card variant="default" padding="md">
          <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Total cheltuit
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: colors.success }}>
            {totalSpent} LEI
          </div>
        </Card>
        <Card variant="default" padding="md">
          <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
            Medie/client
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: colors.normal }}>
            {customers.length > 0 ? Math.round(totalSpent / customers.length) : 0} LEI
          </div>
        </Card>
      </Grid>

      <Section title="Clienți">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <Input
            placeholder="Caută după nume sau telefon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toți
          </Button>
          <Button
            variant={filter === 'vip' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('vip')}
          >
            VIP
          </Button>
        </div>

        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Niciun client"
            description={search ? 'Niciun rezultat pentru căutare' : 'Clienții vor apărea aici după prima comandă'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredCustomers.map(customer => (
              <Card key={customer.id} variant="default" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: colors.ivory }}>
                          {customer.name}
                        </span>
                        {customer.is_vip && (
                          <Badge variant="vip">VIP</Badge>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
                        📞 {customer.phone}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Comenzi</div>
                      <div style={{ fontWeight: 600, color: colors.ivory }}>{customer.total_orders}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Total</div>
                      <div style={{ fontWeight: 600, color: colors.champagne }}>{customer.total_spent} LEI</div>
                    </div>
                    <Button
                      variant={customer.is_vip ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => toggleVip(customer.id, customer.is_vip)}
                    >
                      {customer.is_vip ? '★ VIP' : '☆ Adaugă VIP'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
