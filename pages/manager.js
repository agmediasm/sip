import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, createEvent, updateEvent, deleteEvent, getEventTables, createEventTable, updateEventTable, deleteEventTable, getMenuItems, getEventMenu, setEventMenuPrice, getWaiters, createWaiter, deleteWaiter, getEventWaiters, addWaiterToEvent, removeWaiterFromEvent, getTableAssignments, assignTableToWaiter, getCustomers, getAnalytics, getEventAnalytics, getWaiterLeaderboard } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

const colors = {
  noir: '#08080a', onyx: '#1a1a1c', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0',
  border: 'rgba(255,255,255,0.15)', textMuted: 'rgba(255,255,255,0.65)',
  success: '#22c55e', error: '#ef4444',
  vip: '#d4af37', normal: '#3b82f6', bar: '#8b5cf6'
}

const TABLE_TYPES = {
  vip: { label: 'VIP', color: colors.vip, shape: 'square', size: 56 },
  normal: { label: 'Normal', color: colors.normal, shape: 'square', size: 44 },
  bar: { label: 'Bar/Standing', color: colors.bar, shape: 'circle', size: 36 }
}

const GRID_ROWS = 5
const GRID_COLS = 8

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTables, setEventTables] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [eventMenu, setEventMenu] = useState([])
  const [waiters, setWaiters] = useState([])
  const [eventWaiters, setEventWaiters] = useState([])
  const [tableAssignments, setTableAssignments] = useState([])
  const [customers, setCustomers] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [eventAnalytics, setEventAnalytics] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month')
  
  // Modals & Forms
  const [showEventModal, setShowEventModal] = useState(false)
  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [wizardStep, setWizardStep] = useState(0) // 0 = no wizard, 1-6 = steps
  const [eventForm, setEventForm] = useState({ name: '', event_date: '', start_time: '22:00', description: '', stage_in_back: false })
  const [waiterForm, setWaiterForm] = useState({ name: '', phone: '' })
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [addingTable, setAddingTable] = useState(null) // { row, col, type }
  const [draggedTable, setDraggedTable] = useState(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedEvent) loadEventData(selectedEvent.id) }, [selectedEvent])
  useEffect(() => { loadAnalytics() }, [analyticsPeriod])

  const loadData = async () => {
    setLoading(true)
    const [eventsRes, waitersRes, customersRes, menuRes] = await Promise.all([
      getEvents(VENUE_ID), getWaiters(VENUE_ID), getCustomers(20), getMenuItems(VENUE_ID)
    ])
    if (eventsRes.data) { setEvents(eventsRes.data); if (eventsRes.data.length > 0) setSelectedEvent(eventsRes.data[0]) }
    if (waitersRes.data) setWaiters(waitersRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    if (menuRes.data) setMenuItems(menuRes.data)
    await loadAnalytics()
    setLoading(false)
  }

  const loadEventData = async (eventId) => {
    const [tablesRes, ewRes, assignRes, emRes, eaRes, lbRes] = await Promise.all([
      getEventTables(eventId), getEventWaiters(eventId), getTableAssignments(eventId),
      getEventMenu(eventId), getEventAnalytics(eventId), getWaiterLeaderboard(eventId)
    ])
    if (tablesRes.data) setEventTables(tablesRes.data)
    if (ewRes.data) setEventWaiters(ewRes.data)
    if (assignRes.data) setTableAssignments(assignRes.data)
    if (emRes.data) setEventMenu(emRes.data)
    if (eaRes) setEventAnalytics(eaRes)
    if (lbRes) setLeaderboard(lbRes)
  }

  const loadAnalytics = async () => {
    const data = await getAnalytics(VENUE_ID, analyticsPeriod)
    setAnalytics(data)
  }

  // Event handlers
  const handleCreateEvent = async () => {
    if (!eventForm.name || !eventForm.event_date) return
    const { data } = await createEvent({ ...eventForm, venue_id: VENUE_ID, setup_step: 1 })
    if (data) { setSelectedEvent(data); setWizardStep(1) }
    setShowEventModal(false)
    setEventForm({ name: '', event_date: '', start_time: '22:00', description: '', stage_in_back: false })
    loadData()
  }

  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation()
    if (!confirm('Ștergi acest eveniment?')) return
    await deleteEvent(eventId)
    setSelectedEvent(null)
    loadData()
  }

  const handleWizardNext = async () => {
    if (wizardStep < 6) {
      await updateEvent(selectedEvent.id, { setup_step: wizardStep + 1 })
      setWizardStep(wizardStep + 1)
    } else {
      await updateEvent(selectedEvent.id, { setup_completed: true, setup_step: 6 })
      setWizardStep(0)
      loadData()
    }
  }

  const handleWizardSkip = () => setWizardStep(0)

  // Table handlers
  const handleGridClick = (row, col) => {
    if (eventTables.some(t => t.grid_row === row && t.grid_col === col)) return
    setAddingTable({ row, col, type: 'normal' })
  }

  const handleAddTable = async () => {
    if (!addingTable || !selectedEvent) return
    const tableCount = eventTables.filter(t => t.table_type === addingTable.type).length + 1
    const prefix = addingTable.type === 'vip' ? 'VIP' : addingTable.type === 'bar' ? 'B' : 'M'
    await createEventTable({
      event_id: selectedEvent.id, table_number: `${prefix}${tableCount}`, table_type: addingTable.type,
      capacity: addingTable.type === 'vip' ? 8 : addingTable.type === 'bar' ? 2 : 4,
      min_spend: addingTable.type === 'vip' ? 1500 : addingTable.type === 'bar' ? 0 : 500,
      grid_row: addingTable.row, grid_col: addingTable.col
    })
    setAddingTable(null)
    loadEventData(selectedEvent.id)
  }

  const handleDeleteTable = async (tableId) => {
    await deleteEventTable(tableId)
    loadEventData(selectedEvent.id)
  }

  const handleDragStart = (table) => setDraggedTable(table)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = async (row, col) => {
    if (!draggedTable || eventTables.some(t => t.id !== draggedTable.id && t.grid_row === row && t.grid_col === col)) return
    await updateEventTable(draggedTable.id, { grid_row: row, grid_col: col })
    setDraggedTable(null)
    loadEventData(selectedEvent.id)
  }

  // Waiter handlers
  const handleCreateWaiter = async () => {
    if (!waiterForm.name || !waiterForm.phone) return
    await createWaiter({ ...waiterForm, venue_id: VENUE_ID })
    setShowWaiterModal(false)
    setWaiterForm({ name: '', phone: '' })
    loadData()
  }

  const handleDeleteWaiter = async (e, waiterId) => {
    e.stopPropagation()
    if (!confirm('Ștergi acest ospătar?')) return
    await deleteWaiter(waiterId)
    loadData()
  }

  const handleToggleWaiterEvent = async (waiterId) => {
    if (!selectedEvent) return
    const isAssigned = eventWaiters.some(ew => ew.waiter_id === waiterId)
    if (isAssigned) await removeWaiterFromEvent(selectedEvent.id, waiterId)
    else await addWaiterToEvent(selectedEvent.id, waiterId)
    loadEventData(selectedEvent.id)
  }

  const handleAssignTable = async (tableId, waiterId) => {
    if (!selectedEvent) return
    await assignTableToWaiter(tableId, waiterId, selectedEvent.id)
    loadEventData(selectedEvent.id)
  }

  const getAssignedWaiter = (tableId) => tableAssignments.find(a => a.event_table_id === tableId)?.waiters

  // Menu handlers
  const getItemPrice = (item) => {
    const em = eventMenu.find(m => m.menu_item_id === item.id)
    return em?.custom_price ?? item.default_price
  }

  const handlePriceChange = async (itemId, price) => {
    await setEventMenuPrice(selectedEvent.id, itemId, price)
    loadEventData(selectedEvent.id)
  }

  const toggleCustomer = (id) => setSelectedCustomers(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logoText: { fontSize: '18px', fontWeight: '300', letterSpacing: '6px', color: colors.champagne },
    tabs: { display: 'flex', gap: '0', padding: '0 8px', borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' },
    tab: { padding: '12px 10px', border: 'none', backgroundColor: 'transparent', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    content: { padding: '16px' },
    sectionTitle: { fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: colors.textMuted, marginBottom: '12px' },
    btn: { padding: '10px 16px', border: 'none', fontSize: '11px', fontWeight: '400', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '16px', marginBottom: '12px' },
    input: { width: '100%', padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: '14px', marginBottom: '12px', outline: 'none' },
    select: { width: '100%', padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: '14px', marginBottom: '12px' },
    label: { display: 'block', fontSize: '10px', color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    modalContent: { backgroundColor: colors.onyx, width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: '16px' },
    modalFooter: { padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' },
    statCard: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '16px' },
    statValue: { fontSize: '24px', fontWeight: '300', letterSpacing: '1px', color: colors.champagne, marginBottom: '4px' },
    statLabel: { fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: colors.textMuted },
    grid: { display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: '4px', backgroundColor: colors.noir, border: `1px solid ${colors.border}`, padding: '8px', marginBottom: '16px' },
    gridCell: { aspectRatio: '1', border: `1px dashed ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' },
    wizardBar: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.champagne}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    wizardSteps: { display: 'flex', gap: '8px' },
    wizardStep: { width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '1px solid' },
  }

  if (loading) return <div style={{...s.container, display:'flex', alignItems:'center', justifyContent:'center'}}><div style={{textAlign:'center'}}><div style={{fontSize:'32px', fontWeight:'300', letterSpacing:'12px', color:colors.champagne}}>S I P</div><div style={{fontSize:'11px', letterSpacing:'2px', color:colors.textMuted, marginTop:'16px'}}>Loading...</div></div></div>

  const WIZARD_TITLES = ['', '1. Detalii', '2. Layout', '3. Meniu', '4. Ospătari', '5. Atribuiri', '6. QR Links']

  return (
    <div style={s.container}>
      <Head><title>S I P - Manager</title></Head>
      
      <header style={s.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <Link href="/" style={{textDecoration:'none'}}><div style={s.logoText}>S I P</div></Link>
          <span style={{color:colors.textMuted, fontSize:'11px'}}>Manager</span>
        </div>
        {selectedEvent && <span style={{fontSize:'11px', color:colors.champagne}}>{selectedEvent.name}</span>}
      </header>

      {/* Wizard Bar */}
      {wizardStep > 0 && (
        <div style={s.wizardBar}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <span style={{fontSize:'12px', fontWeight:'500'}}>{WIZARD_TITLES[wizardStep]}</span>
            <div style={s.wizardSteps}>
              {[1,2,3,4,5,6].map(step => (
                <div key={step} style={{...s.wizardStep, backgroundColor: step <= wizardStep ? colors.champagne : 'transparent', borderColor: step <= wizardStep ? colors.champagne : colors.border, color: step <= wizardStep ? colors.noir : colors.textMuted}}>{step}</div>
              ))}
            </div>
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={handleWizardSkip} style={{...s.btn, backgroundColor:'transparent', color:colors.textMuted}}>Skip</button>
            <button onClick={handleWizardNext} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>{wizardStep === 6 ? 'Finalizează' : 'Următorul →'}</button>
          </div>
        </div>
      )}

      <div style={s.tabs}>
        {['overview','events','layout','menu','qr','waiters','customers'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{...s.tab, color: activeTab===tab ? colors.champagne : colors.textMuted, borderBottomColor: activeTab===tab ? colors.champagne : 'transparent'}}>
            {tab==='overview' ? '📊' : tab==='events' ? '📅' : tab==='layout' ? '🗺️' : tab==='menu' ? '📋' : tab==='qr' ? '🔗' : tab==='waiters' ? '👤' : '👑'}
            <span style={{marginLeft:'4px'}}>{tab==='overview' ? 'Stats' : tab==='events' ? 'Events' : tab==='layout' ? 'Layout' : tab==='menu' ? 'Meniu' : tab==='qr' ? 'QR' : tab==='waiters' ? 'Staff' : 'CRM'}</span>
          </button>
        ))}
      </div>

      <div style={s.content}>
        {/* OVERVIEW */}
        {activeTab === 'overview' && <>
          <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
            {['today','week','month','year'].map(p => (
              <button key={p} onClick={() => setAnalyticsPeriod(p)} style={{...s.btn, backgroundColor: analyticsPeriod===p ? colors.champagne : 'transparent', color: analyticsPeriod===p ? colors.noir : colors.textMuted, border:`1px solid ${analyticsPeriod===p ? colors.champagne : colors.border}`, padding:'8px 12px', fontSize:'10px'}}>
                {p==='today' ? 'Azi' : p==='week' ? '7 zile' : p==='month' ? '30 zile' : 'An'}
              </button>
            ))}
          </div>
          <div style={s.statsGrid}>
            <div style={s.statCard}><div style={s.statValue}>{analytics.totalRevenue?.toLocaleString() || 0} LEI</div><div style={s.statLabel}>Venituri</div></div>
            <div style={s.statCard}><div style={s.statValue}>{analytics.totalOrders || 0}</div><div style={s.statLabel}>Comenzi</div></div>
            <div style={s.statCard}><div style={s.statValue}>{analytics.avgOrder || 0} LEI</div><div style={s.statLabel}>Medie</div></div>
            <div style={s.statCard}><div style={s.statValue}>{customers.length}</div><div style={s.statLabel}>Clienți</div></div>
          </div>

          {selectedEvent && <>
            <div style={s.sectionTitle}>📊 {selectedEvent.name}</div>
            <div style={s.statsGrid}>
              <div style={s.statCard}><div style={s.statValue}>{eventAnalytics.totalRevenue?.toLocaleString() || 0}</div><div style={s.statLabel}>Revenue</div></div>
              <div style={s.statCard}><div style={s.statValue}>{eventAnalytics.totalOrders || 0}</div><div style={s.statLabel}>Comenzi</div></div>
            </div>
            {eventAnalytics.topProducts?.length > 0 && <>
              <div style={s.sectionTitle}>🏆 Top Produse</div>
              {eventAnalytics.topProducts.map((p, i) => (
                <div key={i} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px'}}>
                  <span>{i+1}. {p.name} ({p.qty}x)</span>
                  <span style={{color:colors.champagne}}>{p.revenue} LEI</span>
                </div>
              ))}
            </>}
            <div style={s.sectionTitle}>🏅 Staff Leaderboard</div>
            {leaderboard.map((w, i) => (
              <div key={w.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <span style={{color: i===0 ? colors.champagne : colors.textMuted}}>{i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `#${i+1}`}</span>
                  <span>{w.name}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{color:colors.champagne}}>{(w.event_sales || w.total_sales || 0).toLocaleString()} LEI</div>
                  <div style={{fontSize:'10px', color:colors.textMuted}}>{w.event_orders || w.total_orders || 0} comenzi</div>
                </div>
              </div>
            ))}
          </>}
        </>}

        {/* EVENTS */}
        {activeTab === 'events' && <>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <div style={s.sectionTitle}>Evenimente</div>
            <button onClick={() => setShowEventModal(true)} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>+ Nou</button>
          </div>
          {events.map(ev => (
            <div key={ev.id} onClick={() => {setSelectedEvent(ev); if(!ev.setup_completed) setWizardStep(ev.setup_step || 1)}} style={{...s.card, borderColor: selectedEvent?.id===ev.id ? colors.champagne : colors.border, cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:'16px', fontWeight:'400', marginBottom:'4px', display:'flex', alignItems:'center', gap:'8px'}}>
                    {ev.name}
                    {!ev.setup_completed && <span style={{fontSize:'9px', padding:'2px 6px', backgroundColor:'rgba(212,175,55,0.2)', color:colors.champagne}}>SETUP</span>}
                  </div>
                  <div style={{fontSize:'12px', color:colors.textMuted}}>📅 {new Date(ev.event_date).toLocaleDateString('ro-RO',{weekday:'short', day:'numeric', month:'short'})} • 🕐 {ev.start_time}</div>
                </div>
                <button onClick={(e) => handleDeleteEvent(e, ev.id)} style={{...s.btn, background:'transparent', color:colors.error, padding:'8px'}}>✕</button>
              </div>
            </div>
          ))}
        </>}

        {/* LAYOUT */}
        {activeTab === 'layout' && <>
          {!selectedEvent ? <div style={{textAlign:'center', padding:'48px', color:colors.textMuted}}>Selectează un eveniment</div> : <>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
              <div style={s.sectionTitle}>{selectedEvent.name} - {eventTables.length} mese</div>
              <div style={{display:'flex', gap:'8px'}}>
                {Object.entries(TABLE_TYPES).map(([type, cfg]) => (
                  <div key={type} style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:cfg.color}}>
                    <div style={{width:'12px', height:'12px', backgroundColor:cfg.color, borderRadius: cfg.shape==='circle' ? '50%' : '2px'}} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Stage position toggle */}
            <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px', padding:'12px', backgroundColor:colors.onyx, border:`1px solid ${colors.border}`}}>
              <span style={{fontSize:'11px', color:colors.textMuted}}>Scenă:</span>
              <button onClick={async () => {await updateEvent(selectedEvent.id, {stage_in_back: false}); setSelectedEvent({...selectedEvent, stage_in_back: false})}} style={{...s.btn, padding:'6px 12px', backgroundColor: !selectedEvent.stage_in_back ? colors.champagne : 'transparent', color: !selectedEvent.stage_in_back ? colors.noir : colors.textMuted, border:`1px solid ${colors.border}`}}>În față</button>
              <button onClick={async () => {await updateEvent(selectedEvent.id, {stage_in_back: true}); setSelectedEvent({...selectedEvent, stage_in_back: true})}} style={{...s.btn, padding:'6px 12px', backgroundColor: selectedEvent.stage_in_back ? colors.champagne : 'transparent', color: selectedEvent.stage_in_back ? colors.noir : colors.textMuted, border:`1px solid ${colors.border}`}}>În spate</button>
            </div>

            {/* Grid */}
            <div style={s.grid}>
              {/* Stage row */}
              {!selectedEvent.stage_in_back && (
                <div style={{gridColumn:`1 / span ${GRID_COLS}`, padding:'8px', backgroundColor:'rgba(212,175,55,0.1)', border:`1px dashed ${colors.champagne}`, textAlign:'center', fontSize:'10px', color:colors.champagne, letterSpacing:'2px', marginBottom:'4px'}}>STAGE</div>
              )}
              
              {Array.from({length: GRID_ROWS}).map((_, row) => (
                Array.from({length: GRID_COLS}).map((_, col) => {
                  const table = eventTables.find(t => t.grid_row === row && t.grid_col === col)
                  const cfg = table ? TABLE_TYPES[table.table_type] : null
                  return (
                    <div
                      key={`${row}-${col}`}
                      onClick={() => !table && handleGridClick(row, col)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(row, col)}
                      style={{...s.gridCell, backgroundColor: table ? 'rgba(255,255,255,0.03)' : 'transparent'}}
                    >
                      {table ? (
                        <div
                          draggable
                          onDragStart={() => handleDragStart(table)}
                          onClick={(e) => {e.stopPropagation(); if(confirm(`Șterge ${table.table_number}?`)) handleDeleteTable(table.id)}}
                          style={{
                            width: cfg.size, height: cfg.size, borderRadius: cfg.shape==='circle' ? '50%' : '4px',
                            backgroundColor: `${cfg.color}22`, border: `2px solid ${cfg.color}`, color: cfg.color,
                            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                            fontSize:'10px', fontWeight:'600', cursor:'grab'
                          }}
                        >
                          <span>{table.table_number}</span>
                          <span style={{fontSize:'8px', opacity:0.7}}>{table.capacity}p</span>
                        </div>
                      ) : (
                        <span style={{fontSize:'16px', color:colors.border}}>+</span>
                      )}
                    </div>
                  )
                })
              ))}

              {/* Stage row bottom */}
              {selectedEvent.stage_in_back && (
                <div style={{gridColumn:`1 / span ${GRID_COLS}`, padding:'8px', backgroundColor:'rgba(212,175,55,0.1)', border:`1px dashed ${colors.champagne}`, textAlign:'center', fontSize:'10px', color:colors.champagne, letterSpacing:'2px', marginTop:'4px'}}>STAGE</div>
              )}
            </div>
            <div style={{fontSize:'11px', color:colors.textMuted, textAlign:'center'}}>Click pe + pentru a adăuga masă • Drag pentru a muta • Click pe masă pentru a șterge</div>
          </>}
        </>}

        {/* MENU */}
        {activeTab === 'menu' && <>
          {!selectedEvent ? <div style={{textAlign:'center', padding:'48px', color:colors.textMuted}}>Selectează un eveniment</div> : <>
            <div style={s.sectionTitle}>Meniu - {selectedEvent.name}</div>
            <div style={{fontSize:'11px', color:colors.textMuted, marginBottom:'16px'}}>Lasă gol pentru preț default. Setează preț custom pentru acest eveniment.</div>
            {menuItems.map(item => (
              <div key={item.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px'}}>
                <div>
                  <div style={{fontWeight:'400'}}>{item.name}</div>
                  <div style={{fontSize:'11px', color:colors.textMuted}}>{item.categories?.name} • Default: {item.default_price} LEI</div>
                </div>
                <input
                  type="number"
                  placeholder={item.default_price}
                  value={eventMenu.find(m => m.menu_item_id === item.id)?.custom_price || ''}
                  onChange={(e) => handlePriceChange(item.id, e.target.value ? parseFloat(e.target.value) : null)}
                  style={{width:'80px', padding:'8px', border:`1px solid ${colors.border}`, backgroundColor:'transparent', color:colors.champagne, textAlign:'center', fontSize:'14px'}}
                />
              </div>
            ))}
          </>}
        </>}

        {/* QR LINKS */}
        {activeTab === 'qr' && <>
          {!selectedEvent ? <div style={{textAlign:'center', padding:'48px', color:colors.textMuted}}>Selectează un eveniment</div> : <>
            <div style={s.sectionTitle}>QR Links - {selectedEvent.name}</div>
            <div style={{fontSize:'11px', color:colors.textMuted, marginBottom:'16px'}}>Generează QR codes pentru aceste link-uri</div>
            {eventTables.map(table => {
              const waiter = getAssignedWaiter(table.id)
              const link = `${APP_URL}/order/${selectedEvent.id}/${table.id}`
              return (
                <div key={table.id} style={{...s.card, padding:'12px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <span style={{fontWeight:'500', color: TABLE_TYPES[table.table_type]?.color}}>{table.table_number}</span>
                      {waiter && <span style={{fontSize:'10px', color:colors.textMuted}}>👤 {waiter.name}</span>}
                    </div>
                    <span style={{fontSize:'10px', color:colors.textMuted}}>{table.table_type.toUpperCase()}</span>
                  </div>
                  <div style={{backgroundColor:colors.noir, padding:'8px', fontSize:'11px', color:colors.platinum, wordBreak:'break-all', fontFamily:'monospace'}}>
                    {link}
                  </div>
                </div>
              )
            })}
          </>}
        </>}

        {/* WAITERS */}
        {activeTab === 'waiters' && <>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <div style={s.sectionTitle}>Ospătari</div>
            <button onClick={() => setShowWaiterModal(true)} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>+ Nou</button>
          </div>
          {waiters.map(w => {
            const isAssigned = eventWaiters.some(ew => ew.waiter_id === w.id)
            return (
              <div key={w.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px'}}>
                <div>
                  <div style={{fontWeight:'400'}}>{w.name}</div>
                  <div style={{fontSize:'11px', color:colors.textMuted}}>{w.phone} • {w.total_sales?.toLocaleString() || 0} LEI total</div>
                </div>
                <div style={{display:'flex', gap:'8px'}}>
                  {selectedEvent && (
                    <button onClick={() => handleToggleWaiterEvent(w.id)} style={{...s.btn, backgroundColor: isAssigned ? colors.success : 'transparent', color: isAssigned ? 'white' : colors.textMuted, border:`1px solid ${isAssigned ? colors.success : colors.border}`, padding:'8px 12px'}}>
                      {isAssigned ? '✓' : '+'}
                    </button>
                  )}
                  <button onClick={(e) => handleDeleteWaiter(e, w.id)} style={{...s.btn, backgroundColor:'transparent', color:colors.error, border:`1px solid ${colors.error}`, padding:'8px'}}>✕</button>
                </div>
              </div>
            )
          })}

          {selectedEvent && eventWaiters.length > 0 && eventTables.length > 0 && <>
            <div style={{...s.sectionTitle, marginTop:'24px'}}>Atribuire Mese</div>
            {eventTables.map(t => {
              const aw = getAssignedWaiter(t.id)
              return (
                <div key={t.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px'}}>
                  <span style={{fontWeight:'500', color: TABLE_TYPES[t.table_type]?.color}}>{t.table_number}</span>
                  <select value={aw?.id || ''} onChange={(e) => handleAssignTable(t.id, e.target.value)} style={{...s.select, width:'auto', marginBottom:0, padding:'8px 12px'}}>
                    <option value="">Neatribuit</option>
                    {eventWaiters.map(ew => <option key={ew.waiter_id} value={ew.waiter_id}>{ew.waiters?.name}</option>)}
                  </select>
                </div>
              )
            })}
          </>}
        </>}

        {/* CUSTOMERS */}
        {activeTab === 'customers' && <>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <div style={s.sectionTitle}>👑 Top Clienți</div>
            <button onClick={() => setSelectedCustomers(selectedCustomers.length === customers.length ? [] : customers.map(c => c.id))} style={{...s.btn, backgroundColor:'transparent', color:colors.platinum, border:`1px solid ${colors.border}`, padding:'8px 12px'}}>
              {selectedCustomers.length === customers.length ? 'Deselectează' : 'Selectează tot'}
            </button>
          </div>
          {customers.map((c, i) => (
            <div key={c.id} onClick={() => toggleCustomer(c.id)} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', borderColor: selectedCustomers.includes(c.id) ? colors.champagne : colors.border, padding:'12px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{width:'20px', height:'20px', border:`2px solid ${selectedCustomers.includes(c.id) ? colors.champagne : colors.border}`, backgroundColor: selectedCustomers.includes(c.id) ? colors.champagne : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:colors.noir, fontSize:'10px'}}>{selectedCustomers.includes(c.id) && '✓'}</div>
                <span style={{color: i<3 ? colors.champagne : colors.textMuted, marginRight:'8px'}}>{i<3 ? '👑' : `#${i+1}`}</span>
                <div><div style={{fontWeight:'400', fontSize:'14px'}}>{c.name}</div><div style={{fontSize:'11px', color:colors.textMuted}}>{c.phone} • {c.visit_count} vizite</div></div>
              </div>
              <div style={{color:colors.champagne, fontWeight:'400'}}>{c.total_spent?.toLocaleString()} LEI</div>
            </div>
          ))}
          {selectedCustomers.length > 0 && (
            <div style={{position:'fixed', bottom:'16px', left:'16px', right:'16px', backgroundColor:colors.onyx, border:`1px solid ${colors.champagne}`, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:'12px'}}>{selectedCustomers.length} selectați</span>
              <button onClick={() => alert('Funcție de invitații - coming soon!')} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>📨 Invită</button>
            </div>
          )}
        </>}
      </div>

      {/* Add Table Modal */}
      {addingTable && (
        <div style={s.modal} onClick={() => setAddingTable(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}><h3 style={{fontSize:'14px', letterSpacing:'2px', textTransform:'uppercase', margin:0}}>Adaugă Masă</h3></div>
            <div style={s.modalBody}>
              <label style={s.label}>Tip masă</label>
              <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                {Object.entries(TABLE_TYPES).map(([type, cfg]) => (
                  <button key={type} onClick={() => setAddingTable({...addingTable, type})} style={{...s.btn, flex:1, flexDirection:'column', padding:'16px', backgroundColor: addingTable.type===type ? `${cfg.color}22` : 'transparent', border:`2px solid ${addingTable.type===type ? cfg.color : colors.border}`, color: cfg.color}}>
                    <div style={{width:'24px', height:'24px', backgroundColor:cfg.color, borderRadius: cfg.shape==='circle' ? '50%' : '4px', marginBottom:'8px'}} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setAddingTable(null)} style={{...s.btn, backgroundColor:'transparent', color:colors.textMuted, border:`1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleAddTable} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>Adaugă</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div style={s.modal} onClick={() => setShowEventModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}><h3 style={{fontSize:'14px', letterSpacing:'2px', textTransform:'uppercase', margin:0}}>Eveniment Nou</h3></div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label><input type="text" value={eventForm.name} onChange={e => setEventForm({...eventForm, name:e.target.value})} placeholder="NYE Party" style={s.input} />
              <label style={s.label}>Data</label><input type="date" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date:e.target.value})} style={s.input} />
              <label style={s.label}>Ora</label><input type="time" value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time:e.target.value})} style={s.input} />
              <label style={s.label}>Descriere</label><input type="text" value={eventForm.description} onChange={e => setEventForm({...eventForm, description:e.target.value})} style={s.input} />
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setShowEventModal(false)} style={{...s.btn, backgroundColor:'transparent', color:colors.textMuted, border:`1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleCreateEvent} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>Creează</button>
            </div>
          </div>
        </div>
      )}

      {/* Waiter Modal */}
      {showWaiterModal && (
        <div style={s.modal} onClick={() => setShowWaiterModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}><h3 style={{fontSize:'14px', letterSpacing:'2px', textTransform:'uppercase', margin:0}}>Ospătar Nou</h3></div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label><input type="text" value={waiterForm.name} onChange={e => setWaiterForm({...waiterForm, name:e.target.value})} placeholder="Alexandru Pop" style={s.input} />
              <label style={s.label}>Telefon</label><input type="tel" value={waiterForm.phone} onChange={e => setWaiterForm({...waiterForm, phone:e.target.value})} placeholder="07XX XXX XXX" style={s.input} />
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setShowWaiterModal(false)} style={{...s.btn, backgroundColor:'transparent', color:colors.textMuted, border:`1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleCreateWaiter} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>Adaugă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
