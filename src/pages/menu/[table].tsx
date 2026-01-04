import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  is_popular?: boolean
  is_premium?: boolean
  categories?: { slug: string }
}

interface Category {
  id: string
  name: string
  slug: string
}

interface CartItem extends MenuItem {
  qty: number
}

interface TableInfo {
  id: string
  table_number: string
  venue_id: string
  venues?: { name: string }
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

export default function MenuPage() {
  const router = useRouter()
  const { table: tableQR } = router.query

  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<'splash' | 'welcome' | 'menu'>('splash')
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderType, setOrderType] = useState<string | null>(null)

  useEffect(() => {
    if (!tableQR) return
    loadData()
  }, [tableQR])

  const loadData = async () => {
    try {
      const { data: table } = await supabase
        .from('event_tables')
        .select('*, venues(name)')
        .eq('qr_code', tableQR)
        .single()
      
      if (table) setTableInfo(table)

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')
      
      if (cats) {
        setCategories(cats)
        setSelectedCategory(cats[0]?.slug)
      }

      const { data: items } = await supabase
        .from('menu_items')
        .select('*, categories(slug)')
        .eq('is_available', true)
      
      if (items) setMenuItems(items)

      setLoading(false)
      setTimeout(() => setScreen('welcome'), 2000)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { ...item, qty: 1 }])
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

