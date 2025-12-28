import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getOrders, getReservations, getTables, updateOrderStatus, createReservation, deleteReservation, subscribeToOrders } from '../lib/supabase'

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
}

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [reservations, setReservations] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', table_id: '', notes: '', is_vip: false
  })

  const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Load data
  useEffect(() => {
    loadData()
    
    // Subscribe to realtime orders
    const subscription = subscribeToOrders(VENUE_ID, (payload) => {
      console.log('Realtime update:', payload)
      loadOrders()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadOrders(), loadReservations(), loadTables()])
    setLoading(false)
  }

  const loadOrders = async () => {
    const { data } = await getOrders(VENUE_ID)
    if (data) setOrders(data)
  }

  const loadReservations = async () => {
    const { data } = await getReservations(VENUE_ID)
    if (data) setReservations(data)
  }

  const loadTables = async () => {
    const { data } = await getTables(VENUE_ID)
    if (data) setTables(data)
  }

  const handleCompleteOrder = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus)
    loadOrders()
  }

  const handleAddReservation = async () => {
    if (!formData.customer_name || !formData.table_id) return

    const table = tables.find(t => t.id === formData.table_id)
    
    await createReservation({
      venue_id: VENUE_ID,
      table_id: formData.table_id,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      party_size: formData.party_size,
      reservation_time: formData.reservation_time,
      reservation_date: new Date().toISOString().split('T')[0],
      notes: formData.notes,
      is_vip: formData.is_vip,
    })

    setShowAddModal(false)
    setFormData({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', table_id: '', notes: '', is_vip: false })
    loadReservations()
  }

  const handleDeleteReservation = async (id) => {
    if (confirm('Ștergi această rezervare?')) {
      await deleteReservation(id)
      loadReservations()
    }
  }

  const newOrders = orders.filter(o => o.status === 'new')
  const preparingOrders = orders.filter(o => o.status === 'preparing')

  const styles = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40, flexWrap: 'wrap', gap: '12px' },
    logo: { display: 'flex', alignItems: 'center', gap: '16px' },
    logoText: { fontSize: '18px', fontWeight: '300', letterSpacing: '6px', color: colors.champagne },
    logoSub: { fontSize: '11px', color: colors.textMuted, letterSpacing: '2px' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
    btn: { padding: '12px 20px', border: 'none', fontSize: '11px', fontWeight: '400', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    tabs: { display: 'flex', gap: '0', padding: '0 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.noir },
    tab: { padding: '16px 24px', border: 'none', backgroundColor: 'transparent', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.3s' },
    content: { padding: '16px' },
    sectionTitle: { fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: colors.textMuted, marginBottom: '16px' },
    orderCard: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, marginBottom: '12px', padding: '20px' },
    orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    orderTable: { fontSize: '18px', fontWeight: '400', letterSpacing: '2px' },
    orderTime: { fontSize: '12px', color: colors.textMuted, marginTop: '4px' },
    orderBadge: { padding: '6px 12px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500' },
    orderItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}`, fontSize: '14px' },
    orderTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` },
    reservationCard: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '20px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    reservationInfo: { flex: 1 },
    reservationName: { fontSize: '16px', fontWeight: '400', letterSpacing: '1px', marginBottom: '8px' },
    reservationDetails: { display: 'flex', gap: '20px', fontSize: '13px', color: colors.textMuted },
    reservationNote: { fontSize: '12px', color: colors.champagne, marginTop: '8px', fontStyle: 'italic' },
    reservationTable: { width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: '20px', border: `1px solid ${colors.border}` },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
    modalContent: { backgroundColor: colors.onyx, width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase' },
    modalBody: { padding: '24px' },
    formGroup: { marginBottom: '20px' },
    formLabel: { display: 'block', fontSize: '11px', color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' },
    formInput: { width: '100%', padding: '14px 16px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: '14px', outline: 'none' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    modalFooter: { padding: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  }

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '300', letterSpacing: '12px', color: colors.champagne, marginBottom: '16px' }}>S I P</div>
          <div style={{ fontSize: '11px', letterSpacing: '2px', color: colors.textMuted }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Head><title>S I P - Staff Dashboard</title></Head>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={styles.logoText}>S I P</div>
          </Link>
          <div style={{ width: '1px', height: '24px', backgroundColor: colors.border }} />
          <div style={styles.logoSub}>Staff Dashboard</div>
        </div>
        <div style={styles.headerRight}>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>{today}</span>
          <button onClick={() => setShowAddModal(true)} style={{ ...styles.btn, backgroundColor: colors.champagne, color: colors.noir }}>
            + Rezervare
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('orders')} style={{ ...styles.tab, color: activeTab === 'orders' ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === 'orders' ? colors.champagne : 'transparent' }}>
          Comenzi {newOrders.length > 0 && <span style={{ backgroundColor: colors.error, color: 'white', padding: '2px 8px', borderRadius: '0', marginLeft: '8px', fontSize: '10px' }}>{newOrders.length}</span>}
        </button>
        <button onClick={() => setActiveTab('reservations')} style={{ ...styles.tab, color: activeTab === 'reservations' ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === 'reservations' ? colors.champagne : 'transparent' }}>
          Rezervări ({reservations.length})
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            {newOrders.length > 0 && (
              <>
                <div style={styles.sectionTitle}>🔔 Comenzi Noi</div>
                {newOrders.map(order => (
                  <div key={order.id} style={{ ...styles.orderCard, borderColor: colors.error }}>
                    <div style={styles.orderHeader}>
                      <div>
                        <div style={styles.orderTable}>{order.table_number}</div>
                        <div style={styles.orderTime}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ ...styles.orderBadge, backgroundColor: order.payment_type === 'cash' ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)', color: order.payment_type === 'cash' ? colors.success : '#6366f1' }}>
                        {order.payment_type === 'cash' ? '💵 Cash' : '💳 Card'}
                      </div>
                    </div>
                    
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={styles.orderItem}>
                        <span>{item.quantity}× {item.name}</span>
                        <span style={{ color: colors.champagne }}>{item.subtotal} LEI</span>
                      </div>
                    ))}
                    
                    <div style={styles.orderTotal}>
                      <span style={{ fontSize: '18px', fontWeight: '400', color: colors.champagne }}>{order.total} LEI</span>
                      <button onClick={() => handleCompleteOrder(order.id, 'preparing')} style={{ ...styles.btn, backgroundColor: colors.success, color: 'white' }}>
                        ✓ Pregătit
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {preparingOrders.length > 0 && (
              <>
                <div style={{ ...styles.sectionTitle, marginTop: '32px' }}>⏳ În Preparare</div>
                {preparingOrders.map(order => (
                  <div key={order.id} style={{ ...styles.orderCard, opacity: 0.7 }}>
                    <div style={styles.orderHeader}>
                      <div>
                        <div style={styles.orderTable}>{order.table_number}</div>
                        <div style={styles.orderTime}>{new Date(order.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    
                    {order.order_items?.map((item, i) => (
                      <div key={i} style={styles.orderItem}>
                        <span>{item.quantity}× {item.name}</span>
                        <span>{item.subtotal} LEI</span>
                      </div>
                    ))}
                    
                    <div style={styles.orderTotal}>
                      <span style={{ fontSize: '18px', color: colors.champagne }}>{order.total} LEI</span>
                      <button onClick={() => handleCompleteOrder(order.id, 'completed')} style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}` }}>
                        Finalizat
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {newOrders.length === 0 && preparingOrders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 0', color: colors.textMuted }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                <p style={{ letterSpacing: '2px' }}>Nicio comandă activă</p>
              </div>
            )}
          </>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <>
            <div style={styles.sectionTitle}>Rezervări pentru astăzi</div>
            
            {reservations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: colors.textMuted }}>
                <p style={{ letterSpacing: '2px' }}>Nicio rezervare pentru astăzi</p>
              </div>
            ) : (
              reservations.map(res => (
                <div key={res.id} style={{ ...styles.reservationCard, borderColor: res.is_vip ? colors.champagne : colors.border }}>
                  <div style={{ ...styles.reservationTable, backgroundColor: res.tables?.zone === 'vip' ? 'rgba(212,175,55,0.1)' : 'transparent', color: res.tables?.zone === 'vip' ? colors.champagne : colors.platinum }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{res.tables?.table_number}</span>
                  </div>
                  
                  <div style={styles.reservationInfo}>
                    <div style={styles.reservationName}>
                      {res.customer_name}
                      {res.is_vip && <span style={{ marginLeft: '8px' }}>⭐</span>}
                      {res.is_birthday && <span style={{ marginLeft: '4px' }}>🎂</span>}
                    </div>
                    <div style={styles.reservationDetails}>
                      <span>🕐 {res.reservation_time}</span>
                      <span>👥 {res.party_size} pers</span>
                      <span>📞 {res.customer_phone}</span>
                    </div>
                    {res.notes && <div style={styles.reservationNote}>📝 {res.notes}</div>}
                  </div>
                  
                  <button onClick={() => handleDeleteReservation(res.id)} style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}` }}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Add Reservation Modal */}
      {showAddModal && (
        <div style={styles.modal} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Rezervare Nouă</h2>
              <button onClick={() => setShowAddModal(false)} style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.platinum }}>✕</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nume client</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Ex: Andrei Popescu"
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Telefon</label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="07XX XXX XXX"
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Persoane</label>
                  <select value={formData.party_size} onChange={e => setFormData({ ...formData, party_size: parseInt(e.target.value) })} style={styles.formInput}>
                    {[1,2,3,4,5,6,7,8,9,10,12,15,20].map(n => <option key={n} value={n}>{n} persoane</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Ora</label>
                  <select value={formData.reservation_time} onChange={e => setFormData({ ...formData, reservation_time: e.target.value })} style={styles.formInput}>
                    {['21:00','21:30','22:00','22:30','23:00','23:30','00:00','00:30','01:00'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Masă</label>
                <select value={formData.table_id} onChange={e => setFormData({ ...formData, table_id: e.target.value })} style={styles.formInput}>
                  <option value="">Selectează masa</option>
                  {tables.filter(t => t.zone === 'vip').length > 0 && <optgroup label="VIP">{tables.filter(t => t.zone === 'vip').map(t => <option key={t.id} value={t.id}>{t.table_number}</option>)}</optgroup>}
                  {tables.filter(t => t.zone === 'main').length > 0 && <optgroup label="Principal">{tables.filter(t => t.zone === 'main').map(t => <option key={t.id} value={t.id}>{t.table_number}</option>)}</optgroup>}
                  {tables.filter(t => t.zone === 'bar').length > 0 && <optgroup label="Bar">{tables.filter(t => t.zone === 'bar').map(t => <option key={t.id} value={t.id}>{t.table_number}</option>)}</optgroup>}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Note</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Vor tort surpriză la 00:00"
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setFormData({ ...formData, is_vip: !formData.is_vip })}>
                <div style={{ width: '24px', height: '24px', border: `2px solid ${formData.is_vip ? colors.champagne : colors.border}`, backgroundColor: formData.is_vip ? colors.champagne : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.noir }}>
                  {formData.is_vip && '✓'}
                </div>
                <span>Client VIP</span>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowAddModal(false)} style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}` }}>
                Anulează
              </button>
              <button onClick={handleAddReservation} style={{ ...styles.btn, backgroundColor: colors.champagne, color: colors.noir }}>
                Adaugă
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
