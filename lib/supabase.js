import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// =============================================
// VENUE
// =============================================
export async function getVenue(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('venues').select('*').eq('id', venueId).single()
  return { data, error }
}

export async function getVenueBySlug(slug) {
  // Try multiple strategies to find the venue
  
  // 1. First try exact slug match
  let { data, error } = await supabase
    .from('venues')
    .select('*')
    .ilike('slug', slug)
    .limit(1)
    .single()
  
  if (data) return { data, error: null }
  
  // 2. Try name contains (case insensitive)
  const { data: data2 } = await supabase
    .from('venues')
    .select('*')
    .ilike('name', `%${slug}%`)
    .limit(1)
    .single()
  
  if (data2) return { data: data2, error: null }
  
  // 3. Fallback: get first/default venue (for single-venue setups)
  const { data: defaultVenue } = await supabase
    .from('venues')
    .select('*')
    .limit(1)
    .single()
  
  if (defaultVenue) return { data: defaultVenue, error: null }
  
  return { data: null, error: 'Venue not found' }
}

// Smart table resolution for QR code scanning
export async function resolveTableForOrder(venueSlug, tableNumber) {
  // 1. Handle testing mode - always works
  if (venueSlug === 'testing' || venueSlug === 'demo') {
    const { data: venue } = await getVenue() // Get default venue
    if (!venue) return { status: 'error', message: 'Venue not configured' }
    
    // Get any active event for testing
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .order('event_date', { ascending: false })
      .limit(1)
    
    const event = events?.[0]
    if (!event) return { status: 'no_event', venue, message: 'Niciun eveniment activ' }
    
    // Find table in this event
    const { data: table } = await supabase
      .from('event_tables')
      .select('*')
      .eq('event_id', event.id)
      .ilike('table_number', tableNumber)
      .limit(1)
      .single()
    
    if (!table) {
      // For testing, create a mock table or return first available
      const { data: anyTable } = await supabase
        .from('event_tables')
        .select('*')
        .eq('event_id', event.id)
        .limit(1)
        .single()
      
      return anyTable 
        ? { status: 'ok', venue, event, table: anyTable, isTestMode: true }
        : { status: 'table_not_found', venue, event, message: `Masa ${tableNumber} nu există` }
    }
    
    return { status: 'ok', venue, event, table, isTestMode: true }
  }
  
  // 2. Get venue by slug
  const { data: venue, error: venueError } = await getVenueBySlug(venueSlug)
  if (!venue) {
    return { status: 'venue_not_found', message: 'Locația nu a fost găsită' }
  }
  
  // 3. Find active event (using event_date + start_time for now)
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().slice(0, 5)
  
  // Get events for today or yesterday (for overnight events)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('venue_id', venue.id)
    .eq('is_active', true)
    .in('event_date', [today, yesterday])
    .order('event_date', { ascending: false })
  
  // Filter to find truly active event
  // Active = started (current time >= start_time OR it's the next day) AND not ended
  let activeEvent = null
  for (const ev of (events || [])) {
    const eventDate = ev.event_date
    const startTime = ev.start_time || '22:00'
    
    // If event is today and we're past start time
    if (eventDate === today && currentTime >= startTime) {
      activeEvent = ev
      break
    }
    
    // If event was yesterday (overnight event) and it's before 6am
    if (eventDate === yesterday && currentTime < '06:00') {
      activeEvent = ev
      break
    }
    
    // If event is today and hasn't started yet
    if (eventDate === today && currentTime < startTime) {
      // Calculate time until start
      const [startH, startM] = startTime.split(':').map(Number)
      const [nowH, nowM] = currentTime.split(':').map(Number)
      const minsUntil = (startH * 60 + startM) - (nowH * 60 + nowM)
      
      return {
        status: 'upcoming',
        venue,
        event: ev,
        minutesUntilStart: minsUntil,
        message: `Evenimentul începe la ${startTime}`
      }
    }
  }
  
  // 4. No active event found
  if (!activeEvent) {
    // Check for upcoming event
    const { data: upcomingEvents } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(1)
    
    if (upcomingEvents?.[0]) {
      return {
        status: 'upcoming',
        venue,
        event: upcomingEvents[0],
        message: `Următorul eveniment: ${upcomingEvents[0].name}`
      }
    }
    
    return { status: 'no_event', venue, message: 'Niciun eveniment activ' }
  }
  
  // 5. Find table by number in active event
  const { data: table } = await supabase
    .from('event_tables')
    .select('*')
    .eq('event_id', activeEvent.id)
    .ilike('table_number', tableNumber.replace(/\s+/g, ''))
    .limit(1)
    .single()
  
  if (!table) {
    // Try with spaces
    const { data: tableWithSpaces } = await supabase
      .from('event_tables')
      .select('*')
      .eq('event_id', activeEvent.id)
      .ilike('table_number', tableNumber)
      .limit(1)
      .single()
    
    if (!tableWithSpaces) {
      return {
        status: 'table_not_found',
        venue,
        event: activeEvent,
        message: `Masa ${tableNumber} nu este disponibilă`
      }
    }
    
    return { status: 'ok', venue, event: activeEvent, table: tableWithSpaces }
  }
  
  return { status: 'ok', venue, event: activeEvent, table }
}

