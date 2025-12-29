import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventMenu, getCategories, loginWaiter, getTableAssignments, getEventReservations, updateOrder } from '../lib/supabase'

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
  const [reservations, setReservations] = useState([])
  const [tableAssignments, setTableAssignments] = useState([])
  const [activeTab, setActiveTab] = useState('orders')
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableOrders, setTableOrders] = useState([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderTable, setOrderTable] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const myTableIdsRef = useRef([])
  const audioRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('sip_waiter')
    if (saved) {
      try { setWaiter(JSON.parse(saved)) } catch(e) {}
    }
  }, [])

  useEffect(() => {
    if (waiter) {
      loadEvents()
    }
  }, [waiter])

  useEffect(() => {
    if (selectedEvent && waiter) {
      loadEventData()
    }
  }, [selectedEvent, waiter])

  useEffect(() => {
    if (!selectedEvent || !waiter) return
    
    const channel = supabase.channel('staff-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `event_id=eq.${selectedEvent.id}` }, (payload) => {
        if (payload.eventType === 'INSERT' && myTableIdsRef.current.includes(payload.new.event_table_id)) {
          setNewOrderAlert(true)
          playSound()
          setTimeout(() => setNewOrderAlert(false), 3000)
          loadOrders()
        } else if (payload.eventType === 'UPDATE') {
          loadOrders()
        }
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [selectedEvent, waiter])

  const playSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA0GVaHj6tCHNx0lXbXv8sRqKg')
      }
      audioRef.current.play().catch(() => {})
    } catch(e) {}
  }

  const loadEvents = async () => {
    const { data } = await getEvents(VENUE_ID)
    if (data?.length) {
      setEvents(data)
      setSelectedEvent(data[0])
    }
  }

  const loadEventData = async () => {
    setLoading(true)
    const [tablesRes, assignRes, resRes, menuRes, catsRes] = await Promise.all([
      getEventTables(selectedEvent.id),
      getTableAssignments(selectedEvent.id),
      getEventReservations(selectedEvent.id),
      getEventMenu(selectedEvent.id),
      getCategories(VENUE_ID)
    ])
    
    if (tablesRes.data) setEventTables(tablesRes.data)
    if (assignRes.data) {
      setTableAssignments(assignRes.data)
      const myIds = assignRes.data.filter(a => a.waiter_id === waiter.id).map(a => a.event_table_id)
      myTableIdsRef.current = myIds
    }
    if (resRes.data) setReservations(resRes.data)
    if (menuRes.data) {
      const items = menuRes.data.map(em => ({
        ...em.menu_items,
        custom_price: em.custom_price,
        default_price: em.custom_price || em.menu_items?.default_price
      }))
      setMenuItems(items)
    }
    if (catsRes.data) setCategories(catsRes.data)
    
    await loadOrders()
    setLoading(false)
  }

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, event_tables(*)')
      .eq('event_id', selectedEvent.id)
      .in('event_table_id', myTableIdsRef.current.length ? myTableIdsRef.current : ['00000000-0000-0000-0000-000000000000'])
      .in('status', ['new', 'preparing', 'ready'])
      .order('created_at', { ascending: false })
    
    if (data) setOrders(data)
  }

  const handleLogin = async () => {
    if (!phoneInput) return
    setLoginError('')
    const { data, error } = await loginWaiter(phoneInput.replace(/\s/g, ''))
    if (error || !data) {
      setLoginError('Număr invalid sau cont inactiv')
      return
    }
    setWaiter(data)
    localStorage.setItem('sip_waiter', JSON.stringify(data))
  }

  const handleLogout = () => {
    setWaiter(null)
    localStorage.removeItem('sip_waiter')
    setOrders([])
    setSelectedEvent(null)
  }

  const handleOrderStatus = async (orderId, status) => {
    await updateOrder(orderId, { status })
    loadOrders()
  }

  const handleMarkPaid = async (orderId, paymentType) => {
    await updateOrder(orderId, { status: 'delivered', payment_status: 'paid', payment_type: paymentType })
    loadOrders()
  }

  const openTableOrder = (table) => {
    setOrderTable(table)
    setCart([])
    setSearchQuery('')
    setShowOrderModal(true)
  }

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? {...c, qty: c.qty + 1} : c)
      }
      return [...prev, {...item, qty: 1}]
    })
  }

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId)
      if (existing && existing.qty > 1) {
        return prev.map(c => c.id === itemId ? {...c, qty: c.qty - 1} : c)
      }
      return prev.filter(c => c.id !== itemId)
    })
  }

  const cartTotal = cart.reduce((sum, i) => sum + (i.default_price * i.qty), 0)

  const handlePlaceOrder = async (paymentType) => {
    if (!cart.length || !orderTable) return
    
    const orderItems = cart.map(i => ({
      menu_item_id: i.id,
      name: i.name,
      quantity: i.qty,
      unit_price: i.default_price,
      subtotal: i.default_price * i.qty
    }))
    
    const { error } = await supabase.from('orders').insert({
      venue_id: VENUE_ID,
      event_id: selectedEvent.id,
      event_table_id: orderTable.id,
      waiter_id: waiter.id,
      order_items: orderItems,
      total: cartTotal,
      status: 'preparing',
      payment_type: paymentType,
      payment_status: 'pending'
    })
    
    if (!error) {
      setShowOrderModal(false)
      setCart([])
      loadOrders()
    }
  }

  const filteredMenu = searchQuery 
    ? menuItems.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : menuItems

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
    alertBanner: { position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: colors.error, color: '#fff', padding: 12, textAlign: 'center', fontWeight: 600, zIndex: 50, animation: 'pulse 1s infinite' }
  }

  const renderGrid = (showMyOnly, clickable) => {
    const cellSize = 40, gap = 4
    const maxRow = Math.max(...eventTables.map(t => t.grid_row), 5)
    const maxCol = Math.max(...eventTables.map(t => t.grid_col), 7)
    
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maxCol + 1}, ${cellSize}px)`, gap, padding: 8, backgroundColor: colors.noir, border: `1px solid ${colors.border}`, borderRadius: 8, width: 'fit-content' }}>
          {Array.from({ length: maxRow + 1 }).map((_, row) => 
            Array.from({ length: maxCol + 1 }).map((_, col) => {
              const t = eventTables.find(t => t.grid_row === row && t.grid_col === col)
              if (!t) return <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }} />
              
              const mine = myTableIdsRef.current.includes(t.id)
              const hRes = reservations.some(r => r.event_table_id === t.id)
              const cfg = { vip: colors.vip, normal: colors.normal, bar: colors.bar }[t.table_type] || colors.normal
              const showTxt = !showMyOnly || mine
              
              return (
                <div 
                  key={`${row}-${col}`} 
                  onClick={() => clickable && mine && openTableOrder(t)}
                  style={{ 
                    width: cellSize, 
                    height: cellSize, 
                    borderRadius: 6, 
                    border: `2px solid ${hRes ? colors.warning : mine ? colors.champagne : cfg}`,
                    backgroundColor: hRes ? `${colors.warning}25` : mine ? `${colors.champagne}25` : `${cfg}15`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: clickable && mine ? 'pointer' : 'default', 
                    fontSize: 9, 
                    fontWeight: 700, 
                    color: hRes ? colors.warning : mine ? colors.champagne : cfg, 
                    opacity: showMyOnly && !mine ? 0.4 : 1 
                  }}
                >
                  {showTxt ? t.table_number : ''}
                </div>
              )
            })
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 10, color: colors.textMuted, flexWrap: 'wrap' }}>
          <span>🟡 Masa ta (click = comandă)</span>
          <span>🟠 Rezervată</span>
          <span>🔵 Alte mese</span>
        </div>
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
      <header style={s.header}>
        <Link href="/" style={{ textDecoration: 'none' }}><span style={s.logo}>S I P</span></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.success }} title="Live" />
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
        {[
          { id: 'orders', label: `🔔 Comenzi ${newO.length > 0 ? `(${newO.length})` : ''}` },
          { id: 'tables', label: '🗺️ Mesele mele' },
          { id: 'reservations', label: '📋 Rezervări' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'}}>{tab.label}</button>
        ))}
      </div>
      
      <div style={s.content}>
        {activeTab === 'orders' && <>
          {myTableIdsRef.current.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: colors.warning }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <p>Nu ai mese atribuite.</p>
            </div>
          )}
          
          {newO.length > 0 && <>
            <div style={s.title}>🔔 Noi ({newO.length})</div>
            {newO.map(o => (
              <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${colors.error}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{o.table_number || o.event_tables?.table_number}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: colors.champagne }}>{o.total} LEI</div>
                </div>
                {o.order_items?.map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span>{i.quantity}× {i.name}</span>
                    <span style={{ color: colors.textMuted }}>{i.subtotal} LEI</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Plată: {o.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}</div>
                  <button onClick={() => handleOrderStatus(o.id, 'preparing')} style={{ ...s.btn, width: '100%', backgroundColor: colors.success, color: 'white' }}>✓ Accept</button>
                </div>
              </div>
            ))}
          </>}
          
          {prepO.length > 0 && <>
            <div style={{ ...s.title, marginTop: 24 }}>⏳ În pregătire ({prepO.length})</div>
            {prepO.map(o => (
              <div key={o.id} style={{ ...s.card, opacity: 0.9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{o.table_number || o.event_tables?.table_number}</span>
                    <span style={{ marginLeft: 12, color: colors.champagne }}>{o.total} LEI</span>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{o.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div>
                  </div>
                  <button onClick={() => handleOrderStatus(o.id, 'ready')} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Gata →</button>
                </div>
              </div>
            ))}
          </>}
          
          {readyO.length > 0 && <>
            <div style={{ ...s.title, marginTop: 24 }}>✓ De livrat ({readyO.length})</div>
            {readyO.map(o => (
              <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${colors.champagne}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500 }}>{o.table_number || o.event_tables?.table_number}</span>
                  <span style={{ fontSize: 18, color: colors.champagne, fontWeight: 500 }}>{o.total} LEI</span>
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>{o.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => handleMarkPaid(o.id, 'cash')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.success}`, color: colors.success }}>💵 Cash</button>
                  <button onClick={() => handleMarkPaid(o.id, 'card')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.normal}`, color: colors.normal }}>💳 Card</button>
                </div>
              </div>
            ))}
          </>}
          
          {newO.length === 0 && prepO.length === 0 && readyO.length === 0 && myTableIdsRef.current.length > 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <p>Nicio comandă activă</p>
            </div>
          )}
        </>}
        
        {activeTab === 'tables' && <>
          <div style={s.title}>Click pe masa ta = adaugă comandă</div>
          {renderGrid(true, true)}
        </>}
        
        {activeTab === 'reservations' && <>
          <div style={s.title}>Rezervări</div>
          {renderGrid(false, false)}
          <div style={{ marginTop: 24 }}>
            {reservations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: colors.textMuted }}>Nicio rezervare</div>
            ) : reservations.map(r => (
              <div key={r.id} style={s.card}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, backgroundColor: `${colors.warning}25`, border: `2px solid ${colors.warning}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: colors.warning }}>
                    {r.event_tables?.table_number || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.customer_name} {r.is_vip && '⭐'}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>🕐 {r.reservation_time} • 👥 {r.party_size}p</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>

      {/* Order Modal */}
      {showOrderModal && orderTable && (
        <div style={s.modal} onClick={() => setShowOrderModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Comandă - {orderTable.table_number}</div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>{cart.length} produse • {cartTotal} LEI</div>
              </div>
              <button onClick={() => setShowOrderModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Caută produs..." style={{...s.input, textAlign: 'left', marginBottom: 16 }} />
              
              {!searchQuery && popularItems.length > 0 && <>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>🔥 POPULAR</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {popularItems.map(i => (
                    <button key={i.id} onClick={() => addToCart(i)} style={{...s.btnSm, backgroundColor: `${colors.error}20`, color: colors.error, border: `1px solid ${colors.error}`}}>{i.name}</button>
                  ))}
                </div>
              </>}
              
              {categories.map(cat => {
                const items = filteredMenu.filter(m => m.category_id === cat.id && m.is_available !== false)
                if (!items.length) return null
                return (
                  <div key={cat.id} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: colors.champagne, marginBottom: 8 }}>{cat.name}</div>
                    {items.map(i => (
                      <div key={i.id} onClick={() => addToCart(i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{i.name}</div>
                          {i.description && <div style={{ fontSize: 11, color: colors.textMuted }}>{i.description}</div>}
                        </div>
                        <span style={{ color: colors.champagne }}>{i.default_price} LEI</span>
                      </div>
                    ))}
                  </div>
                )
              })}

              {cart.length > 0 && <>
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: `2px solid ${colors.champagne}` }}>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>🛒 COȘ</div>
                  {cart.map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => removeFromCart(i.id)} style={{...s.btnSm, backgroundColor: colors.error, color: '#fff', padding: '4px 10px' }}>−</button>
                        <span>{i.qty}× {i.name}</span>
                      </div>
                      <span style={{ color: colors.champagne }}>{i.default_price * i.qty} LEI</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${colors.border}`, fontSize: 18, fontWeight: 600 }}>
                    <span>TOTAL</span>
                    <span style={{ color: colors.champagne }}>{cartTotal} LEI</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                  <button onClick={() => handlePlaceOrder('cash')} style={{...s.btn, backgroundColor: colors.success, color: '#fff', padding: 16 }}>💵 Cash</button>
                  <button onClick={() => handlePlaceOrder('card')} style={{...s.btn, backgroundColor: colors.normal, color: '#fff', padding: 16 }}>💳 Card</button>
                </div>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
