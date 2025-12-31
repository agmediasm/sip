import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventMenu, getCategories, loginWaiter, getTableAssignments, getEventReservations, createOrder, createOrderItems } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

// Premium Icons (matching menu style)
const Icons = {
  Bell: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  Minus: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  CreditCard: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
  Banknote: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m9 18 6-6-6-6"/></svg>,
  Grid: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  AlertTriangle: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Scissors: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/></svg>,
  ClipboardList: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
  LogOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  Star: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Flame: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
}

// Premium colors (matching menu)
const colors = {
  noir: '#08080a',
  onyx: '#1a1a1c',
  champagne: '#d4af37',
  platinum: '#e5e4e2',
  ivory: '#fffff0',
  border: 'rgba(255,255,255,0.15)',
  textMuted: 'rgba(255,255,255,0.65)',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  vip: '#d4af37',
  normal: '#3b82f6',
  bar: '#8b5cf6'
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

  const hasSelectedItems = () => {
    return Object.values(selectedItemsForPayment).some(qty => qty > 0)
  }

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
        const minutesAgo = lastOrder 
          ? Math.round((Date.now() - new Date(lastOrder.created_at)) / 60000)
          : null
        
        alerts.push({
          tableId,
          table,
          lastOrder,
          minutesAgo,
          message: lastOrder 
            ? `${minutesAgo} min fără comandă (ultima: ${lastOrder.total} LEI)`
            : 'Nicio comandă încă'
        })
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
      
      if (orderError) {
        setOrderError(orderError.message)
        alert('Eroare la creare comandă: ' + orderError.message)
        return
      }
      
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        price: item.default_price,
        quantity: item.qty,
        subtotal: item.default_price * item.qty
      }))
      
      const { error: itemsError } = await createOrderItems(orderItems)
      
      if (itemsError) {
        setOrderError(itemsError.message)
        alert('Eroare la adăugare produse: ' + itemsError.message)
        return
      }
      
      setShowOrderModal(false)
      setCart([])
      setSelectedTable(null)
      loadOrders()
      
    } catch (err) {
      setOrderError(err.message)
      alert('Eroare: ' + err.message)
    }
  }

  const filteredMenu = searchQuery ? menuItems.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase())) : menuItems
  const popularItems = menuItems.filter(m => m.badge === 'popular').slice(0, 5)

  const openReservationDetails = (table) => {
    const res = reservations.find(r => r.event_table_id === table.id)
    if (res) {
      setSelectedReservation({ ...res, table })
      setShowReservationModal(true)
    }
  }

  // Premium Styles
  const s = {
    container: { 
      minHeight: '100vh', 
      backgroundColor: colors.noir, 
      color: colors.ivory, 
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontWeight: '300'
    },
    // Login
    loginContainer: { 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 32 
    },
    loginLogo: {
      fontSize: 56,
      fontWeight: 300,
      letterSpacing: 24,
      color: colors.champagne,
      marginBottom: 8
    },
    loginSubtitle: {
      fontSize: 10,
      letterSpacing: 6,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 56
    },
    loginBox: {
      width: '100%',
      maxWidth: 320
    },
    inputLabel: {
      fontSize: 10,
      letterSpacing: 3,
      color: colors.textMuted,
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: 10
    },
    input: { 
      width: '100%', 
      padding: '18px 20px', 
      border: `1px solid ${colors.border}`, 
      backgroundColor: 'transparent', 
      color: colors.ivory, 
      fontSize: 15, 
      fontWeight: 300,
      letterSpacing: 1,
      marginBottom: 20, 
      borderRadius: 0, 
      outline: 'none', 
      boxSizing: 'border-box',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    },
    inputPin: {
      textAlign: 'center',
      letterSpacing: 12,
      fontSize: 24,
      fontWeight: 300
    },
    // Header
    header: { 
      backgroundColor: colors.noir, 
      borderBottom: `1px solid ${colors.border}`, 
      padding: '16px 20px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      position: 'sticky', 
      top: 0, 
      zIndex: 40 
    },
    logo: { 
      fontSize: 18, 
      fontWeight: 300, 
      letterSpacing: 6, 
      color: colors.champagne 
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: colors.success
    },
    waiterName: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: 1,
      color: colors.platinum
    },
    logoutBtn: {
      padding: '8px 16px',
      border: `1px solid ${colors.border}`,
      backgroundColor: 'transparent',
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: 2,
      textTransform: 'uppercase',
      cursor: 'pointer'
    },
    // Event selector
    eventBar: {
      padding: '16px 20px',
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: colors.onyx
    },
    select: { 
      width: '100%', 
      padding: '14px 16px', 
      border: `1px solid ${colors.border}`, 
      backgroundColor: 'transparent', 
      color: colors.ivory, 
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: 1,
      borderRadius: 0, 
      boxSizing: 'border-box',
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer'
    },
    // Tabs
    tabs: { 
      display: 'flex', 
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: colors.noir
    },
    tab: { 
      flex: 1, 
      padding: '16px 12px', 
      border: 'none', 
      background: 'none', 
      fontSize: 11, 
      fontWeight: 400, 
      letterSpacing: 2,
      textTransform: 'uppercase',
      cursor: 'pointer', 
      borderBottom: '1px solid transparent', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transition: 'all 0.2s'
    },
    // Content
    content: { 
      padding: 20 
    },
    sectionTitle: { 
      fontSize: 11, 
      fontWeight: 400, 
      letterSpacing: 3, 
      color: colors.textMuted, 
      marginBottom: 20, 
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    },
    // Order Card
    card: { 
      backgroundColor: colors.onyx, 
      border: `1px solid ${colors.border}`, 
      padding: 20, 
      marginBottom: 16
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16
    },
    tableNumber: {
      fontSize: 20,
      fontWeight: 400,
      letterSpacing: 2,
      color: colors.ivory
    },
    orderTime: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4
    },
    orderTotal: {
      fontSize: 22,
      fontWeight: 300,
      letterSpacing: 1,
      color: colors.champagne
    },
    itemsList: {
      backgroundColor: colors.noir,
      padding: 16,
      marginBottom: 16
    },
    itemRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 0.5
    },
    paymentBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 11,
      letterSpacing: 1,
      padding: '8px 14px',
      borderRadius: 0
    },
    // Buttons
    btn: { 
      padding: '14px 24px', 
      border: 'none', 
      fontSize: 11, 
      fontWeight: 400, 
      letterSpacing: 2,
      textTransform: 'uppercase',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transition: 'all 0.2s'
    },
    btnPrimary: {
      backgroundColor: colors.champagne,
      color: colors.noir
    },
    btnSuccess: {
      backgroundColor: colors.success,
      color: '#fff'
    },
    btnOutline: {
      backgroundColor: 'transparent',
      border: `1px solid ${colors.border}`,
      color: colors.textMuted
    },
    btnSm: { 
      padding: '10px 16px', 
      border: 'none', 
      fontSize: 10, 
      fontWeight: 400, 
      letterSpacing: 2,
      textTransform: 'uppercase',
      cursor: 'pointer' 
    },
    // Modal
    modalOverlay: { 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.9)', 
      zIndex: 100
    },
    modal: { 
      position: 'fixed', 
      inset: 0, 
      zIndex: 100, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 16 
    },
    modalBox: { 
      backgroundColor: colors.onyx, 
      width: '100%', 
      maxWidth: 400, 
      border: `1px solid ${colors.border}`, 
      maxHeight: '90vh', 
      overflowY: 'auto' 
    },
    modalHeader: { 
      padding: 20, 
      borderBottom: `1px solid ${colors.border}`, 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    },
    modalTitle: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 3,
      textTransform: 'uppercase'
    },
    modalBody: { 
      padding: 20 
    },
    closeBtn: {
      width: 40,
      height: 40,
      border: `1px solid ${colors.border}`,
      backgroundColor: 'transparent',
      color: colors.textMuted,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    },
    // Zone Tabs
    zoneTabs: { 
      display: 'flex', 
      marginBottom: 16, 
      border: `1px solid ${colors.border}`
    },
    zoneTab: { 
      flex: 1, 
      padding: '12px 20px', 
      border: 'none', 
      fontSize: 11, 
      fontWeight: 400, 
      letterSpacing: 2,
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    stage: { 
      backgroundColor: `${colors.champagne}10`, 
      border: `1px solid ${colors.champagne}40`, 
      padding: '10px 0', 
      textAlign: 'center', 
      fontSize: 10, 
      fontWeight: 400, 
      color: colors.champagne, 
      letterSpacing: 3, 
      marginBottom: 12,
      textTransform: 'uppercase'
    },
    // Grid
    gridContainer: {
      overflowX: 'auto',
      padding: 4
    },
    grid: {
      display: 'grid',
      gap: 6,
      padding: 12,
      backgroundColor: colors.noir,
      border: `1px solid ${colors.border}`,
      width: 'fit-content'
    },
    gridCell: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 1,
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    // Floating Cart
    floatingCart: { 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      backgroundColor: colors.onyx, 
      borderTop: `1px solid ${colors.champagne}`, 
      padding: 20, 
      zIndex: 120 
    },
    cartItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      fontSize: 13
    },
    cartTotal: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTop: `1px solid ${colors.border}`,
      marginTop: 12,
      marginBottom: 16
    },
    // Add button (circular)
    addBtn: { 
      width: 36, 
      height: 36, 
      border: `1px solid ${colors.champagne}`, 
      backgroundColor: colors.champagne, 
      color: colors.noir, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      cursor: 'pointer',
      flexShrink: 0
    },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      border: 'none',
      backgroundColor: colors.error,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    },
    // Alert banner
    alertBanner: { 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      backgroundColor: colors.error, 
      color: '#fff', 
      padding: 14, 
      textAlign: 'center', 
      fontWeight: 400,
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10
    },
    warningBanner: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.warning,
      color: colors.noir,
      padding: 12,
      textAlign: 'center',
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: 1,
      zIndex: 45,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10
    },
    // Empty state
    emptyState: {
      textAlign: 'center',
      padding: 56,
      color: colors.textMuted
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 20,
      opacity: 0.5
    },
    emptyText: {
      fontSize: 13,
      letterSpacing: 2
    }
  }

  const renderGrid = (forMyTables, forReservations = false) => {
    const cellSize = forMyTables ? 50 : 46, gap = 6
    const zoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    const maxRow = zoneTables.length ? Math.max(...zoneTables.map(t => t.grid_row)) + 1 : 6
    const maxCol = zoneTables.length ? Math.max(...zoneTables.map(t => t.grid_col)) + 1 : 8
    
    return (
      <div style={s.gridContainer}>
        <div style={s.zoneTabs}>
          <button onClick={() => setActiveZone('front')} style={{...s.zoneTab, backgroundColor: activeZone === 'front' ? colors.champagne : 'transparent', color: activeZone === 'front' ? colors.noir : colors.textMuted}}>Față</button>
          <button onClick={() => setActiveZone('back')} style={{...s.zoneTab, backgroundColor: activeZone === 'back' ? colors.champagne : 'transparent', color: activeZone === 'back' ? colors.noir : colors.textMuted}}>Spate</button>
        </div>
        {activeZone === 'front' && <div style={s.stage}>Scenă</div>}
        <div style={{ ...s.grid, gridTemplateColumns: `repeat(${maxCol}, ${cellSize}px)` }}>
          {Array.from({ length: maxRow }).map((_, row) => Array.from({ length: maxCol }).map((_, col) => {
            const t = zoneTables.find(t => t.grid_row === row && t.grid_col === col)
            if (!t) return <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }} />
            const mine = myTableIdsRef.current.includes(t.id)
            const tableReservation = reservations.find(r => r.event_table_id === t.id)
            const hasRes = !!tableReservation
            const cfg = { vip: colors.vip, normal: colors.normal, bar: colors.bar }[t.table_type] || colors.normal
            
            if (forMyTables) {
              const hasAlert = inactiveAlerts.some(a => a.tableId === t.id)
              return (
                <div key={`${row}-${col}`} onClick={() => mine && openTableOptions(t)} style={{ 
                  ...s.gridCell,
                  width: cellSize, 
                  height: cellSize, 
                  border: mine ? `2px solid ${hasAlert ? colors.warning : colors.champagne}` : `1px solid ${colors.border}`, 
                  backgroundColor: mine ? (hasAlert ? `${colors.warning}20` : `${colors.champagne}15`) : `${cfg}10`, 
                  color: mine ? (hasAlert ? colors.warning : colors.champagne) : colors.textMuted, 
                  opacity: mine ? 1 : 0.4,
                  position: 'relative'
                }}>
                  {hasAlert && <Icons.AlertTriangle style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, color: colors.warning }} />}
                  {t.table_number}
                </div>
              )
            }
            
            if (forReservations) {
              return (
                <div key={`${row}-${col}`} onClick={() => hasRes && openReservationDetails(t)} style={{ 
                  ...s.gridCell,
                  width: cellSize, 
                  height: cellSize, 
                  border: `1px solid ${hasRes ? colors.error : cfg}`, 
                  backgroundColor: hasRes ? `${colors.error}20` : `${cfg}10`, 
                  color: hasRes ? colors.error : cfg,
                  gap: 2
                }}>
                  {hasRes && <Icons.Lock />}
                  <span>{t.table_number}</span>
                </div>
              )
            }
            
            return (
              <div key={`${row}-${col}`} style={{ ...s.gridCell, width: cellSize, height: cellSize, border: `1px solid ${hasRes ? colors.warning : mine ? colors.champagne : cfg}`, backgroundColor: hasRes ? `${colors.warning}15` : mine ? `${colors.champagne}15` : `${cfg}10`, color: hasRes ? colors.warning : mine ? colors.champagne : cfg }}>
                {t.table_number}
              </div>
            )
          }))}
        </div>
        {activeZone === 'back' && <div style={{...s.stage, marginTop: 12, marginBottom: 0}}>Scenă</div>}
        {forMyTables && (
          <div style={{ marginTop: 20, fontSize: 11, color: colors.textMuted, textAlign: 'center', letterSpacing: 1 }}>Apasă pe o masă pentru opțiuni</div>
        )}
        {forReservations && (
          <div style={{ marginTop: 16, fontSize: 11, color: colors.textMuted, letterSpacing: 1 }}>
            Apasă pe masa rezervată pentru detalii
          </div>
        )}
      </div>
    )
  }

  const renderOrderCard = (o, type) => {
    const borderColor = type === 'new' ? colors.error : type === 'preparing' ? colors.warning : colors.success
    const items = o.order_items || []
    
    return (
      <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${borderColor}` }}>
        <div style={s.cardHeader}>
          <div>
            <div style={s.tableNumber}>{o.event_tables?.table_number || o.table_number || 'Masă'}</div>
            <div style={s.orderTime}>
              <Icons.Clock />
              {new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div style={s.orderTotal}>{o.total} <span style={{ fontSize: 12, color: colors.textMuted }}>LEI</span></div>
        </div>
        
        <div style={s.itemsList}>
          {items.length > 0 ? items.map((item, idx) => (
            <div key={idx} style={{ ...s.itemRow, borderBottom: idx < items.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <span style={{ color: colors.ivory }}>{item.quantity}× {item.name}</span>
              <span style={{ color: colors.textMuted }}>{item.subtotal || item.price * item.quantity} LEI</span>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>Se încarcă...</div>
          )}
        </div>
        
        <div style={{ ...s.paymentBadge, backgroundColor: o.payment_type === 'cash' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${o.payment_type === 'cash' ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.3)'}`, color: o.payment_type === 'cash' ? colors.success : colors.normal, marginBottom: 16 }}>
          {o.payment_type === 'cash' ? <Icons.Banknote /> : <Icons.CreditCard />}
          {o.payment_type === 'cash' ? 'Cash' : 'Card'}
        </div>
        
        {type === 'new' && (
          <button onClick={() => handleOrderStatus(o.id, 'preparing')} style={{ ...s.btn, ...s.btnSuccess, width: '100%' }}>
            <Icons.Check /> Accept
          </button>
        )}
        
        {type === 'preparing' && (
          <button onClick={() => handleOrderStatus(o.id, 'ready')} style={{ ...s.btn, ...s.btnPrimary, width: '100%' }}>
            <Icons.Check /> Gata de servit
          </button>
        )}
        
        {type === 'ready' && (
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Încasează {o.total} LEI</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => handleMarkPaid(o.id, 'cash')} style={{ ...s.btn, ...s.btnSuccess }}>
                <Icons.Banknote /> Cash
              </button>
              <button onClick={() => handleMarkPaid(o.id, 'card')} style={{ ...s.btn, backgroundColor: colors.normal, color: '#fff' }}>
                <Icons.CreditCard /> Card
              </button>
            </div>
            <button onClick={() => openSplitPayment(o)} style={{ ...s.btn, ...s.btnOutline, width: '100%', marginTop: 12 }}>
              <Icons.Scissors /> Plată parțială
            </button>
          </div>
        )}
        
        {o.payment_status === 'partial' && (
          <div style={{ marginTop: 12, padding: 14, backgroundColor: `${colors.warning}10`, border: `1px solid ${colors.warning}40` }}>
            <div style={{ fontSize: 11, color: colors.warning, fontWeight: 500, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.AlertTriangle /> Parțial plătit
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>{o.notes}</div>
          </div>
        )}
      </div>
    )
  }

  // Login Screen
  if (!waiter) return (
    <div style={s.container}>
      <Head><title>S I P — Staff</title></Head>
      <div style={s.loginContainer}>
        <div style={s.loginLogo}>S I P</div>
        <div style={s.loginSubtitle}>Staff Portal</div>
        <div style={s.loginBox}>
          <div>
            <label style={s.inputLabel}>Telefon</label>
            <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="07XX XXX XXX" style={s.input} />
          </div>
          <div>
            <label style={s.inputLabel}>PIN</label>
            <input type="password" inputMode="numeric" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" maxLength={4} style={{ ...s.input, ...s.inputPin }} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
          </div>
          {loginError && <div style={{ color: colors.error, fontSize: 12, textAlign: 'center', marginBottom: 20, letterSpacing: 1 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ ...s.btn, ...s.btnPrimary, width: '100%', padding: 18 }}>Intră</button>
        </div>
        <Link href="/" style={{ marginTop: 56, fontSize: 11, color: colors.textMuted, textDecoration: 'none', letterSpacing: 2 }}>← Înapoi</Link>
      </div>
    </div>
  )

  // Loading
  if (loading) return (
    <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 16, color: colors.champagne, marginBottom: 16 }}>S I P</div>
        <div style={{ fontSize: 11, letterSpacing: 4, color: colors.textMuted }}>SE ÎNCARCĂ...</div>
      </div>
    </div>
  )

  const newO = orders.filter(o => o.status === 'new')
  const prepO = orders.filter(o => o.status === 'preparing')
  const readyO = orders.filter(o => o.status === 'ready')

  return (
    <div style={s.container}>
      <Head><title>S I P — Staff</title></Head>
      
      {newOrderAlert && (
        <div style={s.alertBanner}>
          <Icons.Bell /> Comandă nouă!
        </div>
      )}
      
      {inactiveAlerts.filter(a => !dismissedTableIds.has(a.table.id)).length > 0 && !showAlertsPanel && (
        <div onClick={() => setShowAlertsPanel(true)} style={{ ...s.warningBanner, top: newOrderAlert ? 48 : 0 }}>
          <Icons.AlertTriangle />
          <span>{inactiveAlerts.filter(a => !dismissedTableIds.has(a.table.id)).length} {inactiveAlerts.filter(a => !dismissedTableIds.has(a.table.id)).length === 1 ? 'masă necesită' : 'mese necesită'} atenție</span>
          <Icons.ChevronRight />
        </div>
      )}
      
      <header style={s.header}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={s.logo}>S I P</span></Link>
        <div style={s.headerRight}>
          <div style={s.statusDot} />
          <span style={s.waiterName}>
            <Icons.User />
            {waiter.name}
          </span>
          <button onClick={handleLogout} style={s.logoutBtn}>
            <Icons.LogOut />
          </button>
        </div>
      </header>
      
      <div style={s.eventBar}>
        <select value={selectedEvent?.id || ''} onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value))} style={s.select}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} — {new Date(ev.event_date).toLocaleDateString('ro-RO')}</option>)}
        </select>
      </div>
      
      <div style={s.tabs}>
        {[
          { id: 'orders', label: 'Comenzi', icon: Icons.Bell, count: newO.length },
          { id: 'tables', label: 'Mese', icon: Icons.Grid },
          { id: 'reservations', label: 'Rezervări', icon: Icons.Calendar }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'}}>
              <Icon />
              {tab.label}
              {tab.count > 0 && <span style={{ backgroundColor: colors.error, color: '#fff', fontSize: 10, padding: '2px 6px', marginLeft: 4 }}>{tab.count}</span>}
            </button>
          )
        })}
      </div>
      
      <div style={s.content}>
        {activeTab === 'orders' && (
          <>
            {myTableIdsRef.current.length === 0 && (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}><Icons.AlertTriangle /></div>
                <p style={s.emptyText}>Nu ai mese atribuite</p>
              </div>
            )}
            
            {prepO.length > 0 && (
              <>
                <div style={s.sectionTitle}>
                  <Icons.Clock /> În pregătire ({prepO.length})
                </div>
                {prepO.map(o => renderOrderCard(o, 'preparing'))}
              </>
            )}
            
            {readyO.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginTop: 32 }}>
                  <Icons.Check /> De livrat ({readyO.length})
                </div>
                {readyO.map(o => renderOrderCard(o, 'ready'))}
              </>
            )}
            
            {newO.length > 0 && (
              <>
                <div style={{ ...s.sectionTitle, marginTop: 32 }}>
                  <Icons.Bell /> Noi ({newO.length})
                </div>
                {newO.map(o => renderOrderCard(o, 'new'))}
              </>
            )}
            
            {newO.length === 0 && prepO.length === 0 && readyO.length === 0 && myTableIdsRef.current.length > 0 && (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}><Icons.Check /></div>
                <p style={s.emptyText}>Nicio comandă activă</p>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'tables' && renderGrid(true)}
        
        {activeTab === 'reservations' && (
          <>
            <div style={s.sectionTitle}><Icons.Calendar /> Rezervări</div>
            {renderGrid(false, true)}
            <div style={{ marginTop: 28 }}>
              {reservations.length === 0 ? (
                <div style={s.emptyState}>
                  <p style={s.emptyText}>Nicio rezervare</p>
                </div>
              ) : reservations.map(r => {
                const resTable = eventTables.find(t => t.id === r.event_table_id)
                return (
                  <div key={r.id} style={s.card} onClick={() => { setSelectedReservation({ ...r, table: resTable }); setShowReservationModal(true) }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{ width: 48, height: 48, backgroundColor: `${colors.error}15`, border: `1px solid ${colors.error}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: colors.error, gap: 2 }}>
                        <Icons.Lock />
                        <span>{resTable?.table_number || '?'}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 400, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.customer_name}
                          {r.is_vip && <Icons.Star style={{ color: colors.champagne }} />}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icons.Clock /> {r.reservation_time}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icons.Users /> {r.party_size}p</span>
                        </div>
                      </div>
                      <Icons.ChevronRight style={{ color: colors.textMuted }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Table Options Modal */}
      {showTableModal && selectedTable && (
        <div style={s.modal} onClick={() => setShowTableModal(false)}>
          <div style={{...s.modalBox, maxWidth: 340}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>{selectedTable.table_number}</span>
              <button onClick={() => setShowTableModal(false)} style={s.closeBtn}><Icons.X /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={openOrderModal} style={{ ...s.btn, ...s.btnPrimary, width: '100%', padding: 18 }}>
                <Icons.Plus /> Comandă nouă
              </button>
              <button onClick={openHistoryModal} style={{ ...s.btn, ...s.btnOutline, width: '100%', padding: 18 }}>
                <Icons.ClipboardList /> Istoric masă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedTable && (
        <div style={s.modal} onClick={() => setShowHistoryModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <span style={s.modalTitle}>Istoric</span>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{selectedTable.table_number}</div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={s.closeBtn}><Icons.X /></button>
            </div>
            <div style={s.modalBody}>
              {allTableOrders.length === 0 ? (
                <div style={s.emptyState}><p style={s.emptyText}>Nicio comandă</p></div>
              ) : allTableOrders.map(o => (
                <div key={o.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: colors.textMuted }}>{new Date(o.created_at).toLocaleString('ro-RO')}</span>
                    <span style={{ fontSize: 10, padding: '4px 10px', backgroundColor: o.status === 'delivered' ? `${colors.success}20` : o.status === 'new' ? `${colors.error}20` : `${colors.warning}20`, color: o.status === 'delivered' ? colors.success : o.status === 'new' ? colors.error : colors.warning, letterSpacing: 1, textTransform: 'uppercase' }}>{o.status}</span>
                  </div>
                  <div style={s.itemsList}>
                    {o.order_items && o.order_items.length > 0 ? o.order_items.map((item, idx) => (
                      <div key={idx} style={{ ...s.itemRow, borderBottom: idx < o.order_items.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                        <span>{item.quantity}× {item.name}</span>
                        <span style={{ color: colors.textMuted }}>{item.subtotal || item.price * item.quantity} LEI</span>
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, color: colors.textMuted }}>—</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                    <span style={{ fontWeight: 400, color: colors.champagne }}>{o.total} LEI</span>
                    <span style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {o.payment_type === 'cash' ? <Icons.Banknote /> : <Icons.CreditCard />}
                      {o.payment_status === 'paid' ? 'Plătit' : 'Neplătit'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reservation Details Modal */}
      {showReservationModal && selectedReservation && (
        <div style={s.modal} onClick={() => setShowReservationModal(false)}>
          <div style={{...s.modalBox, maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, backgroundColor: `${colors.error}20`, border: `1px solid ${colors.error}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.error }}>
                  <Icons.Lock />
                </div>
                <span style={s.modalTitle}>{selectedReservation.table?.table_number}</span>
              </div>
              <button onClick={() => setShowReservationModal(false)} style={s.closeBtn}><Icons.X /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 10 }}>Rezervare</div>
                <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: 1, color: colors.ivory, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {selectedReservation.customer_name}
                  {selectedReservation.is_vip && <Icons.Star style={{ color: colors.champagne }} />}
                </div>
                {selectedReservation.is_vip && (
                  <span style={{ fontSize: 9, letterSpacing: 2, padding: '6px 14px', backgroundColor: `${colors.vip}20`, color: colors.vip, border: `1px solid ${colors.vip}40`, textTransform: 'uppercase' }}>VIP</span>
                )}
              </div>
              
              <div style={{ backgroundColor: colors.noir, padding: 20, marginBottom: 20 }}>
                {[
                  { icon: Icons.Clock, label: 'Ora', value: selectedReservation.reservation_time },
                  { icon: Icons.Users, label: 'Persoane', value: selectedReservation.party_size },
                  selectedReservation.customer_phone && { icon: Icons.Phone, label: 'Telefon', value: selectedReservation.customer_phone, isLink: true },
                  selectedReservation.customer_email && { icon: Icons.Mail, label: 'Email', value: selectedReservation.customer_email },
                  { icon: Icons.Check, label: 'Status', value: selectedReservation.status || 'confirmed', isStatus: true }
                ].filter(Boolean).map((row, idx, arr) => {
                  const Icon = row.icon
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < arr.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                      <span style={{ color: colors.textMuted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Icon /> {row.label}</span>
                      {row.isLink ? (
                        <a href={`tel:${row.value}`} style={{ fontWeight: 400, color: colors.champagne, textDecoration: 'none', fontSize: 14 }}>{row.value}</a>
                      ) : row.isStatus ? (
                        <span style={{ fontWeight: 400, color: row.value === 'confirmed' ? colors.success : colors.warning, fontSize: 14, textTransform: 'capitalize' }}>{row.value}</span>
                      ) : (
                        <span style={{ fontWeight: 400, fontSize: 14 }}>{row.value}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {selectedReservation.notes && (
                <div style={{ backgroundColor: `${colors.warning}10`, padding: 16, border: `1px solid ${colors.warning}30` }}>
                  <div style={{ fontSize: 10, color: colors.warning, fontWeight: 500, marginBottom: 6, letterSpacing: 2, textTransform: 'uppercase' }}>Note</div>
                  <div style={{ fontSize: 13, color: colors.ivory, lineHeight: 1.6 }}>{selectedReservation.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Modal - Full Screen */}
      {showOrderModal && selectedTable && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: colors.noir, zIndex: 110, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.onyx, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 400, letterSpacing: 2 }}>Comandă — {selectedTable.table_number}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{cart.length} produse • {cartTotal} LEI</div>
            </div>
            <button onClick={() => { setShowOrderModal(false); setCart([]) }} style={s.closeBtn}><Icons.X /></button>
          </div>
          
          {orderError && (
            <div style={{ padding: 14, backgroundColor: colors.error, color: '#fff', textAlign: 'center', fontSize: 12, letterSpacing: 1 }}>
              Eroare: {orderError}
            </div>
          )}
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: cart.length > 0 ? 240 : 20 }}>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <Icons.Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Caută produs..." style={{...s.input, textAlign: 'left', paddingLeft: 48, marginBottom: 0 }} />
            </div>
            
            {!searchQuery && popularItems.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Flame style={{ color: colors.error }} /> Popular</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                  {popularItems.map(i => (
                    <button key={i.id} onClick={() => addToCart(i)} style={{...s.btnSm, backgroundColor: `${colors.error}15`, color: colors.error, border: `1px solid ${colors.error}40`}}>{i.name}</button>
                  ))}
                </div>
              </>
            )}
            
            {categories.map(cat => {
              const items = filteredMenu.filter(m => m.category_id === cat.id && m.is_available !== false)
              if (!items.length) return null
              return (
                <div key={cat.id} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, color: colors.champagne, marginBottom: 14, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase' }}>{cat.name}</div>
                  {items.map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 400, letterSpacing: 0.5, fontSize: 15 }}>{i.name}</div>
                        {i.description && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{i.description}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ color: colors.champagne, fontWeight: 400, letterSpacing: 1 }}>{i.default_price} <span style={{ fontSize: 10, color: colors.textMuted }}>LEI</span></span>
                        <button onClick={() => addToCart(i)} style={s.addBtn}><Icons.Plus /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          
          {cart.length > 0 && (
            <div style={s.floatingCart}>
              <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 12 }}>
                {cart.map(i => (
                  <div key={i.id} style={s.cartItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => removeFromCart(i.id)} style={s.removeBtn}><Icons.Minus /></button>
                      <span>{i.qty}× {i.name}</span>
                    </div>
                    <span style={{ color: colors.champagne }}>{i.default_price * i.qty} LEI</span>
                  </div>
                ))}
              </div>
              <div style={s.cartTotal}>
                <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.textMuted }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 300, letterSpacing: 1, color: colors.champagne }}>{cartTotal} <span style={{ fontSize: 12 }}>LEI</span></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button onClick={() => handlePlaceOrder('cash')} style={{...s.btn, ...s.btnSuccess, padding: 16 }}>
                  <Icons.Banknote /> Cash
                </button>
                <button onClick={() => handlePlaceOrder('card')} style={{...s.btn, backgroundColor: colors.normal, color: '#fff', padding: 16 }}>
                  <Icons.CreditCard /> Card
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inactive Tables Alerts Panel */}
      {showAlertsPanel && (
        <div style={s.modal} onClick={() => setShowAlertsPanel(false)}>
          <div style={{...s.modalBox, maxWidth: 420}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={{ ...s.modalTitle, display: 'flex', alignItems: 'center', gap: 10 }}><Icons.AlertTriangle style={{ color: colors.warning }} /> Mese inactive</span>
              <button onClick={() => setShowAlertsPanel(false)} style={s.closeBtn}><Icons.X /></button>
            </div>
            <div style={s.modalBody}>
              {inactiveAlerts.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}><Icons.Check /></div>
                  <p style={s.emptyText}>Toate mesele sunt OK</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 20, letterSpacing: 0.5 }}>Aceste mese nu au comandat de peste {INACTIVE_MINUTES} minute:</div>
                  {inactiveAlerts.map(alert => (
                    <div key={alert.tableId} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, marginBottom: 12, backgroundColor: `${colors.warning}10`, border: `1px solid ${colors.warning}30` }}>
                      <div style={{ width: 48, height: 48, backgroundColor: `${colors.warning}20`, border: `1px solid ${colors.warning}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: colors.warning }}>
                        {alert.table.table_number}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 400, color: colors.ivory }}>{alert.message}</div>
                        {alert.table.table_type === 'vip' && (
                          <div style={{ fontSize: 10, color: colors.champagne, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Icons.Star /> VIP</div>
                        )}
                      </div>
                      <button onClick={() => { setSelectedTable(alert.table); setShowAlertsPanel(false); setShowTableModal(true) }} style={{ ...s.btnSm, backgroundColor: colors.champagne, color: colors.noir }}>
                        Comandă
                      </button>
                    </div>
                  ))}
                  <button onClick={() => { setDismissedTableIds(new Set([...dismissedTableIds, ...inactiveAlerts.map(a => a.table.id)])); setShowAlertsPanel(false) }} style={{ ...s.btn, ...s.btnOutline, width: '100%', marginTop: 8 }}>
                    <Icons.Check /> Am verificat toate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Modal */}
      {splitPaymentOrder && (
        <div style={s.modal} onClick={closeSplitPayment}>
          <div style={{...s.modalBox, maxWidth: 420}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <span style={s.modalTitle}>Plată parțială</span>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{splitPaymentOrder.event_tables?.table_number || splitPaymentOrder.table_number}</div>
              </div>
              <button onClick={closeSplitPayment} style={s.closeBtn}><Icons.X /></button>
            </div>
            <div style={s.modalBody}>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 20, letterSpacing: 0.5 }}>Selectează ce plătește clientul acum:</div>
              
              {splitPaymentOrder.order_items?.map((item, idx) => {
                const selectedQty = selectedItemsForPayment[idx] || 0
                const unitPrice = (item.subtotal || item.price * item.quantity) / item.quantity
                const isSelected = selectedQty > 0
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, marginBottom: 10, backgroundColor: isSelected ? `${colors.champagne}15` : colors.noir, border: `1px solid ${isSelected ? colors.champagne : colors.border}` }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => selectAllOfItem(idx)}>
                      <div style={{ fontWeight: 400, letterSpacing: 0.5 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{Math.round(unitPrice)} LEI/buc</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => adjustItemQty(idx, -1)} style={{ width: 36, height: 36, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icons.Minus /></button>
                      <div style={{ width: 50, textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 400, color: isSelected ? colors.champagne : colors.ivory }}>{selectedQty}</div>
                        <div style={{ fontSize: 9, color: colors.textMuted }}>din {item.quantity}</div>
                      </div>
                      <button onClick={() => adjustItemQty(idx, 1)} style={{ width: 36, height: 36, border: `1px solid ${colors.champagne}`, backgroundColor: colors.champagne, color: colors.noir, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icons.Plus /></button>
                    </div>
                    <div style={{ width: 70, textAlign: 'right', color: isSelected ? colors.champagne : colors.textMuted, fontWeight: 400 }}>{Math.round(unitPrice * selectedQty)} LEI</div>
                  </div>
                )
              })}
              
              <div style={{ marginTop: 24, padding: 20, backgroundColor: colors.noir, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Încasezi acum</span>
                  <span style={{ fontSize: 20, fontWeight: 300, color: colors.champagne }}>{getSelectedTotal()} LEI</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.textMuted, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Rămâne</span>
                  <span style={{ fontSize: 14, color: colors.warning }}>{splitPaymentOrder.total - getSelectedTotal()} LEI</span>
                </div>
              </div>
              
              {hasSelectedItems() && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                  <button onClick={() => handlePartialPayment('cash')} style={{ ...s.btn, ...s.btnSuccess, padding: 16 }}>
                    <Icons.Banknote /> Cash {getSelectedTotal()} LEI
                  </button>
                  <button onClick={() => handlePartialPayment('card')} style={{ ...s.btn, backgroundColor: colors.normal, color: '#fff', padding: 16 }}>
                    <Icons.CreditCard /> Card {getSelectedTotal()} LEI
                  </button>
                </div>
              )}
              
              <button onClick={closeSplitPayment} style={{ width: '100%', marginTop: 16, background: 'none', border: 'none', color: colors.textMuted, fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>Anulează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