// =============================================
// EVENTS
// =============================================
export async function getEvents(venueId = '11111111-1111-1111-1111-111111111111', futureOnly = false) {
  let query = supabase.from('events').select('*').eq('venue_id', venueId).eq('is_active', true).order('event_date', { ascending: false })
  if (futureOnly) query = query.gte('event_date', new Date().toISOString().split('T')[0])
  const { data, error } = await query
  return { data, error }
}

export async function getAllEvents(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('events').select('*').eq('venue_id', venueId).eq('is_active', true).order('event_date', { ascending: false })
  return { data, error }
}

export async function getEvent(eventId) {
  const { data, error } = await supabase.from('events').select('*, venues(*)').eq('id', eventId).single()
  return { data, error }
}

export async function createEvent(eventData) {
  const { data, error } = await supabase.from('events').insert(eventData).select().single()
  return { data, error }
}

export async function updateEvent(eventId, updates) {
  const { data, error } = await supabase.from('events').update(updates).eq('id', eventId).select().single()
  return { data, error }
}

export async function deleteEvent(eventId) {
  const { data, error } = await supabase.from('events').update({ is_active: false }).eq('id', eventId)
  return { data, error }
}

// =============================================
// EVENT TABLES
// =============================================
export async function getEventTables(eventId) {
  const { data, error } = await supabase.from('event_tables').select('*').eq('event_id', eventId).order('grid_row').order('grid_col')
  return { data, error }
}

export async function createEventTable(tableData) {
  const { data, error } = await supabase.from('event_tables').insert(tableData).select().single()
  return { data, error }
}

export async function updateEventTable(tableId, updates) {
  const { data, error } = await supabase.from('event_tables').update(updates).eq('id', tableId).select().single()
  return { data, error }
}

export async function deleteEventTable(tableId) {
  const { data, error } = await supabase.from('event_tables').delete().eq('id', tableId)
  return { data, error }
}

export async function bulkCreateEventTables(tables) {
  const { data, error } = await supabase.from('event_tables').insert(tables).select()
  return { data, error }
}

export async function copyEventLayout(fromEventId, toEventId) {
  const { data: sourceTables } = await getEventTables(fromEventId)
  if (!sourceTables?.length) return { data: null, error: 'No source tables' }
  const newTables = sourceTables.map(t => ({
    event_id: toEventId, table_number: t.table_number, table_type: t.table_type,
    capacity: t.capacity, min_spend: t.min_spend, grid_row: t.grid_row, grid_col: t.grid_col, zone: t.zone
  }))
  return bulkCreateEventTables(newTables)
}

// =============================================
// MENU
// =============================================
export async function getCategories(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('categories').select('*').eq('venue_id', venueId).eq('is_active', true).order('sort_order')
  return { data, error }
}

export async function updateCategory(categoryId, updates) {
  const { data, error } = await supabase.from('categories').update(updates).eq('id', categoryId).select().single()
  return { data, error }
}

export async function updateCategoryOrder(categories) {
  const updates = categories.map((c, i) => ({ id: c.id, sort_order: i }))
  for (const u of updates) {
    await supabase.from('categories').update({ sort_order: u.sort_order }).eq('id', u.id)
  }
  return { success: true }
}

