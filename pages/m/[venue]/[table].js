import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, resolveTableForOrder, getCategories, getEventMenu, createOrder, createOrderItems, getTableOrders } from '../../../lib/supabase'

const colors = {
  // Dark luxury palette
  noir: '#0a0a0c',
  onyx: '#131316', 
  charcoal: '#1c1c20',
  slate: '#252529',
  champagne: '#d4af37',
  champagneLight: '#e8c964',
  champagneDark: '#b8942d',
  gold: '#ffd700',
  ivory: '#faf9f6',
  cream: '#f5f5dc',
  platinum: '#e5e4e2',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.5)',
  success: '#10b981',
  successDark: '#059669',
  error: '#ef4444',
  warning: '#f59e0b',
  // Gradients
  glowChampagne: 'rgba(212, 175, 55, 0.15)',
  glowGold: 'rgba(255, 215, 0, 0.1)'
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
    
    console.log('Loading data for:', { venueSlug, tableNumber })
    
    try {
      const result = await resolveTableForOrder(venueSlug, tableNumber)
      
      console.log('Resolve result:', result)
      
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
        console.log('Setting screen to:', result.status)
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

  // Countdown timer for upcoming events - now with seconds
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  
  useEffect(() => {
    if (status !== 'upcoming') return
    // Initialize with full seconds
    setSecondsRemaining(minutesUntilStart * 60)
  }, [status, minutesUntilStart])
  
  useEffect(() => {
    if (status !== 'upcoming' || secondsRemaining <= 0) return
    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [status, secondsRemaining])

  const formatCountdown = () => {
    const h = Math.floor(secondsRemaining / 3600)
    const m = Math.floor((secondsRemaining % 3600) / 60)
    const s = secondsRemaining % 60
    const pad = (n) => n.toString().padStart(2, '0')
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
    return `${pad(m)}:${pad(s)}`
  }

  // Premium Dark Luxury Styles
  const s = {
    container: { 
      minHeight: '100vh', 
      backgroundColor: colors.noir, 
      color: colors.ivory, 
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", 
      fontWeight: '300',
      WebkitFontSmoothing: 'antialiased',
      position: 'relative'
    },
    centered: { 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 32, 
      textAlign: 'center' 
    },
    logo: { fontSize: 48, fontWeight: 300, letterSpacing: 20, color: colors.champagne, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 400, marginBottom: 12, color: colors.ivory },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 1.6 },
    badge: { display: 'inline-block', padding: '8px 16px', backgroundColor: `${colors.champagne}20`, border: `1px solid ${colors.champagne}`, color: colors.champagne, fontSize: 12, letterSpacing: 2, marginBottom: 24 },
    btn: { padding: '16px 32px', border: 'none', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 8, transition: 'all 0.3s ease' },
    btnPrimary: { backgroundColor: colors.champagne, color: colors.noir },
    btnOutline: { backgroundColor: 'transparent', border: `1px solid ${colors.champagne}`, color: colors.champagne },
    
    // Premium Header with blur - fixed position
    header: { 
      position: 'fixed', 
      top: 0,
      left: 0,
      right: 0,
      zIndex: 40, 
      backgroundColor: 'rgba(10, 10, 12, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${colors.border}`
    },
    headerTop: { 
      padding: '16px 20px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between' 
    },
    
    // Categories with pill style
    categories: { 
      padding: '8px 16px 16px', 
      overflowX: 'auto', 
      display: 'flex', 
      gap: 8, 
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    },
    catBtn: { 
      padding: '10px 18px', 
      border: `1px solid ${colors.border}`,
      borderRadius: 24,
      backgroundColor: 'transparent', 
      fontSize: 11, 
      letterSpacing: 1.5, 
      textTransform: 'uppercase', 
      whiteSpace: 'nowrap', 
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    catBtnActive: {
      backgroundColor: colors.champagne,
      borderColor: colors.champagne,
      color: colors.noir,
      boxShadow: `0 0 20px ${colors.glowChampagne}`
    },
    
    // Menu items with card style - paddingTop compensates for fixed header
    menu: { 
      padding: '16px 16px', 
      paddingTop: 155,  // Height of fixed header (headerTop + categories) + extra space
      paddingBottom: 140
    },
    // Extra padding when test/offline banner is shown
    menuWithBanner: {
      paddingTop: 195  // 155 + 40 for banner
    },
    menuItem: { 
      backgroundColor: colors.onyx,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: `1px solid ${colors.border}`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    },
    
    // Cart modal with glassmorphism
    modal: { 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 50, 
      display: 'flex', 
      alignItems: 'flex-end' 
    },
    cartModal: { 
      backgroundColor: colors.onyx, 
      width: '100%', 
      maxHeight: '85vh', 
      display: 'flex', 
      flexDirection: 'column', 
      borderTopLeftRadius: 24, 
      borderTopRightRadius: 24,
      border: `1px solid ${colors.borderLight}`,
      borderBottom: 'none',
      boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
    },
    successModal: { 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.95)', 
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 60, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 32 
    },
    offlineBanner: { 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      padding: '10px 16px', 
      backgroundColor: colors.warning, 
      color: colors.noir, 
      fontSize: 12, 
      textAlign: 'center', 
      zIndex: 100, 
      fontWeight: 500 
    },
    testBanner: { 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      padding: '10px 16px', 
      background: `linear-gradient(90deg, ${colors.champagneDark}, ${colors.champagne}, ${colors.champagneDark})`,
      color: colors.noir, 
      fontSize: 11, 
      textAlign: 'center', 
      zIndex: 100, 
      letterSpacing: 2,
      fontWeight: 500
    }
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
      <div style={{ ...s.container, background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 50%, #0a0a0c 100%)' }}>
        <Head><title>S I P - Locație negăsită</title></Head>
        <div style={s.centered}>
          <div style={{ fontSize: 42, fontWeight: 300, letterSpacing: 20, color: colors.champagne, marginBottom: 48, textShadow: `0 0 40px ${colors.glowChampagne}` }}>S I P</div>
          <div style={{ fontSize: 48, marginBottom: 24, opacity: 0.5 }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 400, marginBottom: 12, color: colors.textPrimary }}>Locație negăsită</div>
          <div style={{ fontSize: 14, color: colors.textMuted, maxWidth: 280, lineHeight: 1.6 }}>Codul QR nu este valid sau locația nu există.</div>
        </div>
      </div>
    )
  }

  // No event
  if (status === 'no_event') {
    return (
      <div style={{ ...s.container, background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 50%, #0a0a0c 100%)' }}>
        <Head><title>S I P</title></Head>
        <div style={s.centered}>
          <div style={{ fontSize: 42, fontWeight: 300, letterSpacing: 20, color: colors.champagne, marginBottom: 48, textShadow: `0 0 40px ${colors.glowChampagne}` }}>S I P</div>
          <div style={{ fontSize: 48, marginBottom: 24 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 400, marginBottom: 12, color: colors.textPrimary }}>Niciun eveniment activ</div>
          <div style={{ fontSize: 14, color: colors.textMuted, maxWidth: 280, lineHeight: 1.6 }}>Revino când începe petrecerea!</div>
        </div>
      </div>
    )
  }

  // Upcoming event
  if (status === 'upcoming') {
    return (
      <div style={{
        ...s.container,
        background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 50%, #0a0a0c 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Head><title>S I P - {event?.name || 'Coming Soon'}</title></Head>
        
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.glowChampagne} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ ...s.centered, position: 'relative', zIndex: 1 }}>
          {/* Logo centered */}
          <div style={{ 
            fontSize: 42, 
            fontWeight: 300, 
            letterSpacing: 20, 
            color: colors.champagne,
            marginBottom: 48,
            textShadow: `0 0 40px ${colors.glowChampagne}`
          }}>S I P</div>
          
          {/* Event name */}
          <div style={{ 
            fontSize: 12, 
            letterSpacing: 4, 
            color: colors.textMuted, 
            marginBottom: 48,
            textTransform: 'uppercase'
          }}>{event?.name}</div>
          
          {/* Countdown container */}
          <div style={{
            padding: '32px 48px',
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
            marginBottom: 40
          }}>
            <div style={{ 
              fontSize: 12, 
              letterSpacing: 3, 
              color: colors.textMuted, 
              marginBottom: 16,
              textTransform: 'uppercase'
            }}>Începe în</div>
            <div style={{ 
              fontSize: 52, 
              fontWeight: 300, 
              color: colors.champagne, 
              letterSpacing: 6,
              fontFamily: 'monospace',
              textShadow: `0 0 30px ${colors.glowChampagne}`
            }}>
              {formatCountdown()}
            </div>
          </div>
          
          {/* Start time info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            color: colors.textMuted,
            fontSize: 13
          }}>
            <span>🕐</span>
            <span>Start: {event?.start_time || '22:00'}</span>
          </div>
          
          {/* Hint */}
          <div style={{ 
            marginTop: 48, 
            fontSize: 12, 
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            maxWidth: 260,
            lineHeight: 1.6
          }}>
            Scanează din nou codul QR când începe evenimentul
          </div>
        </div>
      </div>
    )
  }

  // Table not found
  if (status === 'table_not_found') {
    return (
      <div style={{ ...s.container, background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 50%, #0a0a0c 100%)' }}>
        <Head><title>S I P</title></Head>
        <div style={s.centered}>
          <div style={{ fontSize: 42, fontWeight: 300, letterSpacing: 20, color: colors.champagne, marginBottom: 48, textShadow: `0 0 40px ${colors.glowChampagne}` }}>S I P</div>
          {event && <div style={{ fontSize: 12, letterSpacing: 4, color: colors.textMuted, marginBottom: 32, textTransform: 'uppercase' }}>{event.name}</div>}
          <div style={{ fontSize: 48, marginBottom: 24, opacity: 0.5 }}>🪑</div>
          <div style={{ fontSize: 20, fontWeight: 400, marginBottom: 12, color: colors.textPrimary }}>Masa {tableNumber} nu există</div>
          <div style={{ fontSize: 14, color: colors.textMuted, maxWidth: 280, lineHeight: 1.6, marginBottom: 32 }}>Verifică numărul mesei sau cheamă un ospătar.</div>
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
      <div style={{ ...s.container, background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 50%, #0a0a0c 100%)' }}>
        <Head><title>S I P - Eroare</title></Head>
        <div style={s.centered}>
          <div style={{ fontSize: 42, fontWeight: 300, letterSpacing: 20, color: colors.champagne, marginBottom: 48, textShadow: `0 0 40px ${colors.glowChampagne}` }}>S I P</div>
          <div style={{ fontSize: 48, marginBottom: 24 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 400, marginBottom: 12, color: colors.textPrimary }}>Oops!</div>
          <div style={{ fontSize: 14, color: colors.textMuted, maxWidth: 280, lineHeight: 1.6, marginBottom: 32 }}>{message || 'A apărut o eroare. Reîncearcă.'}</div>
          <button 
            onClick={() => router.reload()} 
            style={{ 
              padding: '14px 32px',
              borderRadius: 10,
              border: `1px solid ${colors.champagne}`,
              backgroundColor: 'transparent',
              color: colors.champagne,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 2,
              cursor: 'pointer'
            }}
          >REÎNCEARCĂ</button>
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
      
      {/* Premium Order Success Overlay */}
      {orderPlaced && (
        <div style={{
          ...s.successModal,
          background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0.95) 70%)'
        }}>
          <div style={{ 
            textAlign: 'center',
            padding: 40,
            maxWidth: 320
          }}>
            {/* Animated checkmark */}
            <div style={{ 
              width: 100,
              height: 100,
              margin: '0 auto 32px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.success}, ${colors.successDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 60px rgba(16, 185, 129, 0.4), 0 0 100px rgba(16, 185, 129, 0.2)`,
              animation: 'successPop 0.5s ease-out'
            }}>
              <span style={{ fontSize: 48, color: '#fff' }}>✓</span>
            </div>
            
            {/* Title */}
            <div style={{ 
              fontSize: 28, 
              fontWeight: 600, 
              marginBottom: 12, 
              color: colors.textPrimary,
              letterSpacing: 1
            }}>
              Comandă plasată!
            </div>
            
            {/* Subtitle */}
            <div style={{ 
              fontSize: 15, 
              color: colors.textSecondary,
              marginBottom: 32,
              lineHeight: 1.6
            }}>
              {!isOnline 
                ? 'Se trimite automat când revine conexiunea' 
                : paymentType === 'cash' 
                  ? 'Ospătarul vine să încaseze cash' 
                  : 'Ospătarul vine cu POS-ul pentru card'
              }
            </div>
            
            {/* Payment type badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 28px',
              borderRadius: 12,
              backgroundColor: paymentType === 'cash' ? `${colors.success}15` : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${paymentType === 'cash' ? colors.success : '#3b82f6'}30`
            }}>
              <span style={{ fontSize: 24 }}>{paymentType === 'cash' ? '💵' : '💳'}</span>
              <span style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                color: paymentType === 'cash' ? colors.success : '#3b82f6',
                letterSpacing: 1,
                textTransform: 'uppercase'
              }}>
                {paymentType === 'cash' ? 'Cash' : 'Card'}
              </span>
            </div>
            
            {/* Total reminder */}
            <div style={{
              marginTop: 32,
              padding: '16px 24px',
              borderRadius: 12,
              backgroundColor: `${colors.champagne}10`,
              border: `1px solid ${colors.champagne}20`
            }}>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, letterSpacing: 1 }}>TOTAL DE PLATĂ</div>
              <div style={{ 
                fontSize: 32, 
                fontWeight: 700, 
                color: colors.champagne,
                textShadow: `0 0 30px ${colors.glowChampagne}`
              }}>{cartTotal} LEI</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Premium Submitting Overlay */}
      {isSubmitting && (
        <div style={{
          ...s.successModal,
          background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.1) 0%, rgba(0,0,0,0.95) 70%)'
        }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            {/* Animated loader */}
            <div style={{ 
              width: 80,
              height: 80,
              margin: '0 auto 32px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `3px solid ${colors.border}`,
                borderTopColor: colors.champagne,
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{
                position: 'absolute',
                inset: 10,
                borderRadius: '50%',
                border: `2px solid ${colors.border}`,
                borderBottomColor: colors.champagneLight,
                animation: 'spinReverse 0.8s linear infinite'
              }} />
            </div>
            
            <div style={{ 
              fontSize: 18, 
              fontWeight: 500,
              color: colors.textPrimary,
              marginBottom: 8,
              letterSpacing: 1
            }}>Se trimite comanda...</div>
            <div style={{ 
              fontSize: 13, 
              color: colors.textMuted 
            }}>Te rugăm să aștepți</div>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <header style={{ ...s.header, top: isTestMode || !isOnline ? 40 : 0 }}>
        <div style={s.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 300, 
              letterSpacing: 8, 
              color: colors.champagne,
              textShadow: `0 0 20px ${colors.glowChampagne}`
            }}>S I P</div>
            <div style={{ 
              width: 1, 
              height: 24, 
              background: `linear-gradient(180deg, transparent, ${colors.borderLight}, transparent)` 
            }} />
            <div>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 500, 
                letterSpacing: 3, 
                color: colors.textPrimary,
                marginBottom: 2
              }}>{table?.table_number}</div>
              <div style={{ 
                fontSize: 10, 
                letterSpacing: 1,
                color: colors.textMuted,
                textTransform: 'uppercase'
              }}>{event?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={() => setShowHistory(true)} 
              style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 12,
                border: `1px solid ${colors.border}`, 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                color: colors.textSecondary, 
                fontSize: 16, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
            >📋</button>
            <button 
              onClick={() => setShowCart(true)} 
              style={{ 
                position: 'relative', 
                width: 44, 
                height: 44, 
                borderRadius: 12,
                border: 'none', 
                background: `linear-gradient(135deg, ${colors.champagne}, ${colors.champagneDark})`,
                color: colors.noir, 
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 20px ${colors.glowChampagne}`,
                transition: 'all 0.3s ease'
              }}
            >
              🛒 
              {cartCount > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: -6, 
                  right: -6, 
                  minWidth: 20, 
                  height: 20, 
                  padding: '0 6px',
                  backgroundColor: colors.noir, 
                  color: colors.champagne, 
                  border: `2px solid ${colors.champagne}`, 
                  borderRadius: 10, 
                  fontSize: 11, 
                  fontWeight: 600,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
        
        {/* Premium Categories */}
        <div style={s.categories} className="hide-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCat(cat.slug)} 
              style={{ 
                ...s.catBtn, 
                ...(selectedCat === cat.slug ? s.catBtnActive : {}),
                color: selectedCat === cat.slug ? colors.noir : colors.textMuted
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Premium Menu Items */}
      <main style={{ ...s.menu, ...((isTestMode || !isOnline) ? s.menuWithBanner : {}) }}>
        {filteredItems.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: 64, 
            color: colors.textMuted,
            fontSize: 14,
            letterSpacing: 1
          }}>
            Niciun produs în această categorie
          </div>
        )}
        {filteredItems.map(item => {
          const price = getPrice(item)
          const inCart = cart.find(c => c.id === item.id)
          return (
            <div 
              key={item.id} 
              style={{
                ...s.menuItem,
                ...(inCart ? { 
                  borderColor: colors.champagne,
                  boxShadow: `0 0 30px ${colors.glowChampagne}, inset 0 0 30px ${colors.glowGold}`
                } : {})
              }}
              className="menu-item-hover"
            >
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '40%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, ${colors.glowGold})`,
                opacity: 0.3,
                pointerEvents: 'none'
              }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ flex: 1, paddingRight: 16 }}>
                  {/* Product Name */}
                  <div style={{ 
                    fontSize: 16, 
                    fontWeight: 500, 
                    letterSpacing: 0.5, 
                    marginBottom: 6,
                    color: colors.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8
                  }}>
                    {item.name}
                    {item.badge && (
                      <span style={{ 
                        fontSize: 9, 
                        padding: '3px 8px', 
                        borderRadius: 4,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        backgroundColor: item.badge === 'popular' ? `${colors.error}20` : item.badge === 'premium' ? `${colors.champagne}20` : `${colors.success}20`,
                        color: item.badge === 'popular' ? colors.error : item.badge === 'premium' ? colors.champagne : colors.success,
                        border: `1px solid ${item.badge === 'popular' ? colors.error : item.badge === 'premium' ? colors.champagne : colors.success}30`
                      }}>{item.badge}</span>
                    )}
                    {item.is_featured && (
                      <span style={{ 
                        fontSize: 9, 
                        padding: '3px 8px', 
                        borderRadius: 4,
                        background: `linear-gradient(135deg, ${colors.champagne}, ${colors.gold})`,
                        color: colors.noir,
                        fontWeight: 600
                      }}>⭐ FEATURED</span>
                    )}
                  </div>
                  {/* Description */}
                  {item.description && (
                    <div style={{ 
                      fontSize: 13, 
                      color: colors.textMuted,
                      lineHeight: 1.5,
                      maxWidth: '90%'
                    }}>{item.description}</div>
                  )}
                </div>
                
                {/* Price and Add Button */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  gap: 12
                }}>
                  {/* Price */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontSize: 20, 
                      fontWeight: 600,
                      color: colors.champagne,
                      textShadow: `0 0 20px ${colors.glowChampagne}`
                    }}>{price}</span>
                    <span style={{ 
                      fontSize: 11, 
                      color: colors.textMuted,
                      marginLeft: 4,
                      fontWeight: 400
                    }}>LEI</span>
                  </div>
                  
                  {/* Cart Controls */}
                  {inCart ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: `1px solid ${colors.champagne}`,
                      background: `linear-gradient(135deg, ${colors.charcoal}, ${colors.onyx})`
                    }}>
                      <button 
                        onClick={() => removeFromCart(item.id)} 
                        style={{ 
                          width: 38, 
                          height: 38, 
                          border: 'none', 
                          backgroundColor: 'transparent', 
                          color: colors.champagne, 
                          cursor: 'pointer', 
                          fontSize: 18,
                          fontWeight: 300,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >−</button>
                      <span style={{ 
                        width: 36, 
                        height: 38, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: colors.champagne, 
                        fontWeight: 600,
                        fontSize: 15,
                        borderLeft: `1px solid ${colors.border}`,
                        borderRight: `1px solid ${colors.border}`
                      }}>{inCart.qty}</span>
                      <button 
                        onClick={() => addToCart(item)} 
                        style={{ 
                          width: 38, 
                          height: 38, 
                          border: 'none', 
                          backgroundColor: 'transparent', 
                          color: colors.champagne, 
                          cursor: 'pointer', 
                          fontSize: 18,
                          fontWeight: 300,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >+</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)} 
                      style={{ 
                        padding: '10px 20px', 
                        borderRadius: 10,
                        border: `1px solid ${colors.champagne}40`,
                        background: `linear-gradient(135deg, ${colors.charcoal}, ${colors.onyx})`,
                        color: colors.champagne, 
                        fontSize: 11, 
                        fontWeight: 500,
                        letterSpacing: 1, 
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase'
                      }}
                      className="add-btn-hover"
                    >+ Adaugă</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* Premium Floating Cart Button */}
      {cartCount > 0 && !showCart && (
        <div style={{ 
          position: 'fixed', 
          bottom: 24, 
          left: 20, 
          right: 20, 
          zIndex: 30 
        }}>
          <button 
            onClick={() => setShowCart(true)} 
            style={{ 
              width: '100%', 
              padding: '18px 24px', 
              background: `linear-gradient(135deg, ${colors.champagne}, ${colors.champagneDark})`,
              color: colors.noir, 
              border: 'none', 
              borderRadius: 16,
              fontSize: 14, 
              fontWeight: 600, 
              letterSpacing: 1, 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              boxShadow: `0 8px 32px rgba(212, 175, 55, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset`,
              transition: 'all 0.3s ease'
            }}
            className="cart-btn-pulse"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🛒</span>
              <span>{cartCount} {cartCount === 1 ? 'produs' : 'produse'}</span>
            </span>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              fontWeight: 700
            }}>
              {cartTotal} LEI
              <span style={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12
              }}>→</span>
            </span>
          </button>
        </div>
      )}

      {/* Premium Cart Modal */}
      {showCart && (
        <div style={s.modal} onClick={() => setShowCart(false)}>
          <div style={s.cartModal} onClick={e => e.stopPropagation()}>
            {/* Cart Header */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: `1px solid ${colors.border}`, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: `linear-gradient(180deg, ${colors.charcoal}, ${colors.onyx})`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>🛒</span>
                <span style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  letterSpacing: 3,
                  color: colors.textPrimary
                }}>COȘUL TĂU</span>
              </div>
              <button 
                onClick={() => setShowCart(false)} 
                style={{ 
                  width: 36, 
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', 
                  border: `1px solid ${colors.border}`, 
                  color: colors.textMuted, 
                  fontSize: 18, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >×</button>
            </div>
            
            {/* Cart Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {cart.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 64, 
                  color: colors.textMuted,
                  fontSize: 14,
                  letterSpacing: 1
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🛒</div>
                  Coșul e gol
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: 16,
                      marginBottom: 10,
                      backgroundColor: colors.charcoal,
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 500,
                        fontSize: 15,
                        color: colors.textPrimary,
                        marginBottom: 4
                      }}>{item.name}</div>
                      <div style={{ 
                        fontSize: 13, 
                        color: colors.textMuted 
                      }}>{item.price} LEI × {item.qty}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ 
                        color: colors.champagne, 
                        fontWeight: 600,
                        fontSize: 16,
                        minWidth: 60,
                        textAlign: 'right'
                      }}>{item.price * item.qty} LEI</span>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: `1px solid ${colors.border}`
                      }}>
                        <button 
                          onClick={() => removeFromCart(item.id)} 
                          style={{ 
                            width: 34, 
                            height: 34, 
                            border: 'none',
                            borderRight: `1px solid ${colors.border}`, 
                            backgroundColor: 'transparent', 
                            color: colors.textMuted, 
                            cursor: 'pointer',
                            fontSize: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >−</button>
                        <button 
                          onClick={() => addToCart(item)} 
                          style={{ 
                            width: 34, 
                            height: 34, 
                            border: 'none', 
                            backgroundColor: 'transparent', 
                            color: colors.champagne, 
                            cursor: 'pointer',
                            fontSize: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Cart Footer */}
            {cart.length > 0 && (
              <div style={{ 
                padding: '20px 24px', 
                paddingBottom: 32,
                borderTop: `1px solid ${colors.border}`,
                background: `linear-gradient(180deg, ${colors.onyx}, ${colors.charcoal})`
              }}>
                {/* Total */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 20,
                  padding: 16,
                  backgroundColor: 'rgba(212, 175, 55, 0.08)',
                  borderRadius: 12,
                  border: `1px solid ${colors.champagne}30`
                }}>
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    letterSpacing: 2,
                    color: colors.textSecondary
                  }}>TOTAL</span>
                  <span style={{ 
                    fontSize: 24, 
                    fontWeight: 700, 
                    color: colors.champagne,
                    textShadow: `0 0 20px ${colors.glowChampagne}`
                  }}>{cartTotal} LEI</span>
                </div>
                
                {/* Payment Method */}
                <div style={{ 
                  fontSize: 12, 
                  color: colors.textMuted, 
                  marginBottom: 16,
                  textAlign: 'center',
                  letterSpacing: 1
                }}>Alege metoda de plată</div>
                
                {/* Rate Limit Error */}
                {rateLimitError && (
                  <div style={{ 
                    textAlign: 'center', 
                    color: colors.warning, 
                    fontSize: 13, 
                    padding: 12, 
                    backgroundColor: `${colors.warning}15`, 
                    borderRadius: 10,
                    marginBottom: 16,
                    border: `1px solid ${colors.warning}30`
                  }}>⏳ {rateLimitError}</div>
                )}
                
                {/* Payment Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button 
                    onClick={() => placeOrder('cash')} 
                    disabled={isSubmitting || !!rateLimitError} 
                    style={{ 
                      padding: 18, 
                      background: `linear-gradient(135deg, ${colors.success}, ${colors.successDark})`,
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 12,
                      fontSize: 15, 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      opacity: (isSubmitting || rateLimitError) ? 0.5 : 1,
                      boxShadow: `0 4px 20px rgba(16, 185, 129, 0.3)`,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 18 }}>💵</span> CASH
                  </button>
                  <button 
                    onClick={() => placeOrder('card')} 
                    disabled={isSubmitting || !!rateLimitError} 
                    style={{ 
                      padding: 18, 
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 12,
                      fontSize: 15, 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      opacity: (isSubmitting || rateLimitError) ? 0.5 : 1,
                      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 18 }}>💳</span> CARD
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium History Modal */}
      {showHistory && (
        <div style={s.modal} onClick={() => setShowHistory(false)}>
          <div style={s.cartModal} onClick={e => e.stopPropagation()}>
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: `1px solid ${colors.border}`, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: `linear-gradient(180deg, ${colors.charcoal}, ${colors.onyx})`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 3, color: colors.textPrimary }}>ISTORIC</span>
              </div>
              <button 
                onClick={() => setShowHistory(false)} 
                style={{ 
                  width: 36, 
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', 
                  border: `1px solid ${colors.border}`, 
                  color: colors.textMuted, 
                  fontSize: 18, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {orderHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 64, color: colors.textMuted }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📋</div>
                  Nicio comandă încă
                </div>
              ) : (
                orderHistory.map(order => (
                  <div 
                    key={order.id} 
                    style={{ 
                      padding: 16, 
                      marginBottom: 12, 
                      backgroundColor: colors.charcoal, 
                      border: `1px solid ${colors.border}`, 
                      borderRadius: 12 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: colors.textSecondary }}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ 
                        fontSize: 11, 
                        padding: '4px 10px', 
                        backgroundColor: order.payment_status === 'paid' ? `${colors.success}20` : `${colors.warning}20`, 
                        color: order.payment_status === 'paid' ? colors.success : colors.warning, 
                        borderRadius: 6,
                        fontWeight: 500,
                        letterSpacing: 0.5
                      }}>{order.payment_status === 'paid' ? '✓ Plătit' : order.status}</span>
                    </div>
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 14, color: colors.textPrimary, marginBottom: 6, display: 'flex', gap: 8 }}>
                        <span style={{ color: colors.champagne, fontWeight: 500 }}>{item.quantity}×</span>
                        <span>{item.name}</span>
                      </div>
                    ))}
                    <div style={{ 
                      marginTop: 12, 
                      paddingTop: 12,
                      borderTop: `1px solid ${colors.border}`,
                      textAlign: 'right', 
                      color: colors.champagne, 
                      fontWeight: 600,
                      fontSize: 16
                    }}>{order.total} LEI</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Premium CSS Animations */}
      <style jsx global>{`
        /* Hide scrollbar for categories */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Cart button pulse animation */
        @keyframes cartPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        /* Success popup animation */
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .cart-btn-pulse {
          animation: cartPulse 2s ease-in-out infinite;
        }
        .cart-btn-pulse:active {
          animation: none;
          transform: scale(0.98);
        }
        
        /* Menu item hover effect */
        .menu-item-hover {
          transition: all 0.3s ease;
        }
        @media (hover: hover) {
          .menu-item-hover:hover {
            border-color: rgba(212, 175, 55, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
          }
        }
        
        /* Add button hover */
        @media (hover: hover) {
          .add-btn-hover:hover {
            background: linear-gradient(135deg, #d4af37, #b8942d) !important;
            color: #0a0a0c !important;
            border-color: #d4af37 !important;
          }
        }
        
        /* Font import */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        /* Reset and base styles */
        html, body {
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior-y: none;
        }
        
        /* Active states for touch */
        button:active {
          transform: scale(0.97);
        }
        
        /* Ensure main container can scroll */
        #__next {
          min-height: 100vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  )
}
