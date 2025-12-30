import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventMenu, getCategories, loginWaiter, getTableAssignments, getEventReservations, createOrder, createOrderItems } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const colors = { noir: '#08080a', onyx: '#141416', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0', border: 'rgba(255,255,255,0.12)', textMuted: 'rgba(255,255,255,0.55)', success: '#22c55e', error: '#ef4444', warning: '#f59e0b', vip: '#d4af37', normal: '#3b82f6', bar: '#8b5cf6' }

export default function StaffDashboard() {
  const [waiter, setWaiter] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
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
        console.log('Order update:', payload.eventType, payload.new?.id)
        if (payload.eventType === 'INSERT' && myTableIdsRef.current.includes(payload.new.event_table_id)) { 
          setNewOrderAlert(true)
          playSound()
          setTimeout(() => setNewOrderAlert(false), 3000) 
        }
        // Reload orders
        supabase.from('orders').select('*, event_tables(*), order_items(*)').eq('event_id', eventId).in('event_table_id', myTableIdsRef.current.length ? myTableIdsRef.current : ['00000000-0000-0000-0000-000000000000']).in('status', ['new', 'preparing', 'ready']).order('created_at', { ascending: true }).then(({ data }) => { if (data) setOrders(data) })
      })
      .subscribe((status) => {
        console.log('Realtime status:', status)
      })
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

  // Load orders WITH order_items from separate table
  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, event_tables(*), order_items(*)')
      .eq('event_id', selectedEvent.id)
      .in('event_table_id', myTableIdsRef.current.length ? myTableIdsRef.current : ['00000000-0000-0000-0000-000000000000'])
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
    if (!phoneInput) return
    setLoginError('')
    const { data, error } = await loginWaiter(phoneInput.replace(/\s/g, ''))
    if (error || !data) { setLoginError('Număr invalid sau cont inactiv'); return }
    setWaiter(data)
    localStorage.setItem('sip_waiter', JSON.stringify(data))
  }

  const handleLogout = () => { setWaiter(null); localStorage.removeItem('sip_waiter'); setOrders([]); setSelectedEvent(null) }

  const handleOrderStatus = async (orderId, newStatus) => {
    console.log('Updating order', orderId, 'to', newStatus)
    const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId).select()
    console.log('Update result:', data, error)
    if (!error) loadOrders()
  }

  const handleMarkPaid = async (orderId, paymentType) => {
    const { error } = await supabase.from('orders').update({ status: 'delivered', payment_status: 'paid', payment_type: paymentType, paid_at: new Date().toISOString() }).eq('id', orderId)
    if (!error) loadOrders()
  }

  // Split Payment Functions
  const openSplitPayment = (order) => {
    setSplitPaymentOrder(order)
    setSelectedItemsForPayment([])
  }

  const closeSplitPayment = () => {
    setSplitPaymentOrder(null)
    setSelectedItemsForPayment([])
  }

  const toggleItemForPayment = (itemIndex) => {
    setSelectedItemsForPayment(prev => 
      prev.includes(itemIndex) 
        ? prev.filter(i => i !== itemIndex)
        : [...prev, itemIndex]
    )
  }

  const getSelectedTotal = () => {
    if (!splitPaymentOrder) return 0
    return selectedItemsForPayment.reduce((sum, idx) => {
      const item = splitPaymentOrder.order_items?.[idx]
      return sum + (item?.subtotal || item?.price * item?.quantity || 0)
    }, 0)
  }

  // Inactive Table Alerts
  const INACTIVE_MINUTES = 45
  
  const checkInactiveTables = async () => {
    if (!selectedEvent || !waiter || myTableIdsRef.current.length === 0) return
    
    const cutoffTime = new Date(Date.now() - INACTIVE_MINUTES * 60 * 1000).toISOString()
    const alerts = []
    
    for (const tableId of myTableIdsRef.current) {
      const table = eventTables.find(t => t.id === tableId)
      if (!table) continue
      
      // Get last order for this table
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
  
  // Check inactive tables every 2 minutes
  useEffect(() => {
    if (!selectedEvent || !waiter) return
    checkInactiveTables()
    const interval = setInterval(checkInactiveTables, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedEvent, waiter, eventTables])

  const handlePartialPayment = async (paymentType) => {
    if (!splitPaymentOrder || selectedItemsForPayment.length === 0) return
    
    const selectedTotal = getSelectedTotal()
    const remainingTotal = splitPaymentOrder.total - selectedTotal
    
    if (remainingTotal <= 0) {
      // Full payment
      await handleMarkPaid(splitPaymentOrder.id, paymentType)
    } else {
      // Partial payment - update order with remaining amount
      const { error } = await supabase.from('orders').update({
        total: remainingTotal,
        payment_status: 'partial',
        // Mark paid items in notes
        notes: `Plătit parțial: ${selectedTotal} LEI (${paymentType}). Items: ${selectedItemsForPayment.map(idx => splitPaymentOrder.order_items?.[idx]?.name).join(', ')}`
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

  // Place order using createOrder + createOrderItems (separate table)
  const handlePlaceOrder = async (paymentType) => {
    if (!cart.length || !selectedTable) {
      console.log('No cart or table', cart, selectedTable)
      return
    }
    
    setOrderError('')
    
    try {
      // Step 1: Create the order (without items)
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
      
      console.log('Creating order:', orderData)
      const { data: order, error: orderError } = await createOrder(orderData)
      
      if (orderError) {
        console.error('Order error:', orderError)
        setOrderError(orderError.message)
        alert('Eroare la creare comandă: ' + orderError.message)
        return
      }
      
      console.log('Order created:', order)
      
      // Step 2: Create order items in separate table
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        price: item.default_price,
        quantity: item.qty,
        subtotal: item.default_price * item.qty
      }))
      
      console.log('Creating order items:', orderItems)
      const { error: itemsError } = await createOrderItems(orderItems)
      
      if (itemsError) {
        console.error('Items error:', itemsError)
        setOrderError(itemsError.message)
        alert('Eroare la adăugare produse: ' + itemsError.message)
        return
      }
      
      // Success!
      setShowOrderModal(false)
      setCart([])
      setSelectedTable(null)
      loadOrders()
      
    } catch (err) {
      console.error('Unexpected error:', err)
      setOrderError(err.message)
      alert('Eroare: ' + err.message)
    }
  }

  const filteredMenu = searchQuery ? menuItems.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase())) : menuItems
  const popularItems = menuItems.filter(m => m.badge === 'popular').slice(0, 5)

  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    loginContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logo: { fontSize: 18, fontWeight: 300, letterSpacing: 6, color: colors.champagne },
    tabs: { display: 'flex', borderBottom: `1px solid ${colors.border}` },
    tab: { flex: 1, padding: 14, border: 'none', background: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderBottom: '2px solid transparent', textAlign: 'center' },
    content: { padding: 16 },
    title: { fontSize: 12, fontWeight: 600, letterSpacing: 2, color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase' },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 12, borderRadius: 8 },
    btn: { padding: '10px 18px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 6 },
    btnSm: { padding: '6px 12px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4 },
    input: { width: '100%', padding: 16, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: 16, marginBottom: 16, borderRadius: 8, outline: 'none', textAlign: 'center', boxSizing: 'border-box' },
    select: { width: '100%', padding: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: 14, borderRadius: 6, boxSizing: 'border-box' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalBox: { backgroundColor: colors.onyx, width: '100%', maxWidth: 420, borderRadius: 12, border: `1px solid ${colors.border}`, maxHeight: '90vh', overflowY: 'auto' },
    modalHead: { padding: 16, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: 16 },
    alertBanner: { position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: colors.error, color: '#fff', padding: 12, textAlign: 'center', fontWeight: 600, zIndex: 50 },
    zoneTabs: { display: 'flex', marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' },
    zoneTab: { flex: 1, padding: '10px 16px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
    stage: { backgroundColor: `${colors.champagne}15`, border: `2px solid ${colors.champagne}`, borderRadius: 8, padding: '8px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: colors.champagne, letterSpacing: 2, marginBottom: 8 },
    floatingCart: { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.onyx, borderTop: `2px solid ${colors.champagne}`, padding: 16, zIndex: 120, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' },
    addBtn: { width: 32, height: 32, borderRadius: '50%', border: 'none', backgroundColor: colors.champagne, color: colors.noir, fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  }

  const openReservationDetails = (table) => {
    const res = reservations.find(r => r.event_table_id === table.id)
    if (res) {
      setSelectedReservation({ ...res, table })
      setShowReservationModal(true)
    }
  }

  const renderGrid = (forMyTables, forReservations = false) => {
    const cellSize = forMyTables ? 48 : 44, gap = 4
    const zoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    const maxRow = zoneTables.length ? Math.max(...zoneTables.map(t => t.grid_row)) + 1 : 6
    const maxCol = zoneTables.length ? Math.max(...zoneTables.map(t => t.grid_col)) + 1 : 8
    
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={s.zoneTabs}>
          <button onClick={() => setActiveZone('front')} style={{...s.zoneTab, backgroundColor: activeZone === 'front' ? colors.champagne : 'transparent', color: activeZone === 'front' ? colors.noir : colors.textMuted}}>🎭 Față</button>
          <button onClick={() => setActiveZone('back')} style={{...s.zoneTab, backgroundColor: activeZone === 'back' ? colors.champagne : 'transparent', color: activeZone === 'back' ? colors.noir : colors.textMuted}}>🎪 Spate</button>
        </div>
        {activeZone === 'front' && <div style={s.stage}>🎭 SCENĂ</div>}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maxCol}, ${cellSize}px)`, gap, padding: 8, backgroundColor: colors.noir, border: `1px solid ${colors.border}`, borderRadius: 8, width: 'fit-content' }}>
          {Array.from({ length: maxRow }).map((_, row) => Array.from({ length: maxCol }).map((_, col) => {
            const t = zoneTables.find(t => t.grid_row === row && t.grid_col === col)
            if (!t) return <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }} />
            const mine = myTableIdsRef.current.includes(t.id)
            const tableReservation = reservations.find(r => r.event_table_id === t.id)
            const hasRes = !!tableReservation
            const cfg = { vip: colors.vip, normal: colors.normal, bar: colors.bar }[t.table_type] || colors.normal
            
            // For "Mesele mele" tab
            if (forMyTables) {
              const hasAlert = inactiveAlerts.some(a => a.tableId === t.id)
              return (
                <div key={`${row}-${col}`} onClick={() => mine && openTableOptions(t)} style={{ 
                  width: cellSize, 
                  height: cellSize, 
                  borderRadius: 8, 
                  border: mine ? `3px solid ${hasAlert ? colors.warning : colors.champagne}` : `1px solid ${colors.border}`, 
                  backgroundColor: mine ? (hasAlert ? `${colors.warning}40` : `${colors.champagne}40`) : `${cfg}20`, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: mine ? 'pointer' : 'default', 
                  fontSize: 10, 
                  fontWeight: 700, 
                  color: mine ? (hasAlert ? colors.warning : colors.champagne) : colors.textMuted, 
                  opacity: mine ? 1 : 0.5,
                  position: 'relative'
                }}>
                  {hasAlert && <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', backgroundColor: colors.warning, animation: 'pulse 1.5s infinite' }}>⚠️</span>}
                  {t.table_number}
                </div>
              )
            }
            
            // For "Rezervări" tab - show reserved tables in red with lock
            if (forReservations) {
              return (
                <div key={`${row}-${col}`} onClick={() => hasRes && openReservationDetails(t)} style={{ 
                  width: cellSize, 
                  height: cellSize, 
                  borderRadius: 6, 
                  border: `2px solid ${hasRes ? colors.error : cfg}`, 
                  backgroundColor: hasRes ? `${colors.error}30` : `${cfg}15`, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: hasRes ? 'pointer' : 'default',
                  fontSize: 9, 
                  fontWeight: 700, 
                  color: hasRes ? colors.error : cfg,
                  gap: 1
                }}>
                  {hasRes && <span style={{ fontSize: 10 }}>🔒</span>}
                  <span>{t.table_number}</span>
                </div>
              )
            }
            
            // Default grid (not used currently)
            return (
              <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize, borderRadius: 6, border: `2px solid ${hasRes ? colors.warning : mine ? colors.champagne : cfg}`, backgroundColor: hasRes ? `${colors.warning}25` : mine ? `${colors.champagne}25` : `${cfg}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: hasRes ? colors.warning : mine ? colors.champagne : cfg }}>
                {t.table_number}
              </div>
            )
          }))}
        </div>
        {activeZone === 'back' && <div style={{...s.stage, marginTop: 8, marginBottom: 0}}>🎪 SCENĂ</div>}
        {forMyTables && (
          <div style={{ marginTop: 16, fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>💡 Click pe o masă pentru a adăuga un produs</div>
        )}
        {forReservations && (
          <div style={{ marginTop: 12, fontSize: 10, color: colors.textMuted }}>
            <span>🔴 Click pe masă rezervată pentru detalii</span>
          </div>
        )}
      </div>
    )
  }

  const renderOrderCard = (o, type) => {
    const borderColor = type === 'new' ? colors.error : type === 'preparing' ? colors.warning : colors.success
    // order_items comes from the JOIN with order_items table
    const items = o.order_items || []
    
    return (
      <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${borderColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{o.event_tables?.table_number || o.table_number || 'Masă'}</div>
            <div style={{ fontSize: 10, color: colors.textMuted }}>{new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.champagne }}>{o.total} LEI</div>
        </div>
        
        {/* Products list */}
        <div style={{ backgroundColor: colors.noir, padding: 10, borderRadius: 6, marginBottom: 12 }}>
          {items.length > 0 ? items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: idx < items.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <span style={{ color: colors.ivory }}>{item.quantity}× {item.name}</span>
              <span style={{ color: colors.textMuted }}>{item.subtotal || item.price * item.quantity} LEI</span>
            </div>
          )) : (
            <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>Se încarcă produsele...</div>
          )}
        </div>
        
        {/* Actions */}
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8, padding: '6px 10px', backgroundColor: o.payment_type === 'cash' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', borderRadius: 4, display: 'inline-block' }}>
          {o.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}
        </div>
        
        {type === 'new' && (
          <button onClick={() => handleOrderStatus(o.id, 'preparing')} style={{ ...s.btn, width: '100%', backgroundColor: colors.success, color: 'white', marginTop: 8 }}>✓ Accept</button>
        )}
        
        {type === 'preparing' && (
          <button onClick={() => handleOrderStatus(o.id, 'ready')} style={{ ...s.btn, width: '100%', backgroundColor: colors.champagne, color: colors.noir }}>✓ Gata de servit</button>
        )}
        
        {type === 'ready' && (
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Încasează {o.total} LEI:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => handleMarkPaid(o.id, 'cash')} style={{ ...s.btn, backgroundColor: colors.success, color: '#fff' }}>💵 Cash</button>
              <button onClick={() => handleMarkPaid(o.id, 'card')} style={{ ...s.btn, backgroundColor: colors.normal, color: '#fff' }}>💳 Card</button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button onClick={() => openSplitPayment(o)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                Plată parțială ↓
              </button>
            </div>
          </div>
        )}
        
        {/* Partial payment indicator */}
        {o.payment_status === 'partial' && (
          <div style={{ marginTop: 8, padding: 8, backgroundColor: `${colors.warning}20`, borderRadius: 6, border: `1px solid ${colors.warning}` }}>
            <div style={{ fontSize: 11, color: colors.warning, fontWeight: 600 }}>⚠️ Parțial plătit</div>
            <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>{o.notes}</div>
          </div>
        )}
      </div>
    )
  }

  if (!waiter) return (
    <div style={s.container}>
      <Head><title>S I P - Staff</title></Head>
      <div style={s.loginContainer}>
        <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 16, color: colors.champagne, marginBottom: 8 }}>S I P</div>
        <div style={{ fontSize: 11, letterSpacing: 4, color: colors.textMuted, marginBottom: 48 }}>STAFF LOGIN</div>
        <div style={{ width: '100%', maxWidth: 300 }}>
          <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="07XX XXX XXX" style={s.input} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
          {loginError && <div style={{ color: colors.error, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ ...s.btn, width: '100%', backgroundColor: colors.champagne, color: colors.noir, padding: 16 }}>Intră</button>
        </div>
        <Link href="/" style={{ marginTop: 48, fontSize: 11, color: colors.textMuted, textDecoration: 'none' }}>← Înapoi</Link>
      </div>
    </div>
  )

  if (loading) return <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{fontSize: 32, fontWeight: 300, letterSpacing: 12, color: colors.champagne}}>S I P</div></div>

  const newO = orders.filter(o => o.status === 'new')
  const prepO = orders.filter(o => o.status === 'preparing')
  const readyO = orders.filter(o => o.status === 'ready')

  return (
    <div style={s.container}>
      <Head><title>S I P - Staff</title></Head>
      {newOrderAlert && <div style={s.alertBanner}>🔔 COMANDĂ NOUĂ!</div>}
      
      {/* Inactive Tables Alert Banner */}
      {inactiveAlerts.filter(a => !dismissedTableIds.has(a.table.id)).length > 0 && !showAlertsPanel && (
        <div onClick={() => setShowAlertsPanel(true)} style={{ position: 'fixed', top: newOrderAlert ? 48 : 0, left: 0, right: 0, backgroundColor: colors.warning, color: colors.noir, padding: 10, textAlign: 'center', fontWeight: 600, zIndex: 45, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span>{inactiveAlerts.filter(a => !dismissedTableIds.has(a.table.id)).length} {inactiveAlerts.filter(a => !dismissedTableIds.has(a.table.id)).length === 1 ? 'masă necesită' : 'mese necesită'} atenție</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>→ Vezi</span>
        </div>
      )}
      <header style={s.header}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={s.logo}>S I P</span></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.success }} />
          <span style={{ fontSize: 12, color: colors.platinum }}>👤 {waiter.name}</span>
          <button onClick={handleLogout} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, padding: 8 }}>Ieși</button>
        </div>
      </header>
      
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.onyx }}>
        <select value={selectedEvent?.id || ''} onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value))} style={{ ...s.select, marginBottom: 0 }}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} - {new Date(ev.event_date).toLocaleDateString('ro-RO')}</option>)}
        </select>
      </div>
      
      <div style={s.tabs}>
        {[{ id: 'orders', label: `🔔 Comenzi ${newO.length > 0 ? `(${newO.length})` : ''}` }, { id: 'tables', label: '🗺️ Mesele mele' }, { id: 'reservations', label: '📋 Rezervări' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'}}>{tab.label}</button>
        ))}
      </div>
      
      <div style={s.content}>
        {activeTab === 'orders' && <>
          {myTableIdsRef.current.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: colors.warning }}><div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div><p>Nu ai mese atribuite.</p></div>}
          
          {prepO.length > 0 && <>
            <div style={s.title}>⏳ În pregătire ({prepO.length})</div>
            {prepO.map(o => renderOrderCard(o, 'preparing'))}
          </>}
          
          {readyO.length > 0 && <>
            <div style={{ ...s.title, marginTop: 24 }}>✓ De livrat ({readyO.length})</div>
            {readyO.map(o => renderOrderCard(o, 'ready'))}
          </>}
          
          {newO.length > 0 && <>
            <div style={{ ...s.title, marginTop: 24 }}>🔔 NOI ({newO.length})</div>
            {newO.map(o => renderOrderCard(o, 'new'))}
          </>}
          
          {newO.length === 0 && prepO.length === 0 && readyO.length === 0 && myTableIdsRef.current.length > 0 && <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}><div style={{ fontSize: 48, marginBottom: 16 }}>✓</div><p>Nicio comandă activă</p></div>}
        </>}
        
        {activeTab === 'tables' && renderGrid(true)}
        
        {activeTab === 'reservations' && <>
          <div style={s.title}>Rezervări</div>
          {renderGrid(false, true)}
          <div style={{ marginTop: 24 }}>
            {reservations.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: colors.textMuted }}>Nicio rezervare</div> : reservations.map(r => {
              const resTable = eventTables.find(t => t.id === r.event_table_id)
              return (
                <div key={r.id} style={s.card} onClick={() => { setSelectedReservation({ ...r, table: resTable }); setShowReservationModal(true) }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ width: 44, height: 44, backgroundColor: `${colors.error}25`, border: `2px solid ${colors.error}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: colors.error }}>
                      <span style={{ fontSize: 12 }}>🔒</span>
                      <span>{resTable?.table_number || '?'}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{r.customer_name} {r.is_vip && '⭐'}</div>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>🕐 {r.reservation_time} • 👥 {r.party_size}p</div>
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: 16 }}>›</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>}
      </div>

      {/* Table Options Modal */}
      {showTableModal && selectedTable && (
        <div style={s.modal} onClick={() => setShowTableModal(false)}>
          <div style={{...s.modalBox, maxWidth: 320}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{selectedTable.table_number}</span>
              <button onClick={() => setShowTableModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={openOrderModal} style={{ ...s.btn, width: '100%', backgroundColor: colors.champagne, color: colors.noir, padding: 18, fontSize: 14 }}>🍸 Comandă nouă</button>
              <button onClick={openHistoryModal} style={{ ...s.btn, width: '100%', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.ivory, padding: 18, fontSize: 14 }}>📋 Istoric masă</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedTable && (
        <div style={s.modal} onClick={() => setShowHistoryModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Istoric - {selectedTable.table_number}</span>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              {allTableOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted }}>Nicio comandă</div>
              ) : allTableOrders.map(o => (
                <div key={o.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: colors.textMuted }}>{new Date(o.created_at).toLocaleString('ro-RO')}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: o.status === 'delivered' ? `${colors.success}30` : o.status === 'new' ? `${colors.error}30` : `${colors.warning}30`, color: o.status === 'delivered' ? colors.success : o.status === 'new' ? colors.error : colors.warning }}>{o.status}</span>
                  </div>
                  {/* Products in history from order_items table */}
                  <div style={{ backgroundColor: colors.noir, padding: 8, borderRadius: 6, marginBottom: 8 }}>
                    {o.order_items && o.order_items.length > 0 ? o.order_items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 13, padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.quantity}× {item.name}</span>
                        <span style={{ color: colors.textMuted }}>{item.subtotal || item.price * item.quantity} LEI</span>
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, color: colors.textMuted }}>-</div>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, color: colors.champagne }}>{o.total} LEI • {o.payment_type === 'cash' ? '💵' : '💳'} {o.payment_status === 'paid' ? '✓ Plătit' : '○ Neplătit'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reservation Details Modal */}
      {showReservationModal && selectedReservation && (
        <div style={s.modal} onClick={() => setShowReservationModal(false)}>
          <div style={{...s.modalBox, maxWidth: 360}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, backgroundColor: `${colors.error}30`, border: `2px solid ${colors.error}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: colors.error }}>
                  🔒
                </div>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{selectedReservation.table?.table_number}</span>
              </div>
              <button onClick={() => setShowReservationModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 8 }}>REZERVARE</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: colors.ivory, marginBottom: 4 }}>
                  {selectedReservation.customer_name} {selectedReservation.is_vip && '⭐'}
                </div>
                {selectedReservation.is_vip && (
                  <span style={{ fontSize: 10, padding: '4px 12px', backgroundColor: `${colors.vip}30`, color: colors.vip, borderRadius: 20, fontWeight: 600 }}>VIP</span>
                )}
              </div>
              
              <div style={{ backgroundColor: colors.noir, padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>🕐 Ora</span>
                  <span style={{ fontWeight: 500 }}>{selectedReservation.reservation_time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>👥 Persoane</span>
                  <span style={{ fontWeight: 500 }}>{selectedReservation.party_size}</span>
                </div>
                {selectedReservation.customer_phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                    <span style={{ color: colors.textMuted, fontSize: 12 }}>📱 Telefon</span>
                    <a href={`tel:${selectedReservation.customer_phone}`} style={{ fontWeight: 500, color: colors.champagne, textDecoration: 'none' }}>{selectedReservation.customer_phone}</a>
                  </div>
                )}
                {selectedReservation.customer_email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                    <span style={{ color: colors.textMuted, fontSize: 12 }}>✉️ Email</span>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>{selectedReservation.customer_email}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>📋 Status</span>
                  <span style={{ fontWeight: 500, color: selectedReservation.status === 'confirmed' ? colors.success : colors.warning }}>{selectedReservation.status || 'confirmed'}</span>
                </div>
              </div>
              
              {selectedReservation.notes && (
                <div style={{ backgroundColor: `${colors.warning}15`, padding: 12, borderRadius: 8, border: `1px solid ${colors.warning}30` }}>
                  <div style={{ fontSize: 10, color: colors.warning, fontWeight: 600, marginBottom: 4 }}>📝 NOTE</div>
                  <div style={{ fontSize: 13, color: colors.ivory }}>{selectedReservation.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Modal - Full Screen with Floating Cart */}
      {showOrderModal && selectedTable && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: colors.noir, zIndex: 110, display: 'flex', flexDirection: 'column' }}>
          {/* Header - Fixed */}
          <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.onyx, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Comandă - {selectedTable.table_number}</div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>{cart.length} produse • {cartTotal} LEI</div>
            </div>
            <button onClick={() => { setShowOrderModal(false); setCart([]) }} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 24, cursor: 'pointer', padding: 8 }}>✕</button>
          </div>
          
          {/* Error message */}
          {orderError && (
            <div style={{ padding: 12, backgroundColor: colors.error, color: '#fff', textAlign: 'center', fontSize: 12 }}>
              Eroare: {orderError}
            </div>
          )}
          
          {/* Content - Scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: cart.length > 0 ? 220 : 16 }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Caută produs..." style={{...s.input, textAlign: 'left', marginBottom: 16 }} />
            
            {!searchQuery && popularItems.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>🔥 POPULAR</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {popularItems.map(i => (
                    <button key={i.id} onClick={() => addToCart(i)} style={{...s.btnSm, backgroundColor: `${colors.error}20`, color: colors.error, border: `1px solid ${colors.error}`}}>{i.name}</button>
                  ))}
                </div>
              </>
            )}
            
            {categories.map(cat => {
              const items = filteredMenu.filter(m => m.category_id === cat.id && m.is_available !== false)
              if (!items.length) return null
              return (
                <div key={cat.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: colors.champagne, marginBottom: 10, fontWeight: 600, letterSpacing: 1 }}>{cat.name}</div>
                  {items.map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{i.name}</div>
                        {i.description && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{i.description}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: colors.champagne, fontWeight: 500 }}>{i.default_price} LEI</span>
                        <button onClick={() => addToCart(i)} style={s.addBtn}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          
          {/* Floating Cart */}
          {cart.length > 0 && (
            <div style={s.floatingCart}>
              <div style={{ maxHeight: 100, overflowY: 'auto', marginBottom: 12 }}>
                {cart.map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => removeFromCart(i.id)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: colors.error, color: '#fff', fontSize: 14, cursor: 'pointer' }}>−</button>
                      <span style={{ fontSize: 13 }}>{i.qty}× {i.name}</span>
                    </div>
                    <span style={{ color: colors.champagne, fontSize: 13 }}>{i.default_price * i.qty} LEI</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${colors.border}`, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>TOTAL</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: colors.champagne }}>{cartTotal} LEI</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button onClick={() => handlePlaceOrder('cash')} style={{...s.btn, backgroundColor: colors.success, color: '#fff', padding: 14 }}>💵 Cash</button>
                <button onClick={() => handlePlaceOrder('card')} style={{...s.btn, backgroundColor: colors.normal, color: '#fff', padding: 14 }}>💳 Card</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inactive Tables Alerts Panel */}
      {showAlertsPanel && (
        <div style={s.modal} onClick={() => setShowAlertsPanel(false)}>
          <div style={{...s.modalBox, maxWidth: 400}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>⚠️ Mese inactive</span>
              <button onClick={() => setShowAlertsPanel(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              {inactiveAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                  <p>Toate mesele sunt OK</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Aceste mese nu au comandat de peste {INACTIVE_MINUTES} minute:</div>
                  {inactiveAlerts.map(alert => (
                    <div key={alert.tableId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10, backgroundColor: `${colors.warning}15`, border: `1px solid ${colors.warning}40`, borderRadius: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: `${colors.warning}30`, border: `2px solid ${colors.warning}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: colors.warning }}>
                        {alert.table.table_number}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: colors.ivory }}>{alert.message}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          {alert.table.table_type === 'vip' && <span style={{ color: colors.champagne }}>⭐ VIP</span>}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedTable(alert.table); setShowAlertsPanel(false); setShowTableModal(true) }} style={{ ...s.btnSm, backgroundColor: colors.champagne, color: colors.noir }}>
                        + Comandă
                      </button>
                    </div>
                  ))}
                  <button onClick={() => { setDismissedTableIds(new Set([...dismissedTableIds, ...inactiveAlerts.map(a => a.table.id)])); setShowAlertsPanel(false) }} style={{ width: '100%', marginTop: 8, ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted }}>
                    ✓ Am verificat toate
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
          <div style={{...s.modalBox, maxWidth: 400}} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Plată parțială</span>
                <div style={{ fontSize: 11, color: colors.textMuted }}>{splitPaymentOrder.event_tables?.table_number || splitPaymentOrder.table_number}</div>
              </div>
              <button onClick={closeSplitPayment} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Selectează ce plătește clientul acum:</div>
              
              {splitPaymentOrder.order_items?.map((item, idx) => (
                <div key={idx} onClick={() => toggleItemForPayment(idx)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, backgroundColor: selectedItemsForPayment.includes(idx) ? `${colors.champagne}20` : colors.noir, border: `2px solid ${selectedItemsForPayment.includes(idx) ? colors.champagne : colors.border}`, borderRadius: 8, cursor: 'pointer' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${selectedItemsForPayment.includes(idx) ? colors.champagne : colors.border}`, backgroundColor: selectedItemsForPayment.includes(idx) ? colors.champagne : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedItemsForPayment.includes(idx) && <span style={{ color: colors.noir, fontSize: 14 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{item.quantity}× {item.name}</div>
                  </div>
                  <div style={{ color: colors.champagne, fontWeight: 600 }}>{item.subtotal || item.price * item.quantity} LEI</div>
                </div>
              ))}
              
              <div style={{ marginTop: 20, padding: 16, backgroundColor: colors.noir, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: colors.textMuted }}>Încasezi acum:</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: colors.champagne }}>{getSelectedTotal()} LEI</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.textMuted }}>Rămâne:</span>
                  <span style={{ fontSize: 14, color: colors.warning }}>{splitPaymentOrder.total - getSelectedTotal()} LEI</span>
                </div>
              </div>
              
              {selectedItemsForPayment.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                  <button onClick={() => handlePartialPayment('cash')} style={{ ...s.btn, backgroundColor: colors.success, color: '#fff', padding: 14 }}>💵 Cash {getSelectedTotal()} LEI</button>
                  <button onClick={() => handlePartialPayment('card')} style={{ ...s.btn, backgroundColor: colors.normal, color: '#fff', padding: 14 }}>💳 Card {getSelectedTotal()} LEI</button>
                </div>
              )}
              
              <button onClick={closeSplitPayment} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}>Anulează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
