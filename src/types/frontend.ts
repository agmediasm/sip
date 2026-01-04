// ============================================
// FRONTEND / UI TYPES
// ============================================

import type { MenuItem, OrderStatus } from './database'

// Cart
export interface CartItem {
  menuItem: MenuItem
  quantity: number
  customPrice?: number
  notes?: string
}

export interface Cart {
  items: CartItem[]
  venueId: string
  eventId: string
  tableId: string
}

// Auth
export interface AuthState {
  isAuthenticated: boolean
  user: { id: string; name: string; phone: string } | null
  venue: { id: string; slug: string; name: string } | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  phone: string
  pin: string
}

// UI State
export interface ModalState {
  isOpen: boolean
  data?: unknown
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

// Filters
export interface OrderFilters {
  status?: OrderStatus[]
  tableId?: string
  waiterId?: string
  dateFrom?: string
  dateTo?: string
}

export interface CustomerFilters {
  period: 'all' | 'today' | 'week' | 'month'
  eventId?: string
  isVip?: boolean
  search?: string
}

// Analytics
export interface AnalyticsData {
  totalSales: number
  totalOrders: number
  avgOrderValue: number
  cashAmount: number
  cardAmount: number
  topProducts: ProductStat[]
  topCategories: CategoryStat[]
  hourlyData: HourlyStat[]
}

export interface ProductStat {
  id: string
  name: string
  quantity: number
  revenue: number
}

export interface CategoryStat {
  id: string
  name: string
  revenue: number
  percentage: number
}

export interface HourlyStat {
  hour: number
  orders: number
  revenue: number
}

// Leaderboard
export interface WaiterLeaderboard {
  waiterId: string
  waiterName: string
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
}

// Forms
export interface EventFormData {
  name: string
  event_date: string
  start_time: string
  end_time?: string
  description?: string
}

export interface WaiterFormData {
  name: string
  phone: string
  pin?: string
}

export interface ReservationFormData {
  customer_name: string
  customer_phone?: string
  party_size: number
  reservation_time: string
  notes?: string
  is_vip: boolean
}

export interface ProductFormData {
  name: string
  description?: string
  default_price: number
  category_id: string
  product_type: string
  badge?: string
  is_available: boolean
}

// API Responses
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Realtime
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T | null
}
