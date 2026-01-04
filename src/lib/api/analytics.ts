import { supabase } from '@/lib/supabase'
import type { AnalyticsData, WaiterLeaderboard, ApiResponse } from '@/types'

export async function getAnalytics(
  venueId: string,
  options?: {
    period?: 'today' | 'week' | 'month' | 'all'
    eventId?: string
  }
): Promise<ApiResponse<AnalyticsData>> {
  try {
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('venue_id', venueId)
      .eq('payment_status', 'paid')

    // Apply period filter
    if (options?.period && options.period !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (options.period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('paid_at', startDate.toISOString())
    }

    if (options?.eventId) {
      query = query.eq('event_id', options.eventId)
    }

    const { data: orders, error } = await query

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    // Calculate analytics
    const totalOrders = orders?.length || 0
    const totalSales = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
    const cashAmount = orders?.filter(o => o.payment_type === 'cash').reduce((sum, o) => sum + o.total_amount, 0) || 0
    const cardAmount = orders?.filter(o => o.payment_type === 'card').reduce((sum, o) => sum + o.total_amount, 0) || 0
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Top products
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    orders?.forEach(order => {
      order.order_items?.forEach((item: { menu_item_id: string; name: string; quantity: number; total_price: number }) => {
        const existing = productMap.get(item.menu_item_id) || { name: item.name, quantity: 0, revenue: 0 }
        productMap.set(item.menu_item_id, {
          name: item.name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.total_price,
        })
      })
    })

    const topProducts = Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const analytics: AnalyticsData = {
      totalSales,
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue),
      cashAmount,
      cardAmount,
      topProducts,
      topCategories: [], // TODO: implement
      hourlyData: [], // TODO: implement
    }

    return { data: analytics, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch analytics', status: 'error' }
  }
}

export async function getWaiterLeaderboard(
  venueId: string,
  options?: {
    period?: 'today' | 'week' | 'month' | 'all'
    eventId?: string
  }
): Promise<ApiResponse<WaiterLeaderboard[]>> {
  try {
    let query = supabase
      .from('orders')
      .select('waiter_id, total_amount')
      .eq('venue_id', venueId)
      .eq('payment_status', 'paid')
      .not('waiter_id', 'is', null)

    if (options?.eventId) {
      query = query.eq('event_id', options.eventId)
    }

    const { data: orders, error } = await query

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    // Group by waiter
    const waiterMap = new Map<string, { orders: number; revenue: number }>()
    orders?.forEach(order => {
      if (!order.waiter_id) return
      const existing = waiterMap.get(order.waiter_id) || { orders: 0, revenue: 0 }
      waiterMap.set(order.waiter_id, {
        orders: existing.orders + 1,
        revenue: existing.revenue + order.total_amount,
      })
    })

    // Get waiter names
    const waiterIds = Array.from(waiterMap.keys())
    const { data: waiters } = await supabase
      .from('waiters')
      .select('id, name')
      .in('id', waiterIds)

    const waiterNames = new Map(waiters?.map(w => [w.id, w.name]) || [])

    const leaderboard: WaiterLeaderboard[] = Array.from(waiterMap.entries())
      .map(([waiterId, data]) => ({
        waiterId,
        waiterName: waiterNames.get(waiterId) || 'Unknown',
        totalOrders: data.orders,
        totalRevenue: data.revenue,
        avgOrderValue: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    return { data: leaderboard, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch leaderboard', status: 'error' }
  }
}
