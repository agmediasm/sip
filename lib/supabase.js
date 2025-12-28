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
