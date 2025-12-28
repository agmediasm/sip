import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, getTable, getCategories, getMenuItems, createOrder, createOrderItems, getOrCreateCustomer } from '../../lib/supabase'

// Icons
const Icons = {
  Wine: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg>,
  Martini: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/></svg>,
  Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>,
  Beer: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.4.5-3 .5s-2-.5-3-.5-1.7.5-2.5.5a2.5 2.5 0 0 1 0-5c.8 0 1.6.5 2.5.5S9.4 3 11 3s2 .5 3 .5 1.7-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.8 0-1.5-.5-2.5-.5Z"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/></svg>,
  Droplet: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  CreditCard: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
  Banknote: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m9 18 6-6-6-6"/></svg>,
  ShoppingBag: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
}

const categoryIcons = {
  cocktails: Icons.Martini,
  shots: Icons.Zap,
  champagne: Icons.Sparkles,
  bottles: Icons.Wine,
  beer: Icons.Beer,
  soft: Icons.Droplet,
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
  const [screen, setScreen] = useState('splash')
  const [tableInfo, setTableInfo] = useState(null)
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showSplitBill, setShowSplitBill] = useState(false)
  const [splitCount, setSplitCount] = useState(2)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderType, setOrderType] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [user, setUser] = useState(null)

  // Load data
  useEffect(() => {
    if (!tableQR) return

    async function loadData() {
      try {
        // Get table info
        const { data: table } = await getTable(tableQR)
        if (table) {
          setTableInfo(table)
        }

        // Get categories
        const { data: cats } = await getCategories()
        if (cats) {
          setCategories(cats)
          setSelectedCategory(cats[0]?.slug)
        }

        // Get menu items
        const { data: items } = await getMenuItems()
        if (items) {
          setMenuItems(items)
        }

        setLoading(false)
        
        // Show splash then welcome
        setTimeout(() => setScreen('welcome'), 2000)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [tableQR])

  // Cart functions
  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { ...item, qty: 1 }])
    }
  }

  const removeFromCart = (id) => {
    const existing = cart.find(c => c.id === id)
    if (existing && existing.qty > 1) {
      setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c))
    } else {
      setCart(cart.filter(c => c.id !== id))
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  // Place order
  const placeOrder = async (paymentType) => {
    try {
      // Create order
      const orderData = {
        venue_id: tableInfo?.venue_id || '11111111-1111-1111-1111-111111111111',
        table_id: tableInfo?.id,
        table_number: tableInfo?.table_number,
        payment_type: paymentType,
        subtotal: cartTotal,
        total: cartTotal,
        status: 'new',
      }

      const { data: order, error } = await createOrder(orderData)
      
      if (error) throw error

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.qty,
        subtotal: item.price * item.qty,
      }))

      await createOrderItems(orderItems)

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

  // Filter items by category
  const filteredItems = menuItems.filter(item => item.categories?.slug === selectedCategory)

  // Styles
  const styles = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: '300' },
    splash: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    splashLogo: { fontSize: '56px', fontWeight: '300', letterSpacing: '24px', color: colors.champagne },
    splashLine: { width: '80px', height: '1px', backgroundColor: colors.champagne, margin: '24px 0', opacity: 0.5 },
    splashTagline: { fontSize: '10px', letterSpacing: '6px', color: colors.platinum, textTransform: 'uppercase' },
    welcome: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' },
    welcomeVenue: { fontSize: '11px', letterSpacing: '4px', color: colors.textMuted, textTransform: 'uppercase', marginBottom: '32px' },
    welcomeTable: { fontSize: '48px', fontWeight: '300', letterSpacing: '4px', color: colors.champagne, marginBottom: '8px' },
    welcomeLabel: { fontSize: '13px', letterSpacing: '2px', color: colors.platinum, marginBottom: '48px' },
    welcomeBtn: { padding: '18px 48px', border: `1px solid ${colors.champagne}`, backgroundColor: 'transparent', color: colors.champagne, fontSize: '12px', fontWeight: '400', letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer' },
    header: { position: 'sticky', top: 0, zIndex: 40, backgroundColor: colors.noir, borderBottom: `1px solid ${colors.border}` },
    headerTop: { padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerLogo: { fontSize: '18px', fontWeight: '300', letterSpacing: '6px', color: colors.champagne },
    headerDivider: { width: '1px', height: '24px', backgroundColor: colors.border },
    headerTable: { fontSize: '13px', letterSpacing: '2px', color: colors.platinum },
    iconBtn: { position: 'relative', padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.platinum },
    categories: { padding: '0 16px 16px', overflowX: 'auto', display: 'flex', gap: '0' },
    categoryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: 'none', borderBottom: '1px solid transparent', backgroundColor: 'transparent', whiteSpace: 'nowrap', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' },
    menu: { padding: '16px', paddingBottom: '140px' },
    menuItem: { borderBottom: `1px solid ${colors.border}`, padding: '24px 0' },
    menuItemInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    menuItemName: { fontSize: '15px', fontWeight: '400', letterSpacing: '1px', color: colors.ivory, marginBottom: '6px' },
    menuItemDesc: { fontSize: '12px', color: colors.textMuted },
    menuItemPrice: { fontSize: '15px', fontWeight: '400', letterSpacing: '1px', color: colors.champagne, marginBottom: '12px', textAlign: 'right' },
    badge: { display: 'inline-block', padding: '4px 10px', fontSize: '8px', letterSpacing: '1.5px', textTransform: 'uppercase', border: '1px solid', marginLeft: '12px' },
    addBtn: { padding: '10px 20px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.platinum, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' },
    qtyControls: { display: 'flex', border: `1px solid ${colors.champagne}` },
    qtyBtn: { width: '36px', height: '36px', border: 'none', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.champagne },
    qtyNum: { width: '40px', textAlign: 'center', fontSize: '14px', color: colors.champagne, borderLeft: `1px solid ${colors.champagne}`, borderRight: `1px solid ${colors.champagne}`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    floatingCart: { position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 30 },
    floatingCartBtn: { width: '100%', backgroundColor: colors.champagne, color: colors.noir, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50 },
    cartModal: { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.onyx, maxHeight: '90vh', zIndex: 51, display: 'flex', flexDirection: 'column' },
    cartHeader: { padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cartTitle: { fontSize: '14px', fontWeight: '400', letterSpacing: '4px', textTransform: 'uppercase' },
    cartItems: { padding: '16px', overflowY: 'auto', flex: 1 },
    cartItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${colors.border}` },
    cartFooter: { padding: '16px', borderTop: `1px solid ${colors.border}` },
    splitBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.platinum, marginBottom: '20px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' },
    splitBox: { backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', padding: '20px', marginBottom: '20px' },
    totalRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    totalLabel: { fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: colors.textMuted },
    totalAmount: { fontSize: '28px', fontWeight: '300', letterSpacing: '2px', color: colors.champagne },
    payBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    payBtn: { padding: '20px', fontSize: '11px', fontWeight: '400', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
    centerModal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors.onyx, padding: '40px', width: 'calc(100% - 48px)', maxWidth: '360px', zIndex: 51, textAlign: 'center' },
  }

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.splash}>
          <div style={styles.splashLogo}>S I P</div>
          <div style={styles.splashLine} />
          <div style={styles.splashTagline}>Loading...</div>
        </div>
      </div>
    )
  }

  // Splash screen
  if (screen === 'splash') {
    return (
      <div style={styles.container}>
        <Head><title>S I P</title></Head>
        <div style={styles.splash}>
          <div style={styles.splashLogo}>S I P</div>
          <div style={styles.splashLine} />
          <div style={styles.splashTagline}>Elevate the Night</div>
        </div>
      </div>
    )
  }

  // Welcome screen
  if (screen === 'welcome') {
    return (
      <div style={styles.container}>
        <Head><title>S I P - {tableInfo?.table_number}</title></Head>
        <div style={styles.welcome}>
          <div style={styles.welcomeVenue}>{tableInfo?.venues?.name || 'NUBA'} · București</div>
          <div style={styles.welcomeTable}>{tableInfo?.table_number || 'VIP 1'}</div>
          <div style={styles.welcomeLabel}>Your table awaits</div>
          <button onClick={() => setScreen('menu')} style={styles.welcomeBtn}>
            View Menu
          </button>
        </div>
      </div>
    )
  }

  // Main menu screen
  return (
    <div style={styles.container}>
      <Head><title>S I P - Menu</title></Head>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.headerLeft}>
            <div style={styles.headerLogo}>S I P</div>
            <div style={styles.headerDivider} />
            <div style={styles.headerTable}>{tableInfo?.table_number}</div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            style={{ ...styles.iconBtn, backgroundColor: colors.champagne, borderColor: colors.champagne, color: colors.noir }}
          >
            <Icons.ShoppingBag />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px',
                backgroundColor: colors.noir, color: colors.champagne, fontSize: '10px',
                border: `1px solid ${colors.champagne}`, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Categories */}
        <div style={styles.categories}>
          {categories.map(cat => {
            const Icon = categoryIcons[cat.slug] || Icons.Wine
            const isActive = selectedCategory === cat.slug
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                style={{
                  ...styles.categoryBtn,
                  color: isActive ? colors.champagne : colors.textMuted,
                  borderBottomColor: isActive ? colors.champagne : 'transparent',
                }}
              >
                <Icon />
                {cat.name}
              </button>
            )
          })}
        </div>
      </header>

      {/* Menu */}
      <main style={styles.menu}>
        {filteredItems.map(item => {
          const cartItem = cart.find(c => c.id === item.id)
          return (
            <div key={item.id} style={styles.menuItem}>
              <div style={styles.menuItemInner}>
                <div>
                  <div style={styles.menuItemName}>
                    {item.name}
                    {item.is_popular && <span style={{ ...styles.badge, borderColor: colors.champagne, color: colors.champagne }}>Popular</span>}
                    {item.is_premium && <span style={{ ...styles.badge, borderColor: colors.platinum, color: colors.platinum }}>Premium</span>}
                  </div>
                  <div style={styles.menuItemDesc}>{item.description}</div>
                </div>
                <div>
                  <div style={styles.menuItemPrice}>{item.price} <span style={{ fontSize: '10px', color: colors.textMuted }}>LEI</span></div>
                  {cartItem ? (
                    <div style={styles.qtyControls}>
                      <button onClick={() => removeFromCart(item.id)} style={styles.qtyBtn}><Icons.Minus /></button>
                      <span style={styles.qtyNum}>{cartItem.qty}</span>
                      <button onClick={() => addToCart(item)} style={styles.qtyBtn}><Icons.Plus /></button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={styles.addBtn}>Select</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* Floating Cart */}
      {cartCount > 0 && !showCart && (
        <div style={styles.floatingCart}>
          <button onClick={() => setShowCart(true)} style={styles.floatingCartBtn}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Icons.ShoppingBag />
              <span style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                {cartCount} {cartCount === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px', letterSpacing: '1px' }}>{cartTotal} LEI</span>
              <Icons.ChevronRight />
            </div>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowCart(false)} />
          <div style={styles.cartModal}>
            <div style={styles.cartHeader}>
              <div>
                <h2 style={styles.cartTitle}>Your Selection</h2>
                <p style={{ fontSize: '11px', color: colors.textMuted, letterSpacing: '2px', marginTop: '4px' }}>{tableInfo?.table_number}</p>
              </div>
              <button onClick={() => setShowCart(false)} style={{ ...styles.iconBtn, color: colors.platinum }}><Icons.X /></button>
            </div>

            <div style={styles.cartItems}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textMuted }}>
                  <p style={{ letterSpacing: '2px', fontSize: '12px' }}>Your selection is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <div>
                      <p style={{ fontWeight: '400', letterSpacing: '1px', fontSize: '14px' }}>{item.name}</p>
                      <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>{item.price} LEI × {item.qty}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ color: colors.champagne, letterSpacing: '1px' }}>{item.price * item.qty} LEI</span>
                      <div style={{ display: 'flex', border: `1px solid ${colors.border}` }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ ...styles.qtyBtn, color: colors.platinum, width: '32px', height: '32px' }}><Icons.Minus /></button>
                        <button onClick={() => addToCart(item)} style={{ ...styles.qtyBtn, color: colors.platinum, width: '32px', height: '32px', borderLeft: `1px solid ${colors.border}` }}><Icons.Plus /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={styles.cartFooter}>
                <button onClick={() => setShowSplitBill(!showSplitBill)} style={styles.splitBtn}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icons.Users style={{ color: colors.champagne }} />
                    <span>Split Bill</span>
                  </div>
                  <Icons.ChevronRight style={{ transform: showSplitBill ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
                </button>

                {showSplitBill && (
                  <div style={styles.splitBox}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span style={{ color: colors.textMuted, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>Guests</span>
                      <div style={{ display: 'flex', border: `1px solid ${colors.champagne}` }}>
                        <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} style={{ ...styles.qtyBtn, width: '40px', height: '40px' }}><Icons.Minus /></button>
                        <span style={{ ...styles.qtyNum, width: '48px', fontSize: '16px' }}>{splitCount}</span>
                        <button onClick={() => setSplitCount(splitCount + 1)} style={{ ...styles.qtyBtn, width: '40px', height: '40px' }}><Icons.Plus /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(212,175,55,0.2)' }}>
                      <span style={{ color: colors.textMuted, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>Per Guest</span>
                      <span style={{ fontSize: '20px', color: colors.champagne, letterSpacing: '1px' }}>{Math.ceil(cartTotal / splitCount)} LEI</span>
                    </div>
                  </div>
                )}

                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Total</span>
                  <span style={styles.totalAmount}>{cartTotal} <span style={{ fontSize: '14px' }}>LEI</span></span>
                </div>

                <div style={styles.payBtns}>
                  <button onClick={() => placeOrder('cash')} style={{ ...styles.payBtn, backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}` }}>
                    <Icons.Banknote />
                    <span>Cash</span>
                    <span style={{ fontSize: '9px', opacity: 0.6, textTransform: 'none' }}>Staff will assist</span>
                  </button>
                  <button onClick={() => placeOrder('card')} style={{ ...styles.payBtn, backgroundColor: colors.champagne, color: colors.noir }}>
                    <Icons.CreditCard />
                    <span>Card</span>
                    <span style={{ fontSize: '9px', opacity: 0.6, textTransform: 'none' }}>Instant payment</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Order Success - Card */}
      {orderPlaced && orderType === 'card' && (
        <>
          <div style={styles.modalOverlay} />
          <div style={styles.centerModal}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>✓</div>
            <h3 style={{ fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>Payment Complete</h3>
            <p style={{ color: colors.textMuted, lineHeight: '1.7', fontSize: '13px' }}>
              Your order has been sent to the bar.<br />Your drinks will arrive shortly.
            </p>
          </div>
        </>
      )}

      {/* Order Success - Cash */}
      {orderPlaced && orderType === 'cash' && (
        <>
          <div style={styles.modalOverlay} />
          <div style={styles.centerModal}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>◇</div>
            <h3 style={{ fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>Staff Notified</h3>
            <p style={{ color: colors.textMuted, lineHeight: '1.7', fontSize: '13px' }}>
              Your order has been placed.<br />A member of our team will assist with payment.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
