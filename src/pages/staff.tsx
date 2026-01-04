import { useState, useEffect } from 'react'
import { useVenue } from '@/hooks/useVenue'
import { useAuth } from '@/hooks/useAuth'
import { useOrders } from '@/hooks/useOrders'
import { useTables } from '@/hooks/useTables'
import { useSound } from '@/hooks/useSound'
import { useRealtime } from '@/hooks/useRealtime'
import { useLogger } from '@/hooks/useLogger'
import { getEvents } from '@/lib/api'
import { PageContainer, Header, Section } from '@/components/layout'
import { Button, Spinner, EmptyState, Tabs } from '@/components/ui'
import { LoginForm } from '@/components/auth/LoginForm'
import { OrderList } from '@/components/orders/OrderList'
import { TableGrid } from '@/components/tables/TableGrid'
import { SplitPaymentModal } from '@/components/orders/SplitPaymentModal'
import { colors } from '@/styles/theme'
import type { Event, Order, OrderStatus } from '@/types'

export default function StaffPage() {
  // Auth & Venue
  const { venue, loading: venueLoading } = useVenue()
  const { user: waiter, isAuthenticated, login, logout, loading: authLoading, error: authError } = useAuth('staff')
  const { log } = useLogger()
  const { playNotification } = useSound()

  // Data state
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'history'>('orders')
  const [newOrderAlert, setNewOrderAlert] = useState(false)

  // Modals
  const [splitPaymentOrder, setSplitPaymentOrder] = useState<Order | null>(null)

  // Get tables and orders
  const { tables, assignments, getMyTables } = useTables(selectedEvent?.id)
  const myTables = waiter ? getMyTables(waiter.id) : []
  const myTableIds = myTables.map(t => t.id)

  const { 
    orders, 
    loading: ordersLoading, 
    updateStatus,
    markPaid,
    markPartialPaid 
  } = useOrders({
    eventId: selectedEvent?.id,
    tableIds: myTableIds.length > 0 ? myTableIds : undefined,
    statuses: ['new', 'preparing', 'ready'],
    realtime: true,
  })

  // Load events on venue ready
  useEffect(() => {
    if (venue) {
      loadEvents()
    }
  }, [venue])

  // Realtime for new orders alert
  useRealtime(
    {
      table: 'orders',
      filter: selectedEvent ? `event_id=eq.${selectedEvent.id}` : undefined,
      event: 'INSERT',
      enabled: !!selectedEvent && !!waiter,
    },
    (payload) => {
      const newRecord = payload.new as Record<string, unknown> | undefined
      if (newRecord && typeof newRecord.event_table_id === 'string' && myTableIds.includes(newRecord.event_table_id)) {
        setNewOrderAlert(true)
        playNotification()
        setTimeout(() => setNewOrderAlert(false), 3000)
        log('info', 'order', 'New order received', { orderId: newRecord.id })
      }
    }
  )

  const loadEvents = async () => {
    if (!venue) return
    const { data } = await getEvents(venue.id)
    if (data?.length) {
      setEvents(data)
      setSelectedEvent(data[0])
    }
  }

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const success = await updateStatus(orderId, status)
    if (success) {
      log('info', 'order', `Order ${orderId} status changed to ${status}`)
    }
  }

  const handleMarkPaid = async (orderId: string, paymentType: 'cash' | 'card') => {
    const success = await markPaid(orderId, paymentType)
    if (success) {
      log('info', 'payment', `Order ${orderId} paid via ${paymentType}`)
    }
  }

  const handleSplitPayment = (order: Order) => {
    setSplitPaymentOrder(order)
  }

  // Loading states
  if (venueLoading || authLoading) {
    return (
      <PageContainer title="Staff">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <PageContainer title="Staff Login">
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
          <LoginForm 
            onLogin={login}
            error={authError}
            title="Staff Login"
            subtitle={venue?.name}
          />
        </div>
      </PageContainer>
    )
  }

  // Filter orders by status
  const newOrders = orders.filter(o => o.status === 'new')
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')

  const tabs = [
    { id: 'orders', label: 'Comenzi', count: orders.length },
    { id: 'tables', label: 'Mesele mele', count: myTables.length },
    { id: 'history', label: 'Istoric' },
  ]

  return (
    <PageContainer title="Staff Dashboard">
      {/* New order alert */}
      {newOrderAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px',
          background: colors.success,
          color: '#fff',
          textAlign: 'center',
          fontWeight: 600,
          zIndex: 1000,
          animation: 'pulse 0.5s ease-in-out',
        }}>
          🔔 COMANDĂ NOUĂ!
        </div>
      )}

      <Header
        title="S I P"
        subtitle={selectedEvent?.name || 'Staff'}
        user={{ name: waiter?.name || '', role: 'staff' }}
        onLogout={logout}
        rightContent={
          events.length > 1 ? (
            <select
              value={selectedEvent?.id || ''}
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
          onChange={(tab) => setActiveTab(tab as typeof activeTab)}
        />

        <div style={{ marginTop: '24px' }}>
          {activeTab === 'orders' && (
            <>
              {ordersLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <Spinner />
                </div>
              ) : orders.length === 0 ? (
                <EmptyState
                  icon="📭"
                  title="Nicio comandă activă"
                  description="Comenzile noi vor apărea aici"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* New Orders */}
                  {newOrders.length > 0 && (
                    <Section title={`🆕 Comenzi noi (${newOrders.length})`}>
                      <OrderList
                        orders={newOrders}
                        onStatusChange={handleStatusChange}
                        onMarkPaid={handleMarkPaid}
                        onSplitPayment={handleSplitPayment}
                        showActions
                      />
                    </Section>
                  )}

                  {/* Preparing */}
                  {preparingOrders.length > 0 && (
                    <Section title={`🔄 În preparare (${preparingOrders.length})`}>
                      <OrderList
                        orders={preparingOrders}
                        onStatusChange={handleStatusChange}
                        onMarkPaid={handleMarkPaid}
                        onSplitPayment={handleSplitPayment}
                        showActions
                      />
                    </Section>
                  )}

                  {/* Ready */}
                  {readyOrders.length > 0 && (
                    <Section title={`✅ Gata de livrare (${readyOrders.length})`}>
                      <OrderList
                        orders={readyOrders}
                        onStatusChange={handleStatusChange}
                        onMarkPaid={handleMarkPaid}
                        onSplitPayment={handleSplitPayment}
                        showActions
                      />
                    </Section>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'tables' && (
            <TableGrid
              tables={myTables}
              assignments={assignments}
              onTableClick={(table) => {
                // TODO: Show table details/history
                log('info', 'system', 'Table clicked', { tableId: table.id })
              }}
            />
          )}

          {activeTab === 'history' && (
            <EmptyState
              icon="📋"
              title="Istoric comenzi"
              description="Selectează o masă pentru a vedea istoricul"
            />
          )}
        </div>
      </div>

      {/* Split Payment Modal */}
      {splitPaymentOrder && (
        <SplitPaymentModal
          order={splitPaymentOrder}
          onClose={() => setSplitPaymentOrder(null)}
          onConfirm={async (itemIds, quantities, paymentType) => {
            await markPartialPaid(splitPaymentOrder.id, itemIds, quantities, paymentType)
            setSplitPaymentOrder(null)
          }}
        />
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  )
}