  const placeOrder = async (paymentType: string) => {
    try {
      const orderData = {
        venue_id: tableInfo?.venue_id,
        table_id: tableInfo?.id,
        table_number: tableInfo?.table_number,
        payment_type: paymentType,
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

      setOrderType(paymentType)
      setOrderPlaced(true)
      setShowCart(false)

      setTimeout(() => {
        setOrderPlaced(false)
        setOrderType(null)
        setCart([])
      }, 4000)
    } catch (error) {
      console.error('Error placing order:', error)
      alert('A apărut o eroare. Te rugăm să încerci din nou.')
    }
  }

  const filteredItems = menuItems.filter(item => item.categories?.slug === selectedCategory)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.noir, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '48px', fontWeight: 300, letterSpacing: '20px', color: colors.champagne }}>S I P</div>
      </div>
    )
  }

  if (screen === 'splash') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.noir, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Head><title>S I P</title></Head>
        <div style={{ fontSize: '56px', fontWeight: 300, letterSpacing: '24px', color: colors.champagne }}>S I P</div>
        <div style={{ width: '80px', height: '1px', backgroundColor: colors.champagne, margin: '24px 0', opacity: 0.5 }} />
        <div style={{ fontSize: '10px', letterSpacing: '6px', color: colors.platinum, textTransform: 'uppercase' }}>Elevate the Night</div>
      </div>
    )
  }

  if (screen === 'welcome') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.noir, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <Head><title>S I P - {tableInfo?.table_number}</title></Head>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '32px' }}>{tableInfo?.venues?.name || 'S I P'}</div>
        <div style={{ fontSize: '48px', fontWeight: 300, letterSpacing: '4px', color: colors.champagne, marginBottom: '8px' }}>{tableInfo?.table_number || 'VIP 1'}</div>
        <div style={{ fontSize: '13px', letterSpacing: '2px', color: colors.platinum, marginBottom: '48px' }}>Your table awaits</div>
        <button onClick={() => setScreen('menu')} style={{ padding: '18px 48px', border: `1px solid ${colors.champagne}`, backgroundColor: 'transparent', color: colors.champagne, fontSize: '12px', fontWeight: 400, letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer' }}>
          View Menu
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 300 }}>
      <Head><title>S I P - Menu</title></Head>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: colors.noir, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 300, letterSpacing: '6px', color: colors.champagne }}>S I P</div>
            <div style={{ width: '1px', height: '24px', backgroundColor: colors.border }} />
            <div style={{ fontSize: '13px', letterSpacing: '2px', color: colors.platinum }}>{tableInfo?.table_number}</div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            style={{ position: 'relative', padding: '12px', border: `1px solid ${colors.champagne}`, backgroundColor: colors.champagne, color: colors.noir, cursor: 'pointer' }}
          >
            🛒
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', backgroundColor: colors.noir, color: colors.champagne, fontSize: '10px', border: `1px solid ${colors.champagne}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Categories */}
        <div style={{ padding: '0 16px 16px', overflowX: 'auto', display: 'flex', gap: 0 }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderBottom: selectedCategory === cat.slug ? `2px solid ${colors.champagne}` : '2px solid transparent',
                backgroundColor: 'transparent',
                color: selectedCategory === cat.slug ? colors.champagne : colors.textMuted,
                fontSize: '11px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu */}
      <main style={{ padding: '16px', paddingBottom: '140px' }}>
        {filteredItems.map(item => {
          const cartItem = cart.find(c => c.id === item.id)
          return (
            <div key={item.id} style={{ borderBottom: `1px solid ${colors.border}`, padding: '24px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 400, letterSpacing: '1px', marginBottom: '6px' }}>
                    {item.name}
                    {item.is_popular && <span style={{ fontSize: '8px', padding: '4px 10px', border: `1px solid ${colors.champagne}`, color: colors.champagne, marginLeft: '12px', textTransform: 'uppercase' }}>Popular</span>}
                    {item.is_premium && <span style={{ fontSize: '8px', padding: '4px 10px', border: `1px solid ${colors.platinum}`, color: colors.platinum, marginLeft: '12px', textTransform: 'uppercase' }}>Premium</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>{item.description}</div>
                </div>
                <div>
                  <div style={{ fontSize: '15px', color: colors.champagne, marginBottom: '12px', textAlign: 'right' }}>{item.price} <span style={{ fontSize: '10px', color: colors.textMuted }}>LEI</span></div>
                  {cartItem ? (
                    <div style={{ display: 'flex', border: `1px solid ${colors.champagne}` }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: '36px', height: '36px', border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer' }}>-</button>
                      <span style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.champagne, borderLeft: `1px solid ${colors.champagne}`, borderRight: `1px solid ${colors.champagne}` }}>{cartItem.qty}</span>
                      <button onClick={() => addToCart(item)} style={{ width: '36px', height: '36px', border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer' }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={{ padding: '10px 20px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.platinum, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Select</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* Floating Cart */}
      {cartCount > 0 && !showCart && (
        <div style={{ position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 30 }}>
          <button onClick={() => setShowCart(true)} style={{ width: '100%', backgroundColor: colors.champagne, color: colors.noir, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>{cartCount} Items</span>
            <span style={{ fontSize: '18px', letterSpacing: '1px' }}>{cartTotal} LEI →</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 }} onClick={() => setShowCart(false)} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.onyx, maxHeight: '90vh', zIndex: 51, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase', margin: 0 }}>Your Selection</h2>
                <p style={{ fontSize: '11px', color: colors.textMuted, margin: '4px 0 0' }}>{tableInfo?.table_number}</p>
              </div>
              <button onClick={() => setShowCart(false)} style={{ padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.platinum, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textMuted }}>
                  <p style={{ letterSpacing: '2px', fontSize: '12px' }}>Your selection is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${colors.border}` }}>
                    <div>
                      <p style={{ fontWeight: 400, letterSpacing: '1px', fontSize: '14px', margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: '12px', color: colors.textMuted, margin: '4px 0 0' }}>{item.price} LEI × {item.qty}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ color: colors.champagne, letterSpacing: '1px' }}>{item.price * item.qty} LEI</span>
                      <div style={{ display: 'flex', border: `1px solid ${colors.border}` }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ width: '32px', height: '32px', border: 'none', backgroundColor: 'transparent', color: colors.platinum, cursor: 'pointer' }}>-</button>
                        <button onClick={() => addToCart(item)} style={{ width: '32px', height: '32px', border: 'none', backgroundColor: 'transparent', color: colors.platinum, borderLeft: `1px solid ${colors.border}`, cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: colors.textMuted }}>Total</span>
                  <span style={{ fontSize: '28px', fontWeight: 300, letterSpacing: '2px', color: colors.champagne }}>{cartTotal} <span style={{ fontSize: '14px' }}>LEI</span></span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <button onClick={() => placeOrder('cash')} style={{ padding: '20px', backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}`, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span>💵</span>
                    <span>Cash</span>
                  </button>
                  <button onClick={() => placeOrder('card')} style={{ padding: '20px', backgroundColor: colors.champagne, color: colors.noir, border: 'none', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span>💳</span>
                    <span>Card</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Order Success */}
      {orderPlaced && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors.onyx, padding: '40px', width: 'calc(100% - 48px)', maxWidth: '360px', zIndex: 51, textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>✓</div>
            <h3 style={{ fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>
              {orderType === 'card' ? 'Payment Complete' : 'Staff Notified'}
            </h3>
            <p style={{ color: colors.textMuted, lineHeight: 1.7, fontSize: '13px' }}>
              {orderType === 'card' 
                ? 'Your order has been sent to the bar. Your drinks will arrive shortly.'
                : 'Your order has been placed. A member of our team will assist with payment.'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
