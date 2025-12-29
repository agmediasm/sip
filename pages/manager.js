import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getAllEvents, createEvent, updateEvent, deleteEvent, getEventTables, createEventTable, deleteEventTable, getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, duplicateMenuItem, updateMenuItemOrder, getEventMenu, setEventMenuPrice, getWaiters, createWaiter, deleteWaiter, restoreWaiter, getWaiterStats, getEventWaiters, addWaiterToEvent, removeWaiterFromEvent, getTableAssignments, assignTableToWaiter, getCustomers, getCustomersFiltered, getAnalytics, getEventAnalytics, getWaiterLeaderboard, getEventReservations, createReservation, deleteReservation, getLayoutTemplates, createLayoutTemplate, deleteLayoutTemplate, applyLayoutTemplate, getMenuTemplates, createMenuTemplate, deleteMenuTemplate, applyMenuTemplate, updateCategoryOrder } from '../lib/supabase'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const colors = { noir: '#08080a', onyx: '#141416', champagne: '#d4af37', platinum: '#e5e4e2', ivory: '#fffff0', border: 'rgba(255,255,255,0.12)', textMuted: 'rgba(255,255,255,0.55)', success: '#22c55e', error: '#ef4444', warning: '#f59e0b', vip: '#d4af37', normal: '#3b82f6', bar: '#8b5cf6' }
const TABLE_TYPES = { vip: { label: 'VIP', color: colors.vip }, normal: { label: 'Normal', color: colors.normal }, bar: { label: 'Bar', color: colors.bar } }
const PRODUCT_TYPES = ['bottle', 'cocktail', 'shot', 'beer', 'wine', 'soft', 'food', 'other']
const BADGES = ['popular', 'premium', 'new', 'recommended']

