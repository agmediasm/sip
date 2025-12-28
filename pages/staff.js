import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventReservations, loginWaiter, getTableOrders, updateOrderStatus, markOrderPaid, getTableAssignments } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

const colors = {
  noir: '#08080a', onyx: '#141416', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0',
  border: 'rgba(255,255,255,0.12)', textMuted: 'rgba(255,255,255,0.55)',
  success: '#22c55e', error: '#ef4444', warning: '#f59e0b',
  vip: '#d4af37', normal: '#3b82f6', bar: '#8b5cf6'
}

const TABLE_TYPES = { vip: { color: colors.vip }, normal: { color: colors.normal }, bar: { color: colors.bar } }

// Notification sound - folosim un beep simplu
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (e) { console.log('Audio not supported') }
}

export default function StaffDashboard() {
  const [waiter, setWaiter] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [loginError, setLoginError] = useState('')
  
  const [activeTab, setActiveTab] = useState('orders')
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTables, setEventTables] = useState([])
  const [reservations, setReservations] = useState([])
  const [orders, setOrders] = useState([])
  const [tableAssignments, setTableAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableOrders, setTableOrders] = useState([])
  const [activeZone, setActiveZone] = useState('front')
  
  const subscriptionRef = useRef(null)
  const myTableIdsRef = useRef([])

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sip_waiter') : null
    if (saved) setWaiter(JSON.parse(saved))
    loadEvents()
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [])

  useEffect(() => { 
    if (selectedEvent && waiter) {
      loadEventData()
      setupRealtimeSubscription()
    }
  }, [selectedEvent, waiter])

  const setupRealtimeSubscription = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }
    
    subscriptionRef.current = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: `event_id=eq.${selectedEvent.id}`
      }, (payload) => {
        const newOrder = payload.new
        // Verifică dacă e pentru una din mesele mele
        if (myTableIdsRef.current.includes(newOrder.event_table_id)) {
          playNotificationSound()
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 3000)
          loadEventData() // Reîncarcă datele
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public', 
        table: 'orders',
        filter: `event_id=eq.${selectedEvent.id}`
      }, () => {
        loadEventData()
      })
      .subscribe()
  }

  const loadEvents = async () => {
    setLoading(true)
    const { data } = await getEvents(VENUE_ID, true)
    if (data?.length) { setEvents(data); setSelectedEvent(data[0]) }
    setLoading(false)
  }

  const loadEventData = async () => {
    if (!selectedEvent || !waiter) return
    const [tablesRes, resRes, assignRes] = await Promise.all([
      getEventTables(selectedEvent.id),
      getEventReservations(selectedEvent.id),
      getTableAssignments(selectedEvent.id)
    ])
    if (tablesRes.data) setEventTables(tablesRes.data)
    if (resRes.data) setReservations(resRes.data)
    if (assignRes.data) setTableAssignments(assignRes.data)
    
    // Găsim mesele atribuite acestui ospătar
    const myTableIds = assignRes.data?.filter(a => a.waiter_id === waiter?.id).map(a => a.event_table_id) || []
    myTableIdsRef.current = myTableIds
    
    // Încărcăm DOAR comenzile de la mesele ospătarului
    // Ordonate ascending (cele vechi sus, cele noi jos)
    let ordersQuery = supabase.from('orders').select('*, order_items(*), event_tables(*)')
      .eq('event_id', selectedEvent.id)
      .in('status', ['new', 'preparing', 'ready'])
      .order('created_at', { ascending: true }) // Cele vechi sus!
    
    if (myTableIds.length > 0) {
      ordersQuery = ordersQuery.in('event_table_id', myTableIds)
    }
    
    const { data: ordersData } = await ordersQuery
    if (ordersData) setOrders(ordersData)
  }

  const handleLogin = async () => {
    setLoginError('')
    if (!phoneInput) return
    const { data } = await loginWaiter(phoneInput)
    if (data) { setWaiter(data); localStorage.setItem('sip_waiter', JSON.stringify(data)) }
    else setLoginError('Numărul nu este înregistrat')
  }

  const handleLogout = () => { 
    setWaiter(null)
    localStorage.removeItem('sip_waiter')
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }
  }

  const openTableHistory = async (table) => {
    setSelectedTable(table)
    const ordersRes = await getTableOrders(table.id)
    setTableOrders(ordersRes.data || [])
  }

  const handleOrderStatus = async (orderId, status) => { 
    await updateOrderStatus(orderId, status)
    loadEventData()
  }
  
  const handleMarkPaid = async (orderId, paymentType) => { 
    await markOrderPaid(orderId, paymentType)
    loadEventData()
  }

  const getTableRes = (tableId) => reservations.find(r => r.event_table_id === tableId)
  const getAssignedWaiter = (tableId) => tableAssignments.find(a => a.event_table_id === tableId)?.waiters
  const isMyTable = (tableId) => getAssignedWaiter(tableId)?.id === waiter?.id

  const getGridDimensions = (zone) => {
    const zoneTables = eventTables.filter(t => zone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    if (zoneTables.length === 0) return { rows: 6, cols: 8 }
    return { 
      rows: Math.max(6, Math.max(...zoneTables.map(t => t.grid_row)) + 1), 
      cols: Math.max(8, Math.max(...zoneTables.map(t => t.grid_col)) + 1) 
    }
  }

  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logo: { fontSize: 18, fontWeight: 300, letterSpacing: 6, color: colors.champagne },
    tabs: { display: 'flex', padding: '0 16px', borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' },
    tab: { padding: '14px 16px', border: 'none', background: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    content: { padding: 16 },
    title: { fontSize: 12, fontWeight: 600, letterSpacing: 2, color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' },
    btn: { padding: '10px 18px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 6 },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 12, borderRadius: 8 },
    input: { width: '100%', padding: 16, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: 16, marginBottom: 16, borderRadius: 6, outline: 'none', textAlign: 'center', boxSizing: 'border-box' },
    select: { width: '100%', padding: 14, border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: 15, marginBottom: 14, borderRadius: 6, boxSizing: 'border-box' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalBox: { backgroundColor: colors.onyx, width: '100%', maxWidth: 420, borderRadius: 12, border: `1px solid ${colors.border}`, maxHeight: '90vh', overflowY: 'auto' },
    modalHead: { padding: 18, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: 18 },
    zoneTabs: { display: 'flex', marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' },
    zoneTab: { flex: 1, padding: '10px 12px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
    loginContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 },
    newOrderBanner: { position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: colors.success, color: '#fff', padding: 16, textAlign: 'center', zIndex: 50, fontWeight: 600, animation: 'pulse 0.5s ease-in-out' }
  }

  const renderLayoutGrid = (showOnlyMyTables = false, clickable = true) => {
    const { rows, cols } = getGridDimensions(activeZone)
    const zoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    const cellSize = 42, gap = 4

    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={s.zoneTabs}>
          <button onClick={() => setActiveZone('front')} style={{...s.zoneTab, backgroundColor: activeZone === 'front' ? colors.champagne : 'transparent', color: activeZone === 'front' ? colors.noir : colors.textMuted}}>🎭 Față</button>
          <button onClick={() => setActiveZone('back')} style={{...s.zoneTab, backgroundColor: activeZone === 'back' ? colors.champagne : 'transparent', color: activeZone === 'back' ? colors.noir : colors.textMuted}}>🎪 Spate</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap, padding: 10, backgroundColor: colors.noir, border: `1px solid ${colors.border}`, borderRadius: 8, width: 'fit-content' }}>
          {Array.from({ length: rows }).map((_, row) => (
            Array.from({ length: cols }).map((_, col) => {
              const table = zoneTables.find(t => t.grid_row === row && t.grid_col === col)
              if (!table) return <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }} />
              
              const cfg = TABLE_TYPES[table.table_type]
              const hasRes = getTableRes(table.id)
              const myTable = isMyTable(table.id)
              const showText = showOnlyMyTables ? myTable : true
              
              return (
                <div key={`${row}-${col}`} onClick={() => clickable && openTableHistory(table)}
                  style={{ width: cellSize, height: cellSize, border: `2px solid ${hasRes ? colors.warning : myTable ? colors.champagne : cfg.color}`,
                    borderRadius: table.table_type === 'bar' ? '50%' : 6, backgroundColor: hasRes ? `${colors.warning}25` : myTable ? `${colors.champagne}25` : `${cfg.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: clickable ? 'pointer' : 'default',
                    fontSize: 9, fontWeight: 700, color: hasRes ? colors.warning : myTable ? colors.champagne : cfg.color, opacity: showOnlyMyTables && !myTable ? 0.4 : 1 }}>
                  {showText ? table.table_number : ''}
                </div>
              )
            })
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 10, color: colors.textMuted, flexWrap: 'wrap' }}>
          <span>🟡 Masa ta</span><span>🟠 Rezervată</span><span>🔵 Alte mese</span>
        </div>
      </div>
    )
  }

  // LOGIN SCREEN
  if (!waiter) {
    return (
      <div style={s.container}>
        <Head><title>S I P - Staff Login</title></Head>
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
  }

  if (loading) return <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{fontSize: 32, fontWeight: 300, letterSpacing: 12, color: colors.champagne}}>S I P</div></div>

  const newOrders = orders.filter(o => o.status === 'new')
  const prepOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')

  return (
    <div style={s.container}>
      <Head><title>S I P - Staff</title></Head>

      {/* New Order Alert Banner */}
      {newOrderAlert && (
        <div style={s.newOrderBanner}>
          🔔 COMANDĂ NOUĂ!
        </div>
      )}

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
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} - {new Date(ev.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</option>)}
        </select>
      </div>

      <div style={s.tabs}>
        {[
          { id: 'orders', label: `🔔 Comenzi ${newOrders.length > 0 ? `(${newOrders.length})` : ''}` },
          { id: 'tables', label: '🗺️ Mesele mele' },
          { id: 'reservations', label: '📋 Rezervări' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'}}>{tab.label}</button>
        ))}
      </div>

      <div style={s.content}>
        {/* ORDERS - cele vechi sus, cele noi jos */}
        {activeTab === 'orders' && (
          <>
            {myTableIdsRef.current.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: colors.warning }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                <p>Nu ai mese atribuite pentru acest eveniment.</p>
                <p style={{ fontSize: 12, color: colors.textMuted }}>Contactează managerul pentru a-ți atribui mese.</p>
              </div>
            )}

            {newOrders.length > 0 && (
              <>
                <div style={s.title}>🔔 Comenzi noi ({newOrders.length})</div>
                {newOrders.map(order => (
                  <div key={order.id} style={{ ...s.card, borderLeft: `3px solid ${colors.error}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>{order.table_number || order.event_tables?.table_number}</div>
                        <div style={{ fontSize: 10, color: colors.textMuted }}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 500, color: colors.champagne }}>{order.total} LEI</div>
                    </div>
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                        <span>{item.quantity}× {item.name}</span>
                        <span style={{ color: colors.textMuted }}>{item.subtotal} LEI</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Plată: {order.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}</div>
                      <button onClick={() => handleOrderStatus(order.id, 'preparing')} style={{ ...s.btn, width: '100%', backgroundColor: colors.success, color: 'white' }}>✓ Acceptă comanda</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {prepOrders.length > 0 && (
              <>
                <div style={{ ...s.title, marginTop: 24 }}>⏳ În pregătire ({prepOrders.length})</div>
                {prepOrders.map(order => (
                  <div key={order.id} style={{ ...s.card, opacity: 0.9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{order.table_number || order.event_tables?.table_number}</span>
                        <span style={{ marginLeft: 12, color: colors.champagne }}>{order.total} LEI</span>
                        <div style={{ fontSize: 10, color: colors.textMuted }}>{order.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div>
                      </div>
                      <button onClick={() => handleOrderStatus(order.id, 'ready')} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Gata →</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {readyOrders.length > 0 && (
              <>
                <div style={{ ...s.title, marginTop: 24 }}>✓ De livrat ({readyOrders.length})</div>
                {readyOrders.map(order => (
                  <div key={order.id} style={{ ...s.card, borderLeft: `3px solid ${colors.champagne}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontWeight: 500 }}>{order.table_number || order.event_tables?.table_number}</span>
                      <span style={{ fontSize: 18, color: colors.champagne, fontWeight: 500 }}>{order.total} LEI</span>
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
                      {order.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button onClick={() => handleMarkPaid(order.id, 'cash')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.success}`, color: colors.success }}>💵 Cash</button>
                      <button onClick={() => handleMarkPaid(order.id, 'card')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.normal}`, color: colors.normal }}>💳 Card</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {newOrders.length === 0 && prepOrders.length === 0 && readyOrders.length === 0 && myTableIdsRef.current.length > 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
                <p>Nicio comandă activă</p>
                <p style={{ fontSize: 11, marginTop: 8 }}>Comenzile noi vor apărea automat</p>
              </div>
            )}
          </>
        )}

        {/* TABLES */}
        {activeTab === 'tables' && (
          <>
            <div style={s.title}>Mesele tale sunt marcate cu 🟡</div>
            {renderLayoutGrid(true, true)}
            <div style={{ marginTop: 16, fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>
              Click pe orice masă pentru istoric comenzi
            </div>
          </>
        )}

        {/* RESERVATIONS - Read only */}
        {activeTab === 'reservations' && (
          <>
            <div style={s.title}>Rezervări - vizualizare</div>
            {renderLayoutGrid(false, false)}
            
            <div style={{ marginTop: 24 }}>
              <div style={s.title}>Lista rezervări ({reservations.length})</div>
              {reservations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: colors.textMuted }}>Nicio rezervare</div>
              ) : (
                reservations.map(res => (
                  <div key={res.id} style={s.card}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, backgroundColor: `${colors.warning}25`, border: `2px solid ${colors.warning}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: colors.warning }}>{res.event_tables?.table_number || '?'}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{res.customer_name} {res.is_vip && <span style={{ color: colors.champagne }}>⭐</span>}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>🕐 {res.reservation_time} • 👥 {res.party_size}p</div>
                        {res.notes && <div style={{ fontSize: 11, color: colors.warning }}>📝 {res.notes}</div>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Table History Modal */}
      {selectedTable && (
        <div style={s.modal} onClick={() => setSelectedTable(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{selectedTable.table_number} - Istoric</span>
              <button onClick={() => setSelectedTable(null)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              {tableOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted }}>Nicio comandă</div>
              ) : (
                tableOrders.map(order => (
                  <div key={order.id} style={{ ...s.card, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>{new Date(order.created_at).toLocaleString('ro-RO')}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', backgroundColor: order.payment_status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: order.payment_status === 'paid' ? colors.success : colors.error, borderRadius: 4 }}>
                        {order.payment_status === 'paid' ? '✓ Plătit' : 'Neplătit'}
                      </span>
                    </div>
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                        <span>{item.quantity}× {item.name}</span>
                        <span>{item.subtotal} LEI</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.textMuted, fontSize: 11 }}>{order.payment_type === 'cash' ? '💵' : '💳'}</span>
                      <span style={{ fontWeight: 500, color: colors.champagne }}>{order.total} LEI</span>
                    </div>
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
