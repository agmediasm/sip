import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { PageContainer } from '@/components/layout'
import { Button, Card, Badge, Modal, Spinner, EmptyState, QuantitySelector } from '@/components/ui'
import { useCart } from '@/hooks/useCart'
import { useLogger } from '@/hooks/useLogger'
import { resolveTableForOrder, getCategories, getEventMenu, createOrder } from '@/lib/api'
import { colors, borderRadius } from '@/styles/theme'
import type { Venue, Event, EventTable, MenuItem, Category } from '@/types'

type PageStatus = 'loading' | 'ok' | 'upcoming' | 'ended' | 'no_event' | 'table_not_found' | 'venue_not_found' | 'error'

interface MenuItemWithPrice extends MenuItem {
  custom_price?: number
}

export default function GuestMenuPage() {
  const router = useRouter()
  const { venue: venueSlug, table: tableNumber } = router.query as { venue: string; table: string }
  const { log } = useLogger()

  // Data state
  const [status, setStatus] = useState<PageStatus>('loading')
  const [venue, setVenue] = useState<Venue | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [table, setTable] = useState<EventTable | null>(null)
  const [message, setMessage] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemWithPrice[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Cart
  const { items: cartItems, totalItems, totalAmount, addItem, removeItem, updateQuantity, clearCart } = useCart(table?.id)
  const [showCart, setShowCart] = useState(false)

  // Order
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderError, setOrderError] = useState('')

  // Load data
  useEffect(() => {
    if (venueSlug && tableNumber) {
      loadData()
    }
  }, [venueSlug, tableNumber])

  const loadData = async () => {
    setStatus('loading')
    
    try {
      const result = await resolveTableForOrder(venueSlug, tableNumber)
      
      setVenue((result.venue as unknown as Venue) || null)
      setEvent((result.event as unknown as Event) || null)
      setTable((result.table as unknown as EventTable) || null)
      setMessage(result.message || '')
      setStatus(result.status)

      if (result.status === 'ok' && result.venue && result.event) {
        const venueData = result.venue as unknown as Venue
        const eventData = result.event as unknown as Event
        const tableData = result.table as unknown as EventTable
        
        // Load menu
        const [catsRes, menuRes] = await Promise.all([
          getCategories(venueData.id),
          getEventMenu(eventData.id),
        ])

        if (catsRes.data) {
          setCategories(catsRes.data)
          if (catsRes.data.length > 0) {
            setSelectedCategory(catsRes.data[0].id)
          }
        }

        if (menuRes.data) {
          const items = menuRes.data
            .map(em => ({
              ...em.menu_items!,
              custom_price: em.custom_price,
            }))
            .filter(Boolean) as MenuItemWithPrice[]
          setMenuItems(items)
        }

        log('info', 'menu', 'Guest opened menu', { 
          venue: venueData.slug, 
          table: tableData?.table_number 
        })
      }
    } catch (err) {
      setStatus('error')
      setMessage('Eroare la încărcare')
      console.error('Load error:', err)
    }
  }

  const handlePlaceOrder = async () => {
    if (!venue || !event || !table || cartItems.length === 0) return

    setIsSubmitting(true)
    setOrderError('')

    try {
      const result = await createOrder({
        venueId: venue.id,
        eventId: event.id,
        eventTableId: table.id,
        items: cartItems.map(item => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: (item.menuItem as MenuItemWithPrice).custom_price || item.menuItem.default_price,
        })),
      })

      if (result.status === 'success') {
        setOrderPlaced(true)
        clearCart()
        setShowCart(false)
        log('info', 'order', 'Guest placed order', { 
          orderId: result.data?.id,
          total: totalAmount 
        })
      } else {
        setOrderError(result.error || 'Nu s-a putut plasa comanda')
      }
    } catch (err) {
      setOrderError('Eroare la plasare comandă')
      console.error('Order error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading
  if (status === 'loading') {
    return (
      <PageContainer title="Meniu">
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

  // Error states
  if (status !== 'ok') {
    return (
      <PageContainer title="SIP">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 300, 
            letterSpacing: '8px', 
            color: colors.champagne,
            marginBottom: '24px'
          }}>
            S I P
          </h1>
          <EmptyState
            icon={status === 'upcoming' ? '⏰' : status === 'no_event' ? '📅' : '❌'}
            title={
              status === 'upcoming' ? 'Eveniment în curând' :
              status === 'no_event' ? 'Niciun eveniment activ' :
              status === 'table_not_found' ? 'Masă negăsită' :
              status === 'venue_not_found' ? 'Locație negăsită' :
              'Eroare'
            }
            description={message}
          />
        </div>
      </PageContainer>
    )
  }

  // Filter menu by category
  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems

  return (
    <PageContainer title={`${table?.table_number} | ${venue?.name}`}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: colors.noir,
        borderBottom: `1px solid ${colors.border}`,
        padding: '12px 16px',
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: 300, 
              letterSpacing: '6px', 
              color: colors.champagne 
            }}>
              S I P
            </span>
            <span style={{ color: colors.border }}>|</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.ivory }}>
                {table?.table_number}
              </div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>
                {event?.name}
              </div>
            </div>
          </div>

          {/* Cart button */}
          <button
            onClick={() => setShowCart(true)}
            style={{
              position: 'relative',
              padding: '10px',
              background: totalItems > 0 ? colors.champagne : 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '18px' }}>🛒</span>
            {totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: colors.error,
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Categories */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginTop: '12px',
          paddingBottom: '4px',
        }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px',
                background: selectedCategory === cat.id ? colors.champagne : 'transparent',
                border: `1px solid ${selectedCategory === cat.id ? colors.champagne : colors.border}`,
                borderRadius: borderRadius.sm,
                color: selectedCategory === cat.id ? colors.noir : colors.textMuted,
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {cat.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div style={{ padding: '16px' }}>
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Niciun produs"
            description="Nu sunt produse în această categorie"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={cartItems.find(ci => ci.menuItem.id === item.id)?.quantity || 0}
                onAdd={() => addItem(item)}
                onRemove={() => {
                  const cartItem = cartItems.find(ci => ci.menuItem.id === item.id)
                  if (cartItem && cartItem.quantity > 1) {
                    updateQuantity(item.id, cartItem.quantity - 1)
                  } else {
                    removeItem(item.id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order placed success */}
      {orderPlaced && (
        <Modal isOpen onClose={() => setOrderPlaced(false)} title="Comandă plasată!" size="sm">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ fontSize: '64px' }}>✅</span>
            <p style={{ color: colors.textSecondary, marginTop: '16px' }}>
              Comanda ta a fost trimisă. Staff-ul va ajunge în curând!
            </p>
            <Button variant="primary" onClick={() => setOrderPlaced(false)} style={{ marginTop: '24px' }}>
              OK
            </Button>
          </div>
        </Modal>
      )}

      {/* Cart Modal */}
      <Modal isOpen={showCart} onClose={() => setShowCart(false)} title="Coșul tău" size="md">
        {cartItems.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Coșul e gol"
            description="Adaugă produse din meniu"
          />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {cartItems.map(item => (
                <div key={item.menuItem.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: colors.charcoal,
                  borderRadius: borderRadius.md,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: colors.ivory, fontWeight: 500 }}>
                      {item.menuItem.name}
                    </div>
                    <div style={{ color: colors.champagne, fontSize: '14px' }}>
                      {((item.menuItem as MenuItemWithPrice).custom_price || item.menuItem.default_price) * item.quantity} LEI
                    </div>
                  </div>
                  <QuantitySelector
                    value={item.quantity}
                    onChange={(qty) => qty > 0 ? updateQuantity(item.menuItem.id, qty) : removeItem(item.menuItem.id)}
                    min={0}
                    size="sm"
                  />
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              background: colors.onyx,
              borderRadius: borderRadius.md,
              marginBottom: '20px',
            }}>
              <span style={{ color: colors.textSecondary, fontSize: '16px' }}>Total</span>
              <span style={{ fontSize: '28px', fontWeight: 600, color: colors.champagne }}>
                {totalAmount} LEI
              </span>
            </div>

            {orderError && (
              <div style={{
                padding: '12px',
                background: `${colors.error}20`,
                border: `1px solid ${colors.error}`,
                borderRadius: borderRadius.sm,
                color: colors.error,
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                {orderError}
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              loading={isSubmitting}
              onClick={handlePlaceOrder}
            >
              Plasează comanda
            </Button>
          </>
        )}
      </Modal>
    </PageContainer>
  )
}

// Menu Item Card Component
function MenuItemCard({ 
  item, 
  quantity, 
  onAdd, 
  onRemove 
}: { 
  item: MenuItemWithPrice
  quantity: number
  onAdd: () => void
  onRemove: () => void
}) {
  const price = item.custom_price || item.default_price

  return (
    <Card variant="default" padding="md">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: colors.ivory, fontWeight: 500, fontSize: '15px' }}>
              {item.name}
            </span>
            {item.badge && (
              <Badge variant={item.badge as 'popular' | 'premium' | 'new' | 'recommended'} size="sm">
                {item.badge.toUpperCase()}
              </Badge>
            )}
          </div>
          {item.description && (
            <p style={{ 
              color: colors.textMuted, 
              fontSize: '12px', 
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.description}
            </p>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-end',
          gap: '8px',
        }}>
          <span style={{ color: colors.champagne, fontWeight: 600, fontSize: '16px' }}>
            {price} LEI
          </span>
          
          {quantity > 0 ? (
            <QuantitySelector
              value={quantity}
              onChange={(qty) => qty > quantity ? onAdd() : onRemove()}
              min={0}
              size="sm"
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={onAdd}>
              + Adaugă
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
