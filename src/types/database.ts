// ============================================
// DATABASE TYPES - Match Supabase schema
// ============================================

export interface Venue {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  manager_pin: string
  settings: VenueSettings
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VenueSettings {
  currency: string
  timezone: string
  orderCooldownMs: number
  inactiveTableMinutes: number
  enableSound: boolean
  enableUpsells: boolean
}

export interface Event {
  id: string
  venue_id: string
  name: string
  event_date: string
  start_time: string
  end_time?: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface EventTable {
  id: string
  event_id: string
  table_number: string
  table_type: TableType
  zone: TableZone
  grid_row: number
  grid_col: number
  min_spend?: number
  capacity?: number
  is_active: boolean
  created_at: string
}

export type TableType = 'vip' | 'normal' | 'bar'
export type TableZone = 'front' | 'back'

export interface Category {
  id: string
  venue_id: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface MenuItem {
  id: string
  venue_id: string
  category_id: string
  name: string
  description?: string
  default_price: number
  product_type: ProductType
  badge?: ProductBadge
  image_url?: string
  is_available: boolean
  sort_order: number
  created_at: string
}

export type ProductType = 'bottle' | 'cocktail' | 'shot' | 'beer' | 'wine' | 'soft' | 'food' | 'other'
export type ProductBadge = 'popular' | 'premium' | 'new' | 'recommended' | null

export interface EventMenu {
  id: string
  event_id: string
  menu_item_id: string
  custom_price?: number
  is_available: boolean
  menu_items?: MenuItem
}

export interface Waiter {
  id: string
  venue_id: string
  name: string
  phone: string
  pin?: string
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  venue_id: string
  event_id: string
  event_table_id: string
  waiter_id?: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_type?: PaymentType
  total_amount: number
  notes?: string
  customer_name?: string
  customer_phone?: string
  session_id?: string
  created_at: string
  paid_at?: string
  event_tables?: EventTable
  order_items?: OrderItem[]
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded'
export type PaymentType = 'cash' | 'card'

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  name: string
  quantity: number
  unit_price: number
  total_price: number
  paid_quantity: number
  notes?: string
}

export interface Customer {
  id: string
  venue_id: string
  name: string
  phone: string
  email?: string
  total_spent: number
  total_orders: number
  first_visit: string
  last_visit: string
  is_vip: boolean
  notes?: string
}

export interface Reservation {
  id: string
  event_id: string
  event_table_id: string
  customer_name: string
  customer_phone?: string
  party_size: number
  reservation_time: string
  notes?: string
  status: ReservationStatus
  is_vip: boolean
  created_at: string
}

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show'

export interface TableAssignment {
  id: string
  event_id: string
  event_table_id: string
  waiter_id: string
  created_at: string
  waiters?: Waiter
  event_tables?: EventTable
}

// ============================================
// ADMIN / LOGGING TYPES
// ============================================

export interface LogEntry {
  id: string
  venue_id?: string
  level: LogLevel
  category: LogCategory
  message: string
  details?: Record<string, unknown>
  user_id?: string
  user_type?: 'staff' | 'manager' | 'admin' | 'guest'
  ip_address?: string
  user_agent?: string
  created_at: string
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'
export type LogCategory = 'auth' | 'order' | 'payment' | 'menu' | 'system' | 'security' | 'performance'

export interface SystemHealth {
  database: HealthStatus
  realtime: HealthStatus
  api: HealthStatus
  lastCheck: string
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  message?: string
}

export interface ActiveSession {
  id: string
  venue_id: string
  user_type: 'staff' | 'manager' | 'guest'
  user_id?: string
  user_name?: string
  table_id?: string
  started_at: string
  last_activity: string
  device_info?: string
}
