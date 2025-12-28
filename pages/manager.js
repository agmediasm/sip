import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, createEvent, updateEvent, deleteEvent, getEventTables, createEventTable, updateEventTable, deleteEventTable, getMenuItems, getEventMenu, setEventMenuPrice, getWaiters, createWaiter, deleteWaiter, getEventWaiters, addWaiterToEvent, removeWaiterFromEvent, getTableAssignments, assignTableToWaiter, getCustomers, getAnalytics, getEventAnalytics, getWaiterLeaderboard, getEventReservations, createReservation, deleteReservation } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

const colors = {
  noir: '#08080a', onyx: '#141416', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0',
  border: 'rgba(255,255,255,0.12)', textMuted: 'rgba(255,255,255,0.55)',
  success: '#22c55e', error: '#ef4444', warning: '#f59e0b',
  vip: '#d4af37', normal: '#3b82f6', bar: '#8b5cf6'
}

const TABLE_TYPES = {
  vip: { label: 'VIP', color: colors.vip },
  normal: { label: 'Normal', color: colors.normal },
  bar: { label: 'Bar', color: colors.bar }
}

const DEFAULT_COLS = 8
const DEFAULT_ROWS = 6

export default function ManagerDashboard() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTables, setEventTables] = useState([])
  const [reservations, setReservations] = useState([])
  
  const [activeZone, setActiveZone] = useState('front')
  const [frontGridRows, setFrontGridRows] = useState(DEFAULT_ROWS)
  const [frontGridCols, setFrontGridCols] = useState(DEFAULT_COLS)
  const [backGridRows, setBackGridRows] = useState(DEFAULT_ROWS)
  const [backGridCols, setBackGridCols] = useState(DEFAULT_COLS)
  
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
  
  const [showEventModal, setShowEventModal] = useState(false)
  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [eventForm, setEventForm] = useState({ name: '', event_date: '', start_time: '22:00', description: '' })
  const [waiterForm, setWaiterForm] = useState({ name: '', phone: '' })
  const [tableType, setTableType] = useState('normal')
  const [reservationForm, setReservationForm] = useState({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false, event_table_id: '' })
  const [productForm, setProductForm] = useState({ name: '', description: '', default_price: '', category_id: '' })
  const [categories, setCategories] = useState([])
  const [selectedCustomers, setSelectedCustomers] = useState([])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedEvent) loadEventData(selectedEvent.id) }, [selectedEvent])
  useEffect(() => { loadAnalytics() }, [analyticsPeriod])

  const loadData = async () => {
    setLoading(true)
    const [eventsRes, waitersRes, customersRes, menuRes, catsRes] = await Promise.all([
      getEvents(VENUE_ID), getWaiters(VENUE_ID), getCustomers(20), getMenuItems(VENUE_ID),
      supabase.from('categories').select('*').eq('venue_id', VENUE_ID).order('sort_order')
    ])
    if (eventsRes.data?.length) { setEvents(eventsRes.data); setSelectedEvent(eventsRes.data[0]) }
    if (waitersRes.data) setWaiters(waitersRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    if (menuRes.data) setMenuItems(menuRes.data)
    if (catsRes.data) setCategories(catsRes.data)
    await loadAnalytics()
    setLoading(false)
  }

  const loadEventData = async (eventId) => {
    const [tablesRes, ewRes, assignRes, emRes, eaRes, lbRes, resRes] = await Promise.all([
      getEventTables(eventId), getEventWaiters(eventId), getTableAssignments(eventId),
      getEventMenu(eventId), getEventAnalytics(eventId), getWaiterLeaderboard(eventId),
      getEventReservations(eventId)
    ])
    if (tablesRes.data) {
      setEventTables(tablesRes.data)
      const frontTables = tablesRes.data.filter(t => t.zone !== 'back')
      const backTables = tablesRes.data.filter(t => t.zone === 'back')
      if (frontTables.length > 0) {
        setFrontGridRows(Math.max(DEFAULT_ROWS, Math.max(...frontTables.map(t => t.grid_row)) + 2))
        setFrontGridCols(Math.max(DEFAULT_COLS, Math.max(...frontTables.map(t => t.grid_col)) + 2))
      }
      if (backTables.length > 0) {
        setBackGridRows(Math.max(DEFAULT_ROWS, Math.max(...backTables.map(t => t.grid_row)) + 2))
        setBackGridCols(Math.max(DEFAULT_COLS, Math.max(...backTables.map(t => t.grid_col)) + 2))
      }
    }
    if (ewRes.data) setEventWaiters(ewRes.data)
    if (assignRes.data) setTableAssignments(assignRes.data)
    if (emRes.data) setEventMenu(emRes.data)
    if (eaRes) setEventAnalytics(eaRes)
    if (lbRes) setLeaderboard(lbRes)
    if (resRes.data) setReservations(resRes.data)
  }

  const loadAnalytics = async () => { setAnalytics(await getAnalytics(VENUE_ID, analyticsPeriod)) }

  const handleCreateEvent = async () => {
    if (!eventForm.name || !eventForm.event_date) return
    const { data } = await createEvent({ ...eventForm, venue_id: VENUE_ID })
    if (data) setSelectedEvent(data)
    setShowEventModal(false)
    setEventForm({ name: '', event_date: '', start_time: '22:00', description: '' })
    loadData()
  }

  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation()
    if (!confirm('Ștergi acest eveniment?')) return
    await deleteEvent(eventId)
    setSelectedEvent(null)
    loadData()
  }

  const handleCellClick = (row, col) => {
    const zoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    if (zoneTables.some(t => t.grid_row === row && t.grid_col === col)) return
    setSelectedCell({ row, col })
    setTableType('normal')
    setShowTableModal(true)
  }

  const handleAddTable = async () => {
    if (!selectedCell || !selectedEvent) return
    const zoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    const count = zoneTables.filter(t => t.table_type === tableType).length + 1
    const prefix = tableType === 'vip' ? 'VIP' : tableType === 'bar' ? 'B' : 'M'
    const suffix = activeZone === 'back' ? '-S' : ''
    await createEventTable({
      event_id: selectedEvent.id, table_number: `${prefix}${count}${suffix}`, table_type: tableType,
      capacity: tableType === 'vip' ? 8 : tableType === 'bar' ? 2 : 4,
      min_spend: tableType === 'vip' ? 1500 : tableType === 'bar' ? 0 : 500,
      grid_row: selectedCell.row, grid_col: selectedCell.col, zone: activeZone
    })
    setShowTableModal(false)
    setSelectedCell(null)
    loadEventData(selectedEvent.id)
  }

  const handleTableClick = async (e, table) => {
    e.stopPropagation()
    if (confirm(`Ștergi masa ${table.table_number}?`)) {
      await deleteEventTable(table.id)
      loadEventData(selectedEvent.id)
    }
  }

  const addRow = () => activeZone === 'front' ? setFrontGridRows(p => p + 1) : setBackGridRows(p => p + 1)
  const addCol = () => activeZone === 'front' ? setFrontGridCols(p => p + 1) : setBackGridCols(p => p + 1)

  const handleCreateWaiter = async () => {
    if (!waiterForm.name || !waiterForm.phone) return
    await createWaiter({ ...waiterForm, venue_id: VENUE_ID })
    setShowWaiterModal(false)
    setWaiterForm({ name: '', phone: '' })
    loadData()
  }

  const handleDeleteWaiter = async (e, waiterId) => {
    e.stopPropagation()
    if (!confirm('Ștergi?')) return
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

  const handleCreateReservation = async () => {
    if (!reservationForm.customer_name || !reservationForm.event_table_id) return
    await createReservation({
      venue_id: VENUE_ID, event_id: selectedEvent.id, event_table_id: reservationForm.event_table_id,
      customer_name: reservationForm.customer_name, customer_phone: reservationForm.customer_phone,
      party_size: reservationForm.party_size, reservation_time: reservationForm.reservation_time,
      notes: reservationForm.notes, is_vip: reservationForm.is_vip
    })
    setShowReservationModal(false)
    setReservationForm({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false, event_table_id: '' })
    loadEventData(selectedEvent.id)
  }

  const handleDeleteReservation = async (resId) => {
    if (!confirm('Ștergi rezervarea?')) return
    await deleteReservation(resId)
    loadEventData(selectedEvent.id)
  }

  const handleCreateProduct = async () => {
    if (!productForm.name || !productForm.default_price || !productForm.category_id) return
    await supabase.from('menu_items').insert({
      venue_id: VENUE_ID, category_id: productForm.category_id, name: productForm.name,
      description: productForm.description, default_price: parseFloat(productForm.default_price), is_available: true
    })
    setShowProductModal(false)
    setProductForm({ name: '', description: '', default_price: '', category_id: '' })
    loadData()
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Ștergi produsul?')) return
    await supabase.from('menu_items').delete().eq('id', productId)
    loadData()
  }

  const handleCreateCategory = async () => {
    const name = prompt('Nume categorie:')
    if (!name) return
    await supabase.from('categories').insert({ venue_id: VENUE_ID, name, slug: name.toLowerCase().replace(/\s+/g, '-'), sort_order: categories.length })
    loadData()
  }

  const handleDeleteCategory = async (catId) => {
    if (menuItems.filter(m => m.category_id === catId).length > 0) { alert('Categorie cu produse!'); return }
    if (!confirm('Ștergi categoria?')) return
    await supabase.from('categories').delete().eq('id', catId)
    loadData()
  }

  const getAssignedWaiter = (tableId) => tableAssignments.find(a => a.event_table_id === tableId)?.waiters
  const getTableReservation = (tableId) => reservations.find(r => r.event_table_id === tableId)

  const px = isDesktop ? 24 : 16
  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: `14px ${px}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logo: { fontSize: isDesktop ? 22 : 18, fontWeight: 300, letterSpacing: 6, color: colors.champagne },
    tabs: { display: 'flex', padding: `0 ${px}px`, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' },
    tab: { padding: '14px 14px', border: 'none', background: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    content: { padding: px, maxWidth: 1000, margin: '0 auto' },
    title: { fontSize: isDesktop ? 14 : 12, fontWeight: 600, letterSpacing: 2, color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase' },
    btn: { padding: '10px 18px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 6 },
    btnSm: { padding: '8px 14px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4 },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 12, borderRadius: 8 },
    input: { width: '100%', padding: 14, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: 15, marginBottom: 14, borderRadius: 6, outline: 'none' },
    select: { width: '100%', padding: 14, border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: 15, marginBottom: 14, borderRadius: 6 },
    label: { display: 'block', fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 6, fontWeight: 600 },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalBox: { backgroundColor: colors.onyx, width: '100%', maxWidth: 420, borderRadius: 12, border: `1px solid ${colors.border}`, maxHeight: '90vh', overflowY: 'auto' },
    modalHead: { padding: 18, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: 18 },
    modalFoot: { padding: 18, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12, justifyContent: 'flex-end' },
    statsGrid: { display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 12, marginBottom: 24 },
    stat: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: 18, borderRadius: 8, textAlign: 'center' },
    statVal: { fontSize: isDesktop ? 28 : 22, fontWeight: 300, color: colors.champagne },
    statLbl: { fontSize: 10, letterSpacing: 2, color: colors.textMuted, marginTop: 6, fontWeight: 600 },
    zoneTabs: { display: 'flex', marginBottom: 16, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' },
    zoneTab: { flex: 1, padding: '12px 16px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
  }

  const TABS = [
    { id: 'overview', icon: '📊', label: 'Stats' },
    { id: 'events', icon: '📅', label: 'Events' },
    { id: 'layout', icon: '🗺️', label: 'Layout' },
    { id: 'reservations', icon: '📋', label: 'Rezervări' },
    { id: 'menu', icon: '🍸', label: 'Meniu' },
    { id: 'qr', icon: '🔗', label: 'QR' },
    { id: 'waiters', icon: '👤', label: 'Staff' },
    { id: 'customers', icon: '👑', label: 'CRM' },
  ]

  if (loading) return <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{textAlign: 'center'}}><div style={{fontSize: 40, fontWeight: 300, letterSpacing: 12, color: colors.champagne}}>S I P</div><div style={{fontSize: 12, color: colors.textMuted, marginTop: 16}}>Loading...</div></div></div>

  const currentZoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
  const currentRows = activeZone === 'front' ? frontGridRows : backGridRows
  const currentCols = activeZone === 'front' ? frontGridCols : backGridCols
  const availableTables = eventTables.filter(t => !getTableReservation(t.id))

  const renderGrid = () => {
    const cellSize = isDesktop ? 48 : 36
    const gap = 4
    return (
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={s.zoneTabs}>
          <button onClick={() => setActiveZone('front')} style={{...s.zoneTab, backgroundColor: activeZone === 'front' ? colors.champagne : 'transparent', color: activeZone === 'front' ? colors.noir : colors.textMuted}}>🎭 În fața scenei</button>
          <button onClick={() => setActiveZone('back')} style={{...s.zoneTab, backgroundColor: activeZone === 'back' ? colors.champagne : 'transparent', color: activeZone === 'back' ? colors.noir : colors.textMuted}}>🎪 În spatele scenei</button>
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>{currentZoneTables.length} mese în {activeZone === 'front' ? 'față' : 'spate'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentCols}, ${cellSize}px)`, gap, padding: 10, backgroundColor: colors.noir, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
            {Array.from({ length: currentRows }).map((_, row) => (
              Array.from({ length: currentCols }).map((_, col) => {
                const table = currentZoneTables.find(t => t.grid_row === row && t.grid_col === col)
                const cfg = table ? TABLE_TYPES[table.table_type] : null
                const hasRes = table && getTableReservation(table.id)
                return (
                  <div key={`${row}-${col}`} onClick={() => table ? handleTableClick({ stopPropagation: () => {} }, table) : handleCellClick(row, col)}
                    style={{ width: cellSize, height: cellSize, border: table ? `2px solid ${hasRes ? colors.warning : cfg.color}` : `1px dashed rgba(255,255,255,0.15)`,
                      borderRadius: table?.table_type === 'bar' ? '50%' : 6, backgroundColor: table ? (hasRes ? `${colors.warning}30` : `${cfg.color}20`) : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: isDesktop ? 10 : 8, fontWeight: 600, color: table ? (hasRes ? colors.warning : cfg.color) : 'rgba(255,255,255,0.2)' }}>
                    {table ? table.table_number : '+'}
                  </div>
                )
              })
            ))}
          </div>
          <button onClick={addCol} style={{...s.btnSm, backgroundColor: 'transparent', border: `1px dashed ${colors.border}`, color: colors.textMuted, padding: '20px 8px', writingMode: 'vertical-lr'}}>+ Col</button>
        </div>
        <button onClick={addRow} style={{...s.btn, marginTop: 8, backgroundColor: 'transparent', border: `1px dashed ${colors.border}`, color: colors.textMuted, width: currentCols * (cellSize + gap) + 20}}>+ Rând</button>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11, color: colors.textMuted, flexWrap: 'wrap' }}>
          {Object.entries(TABLE_TYPES).map(([type, cfg]) => (<div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, backgroundColor: cfg.color, borderRadius: type === 'bar' ? '50%' : 2 }} />{cfg.label}</div>))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, backgroundColor: colors.warning, borderRadius: 2 }} />Rezervat</div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.container}>
      <Head><title>S I P - Manager</title></Head>
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Link href="/" style={{ textDecoration: 'none' }}><span style={s.logo}>S I P</span></Link><span style={{ color: colors.textMuted, fontSize: 12 }}>Manager</span></div>
        {selectedEvent && <span style={{ fontSize: 12, color: colors.champagne }}>{selectedEvent.name}</span>}
      </header>

      <div style={s.tabs}>
        {TABS.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'}}>{tab.icon} {isDesktop && tab.label}</button>))}
      </div>

      <div style={s.content}>
        {activeTab === 'overview' && (<>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['today', 'week', 'month', 'year'].map(p => (<button key={p} onClick={() => setAnalyticsPeriod(p)} style={{...s.btn, backgroundColor: analyticsPeriod === p ? colors.champagne : 'transparent', color: analyticsPeriod === p ? colors.noir : colors.textMuted, border: `1px solid ${analyticsPeriod === p ? colors.champagne : colors.border}`}}>{p === 'today' ? 'Azi' : p === 'week' ? '7 zile' : p === 'month' ? '30 zile' : 'An'}</button>))}
          </div>
          <div style={s.statsGrid}>
            <div style={s.stat}><div style={s.statVal}>{analytics.totalRevenue?.toLocaleString() || 0}</div><div style={s.statLbl}>VENITURI</div></div>
            <div style={s.stat}><div style={s.statVal}>{analytics.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div>
            <div style={s.stat}><div style={s.statVal}>{analytics.avgOrder || 0}</div><div style={s.statLbl}>MEDIE</div></div>
            <div style={s.stat}><div style={s.statVal}>{customers.length}</div><div style={s.statLbl}>CLIENȚI</div></div>
          </div>
          {leaderboard.length > 0 && (<><div style={s.title}>🏅 Staff Leaderboard</div>{leaderboard.slice(0, 5).map((w, i) => (<div key={w.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span><span>{w.name}</span></div><div style={{ textAlign: 'right' }}><div style={{ color: colors.champagne, fontWeight: 600 }}>{(w.event_sales || w.total_sales || 0).toLocaleString()} LEI</div><div style={{ fontSize: 11, color: colors.textMuted }}>{w.event_orders || w.total_orders || 0} comenzi</div></div></div>))}</>)}
        </>)}

        {activeTab === 'events' && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={s.title}>Evenimente</div><button onClick={() => setShowEventModal(true)} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Nou</button></div>
          {events.map(ev => (<div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{...s.card, cursor: 'pointer', borderColor: selectedEvent?.id === ev.id ? colors.champagne : colors.border}}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{ev.name}</div><div style={{ fontSize: 13, color: colors.textMuted }}>📅 {new Date(ev.event_date).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })} • 🕐 {ev.start_time}</div></div><button onClick={(e) => handleDeleteEvent(e, ev.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 18, cursor: 'pointer' }}>✕</button></div></div>))}
        </>)}

        {activeTab === 'layout' && (<>{!selectedEvent ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează un eveniment</div> : <><div style={s.title}>{selectedEvent.name} - Layout</div>{renderGrid()}<div style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 12 }}>Click + adaugă • Click masă șterge</div></>}</>)}

        {activeTab === 'reservations' && (<>{!selectedEvent ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează un eveniment</div> : <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={s.title}>Rezervări - {selectedEvent.name}</div><button onClick={() => setShowReservationModal(true)} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}} disabled={availableTables.length === 0}>+ Rezervare</button></div>
          {reservations.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Nicio rezervare</div> : reservations.map(res => (<div key={res.id} style={s.card}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><div style={{ display: 'flex', gap: 16, alignItems: 'center' }}><div style={{ width: 50, height: 50, backgroundColor: `${colors.champagne}20`, border: `2px solid ${colors.champagne}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: colors.champagne }}>{res.event_tables?.table_number || '?'}</div><div><div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{res.customer_name} {res.is_vip && <span style={{ color: colors.champagne }}>⭐</span>}</div><div style={{ fontSize: 12, color: colors.textMuted }}>🕐 {res.reservation_time} • 👥 {res.party_size}p</div>{res.customer_phone && <div style={{ fontSize: 12, color: colors.textMuted }}>📱 {res.customer_phone}</div>}{res.notes && <div style={{ fontSize: 12, color: colors.warning, marginTop: 4 }}>📝 {res.notes}</div>}</div></div><button onClick={() => handleDeleteReservation(res.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 16, cursor: 'pointer' }}>✕</button></div></div>))}
        </>}</>)}

        {activeTab === 'menu' && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}><div style={s.title}>Meniu</div><div style={{ display: 'flex', gap: 10 }}><button onClick={handleCreateCategory} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>+ Categorie</button><button onClick={() => { setProductForm({ name: '', description: '', default_price: '', category_id: categories[0]?.id || '' }); setShowProductModal(true) }} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Produs</button></div></div>
          {categories.map(cat => {
            const catItems = menuItems.filter(item => item.category_id === cat.id)
            return (<div key={cat.id} style={{ marginBottom: 24 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><div style={{ fontSize: 13, fontWeight: 600, color: colors.champagne }}>{cat.name} ({catItems.length})</div><button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 14, cursor: 'pointer', opacity: 0.6 }}>✕</button></div>
              {catItems.map(item => {
                const em = selectedEvent ? eventMenu.find(m => m.menu_item_id === item.id) : null
                return (<div key={item.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{ flex: 1 }}><div style={{ fontWeight: 500, marginBottom: 4 }}>{item.name}</div>{item.description && <div style={{ fontSize: 12, color: colors.textMuted }}>{item.description}</div>}<div style={{ fontSize: 13, color: colors.champagne, marginTop: 6 }}>{item.default_price} LEI</div></div><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{selectedEvent && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: colors.textMuted, marginBottom: 4 }}>EVENT</div><input type="number" placeholder={item.default_price} value={em?.custom_price || ''} onChange={async (e) => { await setEventMenuPrice(selectedEvent.id, item.id, e.target.value ? parseFloat(e.target.value) : null); loadEventData(selectedEvent.id) }} style={{ width: 65, padding: 8, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.champagne, textAlign: 'center', fontSize: 12, borderRadius: 4 }} /></div>}<button onClick={() => handleDeleteProduct(item.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 16, cursor: 'pointer' }}>✕</button></div></div>)
              })}
            </div>)
          })}
        </>)}

        {activeTab === 'qr' && (<>{!selectedEvent ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează un eveniment</div> : <><div style={s.title}>QR Links - {selectedEvent.name}</div>{eventTables.map(table => { const waiter = getAssignedWaiter(table.id); const link = `${APP_URL}/order/${selectedEvent.id}/${table.id}`; return (<div key={table.id} style={s.card}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontWeight: 600, color: TABLE_TYPES[table.table_type]?.color }}>{table.table_number}</span><span style={{ fontSize: 10, color: colors.textMuted }}>({table.zone === 'back' ? 'spate' : 'față'})</span>{waiter && <span style={{ fontSize: 11, color: colors.textMuted }}>👤 {waiter.name}</span>}</div></div><div style={{ backgroundColor: colors.noir, padding: 10, fontSize: 10, color: colors.platinum, wordBreak: 'break-all', fontFamily: 'monospace', borderRadius: 4 }}>{link}</div></div>) })}</>}</>)}

        {activeTab === 'waiters' && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={s.title}>Ospătari</div><button onClick={() => setShowWaiterModal(true)} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Nou</button></div>
          {waiters.map(w => { const isAssigned = eventWaiters.some(ew => ew.waiter_id === w.id); return (<div key={w.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div><div style={{ fontWeight: 500 }}>{w.name}</div><div style={{ fontSize: 12, color: colors.textMuted }}>{w.phone}</div></div><div style={{ display: 'flex', gap: 8 }}>{selectedEvent && <button onClick={() => handleToggleWaiterEvent(w.id)} style={{...s.btnSm, backgroundColor: isAssigned ? colors.success : 'transparent', color: isAssigned ? '#fff' : colors.textMuted, border: `1px solid ${isAssigned ? colors.success : colors.border}`}}>{isAssigned ? '✓' : '+'}</button>}<button onClick={(e) => handleDeleteWaiter(e, w.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button></div></div>) })}
          {selectedEvent && eventWaiters.length > 0 && eventTables.length > 0 && (<><div style={{...s.title, marginTop: 30}}>Atribuire Mese</div>{eventTables.map(t => { const aw = getAssignedWaiter(t.id); return (<div key={t.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><span style={{ fontWeight: 500, color: TABLE_TYPES[t.table_type]?.color }}>{t.table_number}</span><select value={aw?.id || ''} onChange={(e) => handleAssignTable(t.id, e.target.value)} style={{...s.select, width: 'auto', marginBottom: 0, padding: '8px 14px'}}><option value="">-</option>{eventWaiters.map(ew => <option key={ew.waiter_id} value={ew.waiter_id}>{ew.waiters?.name}</option>)}</select></div>) })}</>)}
        </>)}

        {activeTab === 'customers' && (<><div style={s.title}>👑 Top Clienți</div>{customers.map((c, i) => (<div key={c.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 16, color: i < 3 ? colors.champagne : colors.textMuted }}>{i < 3 ? '👑' : `#${i + 1}`}</span><div><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 12, color: colors.textMuted }}>{c.phone} • {c.visit_count} vizite</div></div></div><div style={{ color: colors.champagne, fontWeight: 600 }}>{c.total_spent?.toLocaleString()} LEI</div></div>))}</>)}
      </div>

      {showEventModal && (<div style={s.modal} onClick={() => setShowEventModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Eveniment nou</span><button onClick={() => setShowEventModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Nume</label><input type="text" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} placeholder="Revelion 2025" style={s.input} /><label style={s.label}>Data</label><input type="date" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} style={s.input} /><label style={s.label}>Ora</label><input type="time" value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time: e.target.value})} style={s.input} /></div><div style={s.modalFoot}><button onClick={() => setShowEventModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateEvent} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Creează</button></div></div></div>)}

      {showWaiterModal && (<div style={s.modal} onClick={() => setShowWaiterModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Ospătar nou</span><button onClick={() => setShowWaiterModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Nume</label><input type="text" value={waiterForm.name} onChange={e => setWaiterForm({...waiterForm, name: e.target.value})} placeholder="Alexandru Pop" style={s.input} /><label style={s.label}>Telefon</label><input type="tel" value={waiterForm.phone} onChange={e => setWaiterForm({...waiterForm, phone: e.target.value})} placeholder="0722 111 111" style={s.input} /></div><div style={s.modalFoot}><button onClick={() => setShowWaiterModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateWaiter} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Adaugă</button></div></div></div>)}

      {showTableModal && selectedCell && (<div style={s.modal} onClick={() => { setShowTableModal(false); setSelectedCell(null) }}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Masă nouă ({activeZone === 'front' ? 'față' : 'spate'})</span><button onClick={() => { setShowTableModal(false); setSelectedCell(null) }} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Tip masă</label><div style={{ display: 'flex', gap: 10 }}>{Object.entries(TABLE_TYPES).map(([type, cfg]) => (<button key={type} onClick={() => setTableType(type)} style={{ flex: 1, padding: 16, border: `2px solid ${tableType === type ? cfg.color : colors.border}`, backgroundColor: tableType === type ? `${cfg.color}20` : 'transparent', color: cfg.color, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{cfg.label}</button>))}</div></div><div style={s.modalFoot}><button onClick={() => { setShowTableModal(false); setSelectedCell(null) }} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleAddTable} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Adaugă</button></div></div></div>)}

      {showReservationModal && (<div style={s.modal} onClick={() => setShowReservationModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Rezervare nouă</span><button onClick={() => setShowReservationModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Masă</label><select value={reservationForm.event_table_id} onChange={e => setReservationForm({...reservationForm, event_table_id: e.target.value})} style={s.select}><option value="">Selectează...</option>{availableTables.map(t => <option key={t.id} value={t.id}>{t.table_number} ({t.capacity}p) - {t.zone === 'back' ? 'spate' : 'față'}</option>)}</select><label style={s.label}>Nume client</label><input type="text" value={reservationForm.customer_name} onChange={e => setReservationForm({...reservationForm, customer_name: e.target.value})} placeholder="Ion Popescu" style={s.input} /><label style={s.label}>Telefon</label><input type="tel" value={reservationForm.customer_phone} onChange={e => setReservationForm({...reservationForm, customer_phone: e.target.value})} placeholder="0722 123 456" style={s.input} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div><label style={s.label}>Ora</label><select value={reservationForm.reservation_time} onChange={e => setReservationForm({...reservationForm, reservation_time: e.target.value})} style={s.select}>{['20:00','21:00','22:00','23:00','00:00','01:00'].map(t => <option key={t} value={t}>{t}</option>)}</select></div><div><label style={s.label}>Persoane</label><select value={reservationForm.party_size} onChange={e => setReservationForm({...reservationForm, party_size: parseInt(e.target.value)})} style={s.select}>{[1,2,3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}</select></div></div><label style={s.label}>Note</label><input type="text" value={reservationForm.notes} onChange={e => setReservationForm({...reservationForm, notes: e.target.value})} placeholder="Aniversare..." style={s.input} /><div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setReservationForm({...reservationForm, is_vip: !reservationForm.is_vip})}><div style={{ width: 22, height: 22, border: `2px solid ${reservationForm.is_vip ? colors.champagne : colors.border}`, backgroundColor: reservationForm.is_vip ? colors.champagne : 'transparent', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.noir, fontSize: 14 }}>{reservationForm.is_vip && '✓'}</div><span>Client VIP ⭐</span></div></div><div style={s.modalFoot}><button onClick={() => setShowReservationModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateReservation} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Rezervă</button></div></div></div>)}

      {showProductModal && (<div style={s.modal} onClick={() => setShowProductModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Produs nou</span><button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Categorie</label><select value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})} style={s.select}><option value="">Selectează...</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select><label style={s.label}>Nume</label><input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Mojito" style={s.input} /><label style={s.label}>Descriere</label><input type="text" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Rum, mentă, lime" style={s.input} /><label style={s.label}>Preț (LEI)</label><input type="number" value={productForm.default_price} onChange={e => setProductForm({...productForm, default_price: e.target.value})} placeholder="45" style={s.input} /></div><div style={s.modalFoot}><button onClick={() => setShowProductModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateProduct} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Adaugă</button></div></div></div>)}
    </div>
  )
}
