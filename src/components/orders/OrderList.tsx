import { OrderCard } from './OrderCard'
import type { Order, OrderStatus, PaymentType } from '@/types'

interface OrderListProps {
  orders: Order[]
  onStatusChange?: (orderId: string, status: OrderStatus) => void
  onMarkPaid?: (orderId: string, paymentType: PaymentType) => void
  onSplitPayment?: (order: Order) => void
  showActions?: boolean
}

export function OrderList({ 
  orders, 
  onStatusChange, 
  onMarkPaid,
  onSplitPayment,
  showActions 
}: OrderListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onStatusChange={onStatusChange}
          onMarkPaid={onMarkPaid}
          onSplitPayment={onSplitPayment}
          showActions={showActions}
        />
      ))}
    </div>
  )
}
