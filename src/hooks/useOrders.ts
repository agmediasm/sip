import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useVenue } from './useVenue'
import { useLogger } from './useLogger'
import type { Order, OrderStatus, PaymentType } from '@/types'

interface UseOrdersOptions {
  eventId?: string
  tableIds?: string[]
  statuses?: OrderStatus[]
  realtime?: boolean
}

interface UseOrdersReturn {
  orders: Order[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateStatus: (orderId: string, status: OrderStatus) => Promise<boolean>
  markPaid: (orderId: string, paymentType: PaymentType) => Promise<boolean>
  markPartialPaid: (orderId: string, itemIds: string[], quantities: number[], paymentType: PaymentType) => Promise<boolean>
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const { venue } = useVenue()
  const { log } = useLogger()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const fetchOrders = useCallback(async () => {
    if (!venue) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('orders')
        .select('*, event_tables(*), order_items(*)')
        .eq('venue_id', venue.id)
        .order('created_at', { ascending: true })

      if (optionsRef.current.eventId) {
        query = query.eq('event_id', optionsRef.current.eventId)
      }

      if (optionsRef.current.tableIds?.length) {
        query = query.in('event_table_id', optionsRef.current.tableIds)
      }

      if (optionsRef.current.statuses?.length) {
        query = query.in('status', optionsRef.current.statuses)
      }

      const { data, error: dbError } = await query

      if (dbError) {
        throw dbError
      }

      setOrders(data || [])
    } catch (err) {
      setError('Failed to load orders')
      console.error('useOrders fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [venue])

  // Initial fetch
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Realtime subscription
  useEffect(() => {
    if (!venue || !options.realtime || !options.eventId) return

    const channel = supabase
      .channel(`orders-${options.eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `event_id=eq.${options.eventId}`,
        },
        (payload) => {
          log('debug', 'order', 'Realtime order update', { type: payload.eventType })
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venue, options.realtime, options.eventId, fetchOrders, log])

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (dbError) throw dbError

      log('info', 'order', `Order status updated to ${status}`, { orderId })
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      
      return true
    } catch (err) {
      log('error', 'order', 'Failed to update order status', { orderId, status, error: err })
      return false
    }
  }, [log])

  const markPaid = useCallback(async (orderId: string, paymentType: PaymentType): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_status: 'paid',
          payment_type: paymentType,
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (dbError) throw dbError

      log('info', 'payment', `Order paid via ${paymentType}`, { orderId })
      
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, status: 'delivered', payment_status: 'paid', payment_type: paymentType }
          : o
      ))
      
      return true
    } catch (err) {
      log('error', 'payment', 'Failed to mark order as paid', { orderId, error: err })
      return false
    }
  }, [log])

  const markPartialPaid = useCallback(async (
    orderId: string,
    itemIds: string[],
    quantities: number[],
    paymentType: PaymentType
  ): Promise<boolean> => {
    try {
      // Update paid quantities for each item
      for (let i = 0; i < itemIds.length; i++) {
        await supabase
          .from('order_items')
          .update({ paid_quantity: quantities[i] })
          .eq('id', itemIds[i])
      }

      // Check if all items are paid
      const order = orders.find(o => o.id === orderId)
      if (order) {
        const allPaid = order.order_items?.every((item, idx) => {
          const newPaidQty = itemIds.includes(item.id) 
            ? quantities[itemIds.indexOf(item.id)]
            : item.paid_quantity
          return newPaidQty >= item.quantity
        })

        await supabase
          .from('orders')
          .update({
            payment_status: allPaid ? 'paid' : 'partial',
            payment_type: paymentType,
            ...(allPaid ? { status: 'delivered', paid_at: new Date().toISOString() } : {}),
          })
          .eq('id', orderId)
      }

      log('info', 'payment', 'Partial payment processed', { orderId, itemIds })
      await fetchOrders()
      
      return true
    } catch (err) {
      log('error', 'payment', 'Failed to process partial payment', { orderId, error: err })
      return false
    }
  }, [orders, fetchOrders, log])

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    updateStatus,
    markPaid,
    markPartialPaid,
  }
}