export async function createCategory(venueId, name) {
  const { data: existing } = await supabase.from('categories').select('sort_order').eq('venue_id', venueId).order('sort_order', { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data, error } = await supabase.from('categories').insert({ venue_id: venueId, name, slug, sort_order: nextOrder, is_active: true }).select().single()
  return { data, error }
}

export async function updateCategoryName(categoryId, name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data, error } = await supabase.from('categories').update({ name, slug }).eq('id', categoryId).select().single()
  return { data, error }
}

export async function deleteCategory(categoryId) {
  const { data, error } = await supabase.from('categories').delete().eq('id', categoryId)
  return { data, error }
}

export async function bulkDeleteMenuItems(itemIds) {
  const { data, error } = await supabase.from('menu_items').delete().in('id', itemIds)
  return { data, error }
}

export async function bulkUpdateMenuItems(itemIds, updates) {
  const { data, error } = await supabase.from('menu_items').update(updates).in('id', itemIds)
  return { data, error }
}

export async function setDefaultMenuTemplate(venueId, templateId) {
  // Resetăm toate template-urile
  await supabase.from('menu_templates').update({ is_default: false }).eq('venue_id', venueId)
  // Setăm noul default
  if (templateId) {
    const { data, error } = await supabase.from('menu_templates').update({ is_default: true }).eq('id', templateId).select().single()
    return { data, error }
  }
  return { data: null, error: null }
}

export async function getDefaultMenuTemplate(venueId) {
  const { data, error } = await supabase.from('menu_templates').select('*').eq('venue_id', venueId).eq('is_default', true).single()
  return { data, error }
}

export async function getMenuItems(venueId = '11111111-1111-1111-1111-111111111111', includeUnavailable = false) {
  let query = supabase.from('menu_items').select('*, categories(*)').eq('venue_id', venueId)
  if (!includeUnavailable) query = query.eq('is_available', true)
  const { data, error } = await query.order('sort_order')
  return { data, error }
}

export async function getAllMenuItems(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('menu_items').select('*, categories(*)').eq('venue_id', venueId).order('sort_order')
  return { data, error }
}

export async function createMenuItem(itemData) {
  const { data, error } = await supabase.from('menu_items').insert(itemData).select().single()
  return { data, error }
}

export async function updateMenuItem(itemId, updates) {
  const { data, error } = await supabase.from('menu_items').update(updates).eq('id', itemId).select().single()
  return { data, error }
}

export async function deleteMenuItem(itemId) {
  const { data, error } = await supabase.from('menu_items').delete().eq('id', itemId)
  return { data, error }
}

export async function duplicateMenuItem(itemId) {
  const { data: original } = await supabase.from('menu_items').select('*').eq('id', itemId).single()
  if (!original) return { data: null, error: 'Not found' }
  const { id, created_at, ...itemData } = original
  itemData.name = `${itemData.name} (copie)`
  const { data, error } = await supabase.from('menu_items').insert(itemData).select().single()
  return { data, error }
}

export async function updateMenuItemOrder(items) {
  for (let i = 0; i < items.length; i++) {
    await supabase.from('menu_items').update({ sort_order: i }).eq('id', items[i].id)
  }
  return { success: true }
}

export async function bulkUpdateMenuPrices(updates) {
  for (const item of updates) {
    await supabase.from('menu_items').update({ default_price: item.default_price }).eq('id', item.id)
  }
  return { success: true }
}

export async function getEventMenu(eventId) {
  const { data, error } = await supabase.from('event_menu').select('*, menu_items(*, categories(*))').eq('event_id', eventId)
  return { data, error }
}

export async function setEventMenuPrice(eventId, menuItemId, customPrice, isAvailable = true, isFeatured = false) {
  const { data, error } = await supabase.from('event_menu').upsert({
    event_id: eventId, menu_item_id: menuItemId, custom_price: customPrice, is_available: isAvailable, is_featured: isFeatured
  }, { onConflict: 'event_id,menu_item_id' }).select().single()
  return { data, error }
}

export async function copyEventMenu(fromEventId, toEventId) {
  const { data: sourceMenu } = await getEventMenu(fromEventId)
  if (!sourceMenu?.length) return { data: null, error: null }
  const newMenu = sourceMenu.map(m => ({
    event_id: toEventId, menu_item_id: m.menu_item_id, custom_price: m.custom_price, is_available: m.is_available, is_featured: m.is_featured
  }))
  const { data, error } = await supabase.from('event_menu').insert(newMenu).select()
  return { data, error }
}

