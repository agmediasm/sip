import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, createEvent, updateEvent, deleteEvent, getEventTables, createEventTable, updateEventTable, deleteEventTable, getMenuItems, getEventMenu, setEventMenuPrice, getWaiters, createWaiter, deleteWaiter, getEventWaiters, addWaiterToEvent, removeWaiterFromEvent, getTableAssignments, assignTableToWaiter, getCustomers, getAnalytics, getEventAnalytics, getWaiterLeaderboard } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

const colors = {
  noir: '#08080a', onyx: '#141416', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0',
  border: 'rgba(255,255,255,0.12)', textMuted: 'rgba(255,255,255,0.55)',
  success: '#22c55e', error: '#ef4444',
  vip: '#d4af37', normal: '#3b82f6', bar: '#8b5cf6'
}

const TABLE_TYPES = {
  vip: { label: 'VIP', color: colors.vip },
  normal: { label: 'Normal', color: colors.normal },
  bar: { label: 'Bar', color: colors.bar }
}

const GRID_COLS = 8
const MIN_ROWS = 6

export default function ManagerDashboard() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTables, setEventTables] = useState([])
  const [gridRows, setGridRows] = useState(MIN_ROWS)
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
  const [selectedCell, setSelectedCell] = useState(null)
  const [eventForm, setEventForm] = useState({ name: '', event_date: '', start_time: '22:00', description: '', stage_in_back: false })
  const [waiterForm, setWaiterForm] = useState({ name: '', phone: '' })
  const [tableType, setTableType] = useState('normal')
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
    const [eventsRes, waitersRes, customersRes, menuRes] = await Promise.all([
      getEvents(VENUE_ID), getWaiters(VENUE_ID), getCustomers(20), getMenuItems(VENUE_ID)
    ])
    if (eventsRes.data?.length) { setEvents(eventsRes.data); setSelectedEvent(eventsRes.data[0]) }
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
    if (tablesRes.data) {
      setEventTables(tablesRes.data)
      const maxRow = tablesRes.data.length > 0 ? Math.max(...tablesRes.data.map(t => t.grid_row)) : 0
      setGridRows(Math.max(MIN_ROWS, maxRow + 2))
    }
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
    const { data } = await createEvent({ ...eventForm, venue_id: VENUE_ID })
    if (data) setSelectedEvent(data)
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

  // Grid click - open modal to add table
  const handleCellClick = (row, col) => {
    if (eventTables.some(t => t.grid_row === row && t.grid_col === col)) return
    setSelectedCell({ row, col })
    setTableType('normal')
    setShowTableModal(true)
  }

  // Add table
  const handleAddTable = async () => {
    if (!selectedCell || !selectedEvent) return
    const count = eventTables.filter(t => t.table_type === tableType).length + 1
    const prefix = tableType === 'vip' ? 'VIP' : tableType === 'bar' ? 'B' : 'M'
    await createEventTable({
      event_id: selectedEvent.id,
      table_number: `${prefix}${count}`,
      table_type: tableType,
      capacity: tableType === 'vip' ? 8 : tableType === 'bar' ? 2 : 4,
      min_spend: tableType === 'vip' ? 1500 : tableType === 'bar' ? 0 : 500,
      grid_row: selectedCell.row,
      grid_col: selectedCell.col
    })
    setShowTableModal(false)
    setSelectedCell(null)
    loadEventData(selectedEvent.id)
  }

  // Delete table on click
  const handleTableClick = async (e, table) => {
    e.stopPropagation()
    if (confirm(`Ștergi masa ${table.table_number}?`)) {
      await deleteEventTable(table.id)
      loadEventData(selectedEvent.id)
    }
  }

  // Add row
  const addRow = () => setGridRows(prev => prev + 1)

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
  const toggleCustomer = (id) => setSelectedCustomers(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  // Styles
  const px = isDesktop ? 24 : 16
  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: `14px ${px}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logo: { fontSize: isDesktop ? 22 : 18, fontWeight: 300, letterSpacing: 6, color: colors.champagne },
    tabs: { display: 'flex', padding: `0 ${px}px`, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto', gap: 0 },
    tab: { padding: '14px 16px', border: 'none', background: 'none', fontSize: 12, fontWeight: 500, letterSpacing: 1, cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    content: { padding: px, maxWidth: 1000, margin: '0 auto' },
    title: { fontSize: isDesktop ? 14 : 12, fontWeight: 600, letterSpacing: 2, color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase' },
    btn: { padding: '10px 18px', border: 'none', fontSize: 12, fontWeight: 600, letterSpacing: 1, cursor: 'pointer', borderRadius: 6 },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 12, borderRadius: 8 },
    input: { width: '100%', padding: 14, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: 15, marginBottom: 14, borderRadius: 6, outline: 'none' },
    select: { width: '100%', padding: 14, border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: 15, marginBottom: 14, borderRadius: 6 },
    label: { display: 'block', fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 6, fontWeight: 600 },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalBox: { backgroundColor: colors.onyx, width: '100%', maxWidth: 400, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' },
    modalHead: { padding: 18, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: 18 },
    modalFoot: { padding: 18, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12, justifyContent: 'flex-end' },
    statsGrid: { display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 12, marginBottom: 24 },
    stat: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: 18, borderRadius: 8, textAlign: 'center' },
    statVal: { fontSize: isDesktop ? 28 : 22, fontWeight: 300, color: colors.champagne },
    statLbl: { fontSize: 10, letterSpacing: 2, color: colors.textMuted, marginTop: 6, fontWeight: 600 },
  }

  const TABS = [
    { id: 'overview', icon: '📊', label: 'Stats' },
    { id: 'events', icon: '📅', label: 'Events' },
    { id: 'layout', icon: '🗺️', label: 'Layout' },
    { id: 'menu', icon: '📋', label: 'Meniu' },
    { id: 'qr', icon: '🔗', label: 'QR' },
    { id: 'waiters', icon: '👤', label: 'Staff' },
    { id: 'customers', icon: '👑', label: 'CRM' },
  ]

  if (loading) return (
    <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: 40, fontWeight: 300, letterSpacing: 12, color: colors.champagne}}>S I P</div>
        <div style={{fontSize: 12, color: colors.textMuted, marginTop: 16}}>Loading...</div>
      </div>
    </div>
  )

  // Grid rendering for Layout tab
  const renderGrid = () => {
    const stageInBack = selectedEvent?.stage_in_back
    const cellSize = isDesktop ? 52 : 40
    const gap = 6
    const gridWidth = GRID_COLS * cellSize + (GRID_COLS - 1) * gap
    
    const StageElement = () => (
      <div style={{
        width: gridWidth,
        padding: 12,
        backgroundColor: 'rgba(212,175,55,0.15)',
        border: `2px dashed ${colors.champagne}`,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: colors.champagne,
        letterSpacing: 4,
        borderRadius: 6
      }}>
        🎭 STAGE
      </div>
    )
    
    return (
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          backgroundColor: colors.noir,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          width: 'fit-content'
        }}>
          {/* Stage în FAȚĂ */}
          {!stageInBack && <StageElement />}

          {/* Grid-ul de mese */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, ${cellSize}px)`,
            gap: gap
          }}>
            {Array.from({ length: gridRows }).map((_, row) => (
              Array.from({ length: GRID_COLS }).map((_, col) => {
                const table = eventTables.find(t => t.grid_row === row && t.grid_col === col)
                const cfg = table ? TABLE_TYPES[table.table_type] : null
                const isBar = table?.table_type === 'bar'
                
                return (
                  <div
                    key={`${row}-${col}`}
                    onClick={() => table ? handleTableClick({ stopPropagation: () => {} }, table) : handleCellClick(row, col)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      border: table ? `2px solid ${cfg.color}` : `1px dashed rgba(255,255,255,0.15)`,
                      borderRadius: isBar ? '50%' : 6,
                      backgroundColor: table ? `${cfg.color}20` : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontSize: isDesktop ? 12 : 10,
                      fontWeight: 600,
                      color: table ? cfg.color : 'rgba(255,255,255,0.2)'
                    }}
                  >
                    {table ? table.table_number : '+'}
                  </div>
                )
              })
            ))}
          </div>

          {/* Stage în SPATE */}
          {stageInBack && <StageElement />}
        </div>

        {/* Add row button */}
        <button
          onClick={addRow}
          style={{
            ...s.btn,
            width: '100%',
            maxWidth: gridWidth + 32,
            marginTop: 12,
            backgroundColor: 'transparent',
            border: `1px dashed ${colors.border}`,
            color: colors.textMuted
          }}
        >
          + Adaugă rând
        </button>
      </div>
    )
  }

  return (
    <div style={s.container}>
      <Head><title>S I P - Manager</title></Head>

      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none' }}><span style={s.logo}>S I P</span></Link>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>Manager</span>
        </div>
        {selectedEvent && <span style={{ fontSize: 12, color: colors.champagne }}>{selectedEvent.name}</span>}
      </header>

      <div style={s.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...s.tab,
              color: activeTab === tab.id ? colors.champagne : colors.textMuted,
              borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'
            }}
          >
            {tab.icon} {isDesktop && tab.label}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['today', 'week', 'month', 'year'].map(p => (
                <button
                  key={p}
                  onClick={() => setAnalyticsPeriod(p)}
                  style={{
                    ...s.btn,
                    backgroundColor: analyticsPeriod === p ? colors.champagne : 'transparent',
                    color: analyticsPeriod === p ? colors.noir : colors.textMuted,
                    border: `1px solid ${analyticsPeriod === p ? colors.champagne : colors.border}`
                  }}
                >
                  {p === 'today' ? 'Azi' : p === 'week' ? '7 zile' : p === 'month' ? '30 zile' : 'An'}
                </button>
              ))}
            </div>

            <div style={s.statsGrid}>
              <div style={s.stat}><div style={s.statVal}>{analytics.totalRevenue?.toLocaleString() || 0}</div><div style={s.statLbl}>VENITURI LEI</div></div>
              <div style={s.stat}><div style={s.statVal}>{analytics.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div>
              <div style={s.stat}><div style={s.statVal}>{analytics.avgOrder || 0}</div><div style={s.statLbl}>MEDIE</div></div>
              <div style={s.stat}><div style={s.statVal}>{customers.length}</div><div style={s.statLbl}>CLIENȚI</div></div>
            </div>

            {leaderboard.length > 0 && (
              <>
                <div style={s.title}>🏅 Staff Leaderboard</div>
                {leaderboard.slice(0, 5).map((w, i) => (
                  <div key={w.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                      <span style={{ fontSize: 14 }}>{w.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: colors.champagne, fontWeight: 600 }}>{(w.event_sales || w.total_sales || 0).toLocaleString()} LEI</div>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>{w.event_orders || w.total_orders || 0} comenzi</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* EVENTS */}
        {activeTab === 'events' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={s.title}>Evenimente</div>
              <button onClick={() => setShowEventModal(true)} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>+ Nou</button>
            </div>

            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Niciun eveniment</div>
            ) : (
              events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  style={{ ...s.card, cursor: 'pointer', borderColor: selectedEvent?.id === ev.id ? colors.champagne : colors.border }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{ev.name}</div>
                      <div style={{ fontSize: 13, color: colors.textMuted }}>
                        📅 {new Date(ev.event_date).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })} • 🕐 {ev.start_time}
                      </div>
                    </div>
                    <button onClick={(e) => handleDeleteEvent(e, ev.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 18, cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* LAYOUT */}
        {activeTab === 'layout' && (
          <>
            {!selectedEvent ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează un eveniment</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={s.title}>{selectedEvent.name} - {eventTables.length} mese</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {Object.entries(TABLE_TYPES).map(([type, cfg]) => (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: cfg.color }}>
                        <div style={{ width: 10, height: 10, backgroundColor: cfg.color, borderRadius: type === 'bar' ? '50%' : 2 }} />
                        {cfg.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scenă toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 14, backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: colors.textMuted }}>Scenă:</span>
                  <button
                    onClick={async () => { await updateEvent(selectedEvent.id, { stage_in_back: false }); setSelectedEvent({ ...selectedEvent, stage_in_back: false }) }}
                    style={{ ...s.btn, padding: '8px 16px', backgroundColor: !selectedEvent.stage_in_back ? colors.champagne : 'transparent', color: !selectedEvent.stage_in_back ? colors.noir : colors.textMuted, border: `1px solid ${colors.border}` }}
                  >
                    În față
                  </button>
                  <button
                    onClick={async () => { await updateEvent(selectedEvent.id, { stage_in_back: true }); setSelectedEvent({ ...selectedEvent, stage_in_back: true }) }}
                    style={{ ...s.btn, padding: '8px 16px', backgroundColor: selectedEvent.stage_in_back ? colors.champagne : 'transparent', color: selectedEvent.stage_in_back ? colors.noir : colors.textMuted, border: `1px solid ${colors.border}` }}
                  >
                    În spate
                  </button>
                </div>

                {renderGrid()}

                <div style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 12 }}>
                  Click pe + pentru a adăuga masă • Click pe masă pentru a șterge
                </div>
              </>
            )}
          </>
        )}

        {/* MENU */}
        {activeTab === 'menu' && (
          <>
            {!selectedEvent ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează un eveniment</div>
            ) : (
              <>
                <div style={s.title}>Meniu - {selectedEvent.name}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Lasă gol pentru preț default</div>
                {menuItems.map(item => {
                  const em = eventMenu.find(m => m.menu_item_id === item.id)
                  return (
                    <div key={item.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{item.categories?.name} • Default: {item.default_price} LEI</div>
                      </div>
                      <input
                        type="number"
                        placeholder={item.default_price}
                        value={em?.custom_price || ''}
                        onChange={async (e) => {
                          await setEventMenuPrice(selectedEvent.id, item.id, e.target.value ? parseFloat(e.target.value) : null)
                          loadEventData(selectedEvent.id)
                        }}
                        style={{ width: 80, padding: 10, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.champagne, textAlign: 'center', fontSize: 14, borderRadius: 6 }}
                      />
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* QR */}
        {activeTab === 'qr' && (
          <>
            {!selectedEvent ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează un eveniment</div>
            ) : (
              <>
                <div style={s.title}>QR Links - {selectedEvent.name}</div>
                {eventTables.map(table => {
                  const waiter = getAssignedWaiter(table.id)
                  const link = `${APP_URL}/order/${selectedEvent.id}/${table.id}`
                  return (
                    <div key={table.id} style={s.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600, color: TABLE_TYPES[table.table_type]?.color }}>{table.table_number}</span>
                          {waiter && <span style={{ fontSize: 11, color: colors.textMuted }}>👤 {waiter.name}</span>}
                        </div>
                      </div>
                      <div style={{ backgroundColor: colors.noir, padding: 10, fontSize: 11, color: colors.platinum, wordBreak: 'break-all', fontFamily: 'monospace', borderRadius: 4 }}>
                        {link}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* WAITERS */}
        {activeTab === 'waiters' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={s.title}>Ospătari</div>
              <button onClick={() => setShowWaiterModal(true)} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>+ Nou</button>
            </div>

            {waiters.map(w => {
              const isAssigned = eventWaiters.some(ew => ew.waiter_id === w.id)
              return (
                <div key={w.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{w.phone}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selectedEvent && (
                      <button
                        onClick={() => handleToggleWaiterEvent(w.id)}
                        style={{ ...s.btn, padding: '8px 14px', backgroundColor: isAssigned ? colors.success : 'transparent', color: isAssigned ? '#fff' : colors.textMuted, border: `1px solid ${isAssigned ? colors.success : colors.border}` }}
                      >
                        {isAssigned ? '✓' : '+'}
                      </button>
                    )}
                    <button onClick={(e) => handleDeleteWaiter(e, w.id)} style={{ ...s.btn, padding: '8px 12px', backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}` }}>✕</button>
                  </div>
                </div>
              )
            })}

            {selectedEvent && eventWaiters.length > 0 && eventTables.length > 0 && (
              <>
                <div style={{ ...s.title, marginTop: 30 }}>Atribuire Mese</div>
                {eventTables.map(t => {
                  const aw = getAssignedWaiter(t.id)
                  return (
                    <div key={t.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, color: TABLE_TYPES[t.table_type]?.color }}>{t.table_number}</span>
                      <select
                        value={aw?.id || ''}
                        onChange={(e) => handleAssignTable(t.id, e.target.value)}
                        style={{ ...s.select, width: 'auto', marginBottom: 0, padding: '8px 14px' }}
                      >
                        <option value="">Neatribuit</option>
                        {eventWaiters.map(ew => <option key={ew.waiter_id} value={ew.waiter_id}>{ew.waiters?.name}</option>)}
                      </select>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* CUSTOMERS */}
        {activeTab === 'customers' && (
          <>
            <div style={s.title}>👑 Top Clienți</div>
            {customers.map((c, i) => (
              <div
                key={c.id}
                onClick={() => toggleCustomer(c.id)}
                style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderColor: selectedCustomers.includes(c.id) ? colors.champagne : colors.border }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, color: i < 3 ? colors.champagne : colors.textMuted }}>{i < 3 ? '👑' : `#${i + 1}`}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{c.phone} • {c.visit_count} vizite</div>
                  </div>
                </div>
                <div style={{ color: colors.champagne, fontWeight: 600 }}>{c.total_spent?.toLocaleString()} LEI</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* EVENT MODAL */}
      {showEventModal && (
        <div style={s.modal} onClick={() => setShowEventModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Eveniment nou</span>
              <button onClick={() => setShowEventModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label>
              <input type="text" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} placeholder="Revelion 2025" style={s.input} />
              <label style={s.label}>Data</label>
              <input type="date" value={eventForm.event_date} onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })} style={s.input} />
              <label style={s.label}>Ora</label>
              <input type="time" value={eventForm.start_time} onChange={e => setEventForm({ ...eventForm, start_time: e.target.value })} style={s.input} />
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowEventModal(false)} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` }}>Anulează</button>
              <button onClick={handleCreateEvent} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Creează</button>
            </div>
          </div>
        </div>
      )}

      {/* WAITER MODAL */}
      {showWaiterModal && (
        <div style={s.modal} onClick={() => setShowWaiterModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Ospătar nou</span>
              <button onClick={() => setShowWaiterModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label>
              <input type="text" value={waiterForm.name} onChange={e => setWaiterForm({ ...waiterForm, name: e.target.value })} placeholder="Alexandru Pop" style={s.input} />
              <label style={s.label}>Telefon</label>
              <input type="tel" value={waiterForm.phone} onChange={e => setWaiterForm({ ...waiterForm, phone: e.target.value })} placeholder="0722 111 111" style={s.input} />
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowWaiterModal(false)} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` }}>Anulează</button>
              <button onClick={handleCreateWaiter} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Adaugă</button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE TYPE MODAL */}
      {showTableModal && selectedCell && (
        <div style={s.modal} onClick={() => { setShowTableModal(false); setSelectedCell(null) }}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Adaugă masă</span>
              <button onClick={() => { setShowTableModal(false); setSelectedCell(null) }} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Tip masă</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {Object.entries(TABLE_TYPES).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => setTableType(type)}
                    style={{
                      flex: 1,
                      padding: 16,
                      border: `2px solid ${tableType === type ? cfg.color : colors.border}`,
                      backgroundColor: tableType === type ? `${cfg.color}20` : 'transparent',
                      color: cfg.color,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => { setShowTableModal(false); setSelectedCell(null) }} style={{ ...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` }}>Anulează</button>
              <button onClick={handleAddTable} style={{ ...s.btn, backgroundColor: colors.champagne, color: colors.noir }}>Adaugă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
