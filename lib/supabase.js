import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions
export async function getVenue(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single()
  return { data, error }
}

export async function getTable(qrCode) {
  const { data, error } = await supabase
    .from('tables')
    .select('*, venues(*)')
    .eq('qr_code', qrCode)
    .single()
  return { data, error }
}

export async function getCategories(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('sort_order')
  return { data, error }
}

export async function getMenuItems(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, categories(*)')
    .eq('venue_id', venueId)
    .eq('is_available', true)
    .order('sort_order')
  return { data, error }
}

export async function createOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()
  return { data, error }
}

export async function createOrderItems(items) {
  const { data, error } = await supabase
    .from('order_items')
    .insert(items)
  return { data, error }
}

export async function getOrders(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('venue_id', venueId)
    .in('status', ['new', 'preparing', 'ready'])
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  return { data, error }
}

export async function getReservations(venueId = '11111111-1111-1111-1111-111111111111', date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('reservations')
    .select('*, tables(*)')
    .eq('venue_id', venueId)
    .eq('reservation_date', targetDate)
    .neq('status', 'cancelled')
    .order('reservation_time')
  return { data, error }
}

export async function createReservation(reservationData) {
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservationData)
    .select()
    .single()
  return { data, error }
}

export async function updateReservation(id, updates) {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
  return { data, error }
}

export async function deleteReservation(id) {
  const { data, error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)
  return { data, error }
}

export async function getTables(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
  return { data, error }
}

export async function getCustomers(limit = 50) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('total_spent', { ascending: false })
    .limit(limit)
  return { data, error }
}

export async function getOrCreateCustomer(phone, name = null) {
  // First try to find existing customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .single()
  
  if (!customer) {
    // Create new customer
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({ phone, name })
      .select()
      .single()
    customer = newCustomer
  }
  
  return customer
}

// Subscribe to realtime orders
export function subscribeToOrders(venueId, callback) {
  return supabase
    .channel('orders-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` },
      callback
    )
    .subscribe()
}

// Subscribe to realtime reservations
export function subscribeToReservations(venueId, callback) {
  return supabase
    .channel('reservations-channel')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'reservations', filter: `venue_id=eq.${venueId}` },
      callback
    )
    .subscribe()
}

// =============================================
// EVENIMENTE
// =============================================

export async function getEvents(venueId = '11111111-1111-1111-1111-111111111111', futureOnly = true) {
  let query = supabase
    .from('events')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('event_date', { ascending: true })
  
  if (futureOnly) {
    query = query.gte('event_date', new Date().toISOString().split('T')[0])
  }
  
  const { data, error } = await query
  return { data, error }
}

export async function getEvent(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(*)')
    .eq('id', eventId)
    .single()
  return { data, error }
}

export async function createEvent(eventData) {
  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single()
  return { data, error }
}

export async function updateEvent(eventId, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
  return { data, error }
}

export async function deleteEvent(eventId) {
  const { data, error } = await supabase
    .from('events')
    .update({ is_active: false })
    .eq('id', eventId)
  return { data, error }
}

// =============================================
// EVENT TABLES (Layout)
// =============================================

export async function getEventTables(eventId) {
  const { data, error } = await supabase
    .from('event_tables')
    .select('*, reservations(*)')
    .eq('event_id', eventId)
    .order('zone')
    .order('table_number')
  return { data, error }
}

export async function createEventTable(tableData) {
  const { data, error } = await supabase
    .from('event_tables')
    .insert(tableData)
    .select()
    .single()
  return { data, error }
}

export async function updateEventTable(tableId, updates) {
  const { data, error } = await supabase
    .from('event_tables')
    .update(updates)
    .eq('id', tableId)
  return { data, error }
}

export async function deleteEventTable(tableId) {
  const { data, error } = await supabase
    .from('event_tables')
    .delete()
    .eq('id', tableId)
  return { data, error }
}

export async function bulkCreateEventTables(tables) {
  const { data, error } = await supabase
    .from('event_tables')
    .insert(tables)
    .select()
  return { data, error }
}