// =============================================
// MENU TEMPLATES
// =============================================
export async function getMenuTemplates(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('menu_templates').select('*').eq('venue_id', venueId).order('created_at', { ascending: false })
  return { data, error }
}

export async function createMenuTemplate(venueId, name, menuItems) {
  const menuConfig = menuItems.map(m => ({
    menu_item_id: m.id, custom_price: m.custom_price || m.default_price, is_available: m.is_available !== false
  }))
  const { data, error } = await supabase.from('menu_templates').insert({ venue_id: venueId, name, menu_config: menuConfig }).select().single()
  return { data, error }
}

export async function deleteMenuTemplate(templateId) {
  const { data, error } = await supabase.from('menu_templates').delete().eq('id', templateId)
  return { data, error }
}

export async function applyMenuTemplate(templateId, eventId) {
  const { data: template } = await supabase.from('menu_templates').select('*').eq('id', templateId).single()
  if (!template) return { data: null, error: 'Template not found' }
  
  await supabase.from('event_menu').delete().eq('event_id', eventId)
  
  const newMenu = template.menu_config.map(m => ({ ...m, event_id: eventId }))
  const { data, error } = await supabase.from('event_menu').insert(newMenu).select()
  return { data, error }
}

// =============================================
// WAITERS
// =============================================
export async function getWaiters(venueId = '11111111-1111-1111-1111-111111111111', filter = 'active') {
  let query = supabase.from('waiters').select('*').eq('venue_id', venueId)
  if (filter === 'active') {
    query = query.eq('is_active', true)
  } else if (filter === 'deleted') {
    query = query.eq('is_deleted', true)
  }
  const { data, error } = await query.order('name')
  return { data, error }
}

export async function createWaiter(waiterData) {
  const { data, error } = await supabase.from('waiters').insert({ ...waiterData, is_deleted: false }).select().single()
  return { data, error }
}

export async function updateWaiter(waiterId, updates) {
  const { data, error } = await supabase.from('waiters').update(updates).eq('id', waiterId)
  return { data, error }
}

