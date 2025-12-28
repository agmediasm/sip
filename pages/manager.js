import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getCustomers, getOrders, getReservations } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

const colors = {
  noir: '#08080a',
  onyx: '#111111',
  champagne: '#d4af37',
  platinum: '#e5e4e2',
  ivory: '#fffff0',
  border: 'rgba(255,255,255,0.06)',
  textMuted: 'rgba(255,255,255,0.4)',
  success: '#22c55e',
}

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    const { data: customersData } = await getCustomers(20)
    if (customersData) setCustomers(customersData)

    // Get all orders for stats
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('venue_id', VENUE_ID)
    if (ordersData) setOrders(ordersData)

    setLoading(false)
  }

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
  const totalOrders = orders.length
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const uniqueCustomers = customers.length

  const toggleCustomer = (id) => {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter(c => c !== id))
    } else {
      setSelectedCustomers([...selectedCustomers, id])
    }
  }

  const handleSendInvites = () => {
    // In production, this would send real SMS/WhatsApp
    alert(`Invitații trimise către ${selectedCustomers.length} clienți!`)
    setShowInviteModal(false)
    setSelectedCustomers([])
    setInviteMessage('')
  }

  const styles = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logo: { display: 'flex', alignItems: 'center', gap: '16px' },
    logoText: { fontSize: '18px', fontWeight: '300', letterSpacing: '6px', color: colors.champagne },
    logoSub: { fontSize: '11px', color: colors.textMuted, letterSpacing: '2px' },
    tabs: { display: 'flex', gap: '0', padding: '0 24px', borderBottom: `1px solid ${colors.border}` },
    tab: { padding: '16px 24px', border: 'none', backgroundColor: 'transparent', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '2px solid transparent' },
    content: { padding: '24px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
    statCard: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '24px' },
    statValue: { fontSize: '32px', fontWeight: '300', letterSpacing: '2px', color: colors.champagne, marginBottom: '8px' },
    statLabel: { fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: colors.textMuted },
    sectionTitle: { fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: colors.textMuted, marginBottom: '16px' },
    customerCard: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s' },
    customerCheckbox: { width: '24px', height: '24px', border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    customerRank: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '400', fontSize: '14px', flexShrink: 0 },
    customerInfo: { flex: 1 },
    customerName: { fontSize: '15px', fontWeight: '400', letterSpacing: '1px', marginBottom: '4px' },
    customerDetails: { display: 'flex', gap: '16px', fontSize: '12px', color: colors.textMuted },
    customerStats: { display: 'flex', gap: '24px', textAlign: 'right' },
    customerStat: {},
    customerStatValue: { fontSize: '16px', fontWeight: '400', color: colors.champagne },
    customerStatLabel: { fontSize: '9px', color: colors.textMuted, letterSpacing: '1px', textTransform: 'uppercase' },
    selectionBar: { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: colors.onyx, border: `1px solid ${colors.champagne}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '20px', zIndex: 50 },
    btn: { padding: '12px 20px', border: 'none', fontSize: '11px', fontWeight: '400', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
    modalContent: { backgroundColor: colors.onyx, width: '100%', maxWidth: '480px' },
    modalHeader: { padding: '24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' },
    modalTitle: { fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase' },
    modalBody: { padding: '24px' },
    formLabel: { display: 'block', fontSize: '11px', color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' },
    formSelect: { width: '100%', padding: '14px 16px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: '14px', marginBottom: '16px' },
    formTextarea: { width: '100%', padding: '14px 16px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: '14px', minHeight: '120px', resize: 'vertical' },
    modalFooter: { padding: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  }

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '300', letterSpacing: '12px', color: colors.champagne }}>S I P</div>
          <div style={{ fontSize: '11px', letterSpacing: '2px', color: colors.textMuted, marginTop: '16px' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Head><title>S I P - Manager Dashboard</title></Head>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={styles.logoText}>S I P</div>
          </Link>
          <div style={{ width: '1px', height: '24px', backgroundColor: colors.border }} />
          <div style={styles.logoSub}>Manager Dashboard</div>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('overview')} style={{ ...styles.tab, color: activeTab === 'overview' ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === 'overview' ? colors.champagne : 'transparent' }}>
          Overview
        </button>
        <button onClick={() => setActiveTab('customers')} style={{ ...styles.tab, color: activeTab === 'customers' ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === 'customers' ? colors.champagne : 'transparent' }}>
          Top Clienți
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{totalRevenue.toLocaleString()} LEI</div>
                <div style={styles.statLabel}>Venituri Totale</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{totalOrders}</div>
                <div style={styles.statLabel}>Comenzi</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{avgOrder} LEI</div>
                <div style={styles.statLabel}>Comandă Medie</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{uniqueCustomers}</div>
                <div style={styles.statLabel}>Clienți</div>
              </div>
            </div>

            <div style={styles.sectionTitle}>⚡ Acțiuni Rapide</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div 
                onClick={() => { setActiveTab('customers'); setSelectedCustomers(customers.slice(0, 10).map(c => c.id)) }}
                style={{ ...styles.statCard, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = colors.champagne}
                onMouseOut={e => e.currentTarget.style.borderColor = colors.border}
              >
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>👑</div>
                <div style={{ fontSize: '14px', fontWeight: '400', marginBottom: '4px' }}>Invită Top 10 Spenders</div>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>Trimite invitații clienților VIP</div>
              </div>
              
              <div 
                onClick={() => setActiveTab('customers')}
                style={{ ...styles.statCard, cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.borderColor = colors.champagne}
                onMouseOut={e => e.currentTarget.style.borderColor = colors.border}
              >
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
                <div style={{ fontSize: '14px', fontWeight: '400', marginBottom: '4px' }}>Vezi Analytics</div>
                <div style={{ fontSize: '12px', color: colors.textMuted }}>Top clienți și statistici</div>
              </div>
            </div>
          </>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={styles.sectionTitle}>👑 Top Clienți</div>
              <button 
                onClick={() => setSelectedCustomers(selectedCustomers.length === customers.length ? [] : customers.map(c => c.id))}
                style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}` }}
              >
                {selectedCustomers.length === customers.length ? 'Deselectează' : 'Selectează Tot'}
              </button>
            </div>

            {customers.map((customer, index) => (
              <div 
                key={customer.id} 
                onClick={() => toggleCustomer(customer.id)}
                style={{ 
                  ...styles.customerCard, 
                  borderColor: selectedCustomers.includes(customer.id) ? colors.champagne : colors.border,
                  backgroundColor: selectedCustomers.includes(customer.id) ? 'rgba(212,175,55,0.05)' : colors.onyx
                }}
              >
                <div style={{ 
                  ...styles.customerCheckbox, 
                  backgroundColor: selectedCustomers.includes(customer.id) ? colors.champagne : 'transparent',
                  borderColor: selectedCustomers.includes(customer.id) ? colors.champagne : colors.border,
                  color: colors.noir
                }}>
                  {selectedCustomers.includes(customer.id) && '✓'}
                </div>
                
                <div style={{ 
                  ...styles.customerRank, 
                  backgroundColor: index < 3 ? 'rgba(212,175,55,0.15)' : 'transparent',
                  color: index < 3 ? colors.champagne : colors.textMuted
                }}>
                  {index < 3 ? '👑' : `#${index + 1}`}
                </div>
                
                <div style={styles.customerInfo}>
                  <div style={styles.customerName}>{customer.name}</div>
                  <div style={styles.customerDetails}>
                    <span>📞 {customer.phone}</span>
                    <span>🎯 {customer.visit_count} vizite</span>
                  </div>
                </div>
                
                <div style={styles.customerStats}>
                  <div style={styles.customerStat}>
                    <div style={styles.customerStatValue}>{customer.total_spent?.toLocaleString()} LEI</div>
                    <div style={styles.customerStatLabel}>Total</div>
                  </div>
                  <div style={styles.customerStat}>
                    <div style={styles.customerStatValue}>{customer.points}</div>
                    <div style={styles.customerStatLabel}>Puncte</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Selection Bar */}
      {selectedCustomers.length > 0 && (
        <div style={styles.selectionBar}>
          <span style={{ fontSize: '13px', letterSpacing: '1px' }}>
            {selectedCustomers.length} clienți selectați
          </span>
          <button onClick={() => setShowInviteModal(true)} style={{ ...styles.btn, backgroundColor: colors.champagne, color: colors.noir }}>
            📨 Trimite Invitație
          </button>
          <button onClick={() => setSelectedCustomers([])} style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}` }}>
            Anulează
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={styles.modal} onClick={() => setShowInviteModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Trimite Invitație</h2>
              <button onClick={() => setShowInviteModal(false)} style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.platinum }}>✕</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={{ backgroundColor: 'rgba(212,175,55,0.1)', border: `1px solid ${colors.champagne}`, padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
                <div style={{ fontSize: '20px', fontWeight: '300', color: colors.champagne }}>{selectedCustomers.length}</div>
                <div style={{ fontSize: '11px', color: colors.textMuted, letterSpacing: '1px' }}>CLIENȚI SELECTAȚI</div>
              </div>

              <label style={styles.formLabel}>Tip Mesaj</label>
              <select 
                style={styles.formSelect}
                onChange={(e) => {
                  const templates = {
                    party: '🎉 Ești invitat la [EVENT]! Ca unul dintre clienții noștri speciali, ai acces prioritar la rezervări. Sună-ne pentru masa ta VIP!',
                    winback: '👋 Ne e dor de tine! A trecut ceva vreme de când nu ne-ai vizitat. Hai să sărbătorim împreună weekendul ăsta - avem o surpriză pentru tine!',
                    birthday: '🎂 La mulți ani! Echipa S I P îți urează un an plin de bucurii. Vino să sărbătorim împreună - îți oferim o sticlă de prosecco din partea casei!',
                  }
                  setInviteMessage(templates[e.target.value] || '')
                }}
              >
                <option value="">Selectează template</option>
                <option value="party">🎉 Invitație Party</option>
                <option value="winback">👋 Win-back</option>
                <option value="birthday">🎂 Ziua de Naștere</option>
              </select>

              <label style={styles.formLabel}>Mesaj</label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Scrie mesajul tău aici..."
                style={styles.formTextarea}
              />
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowInviteModal(false)} style={{ ...styles.btn, backgroundColor: 'transparent', color: colors.platinum, border: `1px solid ${colors.border}` }}>
                Anulează
              </button>
              <button 
                onClick={handleSendInvites}
                disabled={!inviteMessage}
                style={{ 
                  ...styles.btn, 
                  backgroundColor: inviteMessage ? colors.success : colors.border, 
                  color: inviteMessage ? 'white' : colors.textMuted,
                  cursor: inviteMessage ? 'pointer' : 'not-allowed'
                }}
              >
                Trimite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
