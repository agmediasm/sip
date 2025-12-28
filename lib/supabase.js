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

// =============================================
// EVENTS
// =============================================
export async function getEvents(venueId = '11111111-1111-1111-1111-111111111111', futureOnly = true) {
  let query = supabase.from('events').select('*').eq('venue_id', venueId).eq('is_active', true).order('event_date', { ascending: true })
  if (futureOnly) query = query.gte('event_date', new Date().toISOString().split('T')[0])
  const { data, error } = await query
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
    capacity: t.capacity, min_spend: t.min_spend, grid_row: t.grid_row, grid_col: t.grid_col
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

export async function getMenuItems(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('menu_items').select('*, categories(*)').eq('venue_id', venueId).eq('is_available', true).order('sort_order')
  return { data, error }
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
// WAITERS
// =============================================
export async function getWaiters(venueId = '11111111-1111-1111-1111-111111111111') {
  const { data, error } = await supabase.from('waiters').select('*').eq('venue_id', venueId).eq('is_active', true).order('name')
  return { data, error }
}

export async function createWaiter(waiterData) {
  const { data, error } = await supabase.from('waiters').insert(waiterData).select().single()
  return { data, error }
}

export async function updateWaiter(waiterId, updates) {
  const { data, error } = await supabase.from('waiters').update(updates).eq('id', waiterId)
  return { data, error }
}

export async function deleteWaiter(waiterId) {
  const { data, error } = await supabase.from('waiters').update({ is_active: false }).eq('id', waiterId)
  return { data, error }
}

export async function loginWaiter(phone) {
  const { data, error } = await supabase.from('waiters').select('*').eq('phone', phone).eq('is_active', true).single()
  return { data, error }
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
  const { data, error } = await supabase.from('table_assignments').insert({ event_table_id: eventTableId, waiter_id: waiterId, event_id: eventId }).select().single()
  // Add to history
  await addTableHistory(eventTableId, eventId, 'waiter_assigned', { waiter_id: waiterId })
  return { data, error }
}

export async function unassignTable(eventTableId, eventId) {
  const { data, error } = await supabase.from('table_assignments').delete().eq('event_table_id', eventTableId).eq('event_id', eventId)
  return { data, error }
}

// =============================================
// CUSTOMERS
// =============================================
export async function getCustomers(limit = 50) {
  const { data, error } = await supabase.from('customers').select('*').order('total_spent', { ascending: false }).limit(limit)
  return { data, error }
}

export async function getOrCreateCustomer(phone, name = null) {
  let { data: customer } = await supabase.from('customers').select('*').eq('phone', phone).single()
  if (!customer) {
    const { data: newCustomer } = await supabase.from('customers').insert({ phone, name }).select().single()
    customer = newCustomer
  }
  return customer
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
  // Update waiter stats
  if (order?.waiter_id) {
    await supabase.rpc('increment_waiter_sales', { w_id: order.waiter_id, amount: order.total })
  }
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
// ANALYTICS
// =============================================
export async function getAnalytics(venueId = '11111111-1111-1111-1111-111111111111', period = 'month') {
  const now = new Date()
  let startDate
  
  switch(period) {
    case 'today': startDate = new Date(now.setHours(0,0,0,0)); break
    case 'week': startDate = new Date(now.setDate(now.getDate() - 7)); break
    case 'month': startDate = new Date(now.setMonth(now.getMonth() - 1)); break
    case 'year': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break
    default: startDate = new Date(now.setMonth(now.getMonth() - 1))
  }
  
  const { data: orders } = await supabase.from('orders').select('*').eq('venue_id', venueId).gte('created_at', startDate.toISOString())
  
  const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
  const totalOrders = orders?.length || 0
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const paidOrders = orders?.filter(o => o.payment_status === 'paid').length || 0
  
  return { totalRevenue, totalOrders, avgOrder, paidOrders }
}

export async function getEventAnalytics(eventId) {
  const { data: orders } = await supabase.from('orders').select('*, order_items(*)').eq('event_id', eventId)
  
  const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
  const totalOrders = orders?.length || 0
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  
  // Top products
  const productCounts = {}
  orders?.forEach(o => {
    o.order_items?.forEach(item => {
      if (!productCounts[item.name]) productCounts[item.name] = { qty: 0, revenue: 0 }
      productCounts[item.name].qty += item.quantity
      productCounts[item.name].revenue += parseFloat(item.subtotal)
    })
  })
  const topProducts = Object.entries(productCounts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  
  return { totalRevenue, totalOrders, avgOrder, topProducts }
}

export async function getWaiterLeaderboard(eventId = null) {
  if (eventId) {
    const { data } = await supabase.from('event_waiters').select('*, waiters(*)').eq('event_id', eventId).order('event_sales', { ascending: false })
    return data?.map(ew => ({ ...ew.waiters, event_sales: ew.event_sales, event_orders: ew.event_orders })) || []
  } else {
    const { data } = await supabase.from('waiters').select('*').eq('is_active', true).order('total_sales', { ascending: false })
    return data || []
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
