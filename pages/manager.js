import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getEvents, getAllEvents, createEvent, updateEvent, deleteEvent, getEventTables, createEventTable, deleteEventTable, getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, duplicateMenuItem, updateMenuItemOrder, getEventMenu, setEventMenuPrice, getWaiters, createWaiter, deleteWaiter, restoreWaiter, getWaiterStats, getEventWaiters, addWaiterToEvent, removeWaiterFromEvent, getTableAssignments, assignTableToWaiter, getCustomers, getCustomersFiltered, getAnalytics, getEventAnalytics, getWaiterLeaderboard, getEventReservations, createReservation, deleteReservation, getLayoutTemplates, createLayoutTemplate, deleteLayoutTemplate, applyLayoutTemplate, getMenuTemplates, createMenuTemplate, deleteMenuTemplate, applyMenuTemplate, updateCategoryOrder, createCategory, updateCategoryName, deleteCategory, bulkDeleteMenuItems, bulkUpdateMenuItems, setDefaultMenuTemplate, getDefaultMenuTemplate } from '../lib/supabase'

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
  const [defaultTemplateId, setDefaultTemplateId] = useState(null)
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
  
  // Modals
  const [showEventModal, setShowEventModal] = useState(false)
  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [showMenuTemplateModal, setShowMenuTemplateModal] = useState(false)
  const [showWaiterStatsModal, setShowWaiterStatsModal] = useState(false)
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false)
  const [showCategoryOrderModal, setShowCategoryOrderModal] = useState(false)
  const [showCategoryEditModal, setShowCategoryEditModal] = useState(false)
  
  // Editing states
  const [editingEvent, setEditingEvent] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [selectedTableForRes, setSelectedTableForRes] = useState(null)
  const [selectedTableType, setSelectedTableType] = useState('normal')
  
  // Menu selection for bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)
  
  // Forms
  const [eventForm, setEventForm] = useState({ name: '', event_date: '', start_time: '22:00', description: '' })
  const [waiterForm, setWaiterForm] = useState({ name: '', phone: '' })
  const [reservationForm, setReservationForm] = useState({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false })
  const [productForm, setProductForm] = useState({ name: '', description: '', default_price: '', category_id: '', product_type: 'cocktail', badge: '', is_available: true })
  const [layoutName, setLayoutName] = useState('')
  const [menuTemplateName, setMenuTemplateName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedMenuTemplate, setSelectedMenuTemplate] = useState(null)
  const [bulkPriceChange, setBulkPriceChange] = useState({ type: 'percent', value: 0 })
  const [tempCategoryOrder, setTempCategoryOrder] = useState([])

  useEffect(() => { const c = () => setIsDesktop(window.innerWidth >= 900); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c) }, [])
  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedEvent) loadEventData(selectedEvent.id) }, [selectedEvent])
  useEffect(() => { loadAnalytics() }, [analyticsPeriod])
  useEffect(() => { loadWaiters() }, [waiterFilter])
  useEffect(() => { loadCustomers() }, [customerFilter])

  const loadData = async () => {
    setLoading(true)
    const [evRes, allEvRes, menuRes, catsRes, layRes, menuTRes, defTRes] = await Promise.all([
      getEvents(VENUE_ID), getAllEvents(VENUE_ID), getAllMenuItems(VENUE_ID),
      supabase.from('categories').select('*').eq('venue_id', VENUE_ID).eq('is_active', true).order('sort_order'),
      getLayoutTemplates(VENUE_ID), getMenuTemplates(VENUE_ID), getDefaultMenuTemplate(VENUE_ID)
    ])
    if (evRes.data?.length) { setEvents(evRes.data); setSelectedEvent(evRes.data[0]) }
    if (allEvRes.data) setAllEvents(allEvRes.data)
    if (menuRes.data) {
      const unique = []
      const seen = new Set()
      for (const item of menuRes.data) {
        const key = `${item.name}-${item.category_id}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push(item)
        }
      }
      setMenuItems(unique)
    }
    if (catsRes.data) {
      const uniqueCats = []
      const seenCats = new Set()
      for (const cat of catsRes.data) {
        if (!seenCats.has(cat.name)) {
          seenCats.add(cat.name)
          uniqueCats.push(cat)
        }
      }
      setCategories(uniqueCats)
    }
    if (layRes.data) setLayoutTemplates(layRes.data)
    if (menuTRes?.data) setMenuTemplates(menuTRes.data)
    if (defTRes?.data) setDefaultTemplateId(defTRes.data.id)
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
    if (tRes.data) { 
      setEventTables(tRes.data)
      const fT = tRes.data.filter(t => t.zone !== 'back'), bT = tRes.data.filter(t => t.zone === 'back')
      if (fT.length) { setFrontGridRows(Math.max(6, Math.max(...fT.map(t => t.grid_row)) + 2)); setFrontGridCols(Math.max(8, Math.max(...fT.map(t => t.grid_col)) + 2)) }
      if (bT.length) { setBackGridRows(Math.max(6, Math.max(...bT.map(t => t.grid_row)) + 2)); setBackGridCols(Math.max(8, Math.max(...bT.map(t => t.grid_col)) + 2)) }
    }
    if (ewRes.data) setEventWaiters(ewRes.data)
    if (aRes.data) setTableAssignments(aRes.data)
    if (emRes.data) setEventMenu(emRes.data)
    if (lbRes) setLeaderboard(lbRes)
    if (resRes.data) setReservations(resRes.data)
    if (eaRes) setEventAnalytics(eaRes)
  }
  
  const loadAnalytics = async () => { setAnalytics(await getAnalytics(VENUE_ID, analyticsPeriod)) }
  const loadWaiterStats = async (w) => { setSelectedWaiter(w); const g = await getWaiterStats(w.id), e = selectedEvent ? await getWaiterStats(w.id, selectedEvent.id) : { totalSales: 0, totalOrders: 0 }; setWaiterStats({ global: g, event: e }); setShowWaiterStatsModal(true) }

  // EVENT HANDLERS
  const handleCreateEvent = async () => {
    if (!eventForm.name || !eventForm.event_date) return
    const { data } = await createEvent({ ...eventForm, venue_id: VENUE_ID })
    if (data) {
      if (selectedTemplate) await applyLayoutTemplate(selectedTemplate, data.id)
      const templateToApply = selectedMenuTemplate || defaultTemplateId
      if (templateToApply) await applyMenuTemplate(templateToApply, data.id)
      setSelectedEvent(data)
    }
    closeEventModal()
    loadData()
  }
  
  const handleUpdateEvent = async () => { if (!editingEvent || !eventForm.name) return; await updateEvent(editingEvent.id, eventForm); closeEventModal(); loadData() }
  const closeEventModal = () => { setShowEventModal(false); setEditingEvent(null); setSelectedTemplate(null); setSelectedMenuTemplate(null); setEventForm({ name: '', event_date: '', start_time: '22:00', description: '' }) }
  const openEditEvent = (ev) => { setEditingEvent(ev); setEventForm({ name: ev.name, event_date: ev.event_date, start_time: ev.start_time, description: ev.description || '' }); setShowEventModal(true) }
  const handleDeleteEvent = async (e, id) => { e.stopPropagation(); if (!confirm('Ștergi?')) return; await deleteEvent(id); setSelectedEvent(null); loadData() }

  // LAYOUT HANDLERS
  const handleSaveLayout = async () => { if (!layoutName || !eventTables.length) return; await createLayoutTemplate(VENUE_ID, layoutName, eventTables); setLayoutName(''); setShowLayoutModal(false); const { data } = await getLayoutTemplates(VENUE_ID); if (data) setLayoutTemplates(data) }
  const handleDeleteTemplate = async (id) => { if (!confirm('Ștergi?')) return; await deleteLayoutTemplate(id); const { data } = await getLayoutTemplates(VENUE_ID); if (data) setLayoutTemplates(data) }

  // GRID HANDLERS
  const handleCellClick = async (row, col) => { 
    const zT = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
    if (zT.some(t => t.grid_row === row && t.grid_col === col)) return
    const cnt = zT.filter(t => t.table_type === selectedTableType).length + 1
    const pre = selectedTableType === 'vip' ? 'VIP' : selectedTableType === 'bar' ? 'B' : 'M'
    const suf = activeZone === 'back' ? '-S' : ''
    await createEventTable({ event_id: selectedEvent.id, table_number: `${pre}${cnt}${suf}`, table_type: selectedTableType, capacity: selectedTableType === 'vip' ? 8 : selectedTableType === 'bar' ? 2 : 4, min_spend: selectedTableType === 'vip' ? 1500 : selectedTableType === 'bar' ? 0 : 500, grid_row: row, grid_col: col, zone: activeZone })
    loadEventData(selectedEvent.id)
  }
  const handleTableClick = async (e, t) => { e.stopPropagation(); if (confirm(`Ștergi ${t.table_number}?`)) { await deleteEventTable(t.id); loadEventData(selectedEvent.id) } }
  const addRow = () => activeZone === 'front' ? setFrontGridRows(p => p + 1) : setBackGridRows(p => p + 1)
  const addCol = () => activeZone === 'front' ? setFrontGridCols(p => p + 1) : setBackGridCols(p => p + 1)

  // MENU HANDLERS
  const handleCreateProduct = async () => { 
    if (!productForm.name || !productForm.default_price || !productForm.category_id) return
    await createMenuItem({ ...productForm, venue_id: VENUE_ID, default_price: parseFloat(productForm.default_price) })
    closeProductModal()
    loadData()
  }
  
  const handleUpdateProduct = async () => { 
    if (!editingProduct) return
    await updateMenuItem(editingProduct.id, { ...productForm, default_price: parseFloat(productForm.default_price) })
    closeProductModal()
    loadData()
  }
  
  const closeProductModal = () => { 
    setShowProductModal(false)
    setEditingProduct(null)
    setProductForm({ name: '', description: '', default_price: '', category_id: '', product_type: 'cocktail', badge: '', is_available: true })
  }
  
  const openEditProduct = (item) => { 
    setEditingProduct(item)
    setProductForm({ name: item.name, description: item.description || '', default_price: item.default_price, category_id: item.category_id, product_type: item.product_type || 'cocktail', badge: item.badge || '', is_available: item.is_available })
    setShowProductModal(true)
  }
  
  const handleDuplicateProduct = async (id) => { await duplicateMenuItem(id); loadData() }
  const handleToggleStock = async (item) => { await updateMenuItem(item.id, { is_available: !item.is_available }); loadData() }
  const handleDeleteProduct = async (id) => { if (!confirm('Ștergi?')) return; await deleteMenuItem(id); loadData() }
  
  const handleMoveProduct = async (item, direction) => {
    const catItems = menuItems.filter(m => m.category_id === item.category_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const idx = catItems.findIndex(m => m.id === item.id)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= catItems.length) return
    const reordered = [...catItems]
    reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, item)
    await updateMenuItemOrder(reordered)
    loadData()
  }
  
  const handleBulkPrice = async () => {
    const itemsToUpdate = selectMode && selectedItems.size > 0 
      ? menuItems.filter(m => selectedItems.has(m.id))
      : menuItems
    
    for (const item of itemsToUpdate) {
      let nP = bulkPriceChange.type === 'percent' 
        ? item.default_price * (1 + bulkPriceChange.value / 100) 
        : item.default_price + bulkPriceChange.value
      await updateMenuItem(item.id, { default_price: Math.round(nP) })
    }
    setShowBulkPriceModal(false)
    setSelectedItems(new Set())
    loadData()
  }
  
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Ștergi ${selectedItems.size} produse?`)) return
    await bulkDeleteMenuItems(Array.from(selectedItems))
    setSelectedItems(new Set())
    setSelectMode(false)
    loadData()
  }
  
  const handleBulkToggleStock = async (available) => {
    if (selectedItems.size === 0) return
    await bulkUpdateMenuItems(Array.from(selectedItems), { is_available: available })
    setSelectedItems(new Set())
    loadData()
  }
  
  const toggleItemSelection = (id) => {
    const newSet = new Set(selectedItems)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedItems(newSet)
  }
  
  const selectAllInCategory = (catId) => {
    const catItems = menuItems.filter(m => m.category_id === catId)
    const allSelected = catItems.every(m => selectedItems.has(m.id))
    const newSet = new Set(selectedItems)
    if (allSelected) {
      catItems.forEach(m => newSet.delete(m.id))
    } else {
      catItems.forEach(m => newSet.add(m.id))
    }
    setSelectedItems(newSet)
  }

  // CATEGORY HANDLERS
  const handleCreateCategory = async () => { 
    const n = prompt('Nume categorie:')
    if (!n) return
    await createCategory(VENUE_ID, n)
    loadData()
  }
  
  const handleEditCategory = (cat) => {
    setEditingCategory(cat)
    setCategoryName(cat.name)
    setShowCategoryEditModal(true)
  }
  
  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryName) return
    await updateCategoryName(editingCategory.id, categoryName)
    setShowCategoryEditModal(false)
    setEditingCategory(null)
    setCategoryName('')
    loadData()
  }
  
  const handleDeleteCategory = async (id) => { 
    if (menuItems.filter(m => m.category_id === id).length) { 
      alert('Categorie cu produse! Șterge sau mută produsele mai întâi.')
      return 
    }
    if (!confirm('Ștergi?')) return
    await deleteCategory(id)
    loadData()
  }
  
  const openCategoryOrderModal = () => {
    setTempCategoryOrder([...categories])
    setShowCategoryOrderModal(true)
  }
  
  const moveCategoryInOrder = (idx, direction) => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= tempCategoryOrder.length) return
    const newOrder = [...tempCategoryOrder]
    const [moved] = newOrder.splice(idx, 1)
    newOrder.splice(newIdx, 0, moved)
    setTempCategoryOrder(newOrder)
  }
  
  const saveCategoryOrder = async () => {
    await updateCategoryOrder(tempCategoryOrder)
    setShowCategoryOrderModal(false)
    loadData()
  }

  // MENU TEMPLATE HANDLERS
  const handleSaveMenuTemplate = async () => { 
    if (!menuTemplateName) return
    await createMenuTemplate(VENUE_ID, menuTemplateName, menuItems)
    setMenuTemplateName('')
    setShowMenuTemplateModal(false)
    const { data } = await getMenuTemplates(VENUE_ID)
    if (data) setMenuTemplates(data)
  }
  
  const handleDeleteMenuTemplate = async (id) => { 
    if (!confirm('Ștergi?')) return
    await deleteMenuTemplate(id)
    if (defaultTemplateId === id) setDefaultTemplateId(null)
    const { data } = await getMenuTemplates(VENUE_ID)
    if (data) setMenuTemplates(data)
  }
  
  const handleSetDefaultTemplate = async (id) => {
    const newDefault = defaultTemplateId === id ? null : id
    await setDefaultMenuTemplate(VENUE_ID, newDefault)
    setDefaultTemplateId(newDefault)
  }

  // WAITER HANDLERS
  const handleCreateWaiter = async () => { if (!waiterForm.name || !waiterForm.phone) return; await createWaiter({ ...waiterForm, venue_id: VENUE_ID }); setShowWaiterModal(false); setWaiterForm({ name: '', phone: '' }); loadWaiters() }
  const handleDeleteWaiter = async (e, id) => { e.stopPropagation(); if (!confirm('Ștergi?')) return; await deleteWaiter(id); loadWaiters() }
  const handleRestoreWaiter = async (id) => { await restoreWaiter(id); loadWaiters() }
  const handleToggleWaiterEvent = async (wid) => { if (!selectedEvent) return; const isA = eventWaiters.some(ew => ew.waiter_id === wid); isA ? await removeWaiterFromEvent(selectedEvent.id, wid) : await addWaiterToEvent(selectedEvent.id, wid); loadEventData(selectedEvent.id) }
  const handleAssignTable = async (tid, wid) => { await assignTableToWaiter(tid, wid, selectedEvent.id); loadEventData(selectedEvent.id) }

  // RESERVATION HANDLERS
  const handleTableClickForRes = (t) => { 
    const hR = reservations.find(r => r.event_table_id === t.id)
    if (hR) { 
      if (confirm(`Ștergi rezervarea ${t.table_number}?`)) handleDeleteRes(hR.id)
    } else { 
      setSelectedTableForRes(t)
      setReservationForm({ customer_name: '', customer_phone: '', party_size: 2, reservation_time: '22:00', notes: '', is_vip: false })
      setShowReservationModal(true)
    }
  }
  const handleCreateRes = async () => { if (!reservationForm.customer_name || !selectedTableForRes) return; await createReservation({ venue_id: VENUE_ID, event_id: selectedEvent.id, event_table_id: selectedTableForRes.id, ...reservationForm }); setShowReservationModal(false); setSelectedTableForRes(null); loadEventData(selectedEvent.id) }
  const handleDeleteRes = async (id) => { await deleteReservation(id); loadEventData(selectedEvent.id) }

  // CRM HANDLERS
  const handleDeleteCustomer = async (phone) => { if (!confirm('Ștergi clientul?')) return; await supabase.from('orders').update({ customer_phone: null, customer_name: null }).eq('customer_phone', phone); loadCustomers() }

  const getAssignedWaiter = (tid) => tableAssignments.find(a => a.event_table_id === tid)?.waiters
  const getTableRes = (tid) => reservations.find(r => r.event_table_id === tid)

  // STYLES
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
    badge: { fontSize: 9, padding: '2px 6px', borderRadius: 4, marginLeft: 6, textTransform: 'uppercase', fontWeight: 700 },
    checkbox: { width: 20, height: 20, border: `2px solid ${colors.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }
  }

  const TABS = [
    { id: 'overview', icon: '📊', label: 'Stats' },
    { id: 'events', icon: '📅', label: 'Events' },
    { id: 'layout', icon: '🗺️', label: 'Layout' },
    { id: 'reservations', icon: '📋', label: 'Rezervări' },
    { id: 'menu', icon: '🍸', label: 'Meniu' },
    { id: 'qr', icon: '🔗', label: 'QR' },
    { id: 'waiters', icon: '👤', label: 'Staff' },
    { id: 'customers', icon: '👑', label: 'CRM' }
  ]

  if (loading) return (
    <div style={{...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: 40, fontWeight: 300, letterSpacing: 12, color: colors.champagne}}>S I P</div>
        <div style={{fontSize: 12, color: colors.textMuted, marginTop: 16}}>Loading...</div>
      </div>
    </div>
  )

  const curZoneTables = eventTables.filter(t => activeZone === 'front' ? t.zone !== 'back' : t.zone === 'back')
  const curRows = activeZone === 'front' ? frontGridRows : backGridRows
  const curCols = activeZone === 'front' ? frontGridCols : backGridCols

  // RENDER GRID
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
          {Object.entries(TABLE_TYPES).map(([type, cfg]) => (
            <button key={type} onClick={() => setSelectedTableType(type)} style={{ padding: '6px 12px', border: `2px solid ${selectedTableType === type ? cfg.color : colors.border}`, backgroundColor: selectedTableType === type ? `${cfg.color}30` : 'transparent', color: cfg.color, borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>{cfg.label}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowLayoutModal(true)} style={{...s.btnSm, backgroundColor: colors.champagne, color: colors.noir}}>💾 Salvează</button>
        </div>}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${curCols}, ${cellSize}px)`, gap, padding: 10, backgroundColor: colors.noir, border: `1px solid ${colors.border}`, borderRadius: 8, width: 'fit-content' }}>
          {Array.from({ length: curRows }).map((_, row) => Array.from({ length: curCols }).map((_, col) => {
            const t = curZoneTables.find(t => t.grid_row === row && t.grid_col === col)
            if (forRes && !t) return <div key={`${row}-${col}`} style={{ width: cellSize, height: cellSize }} />
            const cfg = t ? TABLE_TYPES[t.table_type] : null
            const hasRes = t && getTableRes(t.id)
            const assigned = t && getAssignedWaiter(t.id)
            return (
              <div key={`${row}-${col}`} onClick={() => forRes ? (t && handleTableClickForRes(t)) : (t ? null : handleCellClick(row, col))} style={{ width: cellSize, height: cellSize, backgroundColor: t ? (hasRes ? `${colors.warning}40` : `${cfg.color}25`) : 'rgba(255,255,255,0.03)', border: `2px solid ${t ? (hasRes ? colors.warning : cfg.color) : 'transparent'}`, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: forRes ? (t ? 'pointer' : 'default') : 'pointer', position: 'relative' }}>
                {t && <>
                  <span style={{ fontSize: 9, fontWeight: 700, color: hasRes ? colors.warning : cfg.color }}>{t.table_number}</span>
                  {hasRes && <span style={{ fontSize: 8, color: colors.warning }}>📋</span>}
                  {!forRes && <button onClick={(e) => handleTableClick(e, t)} style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', border: 'none', backgroundColor: colors.error, color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
                </>}
              </div>
            )
          }))}
        </div>
        {!forRes && <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={addRow} style={{...s.btnSm, backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted}}>+ Rând</button>
          <button onClick={addCol} style={{...s.btnSm, backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted}}>+ Coloană</button>
        </div>}
      </div>
    )
  }

  // RENDER MENU TAB
  const renderMenuTab = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={s.title}>Meniu ({menuItems.length} produse)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setSelectMode(!selectMode)} style={{...s.btnSm, backgroundColor: selectMode ? colors.champagne : 'transparent', color: selectMode ? colors.noir : colors.textMuted, border: `1px solid ${selectMode ? colors.champagne : colors.border}`}}>
            {selectMode ? '✓ Selectare' : '☐ Selectare'}
          </button>
          <button onClick={openCategoryOrderModal} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>📑 Ordine categorii</button>
          <button onClick={handleCreateCategory} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>+ Categorie</button>
          <button onClick={() => setShowMenuTemplateModal(true)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.champagne, border: `1px solid ${colors.champagne}`}}>💾 Salvează</button>
          <button onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', default_price: '', category_id: categories[0]?.id || '', product_type: 'cocktail', badge: '', is_available: true }); setShowProductModal(true) }} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Produs</button>
        </div>
      </div>

      {selectMode && selectedItems.size > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 12, backgroundColor: `${colors.champagne}15`, borderRadius: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: colors.champagne, fontWeight: 600 }}>{selectedItems.size} selectate</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowBulkPriceModal(true)} style={{...s.btnSm, backgroundColor: colors.warning, color: colors.noir}}>💰 Modifică prețuri</button>
          <button onClick={() => handleBulkToggleStock(true)} style={{...s.btnSm, backgroundColor: colors.success, color: '#fff'}}>✓ În stoc</button>
          <button onClick={() => handleBulkToggleStock(false)} style={{...s.btnSm, backgroundColor: colors.textMuted, color: '#fff'}}>✗ Stoc 0</button>
          <button onClick={handleBulkDelete} style={{...s.btnSm, backgroundColor: colors.error, color: '#fff'}}>🗑️ Șterge</button>
          <button onClick={() => { setSelectedItems(new Set()); setSelectMode(false) }} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
        </div>
      )}

      {categories.map(cat => {
        const catItems = menuItems.filter(m => m.category_id === cat.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        const allCatSelected = catItems.length > 0 && catItems.every(m => selectedItems.has(m.id))
        return (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 12px', backgroundColor: `${colors.champagne}10`, borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectMode && (
                  <div onClick={() => selectAllInCategory(cat.id)} style={{...s.checkbox, borderColor: allCatSelected ? colors.champagne : colors.border, backgroundColor: allCatSelected ? colors.champagne : 'transparent'}}>
                    {allCatSelected && <span style={{ color: colors.noir, fontSize: 12 }}>✓</span>}
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.champagne }}>{cat.name}</div>
                <span style={{ fontSize: 11, color: colors.textMuted }}>({catItems.length})</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleEditCategory(cat)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}>✏️</button>
                <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: colors.error, fontSize: 12, cursor: 'pointer', opacity: 0.6 }}>✕</button>
              </div>
            </div>
            
            {catItems.map((item, idx) => (
              <div key={item.id} style={{...s.card, opacity: item.is_available ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectMode && (
                  <div onClick={() => toggleItemSelection(item.id)} style={{...s.checkbox, borderColor: selectedItems.has(item.id) ? colors.champagne : colors.border, backgroundColor: selectedItems.has(item.id) ? colors.champagne : 'transparent'}}>
                    {selectedItems.has(item.id) && <span style={{ color: colors.noir, fontSize: 12 }}>✓</span>}
                  </div>
                )}
                
                {!selectMode && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => handleMoveProduct(item, 'up')} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? colors.border : colors.textMuted, fontSize: 10, cursor: idx === 0 ? 'default' : 'pointer', padding: 2 }}>▲</button>
                    <button onClick={() => handleMoveProduct(item, 'down')} disabled={idx === catItems.length - 1} style={{ background: 'none', border: 'none', color: idx === catItems.length - 1 ? colors.border : colors.textMuted, fontSize: 10, cursor: idx === catItems.length - 1 ? 'default' : 'pointer', padding: 2 }}>▼</button>
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {item.name}
                    {item.badge && <span style={{...s.badge, backgroundColor: item.badge === 'popular' ? colors.error : item.badge === 'premium' ? colors.champagne : item.badge === 'new' ? colors.success : colors.normal, color: item.badge === 'premium' ? colors.noir : '#fff' }}>{item.badge}</span>}
                    {!item.is_available && <span style={{...s.badge, backgroundColor: colors.textMuted }}>STOC 0</span>}
                  </div>
                  {item.description && <div style={{ fontSize: 12, color: colors.textMuted }}>{item.description}</div>}
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{item.product_type || 'other'}</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 15, color: colors.champagne, fontWeight: 500, marginRight: 8 }}>{item.default_price} LEI</div>
                  {!selectMode && <>
                    <button onClick={() => handleToggleStock(item)} style={{...s.btnSm, backgroundColor: 'transparent', color: item.is_available ? colors.success : colors.error, border: `1px solid ${item.is_available ? colors.success : colors.error}`, padding: '4px 8px' }}>{item.is_available ? '✓' : '✗'}</button>
                    <button onClick={() => handleDuplicateProduct(item.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, padding: '4px 8px' }}>📋</button>
                    <button onClick={() => openEditProduct(item)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.champagne, border: `1px solid ${colors.champagne}`, padding: '4px 8px' }}>✏️</button>
                    <button onClick={() => handleDeleteProduct(item.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`, padding: '4px 8px' }}>✕</button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {menuTemplates?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={s.title}>Template-uri meniu</div>
          {menuTemplates.map(t => (
            <div key={t.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.name}
                    {defaultTemplateId === t.id && <span style={{...s.badge, backgroundColor: colors.success, color: '#fff'}}>DEFAULT</span>}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{t.menu_config?.length || 0} produse</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleSetDefaultTemplate(t.id)} style={{...s.btnSm, backgroundColor: defaultTemplateId === t.id ? colors.success : 'transparent', color: defaultTemplateId === t.id ? '#fff' : colors.success, border: `1px solid ${colors.success}`}}>
                  {defaultTemplateId === t.id ? '✓ Default' : '☆ Set Default'}
                </button>
                <button onClick={() => handleDeleteMenuTemplate(t.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  // MAIN RETURN
  return (
    <div style={s.container}>
      <Head><title>S I P - Manager</title></Head>
      
      <header style={s.header}>
        <div style={s.logo}>S I P</div>
        <Link href="/staff" style={{ fontSize: 12, color: colors.textMuted, textDecoration: 'none' }}>Staff →</Link>
      </header>

      <div style={s.tabs}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{...s.tab, color: activeTab === tab.id ? colors.champagne : colors.textMuted, borderColor: activeTab === tab.id ? colors.champagne : 'transparent' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={s.filterRow}>
                {['week', 'month', 'year', 'all'].map(p => (
                  <button key={p} onClick={() => setAnalyticsPeriod(p)} style={{...s.filterBtn, backgroundColor: analyticsPeriod === p ? colors.champagne : 'transparent', color: analyticsPeriod === p ? colors.noir : colors.textMuted}}>{p === 'week' ? '7 zile' : p === 'month' ? '30 zile' : p === 'year' ? '1 an' : 'Total'}</button>
                ))}
              </div>
              <div style={s.statsGrid}>
                <div style={s.stat}><div style={s.statVal}>{analytics.totalRevenue?.toLocaleString() || 0}</div><div style={s.statLbl}>LEI TOTAL</div></div>
                <div style={s.stat}><div style={s.statVal}>{analytics.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div>
                <div style={s.stat}><div style={s.statVal}>{analytics.avgOrderValue || 0}</div><div style={s.statLbl}>MEDIE/COMANDĂ</div></div>
                <div style={s.stat}><div style={s.statVal}>{analytics.uniqueCustomers || 0}</div><div style={s.statLbl}>CLIENȚI</div></div>
              </div>
            </div>
            {selectedEvent && (
              <div>
                <div style={s.title}>{selectedEvent.name}</div>
                <div style={s.statsGrid}>
                  <div style={s.stat}><div style={s.statVal}>{eventAnalytics.totalRevenue?.toLocaleString() || 0}</div><div style={s.statLbl}>LEI</div></div>
                  <div style={s.stat}><div style={s.statVal}>{eventAnalytics.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div>
                  <div style={s.stat}><div style={s.statVal}>{eventTables.length}</div><div style={s.statLbl}>MESE</div></div>
                  <div style={s.stat}><div style={s.statVal}>{reservations.length}</div><div style={s.statLbl}>REZERVĂRI</div></div>
                </div>
                {leaderboard.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={s.title}>Top Staff</div>
                    {leaderboard.slice(0, 5).map((w, i) => (
                      <div key={w.id} style={{...s.card, display: 'flex', alignItems: 'center', gap: 12}}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: i === 0 ? colors.champagne : colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? colors.noir : colors.textMuted }}>{i + 1}</div>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{w.name}</div><div style={{ fontSize: 11, color: colors.textMuted }}>{w.orderCount} comenzi</div></div>
                        <div style={{ color: colors.champagne, fontWeight: 500 }}>{w.totalSales?.toLocaleString()} LEI</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'events' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.title}>Evenimente</div>
              <button onClick={() => setShowEventModal(true)} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Event</button>
            </div>
            {events.map(ev => (
              <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{...s.card, border: `1px solid ${selectedEvent?.id === ev.id ? colors.champagne : colors.border}`, cursor: 'pointer'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{ev.event_date} • {ev.start_time}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={(e) => { e.stopPropagation(); openEditEvent(ev) }} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.champagne, border: `1px solid ${colors.champagne}`}}>✏️</button>
                    <button onClick={(e) => handleDeleteEvent(e, ev.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button>
                  </div>
                </div>
              </div>
            ))}
            {allEvents.filter(e => !events.find(ev => ev.id === e.id)).length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={s.title}>Evenimente trecute</div>
                {allEvents.filter(e => !events.find(ev => ev.id === e.id)).slice(0, 10).map(ev => (
                  <div key={ev.id} style={{...s.card, opacity: 0.6}}>
                    <div style={{ fontWeight: 500 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{ev.event_date}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'layout' && selectedEvent && (
          <>
            <div style={s.title}>Layout: {selectedEvent.name}</div>
            {renderGrid(false)}
            {layoutTemplates.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={s.title}>Template-uri salvate</div>
                {layoutTemplates.map(t => (
                  <div key={t.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div><div style={{ fontWeight: 500 }}>{t.name}</div><div style={{ fontSize: 11, color: colors.textMuted }}>{t.table_config?.length || 0} mese</div></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={async () => { await applyLayoutTemplate(t.id, selectedEvent.id); loadEventData(selectedEvent.id) }} style={{...s.btnSm, backgroundColor: colors.champagne, color: colors.noir}}>Aplică</button>
                      <button onClick={() => handleDeleteTemplate(t.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'reservations' && selectedEvent && (
          <>
            <div style={s.title}>Rezervări: {selectedEvent.name}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Click pe o masă pentru a adăuga/șterge rezervare</div>
            {renderGrid(true)}
            {reservations.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={s.title}>Lista rezervări ({reservations.length})</div>
                {reservations.map(r => {
                  const t = eventTables.find(t => t.id === r.event_table_id)
                  return (
                    <div key={r.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.customer_name} {r.is_vip && <span style={{...s.badge, backgroundColor: colors.champagne, color: colors.noir}}>VIP</span>}</div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{t?.table_number} • {r.party_size} pers • {r.reservation_time}</div>
                        {r.notes && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{r.notes}</div>}
                      </div>
                      <button onClick={() => handleDeleteRes(r.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'menu' && renderMenuTab()}

        {activeTab === 'qr' && selectedEvent && (
          <>
            <div style={s.title}>QR Codes: {selectedEvent.name}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Link-uri pentru meniuri pe mese</div>
            {eventTables.map(t => (
              <div key={t.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{ fontWeight: 500 }}>{t.table_number}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>/order/{selectedEvent.id}/{t.id}</div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/order/${selectedEvent.id}/${t.id}`)} style={{...s.btnSm, backgroundColor: colors.champagne, color: colors.noir}}>📋 Copy</button>
              </div>
            ))}
          </>
        )}

        {activeTab === 'waiters' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.title}>Staff</div>
              <button onClick={() => setShowWaiterModal(true)} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>+ Ospătar</button>
            </div>
            <div style={s.filterRow}>
              {['active', 'deleted', 'all'].map(f => (
                <button key={f} onClick={() => setWaiterFilter(f)} style={{...s.filterBtn, backgroundColor: waiterFilter === f ? colors.champagne : 'transparent', color: waiterFilter === f ? colors.noir : colors.textMuted}}>{f === 'active' ? 'Activi' : f === 'deleted' ? 'Șterși' : 'Toți'}</button>
              ))}
            </div>
            {waiters.map(w => (
              <div key={w.id} onClick={() => loadWaiterStats(w)} style={{...s.card, cursor: 'pointer', opacity: w.is_active ? 1 : 0.5}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{w.phone}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {selectedEvent && (
                      <button onClick={(e) => { e.stopPropagation(); handleToggleWaiterEvent(w.id) }} style={{...s.btnSm, backgroundColor: eventWaiters.some(ew => ew.waiter_id === w.id) ? colors.success : 'transparent', color: eventWaiters.some(ew => ew.waiter_id === w.id) ? '#fff' : colors.textMuted, border: `1px solid ${eventWaiters.some(ew => ew.waiter_id === w.id) ? colors.success : colors.border}`}}>
                        {eventWaiters.some(ew => ew.waiter_id === w.id) ? '✓ Activ' : 'Adaugă'}
                      </button>
                    )}
                    {w.is_active ? (
                      <button onClick={(e) => handleDeleteWaiter(e, w.id)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleRestoreWaiter(w.id) }} style={{...s.btnSm, backgroundColor: colors.success, color: '#fff'}}>↩️</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'customers' && (
          <>
            <div style={s.title}>Clienți ({customers.length})</div>
            <div style={s.filterRow}>
              {['all', 'week', 'month'].map(p => (
                <button key={p} onClick={() => setCustomerFilter({...customerFilter, period: p})} style={{...s.filterBtn, backgroundColor: customerFilter.period === p ? colors.champagne : 'transparent', color: customerFilter.period === p ? colors.noir : colors.textMuted}}>{p === 'all' ? 'Toți' : p === 'week' ? '7 zile' : '30 zile'}</button>
              ))}
            </div>
            {customers.map(c => (
              <div key={c.phone} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.name || 'Anonim'} {c.vipLevel > 0 && <span style={{...s.badge, backgroundColor: colors.champagne, color: colors.noir}}>VIP {c.vipLevel}</span>}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{c.phone}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{c.orderCount} comenzi • {c.totalSpent?.toLocaleString()} LEI</div>
                  </div>
                  <button onClick={() => handleDeleteCustomer(c.phone)} style={{...s.btnSm, backgroundColor: 'transparent', color: colors.error, border: `1px solid ${colors.error}`}}>✕</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* MODALS */}
      
      {/* Event Modal */}
      {showEventModal && (
        <div style={s.modal} onClick={closeEventModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{editingEvent ? 'Editează' : 'Eveniment nou'}</span>
              <button onClick={closeEventModal} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label>
              <input value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} style={s.input} placeholder="Vineri Seara" />
              <label style={s.label}>Data</label>
              <input type="date" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} style={s.input} />
              <label style={s.label}>Ora start</label>
              <input type="time" value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time: e.target.value})} style={s.input} />
              {!editingEvent && layoutTemplates.length > 0 && (
                <>
                  <label style={s.label}>Template Layout</label>
                  <select value={selectedTemplate || ''} onChange={e => setSelectedTemplate(e.target.value || null)} style={s.select}>
                    <option value="">Fără layout</option>
                    {layoutTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </>
              )}
              {!editingEvent && menuTemplates.length > 0 && (
                <>
                  <label style={s.label}>Template Meniu</label>
                  <select value={selectedMenuTemplate || ''} onChange={e => setSelectedMenuTemplate(e.target.value || null)} style={s.select}>
                    <option value="">{defaultTemplateId ? 'Default' : 'Fără meniu'}</option>
                    {menuTemplates.map(t => <option key={t.id} value={t.id}>{t.name} {defaultTemplateId === t.id ? '(default)' : ''}</option>)}
                  </select>
                </>
              )}
            </div>
            <div style={s.modalFoot}>
              <button onClick={closeEventModal} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>{editingEvent ? 'Salvează' : 'Creează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Waiter Modal */}
      {showWaiterModal && (
        <div style={s.modal} onClick={() => setShowWaiterModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Ospătar nou</span>
              <button onClick={() => setShowWaiterModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label>
              <input value={waiterForm.name} onChange={e => setWaiterForm({...waiterForm, name: e.target.value})} style={s.input} placeholder="Ion Popescu" />
              <label style={s.label}>Telefon</label>
              <input value={waiterForm.phone} onChange={e => setWaiterForm({...waiterForm, phone: e.target.value})} style={s.input} placeholder="0712345678" />
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowWaiterModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleCreateWaiter} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Adaugă</button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {showReservationModal && selectedTableForRes && (
        <div style={s.modal} onClick={() => setShowReservationModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Rezervare: {selectedTableForRes.table_number}</span>
              <button onClick={() => setShowReservationModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume client</label>
              <input value={reservationForm.customer_name} onChange={e => setReservationForm({...reservationForm, customer_name: e.target.value})} style={s.input} placeholder="Ion Popescu" />
              <label style={s.label}>Telefon</label>
              <input value={reservationForm.customer_phone} onChange={e => setReservationForm({...reservationForm, customer_phone: e.target.value})} style={s.input} placeholder="0712345678" />
              <label style={s.label}>Nr. persoane</label>
              <input type="number" value={reservationForm.party_size} onChange={e => setReservationForm({...reservationForm, party_size: parseInt(e.target.value)})} style={s.input} />
              <label style={s.label}>Ora</label>
              <input type="time" value={reservationForm.reservation_time} onChange={e => setReservationForm({...reservationForm, reservation_time: e.target.value})} style={s.input} />
              <label style={s.label}>Note</label>
              <input value={reservationForm.notes} onChange={e => setReservationForm({...reservationForm, notes: e.target.value})} style={s.input} placeholder="Note speciale..." />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={reservationForm.is_vip} onChange={e => setReservationForm({...reservationForm, is_vip: e.target.checked})} />
                <span style={{ fontSize: 13, color: colors.textMuted }}>Client VIP</span>
              </label>
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowReservationModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleCreateRes} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Rezervă</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div style={s.modal} onClick={closeProductModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{editingProduct ? 'Editează produs' : 'Produs nou'}</span>
              <button onClick={closeProductModal} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label>
              <input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} style={s.input} placeholder="Mojito" />
              <label style={s.label}>Descriere</label>
              <input value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} style={s.input} placeholder="Rom, mentă, lime..." />
              <label style={s.label}>Preț (LEI)</label>
              <input type="number" value={productForm.default_price} onChange={e => setProductForm({...productForm, default_price: e.target.value})} style={s.input} placeholder="45" />
              <label style={s.label}>Categorie</label>
              <select value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})} style={s.select}>
                <option value="">Selectează...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label style={s.label}>Tip</label>
              <select value={productForm.product_type} onChange={e => setProductForm({...productForm, product_type: e.target.value})} style={s.select}>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label style={s.label}>Badge</label>
              <select value={productForm.badge} onChange={e => setProductForm({...productForm, badge: e.target.value})} style={s.select}>
                <option value="">Fără</option>
                {BADGES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={s.modalFoot}>
              <button onClick={closeProductModal} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={editingProduct ? handleUpdateProduct : handleCreateProduct} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>{editingProduct ? 'Salvează' : 'Adaugă'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Layout Save Modal */}
      {showLayoutModal && (
        <div style={s.modal} onClick={() => setShowLayoutModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Salvează Layout</span>
              <button onClick={() => setShowLayoutModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label>
              <input value={layoutName} onChange={e => setLayoutName(e.target.value)} style={s.input} placeholder="Layout Principal" />
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowLayoutModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleSaveLayout} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Template Save Modal */}
      {showMenuTemplateModal && (
        <div style={s.modal} onClick={() => setShowMenuTemplateModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Salvează Meniu</span>
              <button onClick={() => setShowMenuTemplateModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ textAlign: 'center', padding: 16, marginBottom: 16, backgroundColor: `${colors.champagne}15`, borderRadius: 8 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: colors.champagne }}>{menuItems.length}</div>
                <div style={{ fontSize: 12, color: colors.textMuted }}>produse</div>
              </div>
              <label style={s.label}>Nume</label>
              <input value={menuTemplateName} onChange={e => setMenuTemplateName(e.target.value)} style={s.input} placeholder="Meniu Standard" />
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowMenuTemplateModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleSaveMenuTemplate} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Modal */}
      {showBulkPriceModal && (
        <div style={s.modal} onClick={() => setShowBulkPriceModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Modifică prețurile</span>
              <button onClick={() => setShowBulkPriceModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ textAlign: 'center', padding: 12, marginBottom: 16, backgroundColor: `${colors.warning}15`, borderRadius: 8 }}>
                <div style={{ fontSize: 14, color: colors.warning }}>
                  {selectMode && selectedItems.size > 0 
                    ? `Se vor modifica ${selectedItems.size} produse selectate`
                    : `Se vor modifica toate cele ${menuItems.length} produse`
                  }
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setBulkPriceChange({...bulkPriceChange, type: 'percent'})} style={{...s.btn, backgroundColor: bulkPriceChange.type === 'percent' ? colors.champagne : 'transparent', color: bulkPriceChange.type === 'percent' ? colors.noir : colors.textMuted, border: `1px solid ${colors.border}`}}>Procent %</button>
                <button onClick={() => setBulkPriceChange({...bulkPriceChange, type: 'fixed'})} style={{...s.btn, backgroundColor: bulkPriceChange.type === 'fixed' ? colors.champagne : 'transparent', color: bulkPriceChange.type === 'fixed' ? colors.noir : colors.textMuted, border: `1px solid ${colors.border}`}}>Fix LEI</button>
              </div>
              <label style={s.label}>{bulkPriceChange.type === 'percent' ? 'Procent (ex: 10 = +10%, -10 = -10%)' : 'Sumă (ex: 5 = +5 LEI, -5 = -5 LEI)'}</label>
              <input type="number" value={bulkPriceChange.value} onChange={e => setBulkPriceChange({...bulkPriceChange, value: parseFloat(e.target.value) || 0})} style={s.input} />
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowBulkPriceModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleBulkPrice} style={{...s.btn, backgroundColor: colors.warning, color: colors.noir}}>Aplică</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Order Modal */}
      {showCategoryOrderModal && (
        <div style={s.modal} onClick={() => setShowCategoryOrderModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Ordine categorii</span>
              <button onClick={() => setShowCategoryOrderModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              {tempCategoryOrder.map((cat, idx) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, backgroundColor: colors.noir, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => moveCategoryInOrder(idx, 'up')} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? colors.border : colors.champagne, fontSize: 14, cursor: idx === 0 ? 'default' : 'pointer', padding: 2 }}>▲</button>
                    <button onClick={() => moveCategoryInOrder(idx, 'down')} disabled={idx === tempCategoryOrder.length - 1} style={{ background: 'none', border: 'none', color: idx === tempCategoryOrder.length - 1 ? colors.border : colors.champagne, fontSize: 14, cursor: idx === tempCategoryOrder.length - 1 ? 'default' : 'pointer', padding: 2 }}>▼</button>
                  </div>
                  <span style={{ flex: 1, fontWeight: 500 }}>{cat.name}</span>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>{menuItems.filter(m => m.category_id === cat.id).length} produse</span>
                </div>
              ))}
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowCategoryOrderModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={saveCategoryOrder} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {showCategoryEditModal && editingCategory && (
        <div style={s.modal} onClick={() => setShowCategoryEditModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Editează categorie</span>
              <button onClick={() => setShowCategoryEditModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Nume</label>
              <input value={categoryName} onChange={e => setCategoryName(e.target.value)} style={s.input} />
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowCategoryEditModal(false)} style={{...s.btn, backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`}}>Anulează</button>
              <button onClick={handleUpdateCategory} style={{...s.btn, backgroundColor: colors.champagne, color: colors.noir}}>Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* Waiter Stats Modal */}
      {showWaiterStatsModal && selectedWaiter && (
        <div style={s.modal} onClick={() => setShowWaiterStatsModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>📊 {selectedWaiter.name}</span>
              <button onClick={() => setShowWaiterStatsModal(false)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 12 }}>TOTAL</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={s.stat}><div style={s.statVal}>{waiterStats.global?.totalSales?.toLocaleString() || 0}</div><div style={s.statLbl}>LEI</div></div>
                  <div style={s.stat}><div style={s.statVal}>{waiterStats.global?.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div>
                </div>
              </div>
              {selectedEvent && (
                <div>
                  <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 2, marginBottom: 12 }}>{selectedEvent.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={s.stat}><div style={s.statVal}>{waiterStats.event?.totalSales?.toLocaleString() || 0}</div><div style={s.statLbl}>LEI</div></div>
                    <div style={s.stat}><div style={s.statVal}>{waiterStats.event?.totalOrders || 0}</div><div style={s.statLbl}>COMENZI</div></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
