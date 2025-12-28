import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getEventTables, getEventReservations, createEventReservation, deleteReservation, loginWaiter, subscribeToOrders } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

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
  vip: '#d4af37',
  main: '#3b82f6',
  bar: '#8b5cf6',
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
  const [loading, setLoading] = useState(true)
  
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [selectedTableForRes, setSelectedTableForRes] = useState(null)
  const [resForm, setResForm] = useState({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false })

  useEffect(() => {
    const saved = localStorage.getItem('sip_waiter')
    if (saved) setWaiter(JSON.parse(saved))
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) loadEventData(selectedEvent.id)
  }, [selectedEvent])

  const loadEvents = async () => {
    setLoading(true)
    const { data } = await getEvents(VENUE_ID, true)
    if (data) {
      setEvents(data)
      if (data.length > 0) setSelectedEvent(data[0])
    }
    setLoading(false)
  }

  const loadEventData = async (eventId) => {
    const [tablesRes, resRes] = await Promise.all([
      getEventTables(eventId),
      getEventReservations(eventId)
    ])
    if (tablesRes.data) setEventTables(tablesRes.data)
    if (resRes.data) setReservations(resRes.data)
    
    // Load orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('event_id', eventId)
      .in('status', ['new', 'preparing'])
      .order('created_at', { ascending: false })
    if (ordersData) setOrders(ordersData)
  }

  const handleLogin = async () => {
    setLoginError('')
    if (!phoneInput) return
    const { data, error } = await loginWaiter(phoneInput)
    if (data) {
      setWaiter(data)
      localStorage.setItem('sip_waiter', JSON.stringify(data))
    } else {
      setLoginError('Numărul nu este înregistrat')
    }
  }

  const handleLogout = () => {
    setWaiter(null)
    localStorage.removeItem('sip_waiter')
  }

  const handleSelectTableForReservation = (table) => {
    if (table.status === 'reserved' || reservations.some(r => r.event_table_id === table.id)) return
    setSelectedTableForRes(table)
    setShowReservationModal(true)
  }

  const handleCreateReservation = async () => {
    if (!resForm.customer_name || !selectedTableForRes || !selectedEvent) return
    await createEventReservation({
      venue_id: VENUE_ID,
      event_id: selectedEvent.id,
      event_table_id: selectedTableForRes.id,
      table_id: null,
      customer_name: resForm.customer_name,
      customer_phone: resForm.customer_phone,
      party_size: resForm.party_size,
      reservation_time: resForm.reservation_time,
      reservation_date: selectedEvent.event_date,
      notes: resForm.notes,
      is_vip: resForm.is_vip,
    })
    setShowReservationModal(false)
    setSelectedTableForRes(null)
    setResForm({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false })
    loadEventData(selectedEvent.id)
  }

  const handleDeleteReservation = async (resId) => {
    if (!confirm('Ștergi rezervarea?')) return
    await deleteReservation(resId)
    loadEventData(selectedEvent.id)
  }

  const handleOrderStatus = async (orderId, newStatus) => {
    await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId)
    loadEventData(selectedEvent.id)
  }

  const getTableReservation = (tableId) => reservations.find(r => r.event_table_id === tableId)

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
    input: { width: '100%', padding: '14px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: '16px', marginBottom: '12px', outline: 'none', textAlign: 'center', letterSpacing: '2px' },
    select: { width: '100%', padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: '14px', marginBottom: '12px' },
    label: { display: 'block', fontSize: '10px', color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    modalContent: { backgroundColor: colors.onyx, width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: '16px' },
    modalFooter: { padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    layoutContainer: { position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: colors.noir, border: `1px solid ${colors.border}`, marginBottom: '16px', overflow: 'hidden' },
    tableNode: { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: '500', transition: 'transform 0.2s' },
    loginContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' },
    orderCard: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '16px', marginBottom: '12px' },
  }

  // LOGIN SCREEN
  if (!waiter) {
    return (
      <div style={s.container}>
        <Head><title>S I P - Staff Login</title></Head>
        <div style={s.loginContainer}>
          <div style={{ fontSize: '48px', fontWeight: '300', letterSpacing: '16px', color: colors.champagne, marginBottom: '8px' }}>S I P</div>
          <div style={{ fontSize: '11px', letterSpacing: '4px', color: colors.textMuted, marginBottom: '48px' }}>STAFF LOGIN</div>
          
          <div style={{ width: '100%', maxWidth: '300px' }}>
            <input
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              placeholder="07XX XXX XXX"
              style={s.input}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
            />
            {loginError && <div style={{ color: colors.error, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>{loginError}</div>}
            <button onClick={handleLogin} style={{ ...s.btn, width: '100%', backgroundColor: colors.champagne, color: colors.noir, justifyContent: 'center', padding: '16px' }}>
              Intră
            </button>
          </div>
          
          <Link href="/" style={{ marginTop: '48px', fontSize: '11px', color: colors.textMuted, textDecoration: 'none' }}>← Înapoi</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div style={{...s.container, display:'flex', alignItems:'center', justifyContent:'center'}}><div style={{textAlign:'center'}}><div style={{fontSize:'32px', fontWeight:'300', letterSpacing:'12px', color:colors.champagne}}>S I P</div><div style={{fontSize:'11px', letterSpacing:'2px', color:colors.textMuted, marginTop:'16px'}}>Loading...</div></div></div>
  }

  const newOrders = orders.filter(o => o.status === 'new')
  const preparingOrders = orders.filter(o => o.status === 'preparing')

  return (
    <div style={s.container}>
      <Head><title>S I P - Staff</title></Head>

      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}><div style={s.logoText}>S I P</div></Link>
          <span style={{ color: colors.textMuted, fontSize: '11px' }}>Staff</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: colors.platinum }}>👤 {waiter.name}</span>
          <button onClick={handleLogout} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, padding: '8px' }}>Ieși</button>
        </div>
      </header>

      {/* Event Selector */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.onyx }}>
        <select value={selectedEvent?.id || ''} onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value))} style={{ ...s.select, marginBottom: 0 }}>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name} - {new Date(ev.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</option>
          ))}
        </select>
      </div>

      <div style={s.tabs}>
        {['orders', 'reservations', 'layout'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ ...s.tab, color: activeTab === tab ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab ? colors.champagne : 'transparent' }}>
            {tab === 'orders' ? `🔔 Comenzi ${newOrders.length > 0 ? `(${newOrders.length})` : ''}` : tab === 'reservations' ? `📋 Rezervări (${reservations.length})` : '🗺️ Hartă'}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {/* ORDERS */}
        {activeTab === 'orders' && <>
          {newOrders.length > 0 && <>
            <div style={s.sectionTitle}>🔔 Comenzi noi</div>
            {newOrders.map(order => (
              <div key={order.id} style={{ ...s.orderCard, borderColor: colors.error }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '500' }}>{order.table_number}</div>
                    <div style={{ fontSize: '11px', color: colors.textMuted }}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ padding: '6px 12px', fontSize: '10px', backgroundColor: order.payment_type === 'cash' ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)', color: order.payment_type === 'cash' ? colors.success : '#6366f1' }}>
                    {order.payment_type === 'cash' ? '💵 CASH' : '💳 CARD'}
                  </div>
                </div>
                {order.order_items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, fontSize: '13px' }}>
                    <span>{item.quantity}× {item.name}</span>
                    <span style={{ color: colors.champagne }}>{item.subtotal} LEI</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: '18px', color: colors.champagne, fontWeight: '500' }}>{order.total} LEI</span>
                  <button onClick={() => handleOrderStatus(order.id, 'preparing')} style={{ ...s.btn, backgroundColor: colors.success, color: 'white' }}>✓ Pregătit</button>
                </div>
              </div>
            ))}
          </>}

          {preparingOrders.length > 0 && <>
            <div style={{ ...s.sectionTitle, marginTop: '24px' }}>⏳ În preparare</div>
            {preparingOrders.map(order => (
              <div key={order.id} style={{ ...s.orderCard, opacity: 0.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{order.table_number}</span>
                  <span style={{ fontSize: '16px', color: colors.champagne }}>{order.total} LEI</span>
                </div>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '12px' }}>
                  {order.order_items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                </div>
                <button onClick={() => handleOrderStatus(order.id, 'completed')} style={{ ...s.btn, width: '100%', backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}`, justifyContent: 'center' }}>Finalizat</button>
              </div>
            ))}
          </>}

          {newOrders.length === 0 && preparingOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: colors.textMuted }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
              <p>Nicio comandă activă</p>
            </div>
          )}
        </>}

        {/* RESERVATIONS */}
        {activeTab === 'reservations' && <>
          <div style={s.sectionTitle}>Click pe o masă liberă pentru rezervare</div>
          
          <div style={s.layoutContainer}>
            <div style={{ position: 'absolute', top: '2%', left: '25%', width: '50%', height: '8%', backgroundColor: 'rgba(212,175,55,0.1)', border: `1px dashed ${colors.champagne}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: colors.champagne, letterSpacing: '2px' }}>STAGE</div>
            
            {eventTables.map(table => {
              const res = getTableReservation(table.id)
              const zc = table.zone === 'vip' ? colors.vip : table.zone === 'bar' ? colors.bar : colors.main
              const isReserved = !!res
              
              return (
                <div
                  key={table.id}
                  onClick={() => handleSelectTableForReservation(table)}
                  style={{
                    ...s.tableNode,
                    left: `${table.position_x}%`,
                    top: `${table.position_y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: table.shape === 'rectangle' ? '70px' : '50px',
                    height: '50px',
                    borderRadius: table.shape === 'circle' ? '50%' : '4px',
                    backgroundColor: isReserved ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)',
                    border: `2px solid ${isReserved ? colors.error : colors.success}`,
                    color: isReserved ? colors.error : colors.success,
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{table.table_number}</span>
                  {isReserved ? (
                    <span style={{ fontSize: '8px' }}>{res.customer_name?.split(' ')[0]}</span>
                  ) : (
                    <span style={{ fontSize: '8px' }}>Liber</span>
                  )}
                </div>
              )
            })}
          </div>

          <div style={s.sectionTitle}>Rezervări ({reservations.length})</div>
          {reservations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: colors.textMuted }}>Nicio rezervare</div>
          ) : (
            reservations.map(res => (
              <div key={res.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', color: colors.champagne }}>
                    {res.event_tables?.table_number || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '400', marginBottom: '2px' }}>
                      {res.customer_name}
                      {res.is_vip && <span style={{ marginLeft: '6px' }}>⭐</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.textMuted }}>
                      🕐 {res.reservation_time} • 👥 {res.party_size}p • 📞 {res.customer_phone}
                    </div>
                    {res.notes && <div style={{ fontSize: '11px', color: colors.champagne, marginTop: '4px' }}>📝 {res.notes}</div>}
                  </div>
                </div>
                <button onClick={() => handleDeleteReservation(res.id)} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.error, padding: '8px' }}>✕</button>
              </div>
            ))
          )}
        </>}

        {/* LAYOUT */}
        {activeTab === 'layout' && <>
          <div style={s.sectionTitle}>Hartă sală - {selectedEvent?.name}</div>
          <div style={{ ...s.layoutContainer, aspectRatio: '4/3' }}>
            <div style={{ position: 'absolute', top: '2%', left: '25%', width: '50%', height: '8%', backgroundColor: 'rgba(212,175,55,0.1)', border: `1px dashed ${colors.champagne}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: colors.champagne, letterSpacing: '2px' }}>STAGE</div>
            
            {eventTables.map(table => {
              const res = getTableReservation(table.id)
              const zc = table.zone === 'vip' ? colors.vip : table.zone === 'bar' ? colors.bar : colors.main
              
              return (
                <div
                  key={table.id}
                  style={{
                    ...s.tableNode,
                    left: `${table.position_x}%`,
                    top: `${table.position_y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: table.shape === 'rectangle' ? '70px' : '50px',
                    height: '50px',
                    borderRadius: table.shape === 'circle' ? '50%' : '4px',
                    backgroundColor: res ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${res ? colors.champagne : zc}`,
                    color: res ? colors.champagne : zc,
                    cursor: 'default',
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{table.table_number}</span>
                  <span style={{ fontSize: '8px' }}>{table.capacity}p</span>
                  {res && <span style={{ fontSize: '7px', marginTop: '1px' }}>{res.customer_name?.split(' ')[0]}</span>}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.vip }} /> VIP</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.main }} /> Principal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.bar }} /> Bar</div>
          </div>
        </>}
      </div>

      {/* RESERVATION MODAL */}
      {showReservationModal && selectedTableForRes && (
        <div style={s.modal} onClick={() => { setShowReservationModal(false); setSelectedTableForRes(null) }}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={{ fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>Rezervare - {selectedTableForRes.table_number}</h3>
              <button onClick={() => { setShowReservationModal(false); setSelectedTableForRes(null) }} style={{ ...s.btn, padding: '4px', background: 'transparent', color: colors.textMuted }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ backgroundColor: 'rgba(212,175,55,0.1)', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '500', color: colors.champagne }}>{selectedTableForRes.table_number}</div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>{selectedTableForRes.zone.toUpperCase()} • {selectedTableForRes.capacity} persoane • Min {selectedTableForRes.min_spend} LEI</div>
              </div>

              <label style={s.label}>Nume client *</label>
              <input type="text" value={resForm.customer_name} onChange={e => setResForm({ ...resForm, customer_name: e.target.value })} placeholder="Ex: Andrei Popescu" style={{ ...s.input, textAlign: 'left' }} />

              <label style={s.label}>Telefon</label>
              <input type="tel" value={resForm.customer_phone} onChange={e => setResForm({ ...resForm, customer_phone: e.target.value })} placeholder="07XX XXX XXX" style={{ ...s.input, textAlign: 'left' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={s.label}>Persoane</label>
                  <select value={resForm.party_size} onChange={e => setResForm({ ...resForm, party_size: parseInt(e.target.value) })} style={s.select}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Ora</label>
                  <select value={resForm.reservation_time} onChange={e => setResForm({ ...resForm, reservation_time: e.target.value })} style={s.select}>
                    {['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <label style={s.label}>Note</label>
              <input type="text" value={resForm.notes} onChange={e => setResForm({ ...resForm, notes: e.target.value })} placeholder="Ex: Tort surpriză la 00:00" style={{ ...s.input, textAlign: 'left' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setResForm({ ...resForm, is_vip: !resForm.is_vip })}>
                <div style={{ width: '24px', height: '24px', border: `2px solid ${resForm.is_vip ? colors.champagne : colors.border}`, backgroundColor: resForm.is_vip ? colors.champagne : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.noir }}>{resForm.is_vip && '✓'}</div>
                <span>Client VIP</span>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => { setShowReservationModal(false); setSelectedTableForRes(null) }} style={{ ...s.btn, background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` }}>Anulează</button>
              <button onClick={handleCreateReservation} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Rezervă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
