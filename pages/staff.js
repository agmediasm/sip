import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventMenu, getCategories, loginWaiter, getTableAssignments, getEventReservations } from '../lib/supabase'

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
  const myTableIdsRef = useRef([])
  const audioRef = useRef(null)

  useEffect(() => { const saved = localStorage.getItem('sip_waiter'); if (saved) try { setWaiter(JSON.parse(saved)) } catch(e) {} }, [])
  useEffect(() => { if (waiter) loadEvents() }, [waiter])
  useEffect(() => { if (selectedEvent && waiter) loadEventData() }, [selectedEvent, waiter])
  
  useEffect(() => {
    if (!selectedEvent || !waiter) return
    const channel = supabase.channel('staff-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `event_id=eq.${selectedEvent.id}` }, (payload) => {
      if (payload.eventType === 'INSERT' && myTableIdsRef.current.includes(payload.new.event_table_id)) { setNewOrderAlert(true); playSound(); setTimeout(() => setNewOrderAlert(false), 3000) }
      loadOrders()
    }).subscribe()
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
    const { data } = await supabase.from('orders').select('*, event_tables(*)').eq('event_id', selectedEvent.id).in('event_table_id', myTableIdsRef.current.length ? myTableIdsRef.current : ['00000000-0000-0000-0000-000000000000']).in('status', ['new', 'preparing', 'ready']).order('created_at', { ascending: true })
    if (data) setOrders(data)
  }

  const loadTableHistory = async (tableId) => {
    const { data } = await supabase.from('orders').select('*, event_tables(*)').eq('event_id', selectedEvent.id).eq('event_table_id', tableId).order('created_at', { ascending: false }).limit(20)
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
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) loadOrders()
  }

  const handleMarkPaid = async (orderId, paymentType) => {
    const { error } = await supabase.from('orders').update({ status: 'delivered', payment_status: 'paid', payment_type: paymentType }).eq('id', orderId)
    if (!error) loadOrders()
  }

  const openTableOptions = (table) => { setSelectedTable(table); setShowTableModal(true) }
  const openOrderModal = () => { setShowTableModal(false); setCart([]); setSearchQuery(''); setShowOrderModal(true) }
  const openHistoryModal = async () => { setShowTableModal(false); await loadTableHistory(selectedTable.id); setShowHistoryModal(true) }
  
  const addToCart = (item) => { setCart(prev => { const ex = prev.find(c => c.id === item.id); return ex ? prev.map(c => c.id === item.id ? {...c, qty: c.qty + 1} : c) : [...prev, {...item, qty: 1}] }) }
  const removeFromCart = (itemId) => { setCart(prev => { const ex = prev.find(c => c.id === itemId); return ex?.qty > 1 ? prev.map(c => c.id === itemId ? {...c, qty: c.qty - 1} : c) : prev.filter(c => c.id !== itemId) }) }
  const cartTotal = cart.reduce((sum, i) => sum + (i.default_price * i.qty), 0)

  const handlePlaceOrder = async (paymentType) => {
    if (!cart.length || !selectedTable) return
    const { error } = await supabase.from('orders').insert({ venue_id: VENUE_ID, event_id: selectedEvent.id, event_table_id: selectedTable.id, waiter_id: waiter.id, order_items: cart.map(i => ({ menu_item_id: i.id, name: i.name, quantity: i.qty, unit_price: i.default_price, subtotal: i.default_price * i.qty })), total: cartTotal, status: 'preparing', payment_type: paymentType, payment_status: 'pending' })
    if (!error) { setShowOrderModal(false); setCart([]); setSelectedTable(null); loadOrders() }
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
    floatingCart: { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.onyx, borderTop: `2px solid ${colors.champagne}`, padding: 16, zIndex: 110 }
  }

  const renderGrid = (forMyTables) => {
    const cellSize = forMyTables ? 48 : 40, gap = 4
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
            const hRes = reservations.some(r => r.event_table_id === t.id)
            const cfg = { vip: colors.vip, normal: colors.normal, bar: colors.bar }[t.table_type] || colors.normal
            
            if (forMyTables) {
              return (
                <div key={`${row}-${col}`} onClick={() => mine && openTableOptions(t)} style={{ width: cellSize, height: cellSize, borderRadius: 8, border: mine ? `3px solid ${colors.champagne}` : `1px solid ${colors.border}`, backgroundColor: mine ? `${colors.champagne}40` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: mine ? 'pointer' : 'default', fontSize: 10, fontWeight: 700, color: mine ? colors.champagne : 'transparent', opacity: mine ? 1 : 0.2, transition: 'all 0.2s' }}>
                  {mine ? t.table_number : ''}
                </div>
              )
            }
            
            return (
              <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize, borderRadius: 6, border: `2px solid ${hRes ? colors.warning : mine ? colors.champagne : cfg}`, backgroundColor: hRes ? `${colors.warning}25` : mine ? `${colors.champagne}25` : `${cfg}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: hRes ? colors.warning : mine ? colors.champagne : cfg }}>
                {t.table_number}
              </div>
            )
          }))}
        </div>
        {activeZone === 'back' && <div style={{...s.stage, marginTop: 8, marginBottom: 0}}>🎪 SCENĂ</div>}
        {forMyTables ? (
          <div style={{ marginTop: 16, fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>💡 Click pe o masă pentru a adăuga un produs</div>
        ) : (
          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 10, color: colors.textMuted, flexWrap: 'wrap' }}>
            <span>🟡 Masa ta</span><span>🟠 Rezervată</span><span>🔵 Alte mese</span>
          </div>
        )}
      </div>
    )
  }

  const renderOrderItems = (items) => items?.map((i, idx) => (
    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span>{i.quantity}× {i.name}</span>
      <span style={{ color: colors.textMuted }}>{i.subtotal} LEI</span>
    </div>
  ))

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
            {prepO.map(o => (
              <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${colors.warning}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{o.event_tables?.table_number || o.table_number}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: colors.champagne }}>{o.total} LEI</div>
                </div>
                {renderOrderItems(o.order_items)}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                  <button onClick={() => handleOrderStatus(o.id, 'ready')} style={{ ...s.btn, width: '100%', backgroundColor: colors.champagne, color: colors.noir }}>✓ Gata de servit</button>
                </div>
              </div>
            ))}
          </>}
          
          {readyO.length > 0 && <>
            <div style={{ ...s.title, marginTop: 24 }}>✓ De livrat ({readyO.length})</div>
            {readyO.map(o => (
              <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${colors.success}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{o.event_tables?.table_number || o.table_number}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: colors.champagne }}>{o.total} LEI</div>
                </div>
                {renderOrderItems(o.order_items)}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Încasează:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={() => handleMarkPaid(o.id, 'cash')} style={{ ...s.btn, backgroundColor: colors.success, color: '#fff' }}>💵 Cash</button>
                    <button onClick={() => handleMarkPaid(o.id, 'card')} style={{ ...s.btn, backgroundColor: colors.normal, color: '#fff' }}>💳 Card</button>
                  </div>
                </div>
              </div>
            ))}
          </>}
          
          {newO.length > 0 && <>
            <div style={{ ...s.title, marginTop: 24 }}>🔔 NOI ({newO.length})</div>
            {newO.map(o => (
              <div key={o.id} style={{ ...s.card, borderLeft: `3px solid ${colors.error}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{o.event_tables?.table_number || o.table_number}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{new Date(o.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: colors.champagne }}>{o.total} LEI</div>
                </div>
                {renderOrderItems(o.order_items)}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>Plată: {o.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}</div>
                  <button onClick={() => handleOrderStatus(o.id, 'preparing')} style={{ ...s.btn, width: '100%', backgroundColor: colors.success, color: 'white' }}>✓ Accept</button>
                </div>
              </div>
            ))}
          </>}
          
          {newO.length === 0 && prepO.length === 0 && readyO.length === 0 && myTableIdsRef.current.length > 0 && <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}><div style={{ fontSize: 48, marginBottom: 16 }}>✓</div><p>Nicio comandă activă</p></div>}
        </>}
        
        {activeTab === 'tables' && renderGrid(true)}
        
        {activeTab === 'reservations' && <>
          <div style={s.title}>Rezervări</div>
          {renderGrid(false)}
          <div style={{ marginTop: 24 }}>
            {reservations.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: colors.textMuted }}>Nicio rezervare</div> : reservations.map(r => (
              <div key={r.id} style={s.card}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, backgroundColor: `${colors.warning}25`, border: `2px solid ${colors.warning}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: colors.warning }}>{r.event_tables?.table_number || '?'}</div>
                  <div><div style={{ fontSize: 14, fontWeight: 500 }}>{r.customer_name} {r.is_vip && '⭐'}</div><div style={{ fontSize: 11, color: colors.textMuted }}>🕐 {r.reservation_time} • 👥 {r.party_size}p</div></div>
                </div>
              </div>
            ))}
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
                  {o.order_items?.map((i, idx) => (
                    <div key={idx} style={{ fontSize: 13, padding: '2px 0' }}>{i.quantity}× {i.name}</div>
                  ))}
                  <div style={{ marginTop: 8, fontWeight: 600, color: colors.champagne }}>{o.total} LEI • {o.payment_type === 'cash' ? '💵' : '💳'} {o.payment_status === 'paid' ? '✓' : '○'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Order Modal with Floating Cart */}
      {showOrderModal && selectedTable && (
        <div style={{...s.modal, alignItems: 'flex-start', paddingTop: 0, paddingBottom: cart.length > 0 ? 180 : 0}}>
          <div style={{...s.modalBox, maxHeight: 'none', borderRadius: 0, minHeight: '100vh'}} onClick={e => e.stopPropagation()}>
            <div style={{...s.modalHead, position: 'sticky', top: 0, backgroundColor: colors.onyx, zIndex: 10}}>
              <div><div style={{ fontSize: 16, fontWeight: 600 }}>Comandă - {selectedTable.table_number}</div></div>
              <button onClick={() => { setShowOrderModal(false); setCart([]) }} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Caută produs..." style={{...s.input, textAlign: 'left', marginBottom: 16 }} />
              {!searchQuery && popularItems.length > 0 && <><div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>🔥 POPULAR</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{popularItems.map(i => (<button key={i.id} onClick={() => addToCart(i)} style={{...s.btnSm, backgroundColor: `${colors.error}20`, color: colors.error, border: `1px solid ${colors.error}`}}>{i.name}</button>))}</div></>}
              {categories.map(cat => { const items = filteredMenu.filter(m => m.category_id === cat.id && m.is_available !== false); if (!items.length) return null; return (<div key={cat.id} style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: colors.champagne, marginBottom: 8, fontWeight: 600 }}>{cat.name}</div>{items.map(i => (<div key={i.id} onClick={() => addToCart(i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}><div><div style={{ fontWeight: 500 }}>{i.name}</div>{i.description && <div style={{ fontSize: 11, color: colors.textMuted }}>{i.description}</div>}</div><span style={{ color: colors.champagne, fontWeight: 500 }}>{i.default_price} LEI</span></div>))}</div>) })}
            </div>
          </div>
          
          {/* Floating Cart */}
          {cart.length > 0 && (
            <div style={s.floatingCart}>
              <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 12 }}>
                {cart.map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => removeFromCart(i.id)} style={{...s.btnSm, backgroundColor: colors.error, color: '#fff', padding: '2px 8px', fontSize: 14 }}>−</button>
                      <span style={{ fontSize: 13 }}>{i.qty}× {i.name}</span>
                    </div>
                    <span style={{ color: colors.champagne, fontSize: 13 }}>{i.default_price * i.qty} LEI</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${colors.border}`, marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>TOTAL</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: colors.champagne }}>{cartTotal} LEI</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button onClick={() => handlePlaceOrder('cash')} style={{...s.btn, backgroundColor: colors.success, color: '#fff', padding: 14 }}>💵 Cash</button>
                <button onClick={() => handlePlaceOrder('card')} style={{...s.btn, backgroundColor: colors.normal, color: '#fff', padding: 14 }}>💳 Card</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