export async function deleteWaiter(waiterId) {
  const { data, error } = await supabase.from('waiters').update({ is_active: false, is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', waiterId)
  return { data, error }
}

export async function restoreWaiter(waiterId) {
  const { data, error } = await supabase.from('waiters').update({ is_active: true, is_deleted: false, deleted_at: null }).eq('id', waiterId)
  return { data, error }
}

export async function loginWaiter(phone) {
  const { data, error } = await supabase.from('waiters').select('*').eq('phone', phone).eq('is_active', true).single()
  return { data, error }
}

export async function getWaiterStats(waiterId, eventId = null) {
  if (eventId) {
    const { data } = await supabase.from('orders').select('total').eq('waiter_id', waiterId).eq('event_id', eventId).eq('payment_status', 'paid')
    const totalSales = data?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
    const totalOrders = data?.length || 0
    return { totalSales, totalOrders }
  } else {
    const { data } = await supabase.from('orders').select('total').eq('waiter_id', waiterId).eq('payment_status', 'paid')
    const totalSales = data?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
    const totalOrders = data?.length || 0
    return { totalSales, totalOrders }
  }
}

// =============================================
// EVENT WAITERS
// =============================================
export async function getEventWaiters(eventId) {
  const { data, error } = await supabase.from('event_waiters').select('*, waiters(*)').eq('event_id', eventId)
  return { data, error }
}

export async function addWaiterToEvent(eventId, waiterId) {
  const { data, error } = await supabase.from('event_waiters').insert({ event_id: eventId, waiter_id: waiterId }).select().single()
  return { data, error }
}

export async function removeWaiterFromEvent(eventId, waiterId) {
  const { data, error } = await supabase.from('event_waiters').delete().eq('event_id', eventId).eq('waiter_id', waiterId)
  return { data, error }
}

export async function updateEventWaiterStats(eventId, waiterId, sales, orders) {
  const { data, error } = await supabase.from('event_waiters')
    .update({ event_sales: sales, event_orders: orders }).eq('event_id', eventId).eq('waiter_id', waiterId)
  return { data, error }
}

// =============================================
// TABLE ASSIGNMENTS
// =============================================
export async function getTableAssignments(eventId) {
  const { data, error } = await supabase.from('table_assignments').select('*, event_tables(*), waiters(*)').eq('event_id', eventId)
  return { data, error }
}

export async function assignTableToWaiter(eventTableId, waiterId, eventId) {
  await supabase.from('table_assignments').delete().eq('event_table_id', eventTableId).eq('event_id', eventId)
  if (!waiterId) return { data: null, error: null }
  const { data, error } = await supabase.from('table_assignments').insert({ event_table_id: eventTableId, waiter_id: waiterId, event_id: eventId }).select().single()
  await addTableHistory(eventTableId, eventId, 'waiter_assigned', { waiter_id: waiterId })
  return { data, error }
}

export async function unassignTable(eventTableId, eventId) {
  const { data, error } = await supabase.from('table_assignments').delete().eq('event_table_id', eventTableId).eq('event_id', eventId)
  return { data, error }
}

// =============================================
// CUSTOMERS - FIXED
// =============================================
export async function getCustomers(limit = 50) {
  const { data: orders } = await supabase.from('orders').select('customer_phone, customer_name, total, event_id').eq('payment_status', 'paid')
  
  if (!orders || orders.length === 0) {
    return { data: [], error: null }
  }
  
  const customerMap = {}
  orders.forEach(o => {
    if (!o.customer_phone) return
    if (!customerMap[o.customer_phone]) {
      customerMap[o.customer_phone] = {
        phone: o.customer_phone,
        name: o.customer_name || 'Anonim',
        total_spent: 0,
        visit_count: 0,
        events: new Set()
      }
    }
    customerMap[o.customer_phone].total_spent += parseFloat(o.total || 0)
    customerMap[o.customer_phone].visit_count += 1
    if (o.event_id) customerMap[o.customer_phone].events.add(o.event_id)
  })
  
  const { data: reservations } = await supabase.from('reservations').select('customer_phone, customer_name, event_id')
  reservations?.forEach(r => {
    if (!r.customer_phone) return
    if (!customerMap[r.customer_phone]) {
      customerMap[r.customer_phone] = {
        phone: r.customer_phone,
        name: r.customer_name || 'Anonim',
        total_spent: 0,
        visit_count: 0,
        events: new Set()
      }
    }
    if (r.event_id) customerMap[r.customer_phone].events.add(r.event_id)
  })
  
  const customers = Object.values(customerMap)
    .map(c => ({ ...c, events: c.events.size }))
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, limit)
  
  return { data: customers, error: null }
}

export async function getCustomersFiltered(options = {}) {
  const { eventId, period, limit = 50 } = options
  
  let query = supabase.from('orders').select('customer_phone, customer_name, total, event_id, created_at').eq('payment_status', 'paid')
  
  if (period && period !== 'all') {
    const now = new Date()
    let startDate
    switch(period) {
      case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
      case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
      case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
      case 'year': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break
    }
    if (startDate) query = query.gte('created_at', startDate.toISOString())
  }
  
  if (eventId) {
    query = query.eq('event_id', eventId)
  }
  
  const { data: orders } = await query
  
  if (!orders || orders.length === 0) {
    return { data: [], error: null }
  }
  
  const customerMap = {}
  orders.forEach(o => {
    if (!o.customer_phone) return
    if (!customerMap[o.customer_phone]) {
      customerMap[o.customer_phone] = {
        phone: o.customer_phone,
        name: o.customer_name || 'Anonim',
        total_spent: 0,
        visit_count: 0
      }
    }
    customerMap[o.customer_phone].total_spent += parseFloat(o.total || 0)
    customerMap[o.customer_phone].visit_count += 1
  })
  
  const customers = Object.values(customerMap)
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, limit)
  
  return { data: customers, error: null }
}

export async function deleteCustomer(phone) {
  const { data, error } = await supabase.from('customers').delete().eq('phone', phone)
  return { data, error }
}

export async function getCustomersByReservation(eventId = null) {
  let query = supabase.from('reservations').select('customer_name, customer_phone, event_id, events(name), is_vip')
  if (eventId) query = query.eq('event_id', eventId)
  const { data, error } = await query.order('created_at', { ascending: false })
  return { data, error }
}

// =============================================
// RESERVATIONS
// =============================================
export async function getEventReservations(eventId) {
  const { data, error } = await supabase.from('reservations').select('*, event_tables(*)').eq('event_id', eventId).neq('status', 'cancelled').order('reservation_time')
  return { data, error }
}