// Copy tables from one event to another
export async function copyEventLayout(fromEventId, toEventId) {
  const { data: sourceTables } = await getEventTables(fromEventId)
  if (!sourceTables) return { data: null, error: 'No source tables' }
  
  const newTables = sourceTables.map(t => ({
    event_id: toEventId,
    table_number: t.table_number,
    zone: t.zone,
    capacity: t.capacity,
    min_spend: t.min_spend,
    position_x: t.position_x,
    position_y: t.position_y,
    width: t.width,
    height: t.height,
    shape: t.shape,
  }))
  
  return bulkCreateEventTables(newTables)
}

// =============================================
// OSPĂTARI (WAITERS)
// =============================================

export async function getWaiters(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase
    .from('waiters')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('name')
  return { data, error }
}

export async function createWaiter(waiterData) {
  const { data, error } = await supabase
    .from('waiters')
    .insert(waiterData)
    .select()
    .single()
  return { data, error }
}

export async function updateWaiter(waiterId, updates) {
  const { data, error } = await supabase
    .from('waiters')
    .update(updates)
    .eq('id', waiterId)
  return { data, error }
}

export async function deleteWaiter(waiterId) {
  const { data, error } = await supabase
    .from('waiters')
    .update({ is_active: false })
    .eq('id', waiterId)
  return { data, error }
}

export async function loginWaiter(phone) {
  const { data, error } = await supabase
    .from('waiters')
    .select('*')
    .eq('phone', phone)
    .eq('is_active', true)
    .single()
  return { data, error }
}

// =============================================
// EVENT WAITERS (Programări)
// =============================================

export async function getEventWaiters(eventId) {
  const { data, error } = await supabase
    .from('event_waiters')
    .select('*, waiters(*)')
    .eq('event_id', eventId)
  return { data, error }
}

export async function addWaiterToEvent(eventId, waiterId) {
  const { data, error } = await supabase
    .from('event_waiters')
    .insert({ event_id: eventId, waiter_id: waiterId })
    .select()
    .single()
  return { data, error }
}

export async function removeWaiterFromEvent(eventId, waiterId) {
  const { data, error } = await supabase
    .from('event_waiters')
    .delete()
    .eq('event_id', eventId)
    .eq('waiter_id', waiterId)
  return { data, error }
}

export async function checkInWaiter(eventId, waiterId) {
  const { data, error } = await supabase
    .from('event_waiters')
    .update({ is_checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('waiter_id', waiterId)
  return { data, error }
}

// =============================================
// TABLE ASSIGNMENTS (Atribuire mese)
// =============================================

export async function getTableAssignments(eventId) {
  const { data, error } = await supabase
    .from('table_assignments')
    .select('*, event_tables(*), waiters(*)')
    .eq('event_id', eventId)
  return { data, error }
}

export async function assignTableToWaiter(eventTableId, waiterId, eventId) {
  // First remove existing assignment
  await supabase
    .from('table_assignments')
    .delete()
    .eq('event_table_id', eventTableId)
    .eq('event_id', eventId)
  
  // Then create new assignment
  const { data, error } = await supabase
    .from('table_assignments')
    .insert({ event_table_id: eventTableId, waiter_id: waiterId, event_id: eventId })
    .select()
    .single()
  return { data, error }
}

export async function unassignTable(eventTableId, eventId) {
  const { data, error } = await supabase
    .from('table_assignments')
    .delete()
    .eq('event_table_id', eventTableId)
    .eq('event_id', eventId)
  return { data, error }
}

// =============================================
// RESERVATIONS WITH EVENTS
// =============================================

export async function getEventReservations(eventId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, event_tables(*)')
    .eq('event_id', eventId)
    .neq('status', 'cancelled')
    .order('reservation_time')
  return { data, error }
}

export async function createEventReservation(reservationData) {
  // Update table status
  if (reservationData.event_table_id) {
    await supabase
      .from('event_tables')
      .update({ status: 'reserved' })
      .eq('id', reservationData.event_table_id)
  }
  
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservationData)
    .select()
    .single()
  return { data, error }
}
