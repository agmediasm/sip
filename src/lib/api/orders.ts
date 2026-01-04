import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, PaymentType, ApiResponse } from '@/types'

// ============================================
// ORDERS API
// ============================================

interface CreateOrderInput {
  venueId: string
  eventId: string
  eventTableId: string
  items: {
    menuItemId: string
    name: string
    quantity: number
    unitPrice: number
  }[]
  customerName?: string
  customerPhone?: string
  notes?: string
  sessionId?: string
}

export async function createOrder(input: CreateOrderInput): Promise<ApiResponse<Order>> {
  try {
    // Validate input
    if (!input.items.length) {
      return { data: null, error: 'Coșul este gol', status: 'error' }
    }

    // Calculate total
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        venue_id: input.venueId,
        event_id: input.eventId,
        event_table_id: input.eventTableId,
        total_amount: totalAmount,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        notes: input.notes,
        session_id: input.sessionId,
        status: 'new',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Create order error:', orderError)
      return { data: null, error: 'Nu s-a putut crea comanda', status: 'error' }
    }

    // Create order items
    const orderItems = input.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      paid_quantity: 0,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback order
      await supabase.from('orders').delete().eq('id', order.id)
      console.error('Create order items error:', itemsError)
      return { data: null, error: 'Nu s-au putut adăuga produsele', status: 'error' }
    }

    // Update customer stats
    if (input.customerPhone) {
      await updateCustomerStats(input.venueId, input.customerPhone, input.customerName, totalAmount)
    }

    return { data: order, error: null, status: 'success' }
  } catch (err) {
    console.error('createOrder exception:', err)
    return { data: null, error: 'Eroare la creare comandă', status: 'error' }
  }
}

export async function getOrders(
  venueId: string,
  options?: {
    eventId?: string
    tableIds?: string[]
    statuses?: OrderStatus[]
    limit?: number
  }
): Promise<ApiResponse<Order[]>> {
  try {
    let query = supabase
      .from('orders')
      .select('*, event_tables(*), order_items(*)')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: true })

    if (options?.eventId) {
      query = query.eq('event_id', options.eventId)
    }

    if (options?.tableIds?.length) {
      query = query.in('event_table_id', options.tableIds)
    }

    if (options?.statuses?.length) {
      query = query.in('status', options.statuses)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch orders', status: 'error' }
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ApiResponse<Order>> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to update order', status: 'error' }
  }
}

export async function markOrderPaid(
  orderId: string,
  paymentType: PaymentType
): Promise<ApiResponse<Order>> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        payment_status: 'paid',
        payment_type: paymentType,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to mark order as paid', status: 'error' }
  }
}

export async function getTableOrders(
  eventId: string,
  tableId: string
): Promise<ApiResponse<Order[]>> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('event_id', eventId)
      .eq('event_table_id', tableId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch table orders', status: 'error' }
  }
}

// Helper: Update customer stats after order
async function updateCustomerStats(
  venueId: string,
  phone: string,
  name?: string,
  amount: number = 0
): Promise<void> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, '')
    
    // Check if customer exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id, total_spent, total_orders')
      .eq('venue_id', venueId)
      .eq('phone', cleanPhone)
      .single()

    if (existing) {
      // Update existing
      await supabase
        .from('customers')
        .update({
          total_spent: existing.total_spent + amount,
          total_orders: existing.total_orders + 1,
          last_visit: new Date().toISOString(),
          ...(name ? { name } : {}),
        })
        .eq('id', existing.id)
    } else {
      // Create new customer
      await supabase.from('customers').insert({
        venue_id: venueId,
        phone: cleanPhone,
        name: name || 'Guest',
        total_spent: amount,
        total_orders: 1,
        first_visit: new Date().toISOString(),
        last_visit: new Date().toISOString(),
        is_vip: false,
      })
    }
  } catch (err) {
    console.error('Failed to update customer stats:', err)
  }
}