export default function ManagerDashboard() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [events, setEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTables, setEventTables] = useState([])
  const [reservations, setReservations] = useState([])
  const [layoutTemplates, setLayoutTemplates] = useState([])
  const [menuTemplates, setMenuTemplates] = useState([])
  const [activeZone, setActiveZone] = useState('front')
  const [frontGridRows, setFrontGridRows] = useState(6)
  const [frontGridCols, setFrontGridCols] = useState(8)
  const [backGridRows, setBackGridRows] = useState(6)
  const [backGridCols, setBackGridCols] = useState(8)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [eventMenu, setEventMenu] = useState([])
  const [waiters, setWaiters] = useState([])
  const [waiterFilter, setWaiterFilter] = useState('active')
  const [selectedWaiter, setSelectedWaiter] = useState(null)
  const [waiterStats, setWaiterStats] = useState({})
  const [eventWaiters, setEventWaiters] = useState([])
  const [tableAssignments, setTableAssignments] = useState([])
  const [customers, setCustomers] = useState([])
  const [customerFilter, setCustomerFilter] = useState({ period: 'all', eventId: null })
  const [analytics, setAnalytics] = useState({})
  const [eventAnalytics, setEventAnalytics] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month')
  const [showEventModal, setShowEventModal] = useState(false)
  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [showMenuTemplateModal, setShowMenuTemplateModal] = useState(false)
  const [showWaiterStatsModal, setShowWaiterStatsModal] = useState(false)
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedTableForRes, setSelectedTableForRes] = useState(null)
  const [selectedTableType, setSelectedTableType] = useState('normal')
  const [draggedItem, setDraggedItem] = useState(null)
  const [draggedCategory, setDraggedCategory] = useState(null)
  const [eventForm, setEventForm] = useState({ name: '', event_date: '', start_time: '22:00', description: '' })
  const [waiterForm, setWaiterForm] = useState({ name: '', phone: '' })
  const [reservationForm, setReservationForm] = useState({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false })
  const [productForm, setProductForm] = useState({ name: '', description: '', default_price: '', category_id: '', product_type: 'cocktail', badge: '', is_available: true })
  const [layoutName, setLayoutName] = useState('')
  const [menuTemplateName, setMenuTemplateName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedMenuTemplate, setSelectedMenuTemplate] = useState(null)
  const [bulkPriceChange, setBulkPriceChange] = useState({ type: 'percent', value: 0 })

  useEffect(() => { const c = () => setIsDesktop(window.innerWidth >= 900); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c) }, [])
  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedEvent) loadEventData(selectedEvent.id) }, [selectedEvent])
  useEffect(() => { loadAnalytics() }, [analyticsPeriod])
  useEffect(() => { loadWaiters() }, [waiterFilter])
  useEffect(() => { loadCustomers() }, [customerFilter])

  const loadData = async () => {
    setLoading(true)
    const [evRes, allEvRes, menuRes, catsRes, layRes, menuTRes] = await Promise.all([
      getEvents(VENUE_ID), getAllEvents(VENUE_ID), getAllMenuItems(VENUE_ID),
      supabase.from('categories').select('*').eq('venue_id', VENUE_ID).order('sort_order'),
      getLayoutTemplates(VENUE_ID), getMenuTemplates(VENUE_ID)
    ])
    if (evRes.data?.length) { setEvents(evRes.data); setSelectedEvent(evRes.data[0]) }
    if (allEvRes.data) setAllEvents(allEvRes.data)
    if (menuRes.data) setMenuItems(menuRes.data)
    if (catsRes.data) setCategories(catsRes.data)
    if (layRes.data) setLayoutTemplates(layRes.data)
    if (menuTRes?.data) setMenuTemplates(menuTRes.data)
    await loadWaiters(); await loadAnalytics(); await loadCustomers()
    setLoading(false)
  }
  const loadWaiters = async () => { const { data } = await getWaiters(VENUE_ID, waiterFilter); if (data) setWaiters(data) }
  const loadCustomers = async () => { const { data } = await getCustomersFiltered({ ...customerFilter, limit: 50 }); if (data) setCustomers(data) }
  const loadEventData = async (eventId) => {
    const [tRes, ewRes, aRes, emRes, lbRes, resRes, eaRes] = await Promise.all([
      getEventTables(eventId), getEventWaiters(eventId), getTableAssignments(eventId),
      getEventMenu(eventId), getWaiterLeaderboard(eventId), getEventReservations(eventId), getEventAnalytics(eventId)
    ])
    if (tRes.data) { setEventTables(tRes.data); const fT = tRes.data.filter(t => t.zone !== 'back'), bT = tRes.data.filter(t => t.zone === 'back')
      if (fT.length) { setFrontGridRows(Math.max(6, Math.max(...fT.map(t => t.grid_row)) + 2)); setFrontGridCols(Math.max(8, Math.max(...fT.map(t => t.grid_col)) + 2)) }
      if (bT.length) { setBackGridRows(Math.max(6, Math.max(...bT.map(t => t.grid_row)) + 2)); setBackGridCols(Math.max(8, Math.max(...bT.map(t => t.grid_col)) + 2)) }
    }
    if (ewRes.data) setEventWaiters(ewRes.data); if (aRes.data) setTableAssignments(aRes.data); if (emRes.data) setEventMenu(emRes.data)
    if (lbRes) setLeaderboard(lbRes); if (resRes.data) setReservations(resRes.data); if (eaRes) setEventAnalytics(eaRes)
  }
  const loadAnalytics = async () => { setAnalytics(await getAnalytics(VENUE_ID, analyticsPeriod)) }
  const loadWaiterStats = async (w) => { setSelectedWaiter(w); const g = await getWaiterStats(w.id), e = selectedEvent ? await getWaiterStats(w.id, selectedEvent.id) : { totalSales: 0, totalOrders: 0 }; setWaiterStats({ global: g, event: e }); setShowWaiterStatsModal(true) }

  // Event handlers
  const handleCreateEvent = async () => { if (!eventForm.name || !eventForm.event_date) return; const { data } = await createEvent({ ...eventForm, venue_id: VENUE_ID }); if (data) { if (selectedTemplate) await applyLayoutTemplate(selectedTemplate, data.id); if (selectedMenuTemplate) await applyMenuTemplate(selectedMenuTemplate, data.id); setSelectedEvent(data) }; closeEventModal(); loadData() }
  const handleUpdateEvent = async () => { if (!editingEvent || !eventForm.name) return; await updateEvent(editingEvent.id, eventForm); closeEventModal(); loadData() }
  const closeEventModal = () => { setShowEventModal(false); setEditingEvent(null); setSelectedTemplate(null); setSelectedMenuTemplate(null); setEventForm({ name: '', event_date: '', start_time: '22:00', description: '' }) }
  const openEditEvent = (ev) => { setEditingEvent(ev); setEventForm({ name: ev.name, event_date: ev.event_date, start_time: ev.start_time, description: ev.description || '' }); setShowEventModal(true) }
  const handleDeleteEvent = async (e, id) => { e.stopPropagation(); if (!confirm('Ștergi?')) return; await deleteEvent(id); setSelectedEvent(null); loadData() }

  // Layout
  const handleSaveLayout = async () => { if (!layoutName || !eventTables.length) return; await createLayoutTemplate(VENUE_ID, layoutName, eventTables); setLayoutName(''); setShowLayoutModal(false); const { data } = await getLayoutTemplates(VENUE_ID); if (data) setLayoutTemplates(data) }
  const handleDeleteTemplate = async (id) => { if (!confirm('Ștergi?')) return; await deleteLayoutTemplate(id); const { data } = await getLayoutTemplates(VENUE_ID); if (data) setLayoutTemplates(data) }

  // Grid
  const handleCellClick = async (row, col) => { const zT = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back'); if (zT.some(t => t.grid_row === row && t.grid_col === col)) return; const cnt = zT.filter(t => t.table_type === selectedTableType).length + 1, pre = selectedTableType === 'vip' ? 'VIP' : selectedTableType === 'bar' ? 'B' : 'M', suf = activeZone === 'back' ? '-S' : ''; await createEventTable({ event_id: selectedEvent.id, table_number: `${pre}${cnt}${suf}`, table_type: selectedTableType, capacity: selectedTableType === 'vip' ? 8 : selectedTableType === 'bar' ? 2 : 4, min_spend: selectedTableType === 'vip' ? 1500 : selectedTableType === 'bar' ? 0 : 500, grid_row: row, grid_col: col, zone: activeZone }); loadEventData(selectedEvent.id) }
  const handleTableClick = async (e, t) => { e.stopPropagation(); if (confirm(`Ștergi ${t.table_number}?`)) { await deleteEventTable(t.id); loadEventData(selectedEvent.id) } }
  const addRow = () => activeZone === 'front' ? setFrontGridRows(p => p + 1) : setBackGridRows(p => p + 1)
  const addCol = () => activeZone === 'front' ? setFrontGridCols(p => p + 1) : setBackGridCols(p => p + 1)

  // Menu
  const handleCreateProduct = async () => { if (!productForm.name || !productForm.default_price || !productForm.category_id) return; await createMenuItem({ ...productForm, venue_id: VENUE_ID, default_price: parseFloat(productForm.default_price) }); closeProductModal(); loadData() }
  const handleUpdateProduct = async () => { if (!editingProduct) return; await updateMenuItem(editingProduct.id, { ...productForm, default_price: parseFloat(productForm.default_price) }); closeProductModal(); loadData() }
  const closeProductModal = () => { setShowProductModal(false); setEditingProduct(null); setProductForm({ name: '', description: '', default_price: '', category_id: '', product_type: 'cocktail', badge: '', is_available: true }) }
  const openEditProduct = (item) => { setEditingProduct(item); setProductForm({ name: item.name, description: item.description || '', default_price: item.default_price, category_id: item.category_id, product_type: item.product_type || 'cocktail', badge: item.badge || '', is_available: item.is_available }); setShowProductModal(true) }
  const handleDuplicateProduct = async (id) => { await duplicateMenuItem(id); loadData() }
  const handleToggleStock = async (item) => { await updateMenuItem(item.id, { is_available: !item.is_available }); loadData() }
  const handleDeleteProduct = async (id) => { if (!confirm('Ștergi?')) return; await deleteMenuItem(id); loadData() }
  const handleDragStart = (e, item) => { setDraggedItem(item); e.dataTransfer.effectAllowed = 'move' }
  const handleDragOver = (e) => { e.preventDefault() }
  const handleDrop = async (e, targetItem) => { e.preventDefault(); if (!draggedItem || draggedItem.id === targetItem.id || draggedItem.category_id !== targetItem.category_id) return; const cI = menuItems.filter(m => m.category_id === draggedItem.category_id), oI = cI.findIndex(m => m.id === draggedItem.id), nI = cI.findIndex(m => m.id === targetItem.id), re = [...cI]; re.splice(oI, 1); re.splice(nI, 0, draggedItem); await updateMenuItemOrder(re); setDraggedItem(null); loadData() }
  const handleCatDragStart = (e, cat) => { setDraggedCategory(cat) }
  const handleCatDrop = async (e, targetCat) => { e.preventDefault(); if (!draggedCategory || draggedCategory.id === targetCat.id) return; const oI = categories.findIndex(c => c.id === draggedCategory.id), nI = categories.findIndex(c => c.id === targetCat.id), re = [...categories]; re.splice(oI, 1); re.splice(nI, 0, draggedCategory); await updateCategoryOrder(re); setDraggedCategory(null); loadData() }
  const handleBulkPrice = async () => { for (const item of menuItems) { let nP = bulkPriceChange.type === 'percent' ? item.default_price * (1 + bulkPriceChange.value / 100) : item.default_price + bulkPriceChange.value; await updateMenuItem(item.id, { default_price: Math.round(nP) }) }; setShowBulkPriceModal(false); loadData() }
  const handleSaveMenuTemplate = async () => { if (!menuTemplateName) return; await createMenuTemplate(VENUE_ID, menuTemplateName, menuItems); setMenuTemplateName(''); setShowMenuTemplateModal(false); const { data } = await getMenuTemplates(VENUE_ID); if (data) setMenuTemplates(data) }
  const handleDeleteMenuTemplate = async (id) => { if (!confirm('Ștergi?')) return; await deleteMenuTemplate(id); const { data } = await getMenuTemplates(VENUE_ID); if (data) setMenuTemplates(data) }
  const handleCreateCategory = async () => { const n = prompt('Nume categorie:'); if (!n) return; await supabase.from('categories').insert({ venue_id: VENUE_ID, name: n, slug: n.toLowerCase().replace(/\s+/g, '-'), sort_order: categories.length }); loadData() }
  const handleDeleteCategory = async (id) => { if (menuItems.filter(m => m.category_id === id).length) { alert('Categorie cu produse!'); return }; if (!confirm('Ștergi?')) return; await supabase.from('categories').delete().eq('id', id); loadData() }

  // Waiter
  const handleCreateWaiter = async () => { if (!waiterForm.name || !waiterForm.phone) return; await createWaiter({ ...waiterForm, venue_id: VENUE_ID }); setShowWaiterModal(false); setWaiterForm({ name: '', phone: '' }); loadWaiters() }
  const handleDeleteWaiter = async (e, id) => { e.stopPropagation(); if (!confirm('Ștergi?')) return; await deleteWaiter(id); loadWaiters() }
  const handleRestoreWaiter = async (id) => { await restoreWaiter(id); loadWaiters() }
  const handleToggleWaiterEvent = async (wid) => { if (!selectedEvent) return; const isA = eventWaiters.some(ew => ew.waiter_id === wid); isA ? await removeWaiterFromEvent(selectedEvent.id, wid) : await addWaiterToEvent(selectedEvent.id, wid); loadEventData(selectedEvent.id) }
  const handleAssignTable = async (tid, wid) => { await assignTableToWaiter(tid, wid, selectedEvent.id); loadEventData(selectedEvent.id) }

  // Reservation
  const handleTableClickForRes = (t) => { const hR = reservations.find(r => r.event_table_id === t.id); if (hR) { if (confirm(`Ștergi rezervarea ${t.table_number}?`)) handleDeleteRes(hR.id) } else { setSelectedTableForRes(t); setReservationForm({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false }); setShowReservationModal(true) } }
  const handleCreateRes = async () => { if (!reservationForm.customer_name || !selectedTableForRes) return; await createReservation({ venue_id: VENUE_ID, event_id: selectedEvent.id, event_table_id: selectedTableForRes.id, ...reservationForm }); setShowReservationModal(false); setSelectedTableForRes(null); loadEventData(selectedEvent.id) }
  const handleDeleteRes = async (id) => { await deleteReservation(id); loadEventData(selectedEvent.id) }

  // CRM
  const handleDeleteCustomer = async (phone) => { if (!confirm('Ștergi clientul?')) return; await supabase.from('orders').update({ customer_phone: null, customer_name: null }).eq('customer_phone', phone); loadCustomers() }

  const getAssignedWaiter = (tid) => tableAssignments.find(a => a.event_table_id === tid)?.waiters
  const getTableRes = (tid) => reservations.find(r => r.event_table_id === tid)

  const px = isDesktop ? 24 : 16
  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: `14px ${px}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logo: { fontSize: isDesktop ? 22 : 18, fontWeight: 300, letterSpacing: 6, color: colors.champagne },
    tabs: { display: 'flex', padding: `0 ${px}px`, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' },
    tab: { padding: '14px', border: 'none', background: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    content: { padding: px, maxWidth: 1000, margin: '0 auto' },
    title: { fontSize: 12, fontWeight: 600, letterSpacing: 2, color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase' },
    btn: { padding: '10px 18px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 6 },
    btnSm: { padding: '8px 14px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4 },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 12, borderRadius: 8 },
    input: { width: '100%', padding: 14, border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: 15, marginBottom: 14, borderRadius: 6, outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', padding: 14, border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: 15, marginBottom: 14, borderRadius: 6, boxSizing: 'border-box' },
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
    zoneTabs: { display: 'flex', marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' },
    zoneTab: { flex: 1, padding: '10px 16px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
    filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    filterBtn: { padding: '8px 14px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textMuted, fontSize: 11, cursor: 'pointer', borderRadius: 4 },
    badge: { fontSize: 9, padding: '2px 6px', borderRadius: 4, marginLeft: 6, textTransform: 'uppercase', fontWeight: 700 }
  }

  const TABS = [{ id: 'overview', icon: '📊', label: 'Stats' }, { id: 'events', icon: '📅', label: 'Events' }, { id: 'layout', icon: '🗺️', label: 'Layout' }, { id: 'reservations', icon: '📋', label: 'Rezervări' }, { id: 'menu', icon: '🍸', label: 'Meniu' }, { id: 'qr', icon: '🔗', label: 'QR' }, { id: 'waiters', icon: '👤', label: 'Staff' }, { id: 'customers', icon: '👑', label: 'CRM' }]

  if (loading) return <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{textAlign: 'center'}}><div style={{fontSize: 40, fontWeight: 300, letterSpacing: 12, color: colors.champagne}}>S I P</div><div style={{fontSize: 12, color: colors.textMuted, marginTop: 16}}>Loading...</div></div></div>

  const curZoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
  const curRows = activeZone === 'front' ? frontGridRows : backGridRows
  const curCols = activeZone === 'front' ? frontGridCols : backGridCols

  const renderGrid = (forRes = false) => {
    const cellSize = isDesktop ? 48 : 36, gap = 4
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={s.zoneTabs}>
          <button onClick={() => setActiveZone('front')} style={{...s.zoneTab, backgroundColor: activeZone === 'front' ? colors.champagne : 'transparent', color: activeZone === 'front' ? colors.noir : colors.textMuted}}>🎭 Față</button>
          <button onClick={() => setActiveZone('back')} style={{...s.zoneTab, backgroundColor: activeZone === 'back' ? colors.champagne : 'transparent', color: activeZone === 'back' ? colors.noir : colors.textMuted}}>🎪 Spate</button>
        </div>
        {!forRes && <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: colors.textMuted }}>Adaugă:</span>
          {Object.entries(TABLE_TYPES).map(([type, cfg]) => <button key={type} onClick={() => setSelectedTableType(type)} style={{ padding: '6px 12px', border: `2px solid ${selectedTableType === type ? cfg.color : colors.border}`, backgroundColor: selectedTableType === type ? `${cfg.color}30` : 'transparent', color: cfg.color, borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>{cfg.label}</button>)}
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowLayoutModal(true)} style={{...s.btnSm, backgroundColor: colors.champagne, color: colors.noir}}>💾 Salvează</button>
        </div>}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${curCols}, ${cellSize}px)`, gap, padding: 10, backgroundColor: colors.noir, border: `1px solid ${colors.border}`, borderRadius: 8, width: 'fit-content' }}>
          {Array.from({ length: curRows }).map((_, row) => Array.from({ length: curCols }).map((_, col) => {
            const t = curZoneTables.find(t => t.grid_row === row && t.grid_col === col)
            if (forRes && !t) return <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }} />
            const cfg = t ? TABLE_TYPES[t.table_type] : TABLE_TYPES[selectedTableType]
            const hRes = t && getTableRes(t.id)
            return <div key={`${row}-${col}`} onClick={() => forRes ? (t && handleTableClickForRes(t)) : (t ? handleTableClick({ stopPropagation: () => {} }, t) : handleCellClick(row, col))} style={{ width: cellSize, height: cellSize, border: t ? `2px solid ${hRes ? colors.warning : forRes ? colors.success : cfg.color}` : `2px dashed ${cfg.color}40`, borderRadius: t?.table_type === 'bar' || (!t && selectedTableType === 'bar') ? '50%' : 6, backgroundColor: t ? (hRes ? `${colors.warning}30` : forRes ? `${colors.success}20` : `${cfg.color}20`) : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 9, fontWeight: 700, color: t ? (hRes ? colors.warning : forRes ? colors.success : cfg.color) : `${cfg.color}60` }}>{t ? <><span>{t.table_number}</span>{forRes && <span style={{ fontSize: 7 }}>{hRes ? '🔒' : '✓'}</span>}</> : '+'}</div>
          }))}
        </div>
        {!forRes && <button onClick={addRow} style={{...s.btn, marginTop: 8, backgroundColor: 'transparent', border: `1px dashed ${colors.border}`, color: colors.textMuted, width: curCols * (cellSize + gap) + 20}}>+ Rând</button>}
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
      <div style={s.tabs}>{TABS.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderBottomColor: activeTab === tab.id ? colors.champagne : 'transparent'}}>{tab.icon} {isDesktop && tab.label}</button>)}</div>
      <div style={s.content}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && <>
          <div style={s.filterRow}>{['today', 'week', 'month', 'year'].map(p => <button key={p} onClick={() => setAnalyticsPeriod(p)} style={{...s.filterBtn, backgroundColor: analyticsPeriod === p ? colors.champagne : 'transparent', color: analyticsPeriod === p ? colors.noir : colors.textMuted, borderColor: analyticsPeriod === p ? colors.champagne : colors.border}}>{p === 'today' ? 'Azi' : p === 'week' ? '7 zile' : p === 'month' ? '30 zile' : 'An'}</button>)}</div>
          <div style={s.statsGrid}>
            <div style={s.stat}><div style={s.statVal}>{analytics.totalRevenue?.toLocaleString() || 0}</div><div style={s.statLbl}>VENITURI LEI</div></div>
            <div style={s.stat}><div style={s.statVal}>{analytics.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div>
            <div style={s.stat}><div style={s.statVal}>{analytics.avgOrder || 0}</div><div style={s.statLbl}>MEDIE</div></div>
            <div style={s.stat}><div style={s.statVal}>{customers.length}</div><div style={s.statLbl}>CLIENȚI</div></div>
          </div>
          {selectedEvent && <div style={{...s.card, marginBottom: 24 }}><div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>📅 {selectedEvent.name}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}><div><div style={{ fontSize: 20, color: colors.champagne }}>{eventAnalytics.totalRevenue?.toLocaleString() || 0}</div><div style={{ fontSize: 10, color: colors.textMuted }}>LEI</div></div><div><div style={{ fontSize: 20, color: colors.champagne }}>{eventAnalytics.totalOrders || 0}</div><div style={{ fontSize: 10, color: colors.textMuted }}>Comenzi</div></div><div><div style={{ fontSize: 20, color: colors.champagne }}>{eventAnalytics.avgOrder || 0}</div><div style={{ fontSize: 10, color: colors.textMuted }}>Medie</div></div></div></div>}
          {leaderboard.length > 0 && <><div style={s.title}>🏅 Staff - {selectedEvent?.name || 'Total'}</div>{leaderboard.slice(0, 5).map((w, i) => <div key={w.id} onClick={() => loadWaiterStats(w)} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span><span>{w.name}</span></div><div style={{ textAlign: 'right' }}><div style={{ color: colors.champagne, fontWeight: 600 }}>{(w.event_sales || w.total_sales || 0).toLocaleString()} LEI</div><div style={{ fontSize: 11, color: colors.textMuted }}>{w.event_orders || w.total_orders || 0} comenzi</div></div></div>)}</>}
        </>}

        {/* EVENTS */}
        {activeTab === 'events' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={s.title}>Evenimente</div><button onClick={() => { setEditingEvent(null); setEventForm({ name: '', event_date: '', start_time: '22:00', description: '' }); setShowEventModal(true) }} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Nou</button></div>
          {events.map(ev => <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{...s.card, cursor: 'pointer', borderColor: selectedEvent?.id === ev.id ? colors.champagne : colors.border}}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{ev.name}</div><div style={{ fontSize: 13, color: colors.textMuted }}>📅 {new Date(ev.event_date).toLocaleDateString('ro-RO')} • 🕐 {ev.start_time}</div></div><div style={{ display: 'flex', gap: 8 }}><button onClick={(e) => { e.stopPropagation(); openEditEvent(ev) }} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.champagne, border: `1px solid ${colors.champagne}`}}>✏️</button><button onClick={(e) => handleDeleteEvent(e, ev.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button></div></div></div>)}
        </>}

        {/* LAYOUT */}
        {activeTab === 'layout' && <>{!selectedEvent ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează eveniment</div> : <><div style={s.title}>{selectedEvent.name} - Layout</div>{renderGrid()}{layoutTemplates.length > 0 && <div style={{ marginTop: 24 }}><div style={s.title}>Layout-uri salvate</div>{layoutTemplates.map(t => <div key={t.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div><div style={{ fontWeight: 500 }}>{t.name}</div><div style={{ fontSize: 11, color: colors.textMuted }}>{t.tables_config?.length || 0} mese</div></div><button onClick={() => handleDeleteTemplate(t.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button></div>)}</div>}</>}</>}

        {/* RESERVATIONS */}
        {activeTab === 'reservations' && <>{!selectedEvent ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează eveniment</div> : <><div style={s.title}>Rezervări - {selectedEvent.name} ({reservations.length})</div>{renderGrid(true)}{reservations.length > 0 && <div style={{ marginTop: 24 }}>{reservations.map(r => <div key={r.id} style={s.card}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 40, height: 40, backgroundColor: `${colors.warning}25`, border: `2px solid ${colors.warning}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: colors.warning }}>{r.event_tables?.table_number || '?'}</div><div><div style={{ fontSize: 14, fontWeight: 500 }}>{r.customer_name} {r.is_vip && '⭐'}</div><div style={{ fontSize: 11, color: colors.textMuted }}>🕐 {r.reservation_time} • 👥 {r.party_size}p</div></div></div><button onClick={() => handleDeleteRes(r.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 16, cursor: 'pointer' }}>✕</button></div></div>)}</div>}</>}</>}

        {/* MENU */}
        {activeTab === 'menu' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={s.title}>Meniu ({menuItems.length} produse)</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleCreateCategory} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>+ Categorie</button>
              <button onClick={() => setShowBulkPriceModal(true)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.warning, border: `1px solid ${colors.warning}`}}>💰 Bulk</button>
              <button onClick={() => setShowMenuTemplateModal(true)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.champagne, border: `1px solid ${colors.champagne}`}}>💾 Salvează</button>
              <button onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', default_price: '', category_id: categories[0]?.id || '', product_type: 'cocktail', badge: '', is_available: true }); setShowProductModal(true) }} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Produs</button>
            </div>
          </div>
          {categories.map(cat => {
            const catItems = menuItems.filter(m => m.category_id === cat.id)
            return (
              <div key={cat.id} style={{ marginBottom: 24 }} draggable onDragStart={(e) => handleCatDragStart(e, cat)} onDragOver={handleDragOver} onDrop={(e) => handleCatDrop(e, cat)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, cursor: 'grab' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.champagne }}>⠿ {cat.name} ({catItems.length})</div>
                  <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 12, cursor: 'pointer', opacity: 0.6 }}>✕</button>
                </div>
                {catItems.map(item => (
                  <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, item)} style={{...s.card, opacity: item.is_available ? 1 : 0.5, cursor: 'grab' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          ⠿ {item.name}
                          {item.badge && <span style={{...s.badge, backgroundColor: item.badge === 'popular' ? colors.error : item.badge === 'premium' ? colors.champagne : item.badge === 'new' ? colors.success : colors.normal, color: item.badge === 'premium' ? colors.noir : '#fff' }}>{item.badge}</span>}
                          {!item.is_available && <span style={{...s.badge, backgroundColor: colors.textMuted }}>STOC 0</span>}
                        </div>
                        {item.description && <div style={{ fontSize: 12, color: colors.textMuted }}>{item.description}</div>}
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{item.product_type || 'other'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 15, color: colors.champagne, fontWeight: 500, marginRight: 8 }}>{item.default_price} LEI</div>
                        <button onClick={() => handleToggleStock(item)} style={{...s.btnSm, backgroundColor: 'transparent', color: item.is_available ? colors.success : colors.error, border: `1px solid ${item.is_available ? colors.success : colors.error}`, padding: '4px 8px' }}>{item.is_available ? '✓' : '✗'}</button>
                        <button onClick={() => handleDuplicateProduct(item.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, padding: '4px 8px' }}>📋</button>
                        <button onClick={() => openEditProduct(item)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.champagne, border: `1px solid ${colors.champagne}`, padding: '4px 8px' }}>✏️</button>
                        <button onClick={() => handleDeleteProduct(item.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`, padding: '4px 8px' }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
          {menuTemplates?.length > 0 && <div style={{ marginTop: 24 }}><div style={s.title}>Template-uri meniu</div>{menuTemplates.map(t => <div key={t.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div><div style={{ fontWeight: 500 }}>{t.name}</div><div style={{ fontSize: 11, color: colors.textMuted }}>{t.menu_config?.length || 0} produse</div></div><button onClick={() => handleDeleteMenuTemplate(t.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button></div>)}</div>}
        </>}

        {/* QR */}
        {activeTab === 'qr' && <>{!selectedEvent ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Selectează eveniment</div> : <><div style={s.title}>QR Links - {selectedEvent.name}</div>{eventTables.map(t => { const w = getAssignedWaiter(t.id); const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/order/${selectedEvent.id}/${t.id}`; return <div key={t.id} style={s.card}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontWeight: 600, color: TABLE_TYPES[t.table_type]?.color }}>{t.table_number}</span>{w && <span style={{ fontSize: 11, color: colors.textMuted }}>👤 {w.name}</span>}</div><div style={{ backgroundColor: colors.noir, padding: 10, fontSize: 10, color: colors.platinum, wordBreak: 'break-all', fontFamily: 'monospace', borderRadius: 4 }}>{link}</div></div> })}</>}</>}

        {/* STAFF */}
        {activeTab === 'waiters' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><div style={s.title}>Ospătari</div><button onClick={() => setShowWaiterModal(true)} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Nou</button></div>
          <div style={s.filterRow}>{[{v: 'active', l: 'Activi'}, {v: 'all', l: 'Toți'}, {v: 'deleted', l: 'Șterși'}].map(f => <button key={f.v} onClick={() => setWaiterFilter(f.v)} style={{...s.filterBtn, backgroundColor: waiterFilter === f.v ? colors.champagne : 'transparent', color: waiterFilter === f.v ? colors.noir : colors.textMuted, borderColor: waiterFilter === f.v ? colors.champagne : colors.border}}>{f.l}</button>)}</div>
          {waiters.map(w => { const isA = eventWaiters.some(ew => ew.waiter_id === w.id), isDel = w.is_deleted; return <div key={w.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isDel ? 0.6 : 1}}><div onClick={() => loadWaiterStats(w)} style={{ cursor: 'pointer' }}><div style={{ fontWeight: 500 }}>{w.name} {isDel && <span style={{ fontSize: 10, color: colors.error }}>(șters)</span>}</div><div style={{ fontSize: 12, color: colors.textMuted }}>{w.phone}</div></div><div style={{ display: 'flex', gap: 8 }}>{isDel ? <button onClick={() => handleRestoreWaiter(w.id)} style={{...s.btnSm, backgroundColor: colors.success, color: '#fff'}}>↩️</button> : <>{selectedEvent && <button onClick={() => handleToggleWaiterEvent(w.id)} style={{...s.btnSm, backgroundColor: isA ? colors.success : 'transparent', color: isA ? '#fff' : colors.textMuted, border: `1px solid ${isA ? colors.success : colors.border}`}}>{isA ? '✓' : '+'}</button>}<button onClick={(e) => handleDeleteWaiter(e, w.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button></>}</div></div> })}
          {selectedEvent && eventWaiters.length > 0 && eventTables.length > 0 && <><div style={{...s.title, marginTop: 30}}>Atribuire Mese</div>{eventTables.map(t => { const aw = getAssignedWaiter(t.id); return <div key={t.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><span style={{ fontWeight: 500, color: TABLE_TYPES[t.table_type]?.color }}>{t.table_number}</span><select value={aw?.id || ''} onChange={(e) => handleAssignTable(t.id, e.target.value)} style={{...s.select, width: 'auto', marginBottom: 0, padding: '8px 14px'}}><option value="">-</option>{eventWaiters.map(ew => <option key={ew.waiter_id} value={ew.waiter_id}>{ew.waiters?.name}</option>)}</select></div> })}</>}
        </>}

        {/* CRM */}
        {activeTab === 'customers' && <>
          <div style={s.title}>👑 Clienți</div>
          <div style={s.filterRow}>
            <span style={{ fontSize: 11, color: colors.textMuted }}>Perioadă:</span>
            {[{v: 'all', l: 'Tot'}, {v: 'today', l: 'Azi'}, {v: 'week', l: '7z'}, {v: 'month', l: '30z'}].map(f => <button key={f.v} onClick={() => setCustomerFilter({...customerFilter, period: f.v})} style={{...s.filterBtn, backgroundColor: customerFilter.period === f.v ? colors.champagne : 'transparent', color: customerFilter.period === f.v ? colors.noir : colors.textMuted}}>{f.l}</button>)}
          </div>
          <div style={s.filterRow}>
            <span style={{ fontSize: 11, color: colors.textMuted }}>Event:</span>
            <select value={customerFilter.eventId || ''} onChange={e => setCustomerFilter({...customerFilter, eventId: e.target.value || null})} style={{...s.select, width: 'auto', marginBottom: 0, padding: '8px'}}><option value="">Toate</option>{allEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select>
          </div>
          {customers.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Niciun client</div> : customers.map((c, i) => <div key={c.phone} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 16, color: i < 3 ? colors.champagne : colors.textMuted }}>{i < 3 ? '👑' : `#${i + 1}`}</span><div><div style={{ fontWeight: 500 }}>{c.name || 'Anonim'}</div><div style={{ fontSize: 12, color: colors.textMuted }}>{c.phone} • {c.visit_count || 0} comenzi</div></div></div><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ color: colors.champagne, fontWeight: 600 }}>{(c.total_spent || 0).toLocaleString()} LEI</span><button onClick={() => handleDeleteCustomer(c.phone)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 14, cursor: 'pointer' }}>✕</button></div></div>)}
        </>}
      </div>

      {/* MODALS */}
      {showEventModal && <div style={s.modal} onClick={closeEventModal}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>{editingEvent ? 'Editează' : 'Eveniment nou'}</span><button onClick={closeEventModal} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Nume</label><input value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} style={s.input} /><label style={s.label}>Data</label><input type="date" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} style={s.input} /><label style={s.label}>Ora</label><input type="time" value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time: e.target.value})} style={s.input} />{!editingEvent && layoutTemplates.length > 0 && <><label style={s.label}>Layout</label><select value={selectedTemplate || ''} onChange={e => setSelectedTemplate(e.target.value || null)} style={s.select}><option value="">Fără</option>{layoutTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></>}{!editingEvent && menuTemplates?.length > 0 && <><label style={s.label}>Meniu</label><select value={selectedMenuTemplate || ''} onChange={e => setSelectedMenuTemplate(e.target.value || null)} style={s.select}><option value="">Fără</option>{menuTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></>}</div><div style={s.modalFoot}><button onClick={closeEventModal} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>{editingEvent ? 'Salvează' : 'Creează'}</button></div></div></div>}

      {showWaiterModal && <div style={s.modal} onClick={() => setShowWaiterModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Ospătar nou</span><button onClick={() => setShowWaiterModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Nume</label><input value={waiterForm.name} onChange={e => setWaiterForm({...waiterForm, name: e.target.value})} style={s.input} /><label style={s.label}>Telefon</label><input value={waiterForm.phone} onChange={e => setWaiterForm({...waiterForm, phone: e.target.value})} style={s.input} /></div><div style={s.modalFoot}><button onClick={() => setShowWaiterModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateWaiter} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Adaugă</button></div></div></div>}

      {showReservationModal && selectedTableForRes && <div style={s.modal} onClick={() => { setShowReservationModal(false); setSelectedTableForRes(null) }}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Rezervare - {selectedTableForRes.table_number}</span><button onClick={() => { setShowReservationModal(false); setSelectedTableForRes(null) }} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Nume</label><input value={reservationForm.customer_name} onChange={e => setReservationForm({...reservationForm, customer_name: e.target.value})} style={s.input} /><label style={s.label}>Telefon</label><input value={reservationForm.customer_phone} onChange={e => setReservationForm({...reservationForm, customer_phone: e.target.value})} style={s.input} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div><label style={s.label}>Ora</label><select value={reservationForm.reservation_time} onChange={e => setReservationForm({...reservationForm, reservation_time: e.target.value})} style={s.select}>{['20:00','21:00','22:00','23:00','00:00','01:00'].map(t => <option key={t}>{t}</option>)}</select></div><div><label style={s.label}>Persoane</label><select value={reservationForm.party_size} onChange={e => setReservationForm({...reservationForm, party_size: parseInt(e.target.value)})} style={s.select}>{[1,2,3,4,5,6,8,10,12].map(n => <option key={n}>{n}</option>)}</select></div></div><label style={s.label}>Note</label><input value={reservationForm.notes} onChange={e => setReservationForm({...reservationForm, notes: e.target.value})} style={s.input} /><div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setReservationForm({...reservationForm, is_vip: !reservationForm.is_vip})}><div style={{ width: 22, height: 22, border: `2px solid ${reservationForm.is_vip ? colors.champagne : colors.border}`, backgroundColor: reservationForm.is_vip ? colors.champagne : 'transparent', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.noir }}>{reservationForm.is_vip && '✓'}</div><span>VIP ⭐</span></div></div><div style={s.modalFoot}><button onClick={() => { setShowReservationModal(false); setSelectedTableForRes(null) }} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateRes} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Rezervă</button></div></div></div>}

      {showProductModal && <div style={s.modal} onClick={closeProductModal}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>{editingProduct ? 'Editează produs' : 'Produs nou'}</span><button onClick={closeProductModal} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><label style={s.label}>Categorie</label><select value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})} style={s.select}><option value="">Selectează...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label style={s.label}>Nume</label><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} style={s.input} /><label style={s.label}>Descriere</label><input value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} style={s.input} /><label style={s.label}>Preț (LEI)</label><input type="number" value={productForm.default_price} onChange={e => setProductForm({...productForm, default_price: e.target.value})} style={s.input} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div><label style={s.label}>Tip</label><select value={productForm.product_type} onChange={e => setProductForm({...productForm, product_type: e.target.value})} style={s.select}>{PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div><div><label style={s.label}>Badge</label><select value={productForm.badge} onChange={e => setProductForm({...productForm, badge: e.target.value})} style={s.select}><option value="">Fără</option>{BADGES.map(b => <option key={b}>{b}</option>)}</select></div></div><div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setProductForm({...productForm, is_available: !productForm.is_available})}><div style={{ width: 22, height: 22, border: `2px solid ${productForm.is_available ? colors.success : colors.border}`, backgroundColor: productForm.is_available ? colors.success : 'transparent', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{productForm.is_available && '✓'}</div><span>În stoc</span></div></div><div style={s.modalFoot}><button onClick={closeProductModal} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={editingProduct ? handleUpdateProduct : handleCreateProduct} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>{editingProduct ? 'Salvează' : 'Adaugă'}</button></div></div></div>}

      {showLayoutModal && <div style={s.modal} onClick={() => setShowLayoutModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Salvează Layout</span><button onClick={() => setShowLayoutModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><div style={{ textAlign: 'center', padding: 16, marginBottom: 16, backgroundColor: `${colors.champagne}15`, borderRadius: 8 }}><div style={{ fontSize: 32, fontWeight: 700, color: colors.champagne }}>{eventTables.length}</div><div style={{ fontSize: 12, color: colors.textMuted }}>mese</div></div><label style={s.label}>Nume</label><input value={layoutName} onChange={e => setLayoutName(e.target.value)} style={s.input} /></div><div style={s.modalFoot}><button onClick={() => setShowLayoutModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleSaveLayout} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Salvează</button></div></div></div>}

      {showMenuTemplateModal && <div style={s.modal} onClick={() => setShowMenuTemplateModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Salvează Meniu</span><button onClick={() => setShowMenuTemplateModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><div style={{ textAlign: 'center', padding: 16, marginBottom: 16, backgroundColor: `${colors.champagne}15`, borderRadius: 8 }}><div style={{ fontSize: 32, fontWeight: 700, color: colors.champagne }}>{menuItems.length}</div><div style={{ fontSize: 12, color: colors.textMuted }}>produse</div></div><label style={s.label}>Nume</label><input value={menuTemplateName} onChange={e => setMenuTemplateName(e.target.value)} style={s.input} /></div><div style={s.modalFoot}><button onClick={() => setShowMenuTemplateModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleSaveMenuTemplate} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Salvează</button></div></div></div>}

      {showBulkPriceModal && <div style={s.modal} onClick={() => setShowBulkPriceModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>Modifică toate prețurile</span><button onClick={() => setShowBulkPriceModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}><button onClick={() => setBulkPriceChange({...bulkPriceChange, type: 'percent'})} style={{...s.btn, backgroundColor: bulkPriceChange.type === 'percent' ? colors.champagne : 'transparent', color: bulkPriceChange.type === 'percent' ? colors.noir : colors.textMuted, border: `1px solid ${colors.border}`}}>Procent %</button><button onClick={() => setBulkPriceChange({...bulkPriceChange, type: 'fixed'})} style={{...s.btn, backgroundColor: bulkPriceChange.type === 'fixed' ? colors.champagne : 'transparent', color: bulkPriceChange.type === 'fixed' ? colors.noir : colors.textMuted, border: `1px solid ${colors.border}`}}>Fix LEI</button></div><label style={s.label}>{bulkPriceChange.type === 'percent' ? 'Procent (ex: 10 = +10%)' : 'Sumă (ex: 5 = +5 LEI)'}</label><input type="number" value={bulkPriceChange.value} onChange={e => setBulkPriceChange({...bulkPriceChange, value: parseFloat(e.target.value) || 0})} style={s.input} /></div><div style={s.modalFoot}><button onClick={() => setShowBulkPriceModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button><button onClick={handleBulkPrice} style={{...s.btn, backgroundColor: colors.warning, color: colors.noir}}>Aplică la {menuItems.length} produse</button></div></div></div>}

      {showWaiterStatsModal && selectedWaiter && <div style={s.modal} onClick={() => setShowWaiterStatsModal(false)}><div style={s.modalBox} onClick={e => e.stopPropagation()}><div style={s.modalHead}><span style={{ fontSize: 16, fontWeight: 600 }}>📊 {selectedWaiter.name}</span><button onClick={() => setShowWaiterStatsModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button></div><div style={s.modalBody}><div style={{ marginBottom: 24 }}><div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 12 }}>TOTAL</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div style={s.stat}><div style={s.statVal}>{waiterStats.global?.totalSales?.toLocaleString() || 0}</div><div style={s.statLbl}>LEI</div></div><div style={s.stat}><div style={s.statVal}>{waiterStats.global?.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div></div></div>{selectedEvent && <div><div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 12 }}>{selectedEvent.name}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div style={s.stat}><div style={s.statVal}>{waiterStats.event?.totalSales?.toLocaleString() || 0}</div><div style={s.statLbl}>LEI</div></div><div style={s.stat}><div style={s.statVal}>{waiterStats.event?.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div></div></div>}</div></div></div>}
    </div>
  )
}
