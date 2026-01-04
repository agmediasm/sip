import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

interface MenuItem {
  id: string
  name: string
  description?: string
  default_price: number
  badge?: string
  is_available?: boolean
  product_type?: string
  categories?: { slug: string }
}

interface Category {
  id: string
  name: string
  slug: string
}

interface CartItem extends MenuItem {
  price: number
  qty: number
}

interface EventMenu {
  menu_item_id: string
  custom_price?: number
}

interface Order {
  id: string
  created_at: string
  total: number
  status: string
  payment_type: string
  payment_status: string
  order_items?: { quantity: number; name: string; subtotal: number }[]
}

const colors = {
  noir: '#08080a',
  onyx: '#1a1a1c',
  champagne: '#d4af37',
  platinum: '#e5e4e2',
  ivory: '#fffff0',
  border: 'rgba(255,255,255,0.15)',
  textMuted: 'rgba(255,255,255,0.65)',
}

export default function OrderPage() {
  const router = useRouter()
  const { eventId, tableId } = router.query

  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<'splash' | 'welcome' | 'menu'>('splash')
  const [event, setEvent] = useState<any>(null)
  const [table, setTable] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [eventMenu, setEventMenu] = useState<EventMenu[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [orderHistory, setOrderHistory] = useState<Order[]>([])
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [paymentType, setPaymentType] = useState<string | null>(null)

  useEffect(() => {
    if (eventId && tableId) loadData()
  }, [eventId, tableId])

  const loadData = async () => {
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('*, venues(name)')
        .eq('id', eventId)
        .single()
      setEvent(eventData)

      const { data: tableData } = await supabase
        .from('event_tables')
        .select('*')
        .eq('id', tableId)
        .single()
      setTable(tableData)

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('venue_id', eventData?.venue_id)
        .order('sort_order')
      
      if (cats) {
        const uniqueCats = cats.filter((cat, index, self) => 
          index === self.findIndex(c => c.slug === cat.slug)
        )
        setCategories(uniqueCats)
        setSelectedCat(uniqueCats[0]?.slug)
      }

      const { data: items } = await supabase
        .from('menu_items')
        .select('*, categories(slug)')
        .eq('venue_id', eventData?.venue_id)
        .eq('is_available', true)
      if (items) setMenuItems(items)

      const { data: em } = await supabase
        .from('event_menu')
        .select('*')
        .eq('event_id', eventId)
      if (em) setEventMenu(em)

      await loadHistory()
      setLoading(false)
      setTimeout(() => setScreen('welcome'), 2000)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('event_table_id', tableId)
      .order('created_at', { ascending: false })
    if (data) setOrderHistory(data)
  }

  const getPrice = (item: MenuItem) => {
    const em = eventMenu.find(m => m.menu_item_id === item.id)
    return em?.custom_price ?? item.default_price
  }

  const addToCart = (item: MenuItem) => {
    const price = getPrice(item)
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { ...item, price, qty: 1 }])
    }
  }

  const removeFromCart = (id: string) => {
    const existing = cart.find(c => c.id === id)
    if (existing && existing.qty > 1) {
      setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c))
    } else {
      setCart(cart.filter(c => c.id !== id))
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const placeOrder = async (pType: string) => {
    try {
      const orderData = {
        venue_id: event?.venue_id,
        event_id: eventId,
        event_table_id: tableId,
        table_number: table?.table_number,
        payment_type: pType,
        subtotal: cartTotal,
        total: cartTotal,
        status: 'new',
      }

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()
      
      if (error) throw error

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.qty,
        subtotal: item.price * item.qty,
      }))

      await supabase.from('order_items').insert(orderItems)

      setPaymentType(pType)
      setOrderPlaced(true)
      setShowCart(false)
      
      setTimeout(() => {
        setOrderPlaced(false)
        setPaymentType(null)
        setCart([])
        loadHistory()
      }, 4000)
    } catch (error) {
      console.error('Order error:', error)
      alert('Eroare la plasarea comenzii')
    }
  }

  const filteredItems = menuItems.filter(item => item.categories?.slug === selectedCat)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.noir, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '48px', fontWeight: 300, letterSpacing: '20px', color: colors.champagne }}>S I P</div>
        <div style={{ marginTop: '16px', fontSize: '11px', color: colors.textMuted, letterSpacing: '4px' }}>LOADING...</div>
      </div>
    )
  }

  if (screen === 'splash') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.noir, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '48px', fontWeight: 300, letterSpacing: '20px', color: colors.champagne }}>S I P</div>
        <div style={{ width: '60px', height: '1px', backgroundColor: colors.champagne, margin: '20px 0', opacity: 0.5 }} />
        <div style={{ fontSize: '10px', letterSpacing: '4px', color: colors.platinum }}>ELEVATE THE NIGHT</div>
      </div>
    )
  }

  if (screen === 'welcome') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.noir, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <Head><title>S I P - {table?.table_number}</title></Head>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: colors.textMuted, marginBottom: '32px' }}>{event?.venues?.name || 'S I P'}</div>
        <div style={{ fontSize: '40px', fontWeight: 300, letterSpacing: '4px', color: colors.champagne, marginBottom: '8px' }}>{table?.table_number}</div>
        <div style={{ fontSize: '13px', letterSpacing: '2px', color: colors.platinum, marginBottom: '48px' }}>Your table awaits</div>
        <button 
          onClick={() => setScreen('menu')} 
          style={{ padding: '18px 48px', border: `1px solid ${colors.champagne}`, backgroundColor: 'transparent', color: colors.champagne, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          View Menu
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 300 }}>
      <Head><title>S I P - Menu</title></Head>

      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: colors.noir, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 300, letterSpacing: '6px', color: colors.champagne }}>S I P</span>
            <span style={{ width: '1px', height: '20px', backgroundColor: colors.border }} />
            <span style={{ fontSize: '12px', letterSpacing: '2px', color: colors.platinum }}>{table?.table_number}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { loadHistory(); setShowHistory(true) }} style={{ padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.platinum, fontSize: '14px', cursor: 'pointer' }}>📋</button>
            <button onClick={() => setShowCart(true)} style={{ position: 'relative', padding: '12px', border: `1px solid ${colors.champagne}`, backgroundColor: colors.champagne, color: colors.noir, cursor: 'pointer' }}>
              🛒 {cartCount > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', backgroundColor: colors.noir, color: colors.champagne, border: `1px solid ${colors.champagne}`, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>}
            </button>
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', overflowX: 'auto', display: 'flex', gap: 0 }}>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCat(cat.slug)} 
              style={{ padding: '12px 20px', border: 'none', borderBottom: selectedCat === cat.slug ? `2px solid ${colors.champagne}` : '2px solid transparent', backgroundColor: 'transparent', color: selectedCat === cat.slug ? colors.champagne : colors.textMuted, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: '16px', paddingBottom: '140px' }}>
        {filteredItems.map(item => {
          const price = getPrice(item)
          const inCart = cart.find(c => c.id === item.id)
          return (
            <div key={item.id} style={{ borderBottom: `1px solid ${colors.border}`, padding: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 400, letterSpacing: '1px', marginBottom: '4px' }}>
                    {item.name}
                    {item.badge && (
                      <span style={{ 
                        fontSize: '8px', 
                        padding: '2px 6px', 
                        border: `1px solid ${item.badge === 'popular' ? '#ef4444' : item.badge === 'premium' ? colors.champagne : '#22c55e'}`, 
                        color: item.badge === 'popular' ? '#ef4444' : item.badge === 'premium' ? colors.champagne : '#22c55e', 
                        marginLeft: '8px', 
                        textTransform: 'uppercase' 
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>{item.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', color: colors.champagne, marginBottom: '8px' }}>{price} <span style={{ fontSize: '10px', color: colors.textMuted }}>LEI</span></div>
                  {inCart ? (
                    <div style={{ display: 'flex', border: `1px solid ${colors.champagne}` }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: '32px', height: '32px', border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer' }}>-</button>
                      <span style={{ width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.champagne, borderLeft: `1px solid ${colors.champagne}`, borderRight: `1px solid ${colors.champagne}` }}>{inCart.qty}</span>
                      <button onClick={() => addToCart(item)} style={{ width: '32px', height: '32px', border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer' }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.platinum, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Select</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {cartCount > 0 && !showCart && (
        <div style={{ position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 30 }}>
          <button onClick={() => setShowCart(true)} style={{ width: '100%', padding: '18px 20px', backgroundColor: colors.champagne, color: colors.noir, border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: '12px', letterSpacing: '2px' }}>{cartCount} ITEMS</span>
            <span style={{ fontSize: '16px', fontWeight: 400 }}>{cartTotal} LEI →</span>
          </button>
        </div>
      )}

      {showCart && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 }} onClick={() => setShowCart(false)} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.onyx, maxHeight: '90vh', zIndex: 51, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '14px', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>Your Selection</h2>
                <p style={{ fontSize: '11px', color: colors.textMuted, margin: '4px 0 0' }}>{table?.table_number}</p>
              </div>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', color: colors.platinum, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <div>
                    <div style={{ fontWeight: 400, marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: colors.textMuted }}>{item.price} × {item.qty}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: colors.champagne }}>{item.price * item.qty} LEI</span>
                    <div style={{ display: 'flex', border: `1px solid ${colors.border}` }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: '28px', height: '28px', border: 'none', backgroundColor: 'transparent', color: colors.platinum, cursor: 'pointer' }}>-</button>
                      <button onClick={() => addToCart(item)} style={{ width: '28px', height: '28px', border: 'none', backgroundColor: 'transparent', color: colors.platinum, borderLeft: `1px solid ${colors.border}`, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', letterSpacing: '2px', color: colors.textMuted }}>TOTAL</span>
                <span style={{ fontSize: '28px', fontWeight: 300, color: colors.champagne }}>{cartTotal} <span style={{ fontSize: '14px' }}>LEI</span></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => placeOrder('cash')} style={{ padding: '18px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.platinum, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
                  <span>💵</span><span>Cash</span>
                </button>
                <button onClick={() => placeOrder('card')} style={{ padding: '18px', backgroundColor: colors.champagne, color: colors.noir, border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
                  <span>💳</span><span>Card</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {orderPlaced && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors.onyx, padding: '40px', width: 'calc(100% - 48px)', maxWidth: '360px', zIndex: 51, textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
            <h3 style={{ fontSize: '14px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>{paymentType === 'card' ? 'Order Confirmed' : 'Staff Notified'}</h3>
            <p style={{ color: colors.textMuted, fontSize: '13px', lineHeight: 1.7 }}>{paymentType === 'card' ? 'A member of our team will arrive with the POS terminal.' : 'Your order is placed. Staff will arrive to collect payment.'}</p>
          </div>
        </>
      )}

      {showHistory && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 }} onClick={() => setShowHistory(false)} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.onyx, maxHeight: '90vh', zIndex: 51, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '14px', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>Order History</h2>
                <p style={{ fontSize: '11px', color: colors.textMuted, margin: '4px 0 0' }}>{table?.table_number}</p>
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: colors.platinum, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {orderHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: colors.textMuted }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                  <p>No orders yet</p>
                </div>
              ) : (
                orderHistory.map(order => (
                  <div key={order.id} style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: colors.textMuted }}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        backgroundColor: order.payment_status === 'paid' ? 'rgba(34,197,94,0.2)' : order.status === 'new' ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.2)', 
                        color: order.payment_status === 'paid' ? '#22c55e' : order.status === 'new' ? '#ef4444' : colors.champagne, 
                        borderRadius: '4px' 
                      }}>
                        {order.payment_status === 'paid' ? '✓ Paid' : order.status === 'new' ? 'Pending' : order.status === 'preparing' ? 'Preparing' : 'Ready'}
                      </span>
                    </div>
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
                        <span>{item.quantity}× {item.name}</span>
                        <span style={{ color: colors.textMuted }}>{item.subtotal} LEI</span>
                      </div>
                    ))}
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: colors.textMuted }}>{order.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}</span>
                      <span style={{ fontWeight: 500, color: colors.champagne }}>{order.total} LEI</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