export async function createReservation(reservationData) {
  if (reservationData.event_table_id) {
    await supabase.from('event_tables').update({ status: 'reserved' }).eq('id', reservationData.event_table_id)
    await addTableHistory(reservationData.event_table_id, reservationData.event_id, 'reservation', reservationData)
  }
  const { data, error } = await supabase.from('reservations').insert(reservationData).select().single()
  return { data, error }
}

export async function updateReservation(id, updates) {
  const { data, error } = await supabase.from('reservations').update(updates).eq('id', id)
  return { data, error }
}

export async function deleteReservation(id) {
  const { data: res } = await supabase.from('reservations').select('event_table_id').eq('id', id).single()
  if (res?.event_table_id) {
    await supabase.from('event_tables').update({ status: 'available' }).eq('id', res.event_table_id)
  }
  const { data, error } = await supabase.from('reservations').delete().eq('id', id)
  return { data, error }
}

// =============================================
// ORDERS
// =============================================
export async function getOrders(venueId = '11111111-1111-1111-1111-111111111111', status = null) {
  let query = supabase.from('orders').select('*, order_items(*)').eq('venue_id', venueId).order('created_at', { ascending: false })
  if (status) query = query.in('status', Array.isArray(status) ? status : [status])
  const { data, error } = await query
  return { data, error }
}

export async function getEventOrders(eventId) {
  const { data, error } = await supabase.from('orders').select('*, order_items(*), waiters(*), event_tables(*)').eq('event_id', eventId).order('created_at', { ascending: false })
  return { data, error }
}

export async function getTableOrders(eventTableId) {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('event_table_id', eventTableId).order('created_at', { ascending: false })
  return { data, error }
}

export async function createOrder(orderData) {
  const { data, error } = await supabase.from('orders').insert(orderData).select().single()
  if (data && orderData.event_table_id) {
    await addTableHistory(orderData.event_table_id, orderData.event_id, 'order', { order_id: data.id, total: orderData.total })
  }
  return { data, error }
}

export async function createOrderItems(items) {
  const { data, error } = await supabase.from('order_items').insert(items)
  return { data, error }
}

export async function updateOrderStatus(orderId, status) {
  const updates = { status, updated_at: new Date().toISOString() }
  if (status === 'completed') updates.paid_at = new Date().toISOString()
  const { data, error } = await supabase.from('orders').update(updates).eq('id', orderId)
  return { data, error }
}

export async function markOrderPaid(orderId, paymentType) {
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
  if (order?.event_table_id) {
    await addTableHistory(order.event_table_id, order.event_id, 'payment', { order_id: orderId, total: order.total, payment_type: paymentType })
  }
  const { data, error } = await supabase.from('orders').update({ 
    payment_status: 'paid', payment_type: paymentType, paid_at: new Date().toISOString(), status: 'completed' 
  }).eq('id', orderId)
  return { data, error }
}

// =============================================
// TABLE HISTORY
// =============================================
export async function getTableHistory(eventTableId) {
  const { data, error } = await supabase.from('table_history').select('*').eq('event_table_id', eventTableId).order('created_at', { ascending: false })
  return { data, error }
}

export async function addTableHistory(eventTableId, eventId, actionType, actionData) {
  const { data, error } = await supabase.from('table_history').insert({
    event_table_id: eventTableId, event_id: eventId, action_type: actionType, action_data: actionData
  })
  return { data, error }
}

