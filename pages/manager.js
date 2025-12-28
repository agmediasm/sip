import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, getCustomers, getEvents, createEvent, deleteEvent, getEventTables, createEventTable, updateEventTable, deleteEventTable, getWaiters, createWaiter, getEventWaiters, addWaiterToEvent, removeWaiterFromEvent, getTableAssignments, assignTableToWaiter } from '../lib/supabase'

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

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('events')
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventTables, setEventTables] = useState([])
  const [waiters, setWaiters] = useState([])
  const [eventWaiters, setEventWaiters] = useState([])
  const [tableAssignments, setTableAssignments] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [showEventModal, setShowEventModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  
  const [eventForm, setEventForm] = useState({ name: '', event_date: '', start_time: '22:00', description: '' })
  const [tableForm, setTableForm] = useState({ table_number: '', zone: 'main', capacity: 4, min_spend: 0, position_x: 50, position_y: 50, shape: 'circle' })
  const [waiterForm, setWaiterForm] = useState({ name: '', phone: '' })

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedEvent) loadEventData(selectedEvent.id) }, [selectedEvent])

  const loadData = async () => {
    setLoading(true)
    const [eventsRes, waitersRes, customersRes] = await Promise.all([getEvents(VENUE_ID), getWaiters(VENUE_ID), getCustomers(20)])
    if (eventsRes.data) { setEvents(eventsRes.data); if (eventsRes.data.length > 0 && !selectedEvent) setSelectedEvent(eventsRes.data[0]) }
    if (waitersRes.data) setWaiters(waitersRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    setLoading(false)
  }

  const loadEventData = async (eventId) => {
    const [tablesRes, eventWaitersRes, assignmentsRes] = await Promise.all([getEventTables(eventId), getEventWaiters(eventId), getTableAssignments(eventId)])
    if (tablesRes.data) setEventTables(tablesRes.data)
    if (eventWaitersRes.data) setEventWaiters(eventWaitersRes.data)
    if (assignmentsRes.data) setTableAssignments(assignmentsRes.data)
  }

  const handleCreateEvent = async () => {
    if (!eventForm.name || !eventForm.event_date) return
    await createEvent({ ...eventForm, venue_id: VENUE_ID })
    setShowEventModal(false)
    setEventForm({ name: '', event_date: '', start_time: '22:00', description: '' })
    loadData()
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Ștergi acest eveniment?')) return
    await deleteEvent(eventId)
    setSelectedEvent(null)
    loadData()
  }

  const handleCreateTable = async () => {
    if (!tableForm.table_number || !selectedEvent) return
    await createEventTable({ ...tableForm, event_id: selectedEvent.id })
    setShowTableModal(false)
    setTableForm({ table_number: '', zone: 'main', capacity: 4, min_spend: 0, position_x: 50, position_y: 50, shape: 'circle' })
    loadEventData(selectedEvent.id)
  }

  const handleUpdateTable = async () => {
    if (!editingTable) return
    await updateEventTable(editingTable.id, tableForm)
    setEditingTable(null)
    setShowTableModal(false)
    loadEventData(selectedEvent.id)
  }

  const handleDeleteTable = async (tableId) => {
    if (!confirm('Ștergi această masă?')) return
    await deleteEventTable(tableId)
    loadEventData(selectedEvent.id)
  }

  const openEditTable = (table) => {
    setEditingTable(table)
    setTableForm({ table_number: table.table_number, zone: table.zone, capacity: table.capacity, min_spend: table.min_spend || 0, position_x: table.position_x, position_y: table.position_y, shape: table.shape })
    setShowTableModal(true)
  }

  const handleCreateWaiter = async () => {
    if (!waiterForm.name || !waiterForm.phone) return
    await createWaiter({ ...waiterForm, venue_id: VENUE_ID })
    setShowWaiterModal(false)
    setWaiterForm({ name: '', phone: '' })
    loadData()
  }

  const handleAddWaiterToEvent = async (waiterId) => { if (selectedEvent) { await addWaiterToEvent(selectedEvent.id, waiterId); loadEventData(selectedEvent.id) } }
  const handleRemoveWaiterFromEvent = async (waiterId) => { if (selectedEvent) { await removeWaiterFromEvent(selectedEvent.id, waiterId); loadEventData(selectedEvent.id) } }
  const handleAssignTable = async (tableId, waiterId) => { if (selectedEvent) { await assignTableToWaiter(tableId, waiterId, selectedEvent.id); loadEventData(selectedEvent.id) } }
  const getAssignedWaiter = (tableId) => { const a = tableAssignments.find(a => a.event_table_id === tableId); return a?.waiters || null }

  const s = {
    container: { minHeight: '100vh', backgroundColor: colors.noir, color: colors.ivory, fontFamily: "'Helvetica Neue', sans-serif" },
    header: { backgroundColor: colors.onyx, borderBottom: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 },
    logoText: { fontSize: '18px', fontWeight: '300', letterSpacing: '6px', color: colors.champagne },
    tabs: { display: 'flex', gap: '0', padding: '0 16px', borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' },
    tab: { padding: '14px 16px', border: 'none', backgroundColor: 'transparent', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    content: { padding: '16px' },
    sectionTitle: { fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: colors.textMuted, marginBottom: '12px' },
    btn: { padding: '10px 16px', border: 'none', fontSize: '11px', fontWeight: '400', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    card: { backgroundColor: colors.onyx, border: `1px solid ${colors.border}`, padding: '16px', marginBottom: '12px' },
    input: { width: '100%', padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.ivory, fontSize: '14px', marginBottom: '12px', outline: 'none' },
    select: { width: '100%', padding: '12px', border: `1px solid ${colors.border}`, backgroundColor: colors.onyx, color: colors.ivory, fontSize: '14px', marginBottom: '12px' },
    label: { display: 'block', fontSize: '10px', color: colors.textMuted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' },
    modal: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    modalContent: { backgroundColor: colors.onyx, width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' },
    modalBody: { padding: '16px' },
    modalFooter: { padding: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    layoutContainer: { position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: colors.noir, border: `1px solid ${colors.border}`, marginBottom: '16px', overflow: 'hidden' },
    tableNode: { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: '500' },
    badge: { padding: '4px 8px', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' },
  }

  if (loading) return <div style={{...s.container, display:'flex', alignItems:'center', justifyContent:'center'}}><div style={{textAlign:'center'}}><div style={{fontSize:'32px', fontWeight:'300', letterSpacing:'12px', color:colors.champagne}}>S I P</div><div style={{fontSize:'11px', letterSpacing:'2px', color:colors.textMuted, marginTop:'16px'}}>Loading...</div></div></div>

  return (
    <div style={s.container}>
      <Head><title>S I P - Manager</title></Head>
      <header style={s.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <Link href="/" style={{textDecoration:'none'}}><div style={s.logoText}>S I P</div></Link>
          <span style={{color:colors.textMuted, fontSize:'11px'}}>Manager</span>
        </div>
      </header>

      <div style={s.tabs}>
        {['events','layout','waiters','customers'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{...s.tab, color: activeTab===tab ? colors.champagne : colors.textMuted, borderBottomColor: activeTab===tab ? colors.champagne : 'transparent'}}>
            {tab==='events' ? '📅 Evenimente' : tab==='layout' ? '🗺️ Layout' : tab==='waiters' ? '👤 Ospătari' : '👑 Clienți'}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {/* EVENTS */}
        {activeTab==='events' && <>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <div style={s.sectionTitle}>Evenimente viitoare</div>
            <button onClick={() => setShowEventModal(true)} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>+ Eveniment</button>
          </div>
          {events.length===0 ? <div style={{textAlign:'center', padding:'48px', color:colors.textMuted}}>Niciun eveniment</div> : events.map(ev => (
            <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{...s.card, borderColor: selectedEvent?.id===ev.id ? colors.champagne : colors.border, cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:'16px', fontWeight:'400', marginBottom:'4px'}}>{ev.name}</div>
                  <div style={{fontSize:'12px', color:colors.textMuted}}>📅 {new Date(ev.event_date).toLocaleDateString('ro-RO',{weekday:'short', day:'numeric', month:'short'})} • 🕐 {ev.start_time}</div>
                </div>
                <button onClick={(e) => {e.stopPropagation(); handleDeleteEvent(ev.id)}} style={{...s.btn, background:'transparent', color:colors.error, padding:'8px'}}>✕</button>
              </div>
            </div>
          ))}
        </>}

        {/* LAYOUT */}
        {activeTab==='layout' && <>
          {!selectedEvent ? <div style={{textAlign:'center', padding:'48px', color:colors.textMuted}}>Selectează un eveniment</div> : <>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'8px'}}>
              <div><div style={s.sectionTitle}>{selectedEvent.name}</div><div style={{fontSize:'12px', color:colors.textMuted}}>{eventTables.length} mese</div></div>
              <button onClick={() => {setEditingTable(null); setTableForm({table_number:'', zone:'main', capacity:4, min_spend:0, position_x:50, position_y:50, shape:'circle'}); setShowTableModal(true)}} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>+ Masă</button>
            </div>
            <div style={s.layoutContainer}>
              <div style={{position:'absolute', top:'2%', left:'25%', width:'50%', height:'8%', backgroundColor:'rgba(212,175,55,0.1)', border:`1px dashed ${colors.champagne}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:colors.champagne, letterSpacing:'2px'}}>STAGE</div>
              {eventTables.map(t => {
                const zc = t.zone==='vip' ? colors.vip : t.zone==='bar' ? colors.bar : colors.main
                const res = t.status==='reserved' || t.reservations?.length>0
                const aw = getAssignedWaiter(t.id)
                return <div key={t.id} onClick={() => openEditTable(t)} style={{...s.tableNode, left:`${t.position_x}%`, top:`${t.position_y}%`, transform:'translate(-50%,-50%)', width: t.shape==='rectangle' ? '60px' : '44px', height:'44px', borderRadius: t.shape==='circle' ? '50%' : '4px', backgroundColor: res ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border:`2px solid ${res ? colors.error : zc}`, color: res ? colors.error : zc}}>
                  <span style={{fontWeight:'600'}}>{t.table_number}</span>
                  <span style={{fontSize:'8px', opacity:0.7}}>{t.capacity}p</span>
                </div>
              })}
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:'8px'}}>
              {eventTables.map(t => <div key={t.id} style={{...s.card, padding:'10px', cursor:'pointer', textAlign:'center'}} onClick={() => openEditTable(t)}>
                <div style={{fontWeight:'500', marginBottom:'2px'}}>{t.table_number}</div>
                <div style={{fontSize:'10px', color: t.zone==='vip' ? colors.vip : t.zone==='bar' ? colors.bar : colors.main}}>{t.zone.toUpperCase()}</div>
              </div>)}
            </div>
          </>}
        </>}

        {/* WAITERS */}
        {activeTab==='waiters' && <>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <div style={s.sectionTitle}>Ospătari</div>
            <button onClick={() => setShowWaiterModal(true)} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>+ Ospătar</button>
          </div>
          {waiters.map(w => {
            const assigned = eventWaiters.some(ew => ew.waiter_id===w.id)
            return <div key={w.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px'}}>
              <div><div style={{fontWeight:'400'}}>{w.name}</div><div style={{fontSize:'11px', color:colors.textMuted}}>{w.phone}</div></div>
              {selectedEvent && <button onClick={() => assigned ? handleRemoveWaiterFromEvent(w.id) : handleAddWaiterToEvent(w.id)} style={{...s.btn, backgroundColor: assigned ? colors.success : 'transparent', color: assigned ? 'white' : colors.textMuted, border:`1px solid ${assigned ? colors.success : colors.border}`}}>{assigned ? '✓' : '+'}</button>}
            </div>
          })}
          {selectedEvent && eventWaiters.length>0 && <>
            <div style={{...s.sectionTitle, marginTop:'24px'}}>Atribuire mese</div>
            {eventTables.map(t => {
              const aw = getAssignedWaiter(t.id)
              return <div key={t.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px'}}>
                <span style={{fontWeight:'500'}}>{t.table_number}</span>
                <select value={aw?.id || ''} onChange={(e) => handleAssignTable(t.id, e.target.value)} style={{...s.select, width:'auto', marginBottom:0, padding:'8px'}}>
                  <option value="">-</option>
                  {eventWaiters.map(ew => <option key={ew.waiter_id} value={ew.waiter_id}>{ew.waiters?.name}</option>)}
                </select>
              </div>
            })}
          </>}
        </>}

        {/* CUSTOMERS */}
        {activeTab==='customers' && <>
          <div style={s.sectionTitle}>👑 Top Clienți</div>
          {customers.map((c,i) => <div key={c.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <div style={{width:'28px', height:'28px', backgroundColor: i<3 ? 'rgba(212,175,55,0.2)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', color: i<3 ? colors.champagne : colors.textMuted, fontSize:'11px'}}>{i<3 ? '👑' : `#${i+1}`}</div>
              <div><div style={{fontWeight:'400', fontSize:'14px'}}>{c.name}</div><div style={{fontSize:'11px', color:colors.textMuted}}>{c.visit_count} vizite</div></div>
            </div>
            <div style={{color:colors.champagne, fontWeight:'400'}}>{c.total_spent?.toLocaleString()} LEI</div>
          </div>)}
        </>}
      </div>

      {/* EVENT MODAL */}
      {showEventModal && <div style={s.modal} onClick={() => setShowEventModal(false)}><div style={s.modalContent} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}><h3 style={{fontSize:'14px', letterSpacing:'2px', textTransform:'uppercase', margin:0}}>Eveniment Nou</h3><button onClick={() => setShowEventModal(false)} style={{...s.btn, padding:'4px', background:'transparent', color:colors.textMuted}}>✕</button></div>
        <div style={s.modalBody}>
          <label style={s.label}>Nume</label><input type="text" value={eventForm.name} onChange={e => setEventForm({...eventForm, name:e.target.value})} placeholder="Ex: NYE Party" style={s.input} />
          <label style={s.label}>Data</label><input type="date" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date:e.target.value})} style={s.input} />
          <label style={s.label}>Ora</label><input type="time" value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time:e.target.value})} style={s.input} />
          <label style={s.label}>Descriere</label><input type="text" value={eventForm.description} onChange={e => setEventForm({...eventForm, description:e.target.value})} style={s.input} />
        </div>
        <div style={s.modalFooter}><button onClick={() => setShowEventModal(false)} style={{...s.btn, background:'transparent', color:colors.textMuted, border:`1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateEvent} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>Creează</button></div>
      </div></div>}

      {/* TABLE MODAL */}
      {showTableModal && <div style={s.modal} onClick={() => {setShowTableModal(false); setEditingTable(null)}}><div style={s.modalContent} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}><h3 style={{fontSize:'14px', letterSpacing:'2px', textTransform:'uppercase', margin:0}}>{editingTable ? 'Editează' : 'Masă Nouă'}</h3><button onClick={() => {setShowTableModal(false); setEditingTable(null)}} style={{...s.btn, padding:'4px', background:'transparent', color:colors.textMuted}}>✕</button></div>
        <div style={s.modalBody}>
          <label style={s.label}>Număr</label><input type="text" value={tableForm.table_number} onChange={e => setTableForm({...tableForm, table_number:e.target.value})} placeholder="VIP 1" style={s.input} />
          <label style={s.label}>Zonă</label><select value={tableForm.zone} onChange={e => setTableForm({...tableForm, zone:e.target.value})} style={s.select}><option value="vip">VIP</option><option value="main">Principal</option><option value="bar">Bar</option></select>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <div><label style={s.label}>Capacitate</label><input type="number" value={tableForm.capacity} onChange={e => setTableForm({...tableForm, capacity:parseInt(e.target.value)||4})} style={s.input} /></div>
            <div><label style={s.label}>Min spend</label><input type="number" value={tableForm.min_spend} onChange={e => setTableForm({...tableForm, min_spend:parseInt(e.target.value)||0})} style={s.input} /></div>
          </div>
          <label style={s.label}>Formă</label><select value={tableForm.shape} onChange={e => setTableForm({...tableForm, shape:e.target.value})} style={s.select}><option value="circle">Cerc</option><option value="rectangle">Dreptunghi</option><option value="square">Pătrat</option></select>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <div><label style={s.label}>X: {tableForm.position_x}%</label><input type="range" min="5" max="95" value={tableForm.position_x} onChange={e => setTableForm({...tableForm, position_x:parseInt(e.target.value)})} style={{width:'100%'}} /></div>
            <div><label style={s.label}>Y: {tableForm.position_y}%</label><input type="range" min="10" max="90" value={tableForm.position_y} onChange={e => setTableForm({...tableForm, position_y:parseInt(e.target.value)})} style={{width:'100%'}} /></div>
          </div>
        </div>
        <div style={s.modalFooter}>
          {editingTable && <button onClick={() => handleDeleteTable(editingTable.id)} style={{...s.btn, background:'transparent', color:colors.error, border:`1px solid ${colors.error}`, marginRight:'auto'}}>Șterge</button>}
          <button onClick={() => {setShowTableModal(false); setEditingTable(null)}} style={{...s.btn, background:'transparent', color:colors.textMuted, border:`1px solid ${colors.border}`}}>Anulează</button>
          <button onClick={editingTable ? handleUpdateTable : handleCreateTable} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>{editingTable ? 'Salvează' : 'Adaugă'}</button>
        </div>
      </div></div>}

      {/* WAITER MODAL */}
      {showWaiterModal && <div style={s.modal} onClick={() => setShowWaiterModal(false)}><div style={s.modalContent} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}><h3 style={{fontSize:'14px', letterSpacing:'2px', textTransform:'uppercase', margin:0}}>Ospătar Nou</h3><button onClick={() => setShowWaiterModal(false)} style={{...s.btn, padding:'4px', background:'transparent', color:colors.textMuted}}>✕</button></div>
        <div style={s.modalBody}>
          <label style={s.label}>Nume</label><input type="text" value={waiterForm.name} onChange={e => setWaiterForm({...waiterForm, name:e.target.value})} placeholder="Alexandru Pop" style={s.input} />
          <label style={s.label}>Telefon</label><input type="tel" value={waiterForm.phone} onChange={e => setWaiterForm({...waiterForm, phone:e.target.value})} placeholder="07XX XXX XXX" style={s.input} />
        </div>
        <div style={s.modalFooter}><button onClick={() => setShowWaiterModal(false)} style={{...s.btn, background:'transparent', color:colors.textMuted, border:`1px solid ${colors.border}`}}>Anulează</button><button onClick={handleCreateWaiter} style={{...s.btn, backgroundColor:colors.champagne, color:colors.noir}}>Adaugă</button></div>
      </div></div>}
    </div>
  )
}
