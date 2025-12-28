import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventReservations, createReservation, deleteReservation, loginWaiter, getTableOrders, getTableHistory, updateOrderStatus, markOrderPaid, getTableAssignments } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

const colors = {
  noir: '#08080a', onyx: '#1a1a1c', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0',
  border: 'rgba(255,255,255,0.15)', textMuted: 'rgba(255,255,255,0.65)',
  success: '#22c55e', error: '#ef4444',
  vip: '#d4af37', normal: '#3b82f6', bar: '#8b5cf6'
}

const TABLE_TYPES = {
  vip: { color: colors.vip, shape: 'square', size: 48 },
  normal: { color: colors.normal, shape: 'square', size: 40 },
  bar: { color: colors.bar, shape: 'circle', size: 32 }
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
  
  // Table history modal
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableHistory, setTableHistory] = useState([])
  const [tableOrders, setTableOrders] = useState([])
  
  // Reservation modal
  const [showResModal, setShowResModal] = useState(false)
  const [resTableId, setResTableId] = useState(null)
  const [resForm, setResForm] = useState({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false })

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sip_waiter') : null
    if (saved) setWaiter(JSON.parse(saved))
    loadEvents()
  }, [])

  useEffect(() => { if (selectedEvent) loadEventData() }, [selectedEvent])

  const loadEvents = async () => {
    setLoading(true)
    const { data } = await getEvents(VENUE_ID, true)
    if (data?.length) { setEvents(data); setSelectedEvent(data[0]) }
    setLoading(false)
  }

  const loadEventData = async () => {
    if (!selectedEvent) return
    const [tablesRes, resRes, assignRes] = await Promise.all([
      getEventTables(selectedEvent.id),
      getEventReservations(selectedEvent.id),
      getTableAssignments(selectedEvent.id)
    ])
    if (tablesRes.data) setEventTables(tablesRes.data)
    if (resRes.data) setReservations(resRes.data)
    if (assignRes.data) setTableAssignments(assignRes.data)
    
    const { data: ordersData } = await supabase.from('orders').select('*, order_items(*), event_tables(*)')
      .eq('event_id', selectedEvent.id).in('status', ['new', 'preparing', 'ready']).order('created_at', { ascending: false })
    if (ordersData) setOrders(ordersData)
  }

  const handleLogin = async () => {
    setLoginError('')
    if (!phoneInput) return
    const { data } = await loginWaiter(phoneInput)
    if (data) { setWaiter(data); localStorage.setItem('sip_waiter', JSON.stringify(data)) }
    else setLoginError('Numărul nu este înregistrat')
  }

  const handleLogout = () => { setWaiter(null); localStorage.removeItem('sip_waiter') }

  const openTableHistory = async (table) => {
    setSelectedTable(table)
    const [historyRes, ordersRes] = await Promise.all([
      getTableHistory(table.id),
      getTableOrders(table.id)
    ])
    setTableHistory(historyRes.data || [])
    setTableOrders(ordersRes.data || [])
  }

  const closeTableHistory = () => { setSelectedTable(null); setTableHistory([]); setTableOrders([]) }

  const openResModal = (tableId) => { setResTableId(tableId); setShowResModal(true) }

  const handleCreateRes = async () => {
    if (!resForm.customer_name || !resTableId || !selectedEvent) return
    const table = eventTables.find(t => t.id === resTableId)
    await createReservation({
      venue_id: VENUE_ID, event_id: selectedEvent.id, event_table_id: resTableId,
      customer_name: resForm.customer_name, customer_phone: resForm.customer_phone,
      party_size: resForm.party_size, reservation_time: resForm.reservation_time,
      notes: resForm.notes, is_vip: resForm.is_vip
    })
    setShowResModal(false); setResTableId(null)
    setResForm({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false })
    loadEventData()
  }

  const handleDeleteRes = async (resId) => {
    if (!confirm('Ștergi rezervarea?')) return
    await deleteReservation(resId)
    loadEventData()
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

  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40, flexWrap: 'wrap', gap: '8px' },
    logoText: { fontSize: '18px', fontWeight: '300', letterSpacing: '6px', color: colors.champagne },
    tabs: { display: 'flex', gap: '0', padding: '0 16px', borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' },
    tab: { padding: '14px 16px', border: 'none', backgroundColor: 'transparent', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    content: { padding: '16px' },
    sectionTitle: { fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: colors.textMuted, marginBottom: '12px' },
    btn: { padding: '10px 16px', border: 'none', fontSize: '11px', fontWeight: '400', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '16px', marginBottom: '12px' },
    input: { width: '100%', padding: '14px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: '16px', marginBottom: '12px', outline: 'none' },
    select: { width: '100%', padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: '14px', marginBottom: '12px' },
    label: { display: 'block', fontSize: '10px', color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    modalContent: { backgroundColor: colors.onyx, width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: '16px' },
    modalFooter: { padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' },
    loginContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' },
  }

  // LOGIN
  if (!waiter) {
    return (
      <div style={s.container}>
        <Head><title>S I P - Staff Login</title></Head>
        <div style={s.loginContainer}>
          <div style={{ fontSize: '48px', fontWeight: '300', letterSpacing: '16px', color: colors.champagne, marginBottom: '8px' }}>S I P</div>
          <div style={{ fontSize: '11px', letterSpacing: '4px', color: colors.textMuted, marginBottom: '48px' }}>STAFF LOGIN</div>
          <div style={{ width: '100%', maxWidth: '300px' }}>
            <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="07XX XXX XXX" style={{...s.input, textAlign: 'center', letterSpacing: '2px'}} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
            {loginError && <div style={{ color: colors.error, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>{loginError}</div>}
            <button onClick={handleLogin} style={{ ...s.btn, width: '100%', backgroundColor: colors.champagne, color: colors.noir, justifyContent: 'center', padding: '16px' }}>Intră</button>
          </div>
          <Link href="/" style={{ marginTop: '48px', fontSize: '11px', color: colors.textMuted, textDecoration: 'none' }}>← Înapoi</Link>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{...s.container, display:'flex', alignItems:'center', justifyContent:'center'}}><div style={{fontSize:'32px', fontWeight:'300', letterSpacing:'12px', color:colors.champagne}}>S I P</div></div>

  const newOrders = orders.filter(o => o.status === 'new')
  const prepOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')

  return (
    <div style={s.container}>
      <Head><title>S I P - Staff</title></Head>

      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}><div style={s.logoText}>S I P</div></Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: colors.platinum }}>👤 {waiter.name}</span>
          <button onClick={handleLogout} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, padding: '8px' }}>Ieși</button>
        </div>
      </header>

      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.onyx }}>
        <select value={selectedEvent?.id || ''} onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value))} style={{ ...s.select, marginBottom: 0 }}>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} - {new Date(ev.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</option>)}
        </select>
      </div>

      <div style={s.tabs}>
        {['orders', 'tables', 'reservations'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ ...s.tab, color: activeTab === tab ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab ? colors.champagne : 'transparent' }}>
            {tab === 'orders' ? `🔔 Comenzi ${newOrders.length > 0 ? `(${newOrders.length})` : ''}` : tab === 'tables' ? '🗺️ Mese' : `📋 Rezervări`}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {/* ORDERS */}
        {activeTab === 'orders' && <>
          {newOrders.length > 0 && <>
            <div style={s.sectionTitle}>🔔 Comenzi noi</div>
            {newOrders.map(order => (
              <div key={order.id} style={{ ...s.card, borderLeft: `3px solid ${colors.error}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{order.table_number || order.event_tables?.table_number}</div>
                    <div style={{ fontSize: '10px', color: colors.textMuted }}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '500', color: colors.champagne }}>{order.total} LEI</div>
                </div>
                {order.order_items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                    <span>{item.quantity}× {item.name}</span>
                    <span style={{ color: colors.textMuted }}>{item.subtotal} LEI</span>
                  </div>
                ))}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '8px' }}>Client alege: {order.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}</div>
                  <button onClick={() => handleOrderStatus(order.id, 'preparing')} style={{ ...s.btn, width: '100%', backgroundColor: colors.success, color: 'white', justifyContent: 'center' }}>✓ Acceptă comanda</button>
                </div>
              </div>
            ))}
          </>}

          {prepOrders.length > 0 && <>
            <div style={{ ...s.sectionTitle, marginTop: '24px' }}>⏳ În pregătire</div>
            {prepOrders.map(order => (
              <div key={order.id} style={{ ...s.card, opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '500' }}>{order.table_number || order.event_tables?.table_number}</span>
                    <span style={{ marginLeft: '12px', color: colors.champagne }}>{order.total} LEI</span>
                  </div>
                  <button onClick={() => handleOrderStatus(order.id, 'ready')} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Gata →</button>
                </div>
              </div>
            ))}
          </>}

          {readyOrders.length > 0 && <>
            <div style={{ ...s.sectionTitle, marginTop: '24px' }}>✓ De livrat + încasat</div>
            {readyOrders.map(order => (
              <div key={order.id} style={{ ...s.card, borderLeft: `3px solid ${colors.champagne}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '500' }}>{order.table_number || order.event_tables?.table_number}</span>
                  <span style={{ fontSize: '18px', color: colors.champagne, fontWeight: '500' }}>{order.total} LEI</span>
                </div>
                <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '12px' }}>
                  {order.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => handleMarkPaid(order.id, 'cash')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.success}`, color: colors.success, justifyContent: 'center' }}>💵 Cash</button>
                  <button onClick={() => handleMarkPaid(order.id, 'card')} style={{ ...s.btn, backgroundColor: 'transparent', border: `1px solid ${colors.normal}`, color: colors.normal, justifyContent: 'center' }}>💳 Card</button>
                </div>
              </div>
            ))}
          </>}

          {newOrders.length === 0 && prepOrders.length === 0 && readyOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: colors.textMuted }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
              <p>Nicio comandă activă</p>
            </div>
          )}
        </>}

        {/* TABLES */}
        {activeTab === 'tables' && <>
          <div style={s.sectionTitle}>Click pe masă pentru istoric</div>
          <div style={s.grid}>
            {eventTables.map(table => {
              const res = getTableRes(table.id)
              const cfg = TABLE_TYPES[table.table_type]
              const waiterAssigned = getAssignedWaiter(table.id)
              const isMyTable = waiterAssigned?.id === waiter.id
              return (
                <div
                  key={table.id}
                  onClick={() => openTableHistory(table)}
                  style={{
                    aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: res ? 'rgba(239,68,68,0.2)' : isMyTable ? 'rgba(212,175,55,0.2)' : colors.onyx,
                    border: `2px solid ${res ? colors.error : isMyTable ? colors.champagne : cfg.color}`,
                    borderRadius: cfg.shape === 'circle' ? '50%' : '4px', cursor: 'pointer'
                  }}
                >
                  <span style={{ fontWeight: '600', color: res ? colors.error : cfg.color }}>{table.table_number}</span>
                  <span style={{ fontSize: '9px', color: colors.textMuted }}>{table.capacity}p</span>
                  {res && <span style={{ fontSize: '8px', color: colors.error }}>Rezervat</span>}
                  {isMyTable && !res && <span style={{ fontSize: '8px', color: colors.champagne }}>Tu</span>}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '10px', color: colors.textMuted }}>
            <span>🟡 Masa ta</span>
            <span>🔴 Rezervată</span>
          </div>
        </>}

        {/* RESERVATIONS */}
        {activeTab === 'reservations' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={s.sectionTitle}>Rezervări ({reservations.length})</div>
          </div>
          <div style={{ ...s.sectionTitle, fontSize: '10px' }}>Click pe masă liberă pentru rezervare</div>
          <div style={s.grid}>
            {eventTables.map(table => {
              const res = getTableRes(table.id)
              const cfg = TABLE_TYPES[table.table_type]
              return (
                <div
                  key={table.id}
                  onClick={() => !res && openResModal(table.id)}
                  style={{
                    aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: res ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)',
                    border: `2px solid ${res ? colors.error : colors.success}`,
                    borderRadius: cfg.shape === 'circle' ? '50%' : '4px', cursor: res ? 'default' : 'pointer'
                  }}
                >
                  <span style={{ fontWeight: '600', color: res ? colors.error : colors.success }}>{table.table_number}</span>
                  {res ? <span style={{ fontSize: '8px' }}>{res.customer_name?.split(' ')[0]}</span> : <span style={{ fontSize: '8px' }}>Liber</span>}
                </div>
              )
            })}
          </div>

          {reservations.map(res => (
            <div key={res.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', color: colors.champagne }}>{res.event_tables?.table_number}</div>
                <div>
                  <div style={{ fontWeight: '400' }}>{res.customer_name} {res.is_vip && '⭐'}</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted }}>🕐 {res.reservation_time} • 👥 {res.party_size}p</div>
                </div>
              </div>
              <button onClick={() => handleDeleteRes(res.id)} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.error, padding: '8px' }}>✕</button>
            </div>
          ))}
        </>}
      </div>

      {/* Table History Modal */}
      {selectedTable && (
        <div style={s.modal} onClick={closeTableHistory}>
          <div style={{ ...s.modalContent, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>{selectedTable.table_number} - Istoric</h3>
              <button onClick={closeTableHistory} style={{ ...s.btn, padding: '4px', background: 'transparent', color: colors.textMuted }}>✕</button>
            </div>
            <div style={{ ...s.modalBody, maxHeight: '60vh', overflow: 'auto' }}>
              {tableOrders.length === 0 && tableHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: colors.textMuted }}>Niciun istoric</div>
              ) : (
                <>
                  <div style={s.sectionTitle}>Comenzi</div>
                  {tableOrders.map(order => (
                    <div key={order.id} style={{ ...s.card, padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: colors.textMuted }}>{new Date(order.created_at).toLocaleString('ro-RO')}</span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: order.payment_status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: order.payment_status === 'paid' ? colors.success : colors.error }}>
                          {order.payment_status === 'paid' ? '✓ Plătit' : 'Neplătit'}
                        </span>
                      </div>
                      {order.order_items?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
                          <span>{item.quantity}× {item.name}</span>
                          <span>{item.subtotal} LEI</span>
                        </div>
                      ))}
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: colors.textMuted, fontSize: '11px' }}>{order.payment_type === 'cash' ? '💵' : '💳'}</span>
                        <span style={{ fontWeight: '500', color: colors.champagne }}>{order.total} LEI</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {showResModal && resTableId && (
        <div style={s.modal} onClick={() => { setShowResModal(false); setResTableId(null) }}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={{ fontSize: '14px', margin: 0 }}>Rezervare - {eventTables.find(t => t.id === resTableId)?.table_number}</h3>
              <button onClick={() => { setShowResModal(false); setResTableId(null) }} style={{ ...s.btn, padding: '4px', background: 'transparent', color: colors.textMuted }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume client *</label>
              <input type="text" value={resForm.customer_name} onChange={e => setResForm({ ...resForm, customer_name: e.target.value })} placeholder="Andrei Popescu" style={s.input} />
              <label style={s.label}>Telefon</label>
              <input type="tel" value={resForm.customer_phone} onChange={e => setResForm({ ...resForm, customer_phone: e.target.value })} placeholder="07XX XXX XXX" style={s.input} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={s.label}>Persoane</label><select value={resForm.party_size} onChange={e => setResForm({ ...resForm, party_size: parseInt(e.target.value) })} style={s.select}>{[1,2,3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                <div><label style={s.label}>Ora</label><select value={resForm.reservation_time} onChange={e => setResForm({ ...resForm, reservation_time: e.target.value })} style={s.select}>{['21:00','21:30','22:00','22:30','23:00','23:30','00:00'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <label style={s.label}>Note</label>
              <input type="text" value={resForm.notes} onChange={e => setResForm({ ...resForm, notes: e.target.value })} placeholder="Tort surpriză..." style={s.input} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setResForm({ ...resForm, is_vip: !resForm.is_vip })}>
                <div style={{ width: '20px', height: '20px', border: `2px solid ${resForm.is_vip ? colors.champagne : colors.border}`, backgroundColor: resForm.is_vip ? colors.champagne : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.noir, fontSize: '12px' }}>{resForm.is_vip && '✓'}</div>
                <span style={{ fontSize: '13px' }}>Client VIP</span>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => { setShowResModal(false); setResTableId(null) }} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` }}>Anulează</button>
              <button onClick={handleCreateRes} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Rezervă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
