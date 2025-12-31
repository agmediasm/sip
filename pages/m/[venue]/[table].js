import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, resolveTableForOrder, getCategories, getEventMenu, createOrder, createOrderItems, getTableOrders } from '../../../lib/supabase'

const colors = {
  noir: '#08080a', onyx: '#1a1a1c', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0',
  border: 'rgba(255,255,255,0.15)', textMuted: 'rgba(255,255,255,0.65)', success: '#22c55e', error: '#ef4444', warning: '#f59e0b'
}

const CART_STORAGE_KEY = 'sip_cart'
const PENDING_ORDERS_KEY = 'sip_pending_orders'

export default function SmartMenuPage() {
  const router = useRouter()
  const { venue: venueSlug, table: tableNumber } = router.query

  // Core state
  const [status, setStatus] = useState('loading') // loading, ok, upcoming, ended, no_event, table_not_found, venue_not_found, error
  const [venue, setVenue] = useState(null)
  const [event, setEvent] = useState(null)
  const [table, setTable] = useState(null)
  const [message, setMessage] = useState('')
  const [minutesUntilStart, setMinutesUntilStart] = useState(0)
  const [isTestMode, setIsTestMode] = useState(false)

  // Menu state
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [eventMenu, setEventMenu] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  
  // Cart state with persistence
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  
  // Order state
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [paymentType, setPaymentType] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastOrderTime, setLastOrderTime] = useState(0)
  const [rateLimitError, setRateLimitError] = useState('')
  const ORDER_COOLDOWN = 30000 // 30 seconds between orders
  const [assignedWaiter, setAssignedWaiter] = useState(null)
  
  // History
  const [showHistory, setShowHistory] = useState(false)
  const [orderHistory, setOrderHistory] = useState([])
  
  // Offline handling
  const [isOnline, setIsOnline] = useState(true)
  const [pendingOrders, setPendingOrders] = useState([])

  // Screen state for animations
  const [screen, setScreen] = useState('loading')

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        try { setCart(JSON.parse(savedCart)) } catch(e) {}
      }
      const savedPending = localStorage.getItem(PENDING_ORDERS_KEY)
      if (savedPending) {
        try { setPendingOrders(JSON.parse(savedPending)) } catch(e) {}
      }
      setIsOnline(navigator.onLine)
    }
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && cart.length > 0) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    }
  }, [cart])

  // Online/offline handlers
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      // Send pending orders
      for (const order of pendingOrders) {
        await submitOrderToServer(order)
      }
      setPendingOrders([])
      localStorage.removeItem(PENDING_ORDERS_KEY)
    }
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [pendingOrders])

  // Main data loading
  useEffect(() => {
    if (venueSlug && tableNumber) {
      loadData()
    }
  }, [venueSlug, tableNumber])

  const loadData = async () => {
    setScreen('loading')
    setStatus('loading')
    
    try {
      const result = await resolveTableForOrder(venueSlug, tableNumber)
      
      setVenue(result.venue || null)
      setEvent(result.event || null)
      setTable(result.table || null)
      setMessage(result.message || '')
      setIsTestMode(result.isTestMode || false)
      
      if (result.status === 'upcoming') {
        setMinutesUntilStart(result.minutesUntilStart || 0)
      }
      
      setStatus(result.status)
      
      // If OK, load menu data
      if (result.status === 'ok' && result.venue && result.event) {
        await loadMenuData(result.venue.id, result.event.id, result.table?.id)
        setScreen('welcome')
      } else {
        setScreen(result.status)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setStatus('error')
      setMessage('A apărut o eroare. Reîncearcă.')
      setScreen('error')
    }
  }

  const loadMenuData = async (venueId, eventId, tableId) => {
    const [catsRes, emRes] = await Promise.all([
      getCategories(venueId),
      getEventMenu(eventId)
    ])
    
    if (catsRes.data) {
      const uniqueCats = catsRes.data.filter((cat, idx, self) => 
        idx === self.findIndex(c => c.slug === cat.slug)
      )
      setCategories(uniqueCats)
      setSelectedCat(uniqueCats[0]?.slug)
    }
    
    if (emRes.data) {
      setEventMenu(emRes.data)
      // Extract menu items from event menu
      const items = emRes.data
        .filter(em => em.menu_items && em.is_available !== false)
        .map(em => ({
          ...em.menu_items,
          custom_price: em.custom_price,
          is_featured: em.is_featured
        }))
      setMenuItems(items)
    }
    
    // Get assigned waiter
    if (tableId) {
      const { data: assignment } = await supabase
        .from('table_assignments')
        .select('waiter_id')
        .eq('event_table_id', tableId)
        .eq('event_id', eventId)
        .single()
      if (assignment?.waiter_id) setAssignedWaiter(assignment.waiter_id)
    }
    
    // Load order history
    if (tableId) {
      const { data: history } = await getTableOrders(tableId)
      if (history) setOrderHistory(history)
    }
  }

  const getPrice = (item) => {
    return item.custom_price ?? item.default_price ?? 0
  }

  const addToCart = (item) => {
    const price = getPrice(item)
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { ...item, price, qty: 1 }])
    }
  }

  const removeFromCart = (id) => {
    const existing = cart.find(c => c.id === id)
    if (existing?.qty > 1) {
      setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c))
    } else {
      setCart(cart.filter(c => c.id !== id))
    }
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const submitOrderToServer = async (orderData) => {
    const { data: order, error } = await createOrder(orderData.order)
    if (error) throw error
    await createOrderItems(orderData.items.map(i => ({ ...i, order_id: order.id })))
    return order
  }

  const placeOrder = async (pType) => {
    if (isSubmitting) return
    
    // Rate limiting check
    const now = Date.now()
    const timeSinceLastOrder = now - lastOrderTime
    if (timeSinceLastOrder < ORDER_COOLDOWN) {
      const secondsRemaining = Math.ceil((ORDER_COOLDOWN - timeSinceLastOrder) / 1000)
      setRateLimitError(`Așteaptă ${secondsRemaining}s înainte de o nouă comandă`)
      setTimeout(() => setRateLimitError(''), 3000)
      return
    }
    
    setIsSubmitting(true)
    setRateLimitError('')
    
    try {
      const orderData = {
        order: {
          venue_id: venue?.id,
          event_id: event?.id,
          event_table_id: table?.id,
          table_number: table?.table_number,
          payment_type: pType,
          waiter_id: assignedWaiter,
          subtotal: cartTotal,
          total: cartTotal,
          status: 'new'
        },
        items: cart.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.qty,
          subtotal: item.price * item.qty
        }))
      }
      
      if (!isOnline) {
        // Save locally
        const newPending = [...pendingOrders, orderData]
        setPendingOrders(newPending)
        localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(newPending))
        setPaymentType(pType)
        setOrderPlaced(true)
        setShowCart(false)
        setLastOrderTime(Date.now())
        setTimeout(() => { setOrderPlaced(false); clearCart() }, 4000)
      } else {
        await submitOrderToServer(orderData)
        setPaymentType(pType)
        setOrderPlaced(true)
        setShowCart(false)
        setLastOrderTime(Date.now())
        setTimeout(() => { setOrderPlaced(false); setPaymentType(null); clearCart() }, 4000)
      }
    } catch (error) {
      console.error('Order error:', error)
      alert('Eroare la plasarea comenzii. Reîncearcă.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredItems = menuItems.filter(item => {
    const catSlug = item.categories?.slug || item.category?.slug
    return catSlug === selectedCat
  })

  // Countdown timer for upcoming events
  useEffect(() => {
    if (status !== 'upcoming' || minutesUntilStart <= 0) return
    const interval = setInterval(() => {
      setMinutesUntilStart(prev => Math.max(0, prev - 1))
    }, 60000)
    return () => clearInterval(interval)
  }, [status, minutesUntilStart])

  const formatCountdown = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m} minute`
  }

  // Styles
  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: '300' },
    centered: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' },
    logo: { fontSize: 48, fontWeight: 300, letterSpacing: 20, color: colors.champagne, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 400, marginBottom: 12, color: colors.ivory },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 1.6 },
    badge: { display: 'inline-block', padding: '8px 16px', backgroundColor: `${colors.champagne}20`, border: `1px solid ${colors.champagne}`, color: colors.champagne, fontSize: 12, letterSpacing: 2, marginBottom: 24 },
    btn: { padding: '16px 32px', border: 'none', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4 },
    btnPrimary: { backgroundColor: colors.champagne, color: colors.noir },
    btnOutline: { backgroundColor: 'transparent', border: `1px solid ${colors.champagne}`, color: colors.champagne },
    header: { position: 'sticky', top: 0, zIndex: 40, backgroundColor: colors.noir, borderBottom: `1px solid ${colors.border}` },
    headerTop: { padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    categories: { padding: '0 16px 16px', overflowX: 'auto', display: 'flex', gap: 0, WebkitOverflowScrolling: 'touch' },
    catBtn: { padding: '12px 20px', border: 'none', borderBottom: '2px solid transparent', backgroundColor: 'transparent', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' },
    menu: { padding: 16, paddingBottom: 140 },
    menuItem: { borderBottom: `1px solid ${colors.border}`, padding: '20px 0' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'flex-end' },
    cartModal: { backgroundColor: colors.onyx, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    successModal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 },
    offlineBanner: { position: 'fixed', top: 0, left: 0, right: 0, padding: '8px 16px', backgroundColor: colors.warning, color: colors.noir, fontSize: 12, textAlign: 'center', zIndex: 100, fontWeight: 500 },
    testBanner: { position: 'fixed', top: 0, left: 0, right: 0, padding: '8px 16px', backgroundColor: colors.champagne, color: colors.noir, fontSize: 11, textAlign: 'center', zIndex: 100, letterSpacing: 2 }
  }

  // ============ RENDER SCREENS ============

  // Loading
  if (screen === 'loading') {
    return (
      <div style={{ ...s.container, position: 'relative', overflow: 'hidden' }}>
        {/* Animated background gradient */}
        <div className="loading-bg" style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(212, 175, 55, 0.08) 0%, transparent 50%)'
        }} />
        
        <div style={{ ...s.centered, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          {/* Rotating loader ring */}
          <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
            <div className="loader-ring" style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: colors.champagne,
              borderRightColor: 'rgba(212, 175, 55, 0.3)'
            }} />
            <div className="loader-ring-2" style={{
              position: 'absolute',
              inset: 10,
              borderRadius: '50%',
              border: '1px solid transparent',
              borderBottomColor: 'rgba(212, 175, 55, 0.5)',
              borderLeftColor: 'rgba(212, 175, 55, 0.2)'
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 300,
              letterSpacing: 8,
              color: colors.champagne,
              paddingLeft: 8
            }}>S I P</div>
          </div>
          
          {/* Loading dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="dot dot-1" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.champagne }} />
            <div className="dot dot-2" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.champagne }} />
            <div className="dot dot-3" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.champagne }} />
          </div>
          
          <div className="loading-text" style={{ marginTop: 24, fontSize: 10, color: colors.textMuted, letterSpacing: 4 }}>SE ÎNCARCĂ</div>
        </div>
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes spinReverse {
            to { transform: rotate(-360deg); }
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes pulse-bg {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
          }
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .loader-ring {
            animation: spin 1.5s linear infinite;
          }
          .loader-ring-2 {
            animation: spinReverse 2s linear infinite;
          }
          .dot { animation: bounce 1.4s ease-in-out infinite; }
          .dot-1 { animation-delay: 0s; }
          .dot-2 { animation-delay: 0.2s; }
          .dot-3 { animation-delay: 0.4s; }
          .loading-bg { animation: pulse-bg 3s ease-in-out infinite; }
          .loading-text { animation: fadeInOut 2s ease-in-out infinite; }
        `}</style>
      </div>
    )
  }

  // Venue not found
  if (status === 'venue_not_found') {
    return (
      <div style={s.container}>
        <Head><title>S I P - Locație negăsită</title></Head>
        <div style={s.centered}>
          <div style={s.logo}>S I P</div>
          <div style={s.title}>Locație negăsită</div>
          <div style={s.subtitle}>Codul QR nu este valid sau locația nu există.</div>
        </div>
      </div>
    )
  }

  // No event
  if (status === 'no_event') {
    return (
      <div style={s.container}>
        <Head><title>S I P - {venue?.name || 'Menu'}</title></Head>
        <div style={s.centered}>
          <div style={s.logo}>S I P</div>
          {venue && <div style={s.badge}>{venue.name}</div>}
          <div style={s.title}>Niciun eveniment activ</div>
          <div style={s.subtitle}>Revino când începe petrecerea! 🎉</div>
        </div>
      </div>
    )
  }

  // Upcoming event
  if (status === 'upcoming') {
    return (
      <div style={s.container}>
        <Head><title>S I P - {event?.name || 'Coming Soon'}</title></Head>
        <div style={s.centered}>
          <div style={s.logo}>S I P</div>
          {venue && <div style={{ fontSize: 11, letterSpacing: 4, color: colors.textMuted, marginBottom: 24 }}>{venue.name}</div>}
          <div style={s.badge}>{event?.name}</div>
          <div style={s.title}>Începe în:</div>
          <div style={{ fontSize: 48, fontWeight: 300, color: colors.champagne, marginBottom: 24 }}>
            {formatCountdown(minutesUntilStart)}
          </div>
          <div style={s.subtitle}>
            Ora start: {event?.start_time || '22:00'}<br/>
            Scanează din nou când începe evenimentul
          </div>
        </div>
      </div>
    )
  }

  // Table not found
  if (status === 'table_not_found') {
    return (
      <div style={s.container}>
        <Head><title>S I P - {event?.name || 'Menu'}</title></Head>
        <div style={s.centered}>
          <div style={s.logo}>S I P</div>
          {event && <div style={s.badge}>{event.name}</div>}
          <div style={s.title}>Masa {tableNumber} nu este disponibilă</div>
          <div style={s.subtitle}>Verifică numărul mesei sau cheamă un ospătar pentru asistență.</div>
          <button style={{ ...s.btn, ...s.btnOutline, marginTop: 16 }}>🙋 Cheamă ospătar</button>
        </div>
      </div>
    )
  }

  // Welcome screen
  if (screen === 'welcome') {
    return (
      <div style={{
        ...s.container,
        background: 'linear-gradient(180deg, #05050a 0%, #08080a 50%, #05050a 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Head><title>S I P - {table?.table_number}</title></Head>
        
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`particle particle-${i}`} style={{
            position: 'absolute',
            width: i % 2 === 0 ? 3 : 2,
            height: i % 2 === 0 ? 3 : 2,
            borderRadius: '50%',
            backgroundColor: `rgba(212, 175, 55, ${0.2 + (i % 3) * 0.1})`,
            pointerEvents: 'none'
          }} />
        ))}
        
        {/* Subtle top line accent */}
        <div className="line-animate" style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.6) 50%, transparent 100%)'
        }} />
        
        <div style={{ ...s.centered, position: 'relative', zIndex: 1 }}>
          {/* Event name - elegant, refined */}
          <div className="fade-in-down" style={{ 
            fontSize: 14, 
            fontWeight: 400, 
            letterSpacing: 6, 
            color: 'rgba(212, 175, 55, 0.8)', 
            marginBottom: 48, 
            textTransform: 'uppercase'
          }}>{event?.name || 'S I P'}</div>
          
          {/* Thin decorative line */}
          <div className="line-expand" style={{ 
            width: 40, 
            height: 1, 
            background: 'rgba(212, 175, 55, 0.3)', 
            marginBottom: 48 
          }} />
          
          {/* Table number container with rings */}
          <div style={{ position: 'relative', marginBottom: 32 }}>
            {/* Subtle glow behind */}
            <div className="glow-ring" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
              filter: 'blur(25px)',
              pointerEvents: 'none'
            }} />
            
            {/* Single elegant rotating ring */}
            <div className="rotating-ring" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              border: '1px solid transparent',
              borderTopColor: 'rgba(212, 175, 55, 0.25)',
              pointerEvents: 'none'
            }} />
            
            {/* Table number - refined size */}
            <div className="scale-in" style={{ 
              fontSize: 48, 
              fontWeight: 300, 
              letterSpacing: 6, 
              color: colors.ivory,
              position: 'relative',
              zIndex: 2,
              padding: '45px 55px'
            }}>{table?.table_number}</div>
          </div>
          
          {/* Elegant subtitle */}
          <div className="fade-in-up" style={{ 
            fontSize: 10, 
            fontWeight: 300,
            letterSpacing: 8, 
            color: 'rgba(255, 255, 255, 0.4)', 
            marginBottom: 56,
            textTransform: 'uppercase'
          }}>Your table awaits</div>
          
          {/* Minimal elegant button */}
          <button 
            className="btn-glow"
            onClick={() => setScreen('menu')} 
            style={{ 
              padding: '16px 48px', 
              background: 'transparent',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              color: 'rgba(212, 175, 55, 0.9)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: 5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.4s ease'
            }}
          >
            View Menu
          </button>
        </div>
        
        {/* Bottom decorative element */}
        <div className="fade-in-slow" style={{
          position: 'absolute',
          bottom: 48,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4))' }} />
          <div style={{ fontSize: 10, letterSpacing: 4, color: 'rgba(212, 175, 55, 0.4)' }}>S I P</div>
          <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.4), transparent)' }} />
        </div>
        
        {/* CSS Animations - subtle and elegant */}
        <style jsx>{`
          @keyframes rotate {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); opacity: 0.15; }
            50% { transform: translateY(-20px); opacity: 0.4; }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.08); }
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes lineExpand {
            from { width: 0; opacity: 0; }
            to { width: 40px; opacity: 1; }
          }
          .glow-ring {
            animation: pulse-glow 4s ease-in-out infinite;
          }
          .rotating-ring {
            animation: rotate 25s linear infinite;
          }
          .particle-0 { top: 20%; left: 12%; animation: float 8s ease-in-out infinite; }
          .particle-1 { top: 25%; left: 88%; animation: float 9s ease-in-out infinite; animation-delay: 2s; }
          .particle-2 { top: 75%; left: 8%; animation: float 7s ease-in-out infinite; animation-delay: 4s; }
          .particle-3 { top: 80%; left: 92%; animation: float 10s ease-in-out infinite; animation-delay: 1s; }
          .particle-4 { top: 12%; left: 55%; animation: float 8s ease-in-out infinite; animation-delay: 5s; }
          .particle-5 { top: 88%; left: 45%; animation: float 7s ease-in-out infinite; animation-delay: 3s; }
          .particle-6 { top: 50%; left: 4%; animation: float 9s ease-in-out infinite; animation-delay: 6s; }
          .particle-7 { top: 50%; left: 96%; animation: float 8s ease-in-out infinite; animation-delay: 7s; }
          .fade-in-down { animation: fadeInDown 1.2s ease-out forwards; }
          .fade-in-up { animation: fadeInUp 1.2s ease-out forwards; animation-delay: 0.6s; opacity: 0; }
          .scale-in { animation: scaleIn 1s ease-out forwards; animation-delay: 0.3s; opacity: 0; }
          .fade-in-slow { animation: fadeIn 2s ease-out forwards; animation-delay: 1.2s; opacity: 0; }
          .line-expand { animation: lineExpand 1s ease-out forwards; animation-delay: 0.5s; }
          .btn-glow {
            animation: fadeIn 1s ease-out forwards;
            animation-delay: 1s;
            opacity: 0;
          }
          .btn-glow:hover {
            background: rgba(212, 175, 55, 0.08);
            border-color: rgba(212, 175, 55, 0.6);
          }
          .line-animate {
            animation: fadeIn 2s ease-out forwards;
          }
        `}</style>
      </div>
    )
  }

  // Error
  if (status === 'error') {
    return (
      <div style={s.container}>
        <Head><title>S I P - Eroare</title></Head>
        <div style={s.centered}>
          <div style={s.logo}>S I P</div>
          <div style={s.title}>Oops!</div>
          <div style={s.subtitle}>{message || 'A apărut o eroare. Reîncearcă.'}</div>
          <button onClick={() => router.reload()} style={{ ...s.btn, ...s.btnPrimary }}>Reîncearcă</button>
        </div>
      </div>
    )
  }

  // ============ MAIN MENU SCREEN ============
  return (
    <div style={s.container}>
      <Head><title>S I P - {table?.table_number}</title></Head>
      
      {/* Offline banner */}
      {!isOnline && (
        <div style={s.offlineBanner}>📶 Conexiune slabă - comenzile se salvează local</div>
      )}
      
      {/* Test mode banner */}
      {isTestMode && (
        <div style={{ ...s.testBanner, top: !isOnline ? 32 : 0 }}>🧪 MOD TESTARE</div>
      )}
      
      {/* Order success overlay */}
      {orderPlaced && (
        <div style={s.successModal}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>✓</div>
            <div style={{ fontSize: 24, fontWeight: 400, marginBottom: 8, color: colors.champagne }}>Comandă plasată!</div>
            <div style={{ fontSize: 14, color: colors.textMuted }}>
              {!isOnline ? 'Se trimite când revine conexiunea' : paymentType === 'cash' ? 'Pregătește cash' : 'Vei plăti cu cardul'}
            </div>
          </div>
        </div>
      )}
      
      {/* Submitting overlay */}
      {isSubmitting && (
        <div style={s.successModal}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ fontSize: 16, color: colors.textMuted }}>Se trimite comanda...</div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ ...s.header, top: isTestMode || !isOnline ? 32 : 0 }}>
        <div style={s.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: 6, color: colors.champagne }}>S I P</span>
            <span style={{ width: 1, height: 20, backgroundColor: colors.border }} />
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, color: colors.platinum }}>{table?.table_number}</div>
              <div style={{ fontSize: 9, color: colors.textMuted }}>{event?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowHistory(true)} style={{ padding: 12, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.platinum, fontSize: 14, cursor: 'pointer' }}>📋</button>
            <button onClick={() => setShowCart(true)} style={{ position: 'relative', padding: 12, border: `1px solid ${colors.champagne}`, backgroundColor: colors.champagne, color: colors.noir, cursor: 'pointer' }}>
              🛒 {cartCount > 0 && <span style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, backgroundColor: colors.noir, color: colors.champagne, border: `1px solid ${colors.champagne}`, borderRadius: '50%', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>}
            </button>
          </div>
        </div>
        
        {/* Categories */}
        <div style={s.categories}>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCat(cat.slug)} 
              style={{ 
                ...s.catBtn, 
                color: selectedCat === cat.slug ? colors.champagne : colors.textMuted, 
                borderBottomColor: selectedCat === cat.slug ? colors.champagne : 'transparent' 
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu items */}
      <main style={s.menu}>
        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>
            Niciun produs în această categorie
          </div>
        )}
        {filteredItems.map(item => {
          const price = getPrice(item)
          const inCart = cart.find(c => c.id === item.id)
          return (
            <div key={item.id} style={s.menuItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 400, letterSpacing: 1, marginBottom: 4 }}>
                    {item.name}
                    {item.badge && (
                      <span style={{ 
                        fontSize: 8, padding: '2px 6px', marginLeft: 8, textTransform: 'uppercase',
                        border: `1px solid ${item.badge === 'popular' ? colors.error : item.badge === 'premium' ? colors.champagne : colors.success}`,
                        color: item.badge === 'popular' ? colors.error : item.badge === 'premium' ? colors.champagne : colors.success
                      }}>{item.badge}</span>
                    )}
                    {item.is_featured && (
                      <span style={{ fontSize: 8, padding: '2px 6px', marginLeft: 4, backgroundColor: colors.champagne, color: colors.noir }}>⭐</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>{item.description}</div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 16 }}>
                  <div style={{ fontSize: 15, color: colors.champagne, marginBottom: 8 }}>
                    {price} <span style={{ fontSize: 10, color: colors.textMuted }}>LEI</span>
                  </div>
                  {inCart ? (
                    <div style={{ display: 'flex', border: `1px solid ${colors.champagne}` }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer', fontSize: 16 }}>−</button>
                      <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.champagne, fontWeight: 500 }}>{inCart.qty}</span>
                      <button onClick={() => addToCart(item)} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer', fontSize: 16 }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={{ padding: '8px 16px', border: `1px solid ${colors.champagne}`, backgroundColor: 'transparent', color: colors.champagne, fontSize: 11, letterSpacing: 1, cursor: 'pointer' }}>+ ADAUGĂ</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 30 }}>
          <button onClick={() => setShowCart(true)} style={{ width: '100%', padding: 16, backgroundColor: colors.champagne, color: colors.noir, border: 'none', fontSize: 14, fontWeight: 500, letterSpacing: 2, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🛒 {cartCount} {cartCount === 1 ? 'produs' : 'produse'}</span>
            <span>{cartTotal} LEI →</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div style={s.modal} onClick={() => setShowCart(false)}>
          <div style={s.cartModal} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: 2 }}>COȘUL TĂU</span>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>Coșul e gol</div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 400 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>{item.price} LEI × {item.qty}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: colors.champagne, fontWeight: 500 }}>{item.price * item.qty} LEI</span>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: 28, height: 28, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textMuted, cursor: 'pointer' }}>−</button>
                      <button onClick={() => addToCart(item)} style={{ width: 28, height: 28, border: `1px solid ${colors.champagne}`, backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <div style={{ padding: 16, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>TOTAL</span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: colors.champagne }}>{cartTotal} LEI</span>
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Alege metoda de plată:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {rateLimitError && <div style={{ gridColumn: 'span 2', textAlign: 'center', color: colors.warning, fontSize: 12, padding: 8, backgroundColor: `${colors.warning}20`, borderRadius: 6 }}>⏳ {rateLimitError}</div>}
                  <button onClick={() => placeOrder('cash')} disabled={isSubmitting || !!rateLimitError} style={{ padding: 16, backgroundColor: colors.success, color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: (isSubmitting || rateLimitError) ? 0.6 : 1 }}>💵 CASH</button>
                  <button onClick={() => placeOrder('card')} disabled={isSubmitting || !!rateLimitError} style={{ padding: 16, backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: (isSubmitting || rateLimitError) ? 0.6 : 1 }}>💳 CARD</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div style={s.modal} onClick={() => setShowHistory(false)}>
          <div style={s.cartModal} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: 2 }}>ISTORIC COMENZI</span>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {orderHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>Nicio comandă încă</div>
              ) : (
                orderHistory.map(order => (
                  <div key={order.id} style={{ padding: 16, marginBottom: 12, backgroundColor: colors.noir, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: colors.textMuted }}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ fontSize: 12, padding: '2px 8px', backgroundColor: order.payment_status === 'paid' ? colors.success : colors.warning, color: '#fff', borderRadius: 4 }}>{order.payment_status === 'paid' ? 'Plătit' : order.status}</span>
                    </div>
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 13, color: colors.ivory, marginBottom: 4 }}>{item.quantity}× {item.name}</div>
                    ))}
                    <div style={{ marginTop: 8, textAlign: 'right', color: colors.champagne, fontWeight: 500 }}>{order.total} LEI</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