// =============================================
// ANALYTICS - FIXED
// =============================================
export async function getAnalytics(venueId = '11111111-1111-1111-1111-111111111111', period = 'month') {
  const now = new Date()
  let startDate
  
  switch(period) {
    case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
    case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
    case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
    case 'year': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break
    default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
  
  const { data: orders } = await supabase.from('orders').select('*').eq('venue_id', venueId).eq('payment_status', 'paid').gte('created_at', startDate.toISOString())
  
  const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
  const totalOrders = orders?.length || 0
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  
  return { totalRevenue, totalOrders, avgOrder }
}

export async function getEventAnalytics(eventId) {
  const { data: orders } = await supabase.from('orders').select('*, order_items(*)').eq('event_id', eventId)
  
  const paidOrders = orders?.filter(o => o.payment_status === 'paid') || []
  const totalSales = paidOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
  const totalOrders = orders?.length || 0
  const paidOrdersCount = paidOrders.length
  const avgOrder = paidOrdersCount > 0 ? Math.round(totalSales / paidOrdersCount) : 0
  
  const productCounts = {}
  orders?.forEach(o => {
    o.order_items?.forEach(item => {
      if (!productCounts[item.name]) productCounts[item.name] = { qty: 0, revenue: 0 }
      productCounts[item.name].qty += item.quantity
      productCounts[item.name].revenue += parseFloat(item.subtotal)
    })
  })
  const topProducts = Object.entries(productCounts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  
  return { totalSales, totalOrders, paidOrdersCount, avgOrder, topProducts }
}

// FIXED - Leaderboard calculat din orders
export async function getWaiterLeaderboard(eventId = null) {
  if (eventId) {
    const { data: orders } = await supabase.from('orders').select('waiter_id, total').eq('event_id', eventId).eq('payment_status', 'paid')
    const { data: eventWaiters } = await supabase.from('event_waiters').select('*, waiters(*)').eq('event_id', eventId)
    
    if (!eventWaiters) return []
    
    const waiterSales = {}
    orders?.forEach(o => {
      if (!o.waiter_id) return
      if (!waiterSales[o.waiter_id]) waiterSales[o.waiter_id] = { sales: 0, orders: 0 }
      waiterSales[o.waiter_id].sales += parseFloat(o.total || 0)
      waiterSales[o.waiter_id].orders += 1
    })
    
    return eventWaiters.map(ew => ({
      ...ew.waiters,
      event_sales: waiterSales[ew.waiter_id]?.sales || 0,
      event_orders: waiterSales[ew.waiter_id]?.orders || 0
    })).sort((a, b) => b.event_sales - a.event_sales)
  } else {
    const { data: orders } = await supabase.from('orders').select('waiter_id, total').eq('payment_status', 'paid')
    const { data: waiters } = await supabase.from('waiters').select('*').eq('is_active', true)
    
    if (!waiters) return []
    
    const waiterSales = {}
    orders?.forEach(o => {
      if (!o.waiter_id) return
      if (!waiterSales[o.waiter_id]) waiterSales[o.waiter_id] = { sales: 0, orders: 0 }
      waiterSales[o.waiter_id].sales += parseFloat(o.total || 0)
      waiterSales[o.waiter_id].orders += 1
    })
    
    return waiters.map(w => ({
      ...w,
      total_sales: waiterSales[w.id]?.sales || 0,
      total_orders: waiterSales[w.id]?.orders || 0
    })).sort((a, b) => b.total_sales - a.total_sales)
  }
}

// =============================================
// REALTIME
// =============================================
export function subscribeToOrders(eventId, callback) {
  return supabase.channel('orders-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `event_id=eq.${eventId}` }, callback).subscribe()
}

export function subscribeToTables(eventId, callback) {
  return supabase.channel('tables-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'event_tables', filter: `event_id=eq.${eventId}` }, callback).subscribe()
}

// =============================================
// LAYOUT TEMPLATES
// =============================================
export async function getLayoutTemplates(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('layout_templates').select('*').eq('venue_id', venueId).order('created_at', { ascending: false })
  return { data, error }
}

export async function createLayoutTemplate(venueId, name, tables) {
  const tablesConfig = tables.map(t => ({
    table_number: t.table_number, table_type: t.table_type, capacity: t.capacity,
    min_spend: t.min_spend, grid_row: t.grid_row, grid_col: t.grid_col, zone: t.zone || 'front'
  }))
  const { data, error } = await supabase.from('layout_templates').insert({ venue_id: venueId, name, tables_config: tablesConfig }).select().single()
  return { data, error }
}

export async function deleteLayoutTemplate(templateId) {
  const { data, error } = await supabase.from('layout_templates').delete().eq('id', templateId)
  return { data, error }
}

export async function applyLayoutTemplate(templateId, eventId) {
  const { data: template } = await supabase.from('layout_templates').select('*').eq('id', templateId).single()
  if (!template) return { data: null, error: 'Template not found' }
  
  await supabase.from('event_tables').delete().eq('event_id', eventId)
  
  const newTables = template.tables_config.map(t => ({ ...t, event_id: eventId }))
  const { data, error } = await supabase.from('event_tables').insert(newTables).select()
  return { data, error }
}
