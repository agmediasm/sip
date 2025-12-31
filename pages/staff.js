import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventMenu, getCategories, loginWaiter, getTableAssignments, getEventReservations, createOrder, createOrderItems } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

// Premium colors - exact match with menu
const colors = {
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
  glowChampagne: 'rgba(212, 175, 55, 0.15)',
  glowGold: 'rgba(255, 215, 0, 0.1)'
}

export default function StaffDashboard() {
  const [waiter, setWaiter] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTables, setEventTables] = useState([])
  const [orders, setOrders] = useState([])
  const [allTableOrders, setAllTableOrders] = useState([])
  const [reservations, setReservations] = useState([])
  const [tableAssignments, setTableAssignments] = useState([])
  const [activeTab, setActiveTab] = useState('orders')
  const [activeZone, setActiveZone] = useState('front')
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showTableModal, setShowTableModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [orderError, setOrderError] = useState('')
  const [splitPaymentOrder, setSplitPaymentOrder] = useState(null)
  const [selectedItemsForPayment, setSelectedItemsForPayment] = useState([])
  const [inactiveAlerts, setInactiveAlerts] = useState([])
  const [showAlertsPanel, setShowAlertsPanel] = useState(false)
  const [dismissedTableIds, setDismissedTableIds] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sip_dismissed_tables')
      if (saved) try { return new Set(JSON.parse(saved)) } catch(e) {}
    }
    return new Set()
  })
  const myTableIdsRef = useRef([])
  const audioRef = useRef(null)

  useEffect(() => { const saved = localStorage.getItem('sip_waiter'); if (saved) try { setWaiter(JSON.parse(saved)) } catch(e) {} }, [])
  useEffect(() => { if (dismissedTableIds.size > 0) localStorage.setItem('sip_dismissed_tables', JSON.stringify([...dismissedTableIds])); else localStorage.removeItem('sip_dismissed_tables') }, [dismissedTableIds])
  useEffect(() => { if (waiter) loadEvents() }, [waiter])
  useEffect(() => { if (selectedEvent && waiter) loadEventData() }, [selectedEvent, waiter])
  
  useEffect(() => {
    if (!selectedEvent || !waiter) return
    const eventId = selectedEvent.id
    const channel = supabase.channel(`orders-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `event_id=eq.${eventId}` }, (payload) => {
        if (payload.eventType === 'INSERT' && myTableIdsRef.current.includes(payload.new.event_table_id)) { 
          setNewOrderAlert(true)
          playSound()
          setTimeout(() => setNewOrderAlert(false), 3000) 
        }
        loadOrders()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedEvent, waiter])

  const playSound = () => { try { if (!audioRef.current) audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA0GVaHj6tCHNx0lXbXv8sRqKg'); audioRef.current.play().catch(() => {}) } catch(e) {} }
  const loadEvents = async () => { const { data } = await getEvents(VENUE_ID); if (data?.length) { setEvents(data); setSelectedEvent(data[0]) } }
  
  const loadEventData = async () => {
    setLoading(true)
    const [tablesRes, assignRes, resRes, menuRes, catsRes] = await Promise.all([getEventTables(selectedEvent.id), getTableAssignments(selectedEvent.id), getEventReservations(selectedEvent.id), getEventMenu(selectedEvent.id), getCategories(VENUE_ID)])
    if (tablesRes.data) setEventTables(tablesRes.data)
    if (assignRes.data) { setTableAssignments(assignRes.data); myTableIdsRef.current = assignRes.data.filter(a => a.waiter_id === waiter.id).map(a => a.event_table_id) }
    if (resRes.data) setReservations(resRes.data)
    if (menuRes.data) setMenuItems(menuRes.data.map(em => ({ ...em.menu_items, custom_price: em.custom_price, default_price: em.custom_price || em.menu_items?.default_price })))
    if (catsRes.data) setCategories(catsRes.data)
    await loadOrders()
    setLoading(false)
  }

  const loadOrders = async () => {
    const myTables = myTableIdsRef.current.length ? myTableIdsRef.current : ['00000000-0000-0000-0000-000000000000']
    const { data } = await supabase
      .from('orders')
      .select('*, event_tables(*), order_items(*)')
      .eq('event_id', selectedEvent.id)
      .in('event_table_id', myTables)
      .in('status', ['new', 'preparing', 'ready'])
      .order('created_at', { ascending: true })
    if (data) setOrders(data)
  }

  const loadTableHistory = async (tableId) => {
    const { data } = await supabase
      .from('orders')
      .select('*, event_tables(*), order_items(*)')
      .eq('event_id', selectedEvent.id)
      .eq('event_table_id', tableId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setAllTableOrders(data)
  }

  const handleLogin = async () => {
    if (!phoneInput || !pinInput) {
      setLoginError('Introdu telefonul și PIN-ul')
      return
    }
    setLoginError('')
    const { data, error } = await loginWaiter(phoneInput.replace(/\s/g, ''))
    if (error || !data) { 
      setLoginError('Număr invalid sau cont inactiv')
      return 
    }
    if (data.pin && data.pin !== pinInput) {
      setLoginError('PIN incorect')
      return
    }
    setWaiter(data)
    localStorage.setItem('sip_waiter', JSON.stringify(data))
    setPinInput('')
  }

  const handleLogout = () => { setWaiter(null); localStorage.removeItem('sip_waiter'); setOrders([]); setSelectedEvent(null) }

  const handleOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) loadOrders()
  }

  const handleMarkPaid = async (orderId, paymentType) => {
    const { error } = await supabase.from('orders').update({ status: 'delivered', payment_status: 'paid', payment_type: paymentType, paid_at: new Date().toISOString() }).eq('id', orderId)
    if (!error) loadOrders()
  }

  const openSplitPayment = (order) => {
    setSplitPaymentOrder(order)
    const initial = {}
    order.order_items?.forEach((_, idx) => { initial[idx] = 0 })
    setSelectedItemsForPayment(initial)
  }

  const closeSplitPayment = () => {
    setSplitPaymentOrder(null)
    setSelectedItemsForPayment({})
  }

  const adjustItemQty = (idx, delta) => {
    const item = splitPaymentOrder?.order_items?.[idx]
    if (!item) return
    const maxQty = item.quantity || 1
    setSelectedItemsForPayment(prev => {
      const current = prev[idx] || 0
      const newQty = Math.max(0, Math.min(maxQty, current + delta))
      return { ...prev, [idx]: newQty }
    })
  }

  const selectAllOfItem = (idx) => {
    const item = splitPaymentOrder?.order_items?.[idx]
    if (!item) return
    setSelectedItemsForPayment(prev => {
      const current = prev[idx] || 0
      return { ...prev, [idx]: current === item.quantity ? 0 : item.quantity }
    })
  }

  const getSelectedTotal = () => {
    if (!splitPaymentOrder) return 0
    return Object.entries(selectedItemsForPayment).reduce((sum, [idx, qty]) => {
      const item = splitPaymentOrder.order_items?.[parseInt(idx)]
      if (!item || qty === 0) return sum
      const unitPrice = (item.subtotal || item.price * item.quantity) / item.quantity
      return sum + (unitPrice * qty)
    }, 0)
  }

  const hasSelectedItems = () => Object.values(selectedItemsForPayment).some(qty => qty > 0)

  const getSelectedItemsDescription = () => {
    return Object.entries(selectedItemsForPayment)
      .filter(([_, qty]) => qty > 0)
      .map(([idx, qty]) => {
        const item = splitPaymentOrder?.order_items?.[parseInt(idx)]
        return `${qty}× ${item?.name}`
      }).join(', ')
  }

  const INACTIVE_MINUTES = 45
  
  const checkInactiveTables = async () => {
    if (!selectedEvent || !waiter || myTableIdsRef.current.length === 0) return
    const cutoffTime = new Date(Date.now() - INACTIVE_MINUTES * 60 * 1000).toISOString()
    const alerts = []
    for (const tableId of myTableIdsRef.current) {
      const table = eventTables.find(t => t.id === tableId)
      if (!table) continue
      const { data: lastOrders } = await supabase
        .from('orders')
        .select('created_at, total')
        .eq('event_table_id', tableId)
        .eq('event_id', selectedEvent.id)
        .order('created_at', { ascending: false })
        .limit(1)
      const lastOrder = lastOrders?.[0]
      const isInactive = !lastOrder || lastOrder.created_at < cutoffTime
      if (isInactive) {
        const minutesAgo = lastOrder ? Math.round((Date.now() - new Date(lastOrder.created_at)) / 60000) : null
        alerts.push({ tableId, table, lastOrder, minutesAgo, message: lastOrder ? `${minutesAgo} min fără comandă` : 'Nicio comandă încă' })
      }
    }
    setInactiveAlerts(alerts)
  }
  
  useEffect(() => {
    if (!selectedEvent || !waiter) return
    checkInactiveTables()
    const interval = setInterval(checkInactiveTables, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedEvent, waiter, eventTables])

  const handlePartialPayment = async (paymentType) => {
    if (!splitPaymentOrder || !hasSelectedItems()) return
    const selectedTotal = Math.round(getSelectedTotal())
    const remainingTotal = Math.round(splitPaymentOrder.total - selectedTotal)
    if (remainingTotal <= 0) {
      await handleMarkPaid(splitPaymentOrder.id, paymentType)
    } else {
      const { error } = await supabase.from('orders').update({
        total: remainingTotal,
        payment_status: 'partial',
        notes: `Plătit parțial: ${selectedTotal} LEI (${paymentType}). ${getSelectedItemsDescription()}`
      }).eq('id', splitPaymentOrder.id)
      if (!error) loadOrders()
    }
    closeSplitPayment()
  }

  const openTableOptions = (table) => { setSelectedTable(table); setShowTableModal(true) }
  const openOrderModal = () => { setShowTableModal(false); setCart([]); setSearchQuery(''); setOrderError(''); setShowOrderModal(true) }
  const openHistoryModal = async () => { setShowTableModal(false); await loadTableHistory(selectedTable.id); setShowHistoryModal(true) }
  
  const addToCart = (item) => { setCart(prev => { const ex = prev.find(c => c.id === item.id); return ex ? prev.map(c => c.id === item.id ? {...c, qty: c.qty + 1} : c) : [...prev, {...item, qty: 1}] }) }
  const removeFromCart = (itemId) => { setCart(prev => { const ex = prev.find(c => c.id === itemId); return ex?.qty > 1 ? prev.map(c => c.id === itemId ? {...c, qty: c.qty - 1} : c) : prev.filter(c => c.id !== itemId) }) }
  const cartTotal = cart.reduce((sum, i) => sum + (i.default_price * i.qty), 0)

  const handlePlaceOrder = async (paymentType) => {
    if (!cart.length || !selectedTable) return
    setOrderError('')
    try {
      const orderData = {
        venue_id: VENUE_ID,
        event_id: selectedEvent.id,
        event_table_id: selectedTable.id,
        table_number: selectedTable.table_number,
        waiter_id: waiter.id,
        subtotal: cartTotal,
        total: cartTotal,
        status: 'preparing',
        payment_type: paymentType,
        payment_status: 'pending'
      }
      const { data: order, error: orderError } = await createOrder(orderData)
      if (orderError) { setOrderError(orderError.message); return }
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        price: item.default_price,
        quantity: item.qty,
        subtotal: item.default_price * item.qty
      }))
      const { error: itemsError } = await createOrderItems(orderItems)
      if (itemsError) { setOrderError(itemsError.message); return }
      setShowOrderModal(false)
      setCart([])
      setSelectedTable(null)
      loadOrders()
    } catch (err) { setOrderError(err.message) }
  }

  const filteredMenu = searchQuery ? menuItems.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase())) : menuItems
  const popularItems = menuItems.filter(m => m.badge === 'popular').slice(0, 5)

  const openReservationDetails = (table) => {
    const res = reservations.find(r => r.event_table_id === table.id)
    if (res) { setSelectedReservation({ ...res, table }); setShowReservationModal(true) }
  }

  // ========== PREMIUM STYLES (matching menu) ==========
  const s = {
    container: { 
      minHeight: '100vh', 
      backgroundColor: colors.noir, 
      color: colors.ivory, 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: 300,
      WebkitFontSmoothing: 'antialiased'
    },
    // Login
    centered: { 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 32, 
      textAlign: 'center',
      background: 'linear-gradient(180deg, #05050a 0%, #0a0a0c 50%, #05050a 100%)'
    },
    logo: { fontSize: 48, fontWeight: 300, letterSpacing: 20, color: colors.champagne, marginBottom: 8, textShadow: `0 0 40px ${colors.glowChampagne}` },
    logoSmall: { fontSize: 18, fontWeight: 300, letterSpacing: 8, color: colors.champagne, textShadow: `0 0 20px ${colors.glowChampagne}` },
    subtitle: { fontSize: 10, letterSpacing: 4, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 48 },
    inputLabel: { fontSize: 11, letterSpacing: 2, color: colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 8, textAlign: 'left' },
    input: { 
      width: '100%', 
      padding: 16, 
      border: `1px solid ${colors.border}`, 
      backgroundColor: colors.onyx, 
      color: colors.ivory, 
      fontSize: 15, 
      marginBottom: 16, 
      borderRadius: 12, 
      outline: 'none', 
      boxSizing: 'border-box'
    },
    // Header
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
    headerTop: { padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    // Tabs as pills
    tabs: { padding: '8px 16px 16px', display: 'flex', gap: 8, overflowX: 'auto' },
    tabBtn: { 
      padding: '10px 18px', 
      border: `1px solid ${colors.border}`,
      borderRadius: 24,
      backgroundColor: 'transparent', 
      fontSize: 11, 
      letterSpacing: 1.5, 
      textTransform: 'uppercase', 
      whiteSpace: 'nowrap', 
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    },
    tabBtnActive: {
      backgroundColor: colors.champagne,
      borderColor: colors.champagne,
      color: colors.noir,
      boxShadow: `0 0 20px ${colors.glowChampagne}`
    },
    // Content
    content: { padding: 16, paddingTop: 140, paddingBottom: 32 },
    sectionTitle: { fontSize: 11, letterSpacing: 2, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
    // Cards
    card: { 
      backgroundColor: colors.onyx,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: `1px solid ${colors.border}`,
      position: 'relative',
      overflow: 'hidden'
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    tableNumber: { fontSize: 18, fontWeight: 500, letterSpacing: 2, color: colors.textPrimary },
    orderTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    orderTotal: { fontSize: 20, fontWeight: 600, color: colors.champagne, textShadow: `0 0 20px ${colors.glowChampagne}` },
    itemsList: { backgroundColor: colors.charcoal, padding: 12, borderRadius: 10, marginBottom: 12 },
    itemRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: `1px solid ${colors.border}` },
    // Buttons
    btn: { 
      padding: '12px 24px', 
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      backgroundColor: 'transparent', 
      fontSize: 11, 
      letterSpacing: 1.5, 
      textTransform: 'uppercase', 
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    },
    btnPrimary: { 
      background: `linear-gradient(135deg, ${colors.champagne}, ${colors.champagneDark})`,
      borderColor: colors.champagne,
      color: colors.noir,
      boxShadow: `0 4px 20px ${colors.glowChampagne}`
    },
    btnSuccess: { 
      background: `linear-gradient(135deg, ${colors.success}, ${colors.successDark})`,
      borderColor: colors.success,
      color: '#fff',
      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
    },
    btnBlue: {
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      borderColor: '#3b82f6',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
    },
    // Badge
    badge: { 
      fontSize: 9, 
      padding: '4px 10px', 
      borderRadius: 6,
      fontWeight: 600,
      letterSpacing: 0.5,
      textTransform: 'uppercase'
    },
    // Modal
    modalOverlay: { 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 50, 
      display: 'flex', 
      alignItems: 'flex-end' 
    },
    modalBox: { 
      backgroundColor: colors.onyx, 
      width: '100%', 
      maxHeight: '85vh', 
      display: 'flex', 
      flexDirection: 'column', 
      borderTopLeftRadius: 24, 
      borderTopRightRadius: 24,
      border: `1px solid ${colors.borderLight}`,
      borderBottom: 'none'
    },
    modalHeader: { 
      padding: '20px 24px', 
      borderBottom: `1px solid ${colors.border}`, 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      background: `linear-gradient(180deg, ${colors.charcoal}, ${colors.onyx})`
    },
    modalTitle: { fontSize: 16, fontWeight: 600, letterSpacing: 3, color: colors.textPrimary },
    modalBody: { flex: 1, overflowY: 'auto', padding: 20 },
    closeBtn: { 
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
    },
    // Zone tabs
    zoneTabs: { display: 'flex', gap: 8, marginBottom: 16 },
    zoneTab: { 
      flex: 1, 
      padding: '12px 16px', 
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      backgroundColor: 'transparent', 
      fontSize: 11, 
      letterSpacing: 1, 
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'center'
    },
    stage: { 
      backgroundColor: `${colors.champagne}10`, 
      border: `1px solid ${colors.champagne}30`, 
      borderRadius: 10,
      padding: '10px 0', 
      textAlign: 'center', 
      fontSize: 11, 
      fontWeight: 500, 
      color: colors.champagne, 
      letterSpacing: 2, 
      marginBottom: 12
    },
    // Grid
    gridContainer: { overflowX: 'auto' },
    grid: { display: 'grid', gap: 8, padding: 12, backgroundColor: colors.charcoal, border: `1px solid ${colors.border}`, borderRadius: 16, width: 'fit-content' },
    gridCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, letterSpacing: 1, cursor: 'pointer', borderRadius: 10, transition: 'all 0.3s ease' },
    // Alert banner
    alertBanner: { 
      position: 'fixed', top: 0, left: 0, right: 0, 
      background: `linear-gradient(90deg, ${colors.error}, #dc2626)`,
      color: '#fff', padding: 14, textAlign: 'center', 
      fontSize: 12, letterSpacing: 2, textTransform: 'uppercase',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
    },
    warningBanner: {
      position: 'fixed', top: 0, left: 0, right: 0,
      background: `linear-gradient(90deg, ${colors.champagneDark}, ${colors.champagne}, ${colors.champagneDark})`,
      color: colors.noir, padding: 12, textAlign: 'center',
      fontSize: 11, letterSpacing: 2, zIndex: 45, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
    },
    // Empty state
    emptyState: { textAlign: 'center', padding: 56, color: colors.textMuted },
    emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.3 },
    // Floating cart
    floatingCart: { 
      position: 'fixed', bottom: 0, left: 0, right: 0, 
      backgroundColor: colors.onyx, 
      borderTop: `1px solid ${colors.champagne}`, 
      padding: 20, 
      zIndex: 120,
      boxShadow: '0 -8px 32px rgba(0,0,0,0.5)'
    },
    addBtn: { 
      padding: '10px 20px', 
      borderRadius: 10,
      border: `1px solid ${colors.champagne}40`,
      background: `linear-gradient(135deg, ${colors.charcoal}, ${colors.onyx})`,
      color: colors.champagne, 
      fontSize: 11, 
      fontWeight: 500,
      letterSpacing: 1, 
      cursor: 'pointer',
      textTransform: 'uppercase'
    }
  }

  const renderGrid = (forMyTables, forReservations = false) => {
    const cellSize = forMyTables ? 52 : 48
    const zoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    const maxRow = zoneTables.length ? Math.max(...zoneTables.map(t => t.grid_row)) + 1 : 6
    const maxCol = zoneTables.length ? Math.max(...zoneTables.map(t => t.grid_col)) + 1 : 8
    
    return (
      <div style={s.gridContainer}>
        <div style={s.zoneTabs}>
          <button onClick={() => setActiveZone('front')} style={{...s.zoneTab, ...(activeZone === 'front' ? { backgroundColor: colors.champagne, borderColor: colors.champagne, color: colors.noir } : { color: colors.textMuted })}}>🎭 Față</button>
          <button onClick={() => setActiveZone('back')} style={{...s.zoneTab, ...(activeZone === 'back' ? { backgroundColor: colors.champagne, borderColor: colors.champagne, color: colors.noir } : { color: colors.textMuted })}}>🎪 Spate</button>
        </div>
        {activeZone === 'front' && <div style={s.stage}>SCENĂ</div>}
        <div style={{ ...s.grid, gridTemplateColumns: `repeat(${maxCol}, ${cellSize}px)` }}>
          {Array.from({ length: maxRow }).map((_, row) => Array.from({ length: maxCol }).map((_, col) => {
            const t = zoneTables.find(t => t.grid_row === row && t.grid_col === col)
            if (!t) return <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }} />
            const mine = myTableIdsRef.current.includes(t.id)
            const hasRes = reservations.some(r => r.event_table_id === t.id)
            const cfg = { vip: colors.champagne, normal: '#3b82f6', bar: '#8b5cf6' }[t.table_type] || '#3b82f6'
            
            if (forMyTables) {
              const hasAlert = inactiveAlerts.some(a => a.tableId === t.id)
              return (
                <div key={`${row}-${col}`} onClick={() => mine && openTableOptions(t)} style={{ 
                  ...s.gridCell, width: cellSize, height: cellSize, 
                  border: mine ? `2px solid ${hasAlert ? colors.warning : colors.champagne}` : `1px solid ${colors.border}`, 
                  backgroundColor: mine ? (hasAlert ? `${colors.warning}20` : `${colors.champagne}15`) : `${cfg}10`, 
                  color: mine ? (hasAlert ? colors.warning : colors.champagne) : colors.textMuted, 
                  opacity: mine ? 1 : 0.4
                }}>
                  {hasAlert && <span style={{ fontSize: 8, marginBottom: 2 }}>⚠️</span>}
                  {t.table_number}
                </div>
              )
            }
            
            if (forReservations) {
              return (
                <div key={`${row}-${col}`} onClick={() => hasRes && openReservationDetails(t)} style={{ 
                  ...s.gridCell, width: cellSize, height: cellSize, 
                  border: `1px solid ${hasRes ? colors.error : cfg}`, 
                  backgroundColor: hasRes ? `${colors.error}20` : `${cfg}10`, 
                  color: hasRes ? colors.error : cfg
                }}>
                  {hasRes && <span style={{ fontSize: 10 }}>🔒</span>}
                  <span>{t.table_number}</span>
                </div>
              )
            }
            return null
          }))}
        </div>
        {activeZone === 'back' && <div style={{...s.stage, marginTop: 12, marginBottom: 0}}>SCENĂ</div>}
        <div style={{ marginTop: 16, fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>
          {forMyTables ? 'Apasă pe o masă pentru opțiuni' : 'Apasă pe o masă rezervată pentru detalii'}
        </div>
      </div>
    )
  }

  const renderOrderCard = (o, type) => {
    const borderColor = type === 'new' ? colors.error : type === 'preparing' ? colors.warning : colors.success
    const items = o.order_items || []
    
    return (
      <div key={o.id} style={{ ...s.card, borderLeft: `4px solid ${borderColor}` }}>
        <div style={s.cardHeader}>
          <div>
            <div style={s.tableNumber}>{o.event_tables?.table_number || o.table_number}</div>
            <div style={s.orderTime}>🕐 {new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style={s.orderTotal}>{o.total} <span style={{ fontSize: 11, color: colors.textMuted }}>LEI</span></div>
        </div>
        
        <div style={s.itemsList}>
          {items.length > 0 ? items.map((item, idx) => (
            <div key={idx} style={{ ...s.itemRow, borderBottom: idx < items.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <span style={{ color: colors.textPrimary }}>{item.quantity}× {item.name}</span>
              <span style={{ color: colors.textMuted }}>{item.subtotal || item.price * item.quantity} LEI</span>
            </div>
          )) : <div style={{ fontSize: 12, color: colors.textMuted }}>Se încarcă...</div>}
        </div>
        
        <div style={{ ...s.badge, backgroundColor: o.payment_type === 'cash' ? `${colors.success}20` : 'rgba(59,130,246,0.2)', color: o.payment_type === 'cash' ? colors.success : '#3b82f6', marginBottom: 12, display: 'inline-block' }}>
          {o.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}
        </div>
        
        {type === 'new' && (
          <button onClick={() => handleOrderStatus(o.id, 'preparing')} style={{ ...s.btn, ...s.btnSuccess, width: '100%' }}>✓ ACCEPT</button>
        )}
        
        {type === 'preparing' && (
          <button onClick={() => handleOrderStatus(o.id, 'ready')} style={{ ...s.btn, ...s.btnPrimary, width: '100%' }}>✓ GATA DE SERVIT</button>
        )}
        
        {type === 'ready' && (
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12, letterSpacing: 1 }}>ÎNCASEAZĂ {o.total} LEI:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <button onClick={() => handleMarkPaid(o.id, 'cash')} style={{ ...s.btn, ...s.btnSuccess }}>💵 CASH</button>
              <button onClick={() => handleMarkPaid(o.id, 'card')} style={{ ...s.btn, ...s.btnBlue }}>💳 CARD</button>
            </div>
            <button onClick={() => openSplitPayment(o)} style={{ ...s.btn, width: '100%' }}>✂️ PLATĂ PARȚIALĂ</button>
          </div>
        )}
        
        {o.payment_status === 'partial' && (
          <div style={{ marginTop: 12, padding: 12, backgroundColor: `${colors.warning}15`, borderRadius: 10, border: `1px solid ${colors.warning}30` }}>
            <div style={{ fontSize: 11, color: colors.warning, fontWeight: 600 }}>⚠️ Parțial plătit</div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{o.notes}</div>
          </div>
        )}
      </div>
    )
  }

  // ========== LOGIN SCREEN ==========
  if (!waiter) return (
    <div style={s.container}>
      <Head><title>S I P — Staff</title></Head>
      <div style={s.centered}>
        <div style={s.logo}>S I P</div>
        <div style={s.subtitle}>Staff Portal</div>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <label style={s.inputLabel}>Telefon</label>
          <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="07XX XXX XXX" style={s.input} />
          <label style={s.inputLabel}>PIN</label>
          <input type="password" inputMode="numeric" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" maxLength={4} style={{ ...s.input, textAlign: 'center', letterSpacing: 12, fontSize: 20 }} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
          {loginError && <div style={{ color: colors.error, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ ...s.btn, ...s.btnPrimary, width: '100%', padding: 16 }}>INTRĂ</button>
        </div>
        <Link href="/" style={{ marginTop: 48, fontSize: 11, color: colors.textMuted, textDecoration: 'none', letterSpacing: 2 }}>← ÎNAPOI</Link>
      </div>
    </div>
  )

  // ========== LOADING ==========
  if (loading) return (
    <div style={{...s.container, ...s.centered}}>
      <div style={s.logo}>S I P</div>
      <div style={{ fontSize: 11, letterSpacing: 4, color: colors.textMuted, marginTop: 24 }}>SE ÎNCARCĂ...</div>
    </div>
  )

  const newO = orders.filter(o => o.status === 'new')
  const prepO = orders.filter(o => o.status === 'preparing')
  const readyO = orders.filter(o => o.status === 'ready')
  const alertsToShow = inactiveAlerts.filter(a => !dismissedTableIds.has(a.table.id))

  // ========== MAIN DASHBOARD ==========
  return (
    <div style={s.container}>
      <Head><title>S I P — Staff</title></Head>
      
      {newOrderAlert && <div style={s.alertBanner}>🔔 COMANDĂ NOUĂ!</div>}
      
      {alertsToShow.length > 0 && !showAlertsPanel && (
        <div onClick={() => setShowAlertsPanel(true)} style={{ ...s.warningBanner, top: newOrderAlert ? 48 : 0 }}>
          ⚠️ {alertsToShow.length} {alertsToShow.length === 1 ? 'masă necesită' : 'mese necesită'} atenție →
        </div>
      )}
      
      <header style={{ ...s.header, top: (newOrderAlert ? 48 : 0) + (alertsToShow.length > 0 && !showAlertsPanel ? 40 : 0) }}>
        <div style={s.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ textDecoration: 'none' }}><span style={s.logoSmall}>S I P</span></Link>
            <div style={{ width: 1, height: 24, background: `linear-gradient(180deg, transparent, ${colors.borderLight}, transparent)` }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: 2, color: colors.textPrimary }}>👤 {waiter.name}</div>
              <div style={{ fontSize: 10, color: colors.textMuted }}>{selectedEvent?.name}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ ...s.btn, padding: '8px 16px' }}>IEȘI</button>
        </div>
        
        <div style={s.tabs}>
          {[
            { id: 'orders', label: 'Comenzi', count: newO.length },
            { id: 'tables', label: 'Mesele mele' },
            { id: 'reservations', label: 'Rezervări' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...s.tabBtn, ...(activeTab === tab.id ? s.tabBtnActive : { color: colors.textMuted }) }}>
              {tab.label}
              {tab.count > 0 && <span style={{ ...s.badge, backgroundColor: colors.error, color: '#fff', marginLeft: 4 }}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </header>
      
      <div style={{ ...s.content, paddingTop: 140 + (newOrderAlert ? 48 : 0) + (alertsToShow.length > 0 && !showAlertsPanel ? 40 : 0) }}>
        {activeTab === 'orders' && (
          <>
            {myTableIdsRef.current.length === 0 && (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>⚠️</div>
                <p style={{ fontSize: 14, letterSpacing: 1 }}>Nu ai mese atribuite</p>
              </div>
            )}
            
            {prepO.length > 0 && (
              <>
                <div style={s.sectionTitle}>⏳ ÎN PREGĂTIRE ({prepO.length})</div>
                {prepO.map(o => renderOrderCard(o, 'preparing'))}
              </>
            )}
            
            {readyO.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginTop: 24 }}>✓ DE LIVRAT ({readyO.length})</div>
                {readyO.map(o => renderOrderCard(o, 'ready'))}
              </>
            )}
            
            {newO.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginTop: 24 }}>🔔 NOI ({newO.length})</div>
                {newO.map(o => renderOrderCard(o, 'new'))}
              </>
            )}
            
            {newO.length === 0 && prepO.length === 0 && readyO.length === 0 && myTableIdsRef.current.length > 0 && (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>✓</div>
                <p style={{ fontSize: 14, letterSpacing: 1 }}>Nicio comandă activă</p>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'tables' && renderGrid(true)}
        
        {activeTab === 'reservations' && (
          <>
            <div style={s.sectionTitle}>📋 REZERVĂRI</div>
            {renderGrid(false, true)}
            <div style={{ marginTop: 24 }}>
              {reservations.length === 0 ? (
                <div style={s.emptyState}><p>Nicio rezervare</p></div>
              ) : reservations.map(r => {
                const resTable = eventTables.find(t => t.id === r.event_table_id)
                return (
                  <div key={r.id} style={s.card} onClick={() => { setSelectedReservation({ ...r, table: resTable }); setShowReservationModal(true) }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{ width: 48, height: 48, backgroundColor: `${colors.error}20`, border: `1px solid ${colors.error}`, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: colors.error }}>
                        <span>🔒</span>
                        <span style={{ fontWeight: 600 }}>{resTable?.table_number}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: colors.textPrimary }}>{r.customer_name} {r.is_vip && '⭐'}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>🕐 {r.reservation_time} • 👥 {r.party_size}p</div>
                      </div>
                      <span style={{ color: colors.textMuted }}>›</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ========== MODALS ========== */}
      
      {/* Table Options */}
      {showTableModal && selectedTable && (
        <div style={s.modalOverlay} onClick={() => setShowTableModal(false)}>
          <div style={{...s.modalBox, maxHeight: 'auto'}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>{selectedTable.table_number}</span>
              <button onClick={() => setShowTableModal(false)} style={s.closeBtn}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={openOrderModal} style={{ ...s.btn, ...s.btnPrimary, width: '100%', padding: 18 }}>+ COMANDĂ NOUĂ</button>
              <button onClick={openHistoryModal} style={{ ...s.btn, width: '100%', padding: 18 }}>📋 ISTORIC MASĂ</button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {showHistoryModal && selectedTable && (
        <div style={s.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <span style={s.modalTitle}>ISTORIC</span>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{selectedTable.table_number}</div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={s.closeBtn}>×</button>
            </div>
            <div style={s.modalBody}>
              {allTableOrders.length === 0 ? (
                <div style={s.emptyState}><p>Nicio comandă</p></div>
              ) : allTableOrders.map(o => (
                <div key={o.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: colors.textMuted }}>{new Date(o.created_at).toLocaleString('ro-RO')}</span>
                    <span style={{ ...s.badge, backgroundColor: o.status === 'delivered' ? `${colors.success}20` : `${colors.warning}20`, color: o.status === 'delivered' ? colors.success : colors.warning }}>{o.status}</span>
                  </div>
                  <div style={s.itemsList}>
                    {o.order_items?.map((item, idx) => (
                      <div key={idx} style={{ ...s.itemRow, borderBottom: idx < o.order_items.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                        <span>{item.quantity}× {item.name}</span>
                        <span style={{ color: colors.textMuted }}>{item.subtotal} LEI</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ color: colors.champagne, fontWeight: 600 }}>{o.total} LEI</span>
                    <span style={{ fontSize: 12, color: colors.textMuted }}>{o.payment_type === 'cash' ? '💵' : '💳'} {o.payment_status === 'paid' ? '✓ Plătit' : 'Neplătit'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reservation Details */}
      {showReservationModal && selectedReservation && (
        <div style={s.modalOverlay} onClick={() => setShowReservationModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, backgroundColor: `${colors.error}20`, border: `1px solid ${colors.error}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.error }}>🔒</div>
                <span style={s.modalTitle}>{selectedReservation.table?.table_number}</span>
              </div>
              <button onClick={() => setShowReservationModal(false)} style={s.closeBtn}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: colors.textMuted, marginBottom: 8 }}>REZERVARE</div>
                <div style={{ fontSize: 24, fontWeight: 500, color: colors.textPrimary }}>{selectedReservation.customer_name} {selectedReservation.is_vip && '⭐'}</div>
                {selectedReservation.is_vip && <span style={{ ...s.badge, backgroundColor: `${colors.champagne}20`, color: colors.champagne, marginTop: 8, display: 'inline-block' }}>VIP</span>}
              </div>
              <div style={{ backgroundColor: colors.charcoal, padding: 16, borderRadius: 12 }}>
                {[
                  { label: '🕐 Ora', value: selectedReservation.reservation_time },
                  { label: '👥 Persoane', value: selectedReservation.party_size },
                  selectedReservation.customer_phone && { label: '📱 Telefon', value: selectedReservation.customer_phone, isLink: true },
                  { label: '📋 Status', value: selectedReservation.status || 'confirmed' }
                ].filter(Boolean).map((row, idx, arr) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < arr.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <span style={{ color: colors.textMuted, fontSize: 13 }}>{row.label}</span>
                    {row.isLink ? <a href={`tel:${row.value}`} style={{ color: colors.champagne, textDecoration: 'none', fontWeight: 500 }}>{row.value}</a> : <span style={{ fontWeight: 500 }}>{row.value}</span>}
                  </div>
                ))}
              </div>
              {selectedReservation.notes && (
                <div style={{ marginTop: 16, padding: 14, backgroundColor: `${colors.warning}15`, borderRadius: 10, border: `1px solid ${colors.warning}30` }}>
                  <div style={{ fontSize: 10, color: colors.warning, fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>📝 NOTE</div>
                  <div style={{ fontSize: 13, color: colors.textPrimary }}>{selectedReservation.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && selectedTable && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: colors.noir, zIndex: 110, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...s.modalHeader, borderRadius: 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 2 }}>COMANDĂ — {selectedTable.table_number}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{cart.length} produse • {cartTotal} LEI</div>
            </div>
            <button onClick={() => { setShowOrderModal(false); setCart([]) }} style={s.closeBtn}>×</button>
          </div>
          
          {orderError && <div style={{ padding: 14, backgroundColor: colors.error, color: '#fff', textAlign: 'center', fontSize: 12 }}>Eroare: {orderError}</div>}
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: cart.length > 0 ? 240 : 20 }}>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Caută produs..." style={{ ...s.input, marginBottom: 0 }} />
            </div>
            
            {!searchQuery && popularItems.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginBottom: 12 }}>🔥 POPULAR</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                  {popularItems.map(i => (
                    <button key={i.id} onClick={() => addToCart(i)} style={{ ...s.badge, backgroundColor: `${colors.error}20`, color: colors.error, border: `1px solid ${colors.error}40`, cursor: 'pointer', padding: '8px 14px' }}>{i.name}</button>
                  ))}
                </div>
              </>
            )}
            
            {categories.map(cat => {
              const items = filteredMenu.filter(m => m.category_id === cat.id && m.is_available !== false)
              if (!items.length) return null
              return (
                <div key={cat.id} style={{ marginBottom: 24 }}>
                  <div style={{ ...s.sectionTitle, color: colors.champagne, marginBottom: 12 }}>{cat.name?.toUpperCase()}</div>
                  {items.map(i => {
                    const inCart = cart.find(c => c.id === i.id)
                    return (
                      <div key={i.id} style={{ ...s.card, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, paddingRight: 16 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, color: colors.textPrimary, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {i.name}
                              {i.badge && <span style={{ ...s.badge, backgroundColor: i.badge === 'popular' ? `${colors.error}20` : `${colors.champagne}20`, color: i.badge === 'popular' ? colors.error : colors.champagne }}>{i.badge}</span>}
                            </div>
                            {i.description && <div style={{ fontSize: 12, color: colors.textMuted }}>{i.description}</div>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                            <div><span style={{ fontSize: 18, fontWeight: 600, color: colors.champagne }}>{i.default_price}</span> <span style={{ fontSize: 11, color: colors.textMuted }}>LEI</span></div>
                            {inCart ? (
                              <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: `1px solid ${colors.champagne}`, overflow: 'hidden' }}>
                                <button onClick={() => removeFromCart(i.id)} style={{ width: 36, height: 36, border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer', fontSize: 18 }}>−</button>
                                <span style={{ width: 36, textAlign: 'center', color: colors.champagne, fontWeight: 600 }}>{inCart.qty}</span>
                                <button onClick={() => addToCart(i)} style={{ width: 36, height: 36, border: 'none', backgroundColor: 'transparent', color: colors.champagne, cursor: 'pointer', fontSize: 18 }}>+</button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(i)} style={s.addBtn}>+ ADAUGĂ</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          
          {cart.length > 0 && (
            <div style={s.floatingCart}>
              <div style={{ maxHeight: 100, overflowY: 'auto', marginBottom: 12 }}>
                {cart.map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => removeFromCart(i.id)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', backgroundColor: colors.error, color: '#fff', cursor: 'pointer', fontSize: 16 }}>−</button>
                      <span style={{ fontSize: 13 }}>{i.qty}× {i.name}</span>
                    </div>
                    <span style={{ color: colors.champagne }}>{i.default_price * i.qty} LEI</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${colors.border}`, marginBottom: 16 }}>
                <span style={{ fontSize: 12, letterSpacing: 2, color: colors.textMuted }}>TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 600, color: colors.champagne }}>{cartTotal} LEI</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button onClick={() => handlePlaceOrder('cash')} style={{ ...s.btn, ...s.btnSuccess, padding: 16 }}>💵 CASH</button>
                <button onClick={() => handlePlaceOrder('card')} style={{ ...s.btn, ...s.btnBlue, padding: 16 }}>💳 CARD</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inactive Alerts */}
      {showAlertsPanel && (
        <div style={s.modalOverlay} onClick={() => setShowAlertsPanel(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>⚠️ MESE INACTIVE</span>
              <button onClick={() => setShowAlertsPanel(false)} style={s.closeBtn}>×</button>
            </div>
            <div style={s.modalBody}>
              {inactiveAlerts.length === 0 ? (
                <div style={s.emptyState}><div style={s.emptyIcon}>✓</div><p>Toate mesele sunt OK</p></div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Mese fără comandă de peste {INACTIVE_MINUTES} minute:</div>
                  {inactiveAlerts.map(alert => (
                    <div key={alert.tableId} style={{ ...s.card, borderColor: colors.warning }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, backgroundColor: `${colors.warning}20`, border: `1px solid ${colors.warning}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: colors.warning }}>{alert.table.table_number}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: colors.textPrimary }}>{alert.message}</div>
                          {alert.table.table_type === 'vip' && <div style={{ fontSize: 10, color: colors.champagne, marginTop: 4 }}>⭐ VIP</div>}
                        </div>
                        <button onClick={() => { setSelectedTable(alert.table); setShowAlertsPanel(false); setShowTableModal(true) }} style={{ ...s.btn, ...s.btnPrimary, padding: '10px 16px' }}>+ COMANDĂ</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setDismissedTableIds(new Set([...dismissedTableIds, ...inactiveAlerts.map(a => a.table.id)])); setShowAlertsPanel(false) }} style={{ ...s.btn, width: '100%', marginTop: 12 }}>✓ AM VERIFICAT TOATE</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split Payment */}
      {splitPaymentOrder && (
        <div style={s.modalOverlay} onClick={closeSplitPayment}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <span style={s.modalTitle}>PLATĂ PARȚIALĂ</span>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{splitPaymentOrder.event_tables?.table_number}</div>
              </div>
              <button onClick={closeSplitPayment} style={s.closeBtn}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Selectează ce plătește clientul:</div>
              {splitPaymentOrder.order_items?.map((item, idx) => {
                const selectedQty = selectedItemsForPayment[idx] || 0
                const unitPrice = (item.subtotal || item.price * item.quantity) / item.quantity
                const isSelected = selectedQty > 0
                return (
                  <div key={idx} style={{ ...s.card, borderColor: isSelected ? colors.champagne : colors.border, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => selectAllOfItem(idx)}>
                        <div style={{ fontWeight: 500, color: colors.textPrimary }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>{Math.round(unitPrice)} LEI/buc</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => adjustItemQty(idx, -1)} style={{ width: 36, height: 36, border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.textPrimary, cursor: 'pointer', fontSize: 18 }}>−</button>
                        <div style={{ width: 50, textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: isSelected ? colors.champagne : colors.textPrimary }}>{selectedQty}</div>
                          <div style={{ fontSize: 9, color: colors.textMuted }}>din {item.quantity}</div>
                        </div>
                        <button onClick={() => adjustItemQty(idx, 1)} style={{ width: 36, height: 36, border: `1px solid ${colors.champagne}`, borderRadius: 8, backgroundColor: colors.champagne, color: colors.noir, cursor: 'pointer', fontSize: 18 }}>+</button>
                      </div>
                      <div style={{ width: 70, textAlign: 'right', color: isSelected ? colors.champagne : colors.textMuted, fontWeight: 600 }}>{Math.round(unitPrice * selectedQty)} LEI</div>
                    </div>
                  </div>
                )
              })}
              <div style={{ ...s.card, marginTop: 20, backgroundColor: colors.charcoal }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 1 }}>ÎNCASEZI ACUM</span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: colors.champagne }}>{getSelectedTotal()} LEI</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 1 }}>RĂMÂNE</span>
                  <span style={{ fontSize: 14, color: colors.warning }}>{splitPaymentOrder.total - getSelectedTotal()} LEI</span>
                </div>
              </div>
              {hasSelectedItems() && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                  <button onClick={() => handlePartialPayment('cash')} style={{ ...s.btn, ...s.btnSuccess, padding: 16 }}>💵 CASH</button>
                  <button onClick={() => handlePartialPayment('card')} style={{ ...s.btn, ...s.btnBlue, padding: 16 }}>💳 CARD</button>
                </div>
              )}
              <button onClick={closeSplitPayment} style={{ width: '100%', marginTop: 16, background: 'none', border: 'none', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}>Anulează</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        html, body { margin: 0; padding: 0; }
        * { box-sizing: border-box; }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  )
}
