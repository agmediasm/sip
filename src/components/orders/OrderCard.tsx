import { Card, Badge, Button } from '@/components/ui'
import { colors, borderRadius } from '@/styles/theme'
import type { Order, OrderStatus, PaymentType } from '@/types'

interface OrderCardProps {
  order: Order
  onStatusChange?: (orderId: string, status: OrderStatus) => void
  onMarkPaid?: (orderId: string, paymentType: PaymentType) => void
  onSplitPayment?: (order: Order) => void
  showActions?: boolean
}

export function OrderCard({ order, onStatusChange, onMarkPaid, onSplitPayment, showActions }: OrderCardProps) {
  const tableNumber = order.event_tables?.table_number || '?'
  const tableType = order.event_tables?.table_type || 'normal'
  const items = order.order_items || []
  const createdAt = new Date(order.created_at)
  const timeAgo = getTimeAgo(createdAt)

  const statusColors: Record<OrderStatus, string> = {
    new: colors.champagne,
    preparing: colors.warning,
    ready: colors.success,
    delivered: colors.textMuted,
    cancelled: colors.error,
  }

  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    new: 'preparing',
    preparing: 'ready',
    ready: 'delivered',
  }

  const statusLabels: Record<OrderStatus, string> = {
    new: 'Nouă',
    preparing: 'În preparare',
    ready: 'Gata',
    delivered: 'Livrată',
    cancelled: 'Anulată',
  }

  const nextStatusLabels: Partial<Record<OrderStatus, string>> = {
    new: 'Începe prepararea',
    preparing: 'Marchează gata',
    ready: 'Marchează livrată',
  }

  return (
    <Card variant="default" padding="md">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '8px 12px',
            background: colors.charcoal,
            borderRadius: borderRadius.md,
            borderLeft: `3px solid ${colors[tableType as keyof typeof colors] || colors.normal}`,
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: colors.ivory }}>
              {tableNumber}
            </span>
          </div>
          <div>
            <Badge variant={tableType === 'vip' ? 'vip' : tableType === 'bar' ? 'bar' : 'normal'}>
              {tableType.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ 
            fontSize: '11px', 
            color: statusColors[order.status],
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {statusLabels[order.status]}
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.textMuted }}>
            {timeAgo}
          </p>
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: '16px' }}>
        {items.map((item, idx) => (
          <div 
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: idx < items.length - 1 ? `1px solid ${colors.border}` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: colors.charcoal,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: colors.champagne,
              }}>
                {item.quantity}
              </span>
              <span style={{ fontSize: '14px', color: colors.ivory }}>{item.name}</span>
            </div>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}>
              {item.total_price} lei
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.textSecondary }}>
          TOTAL
        </span>
        <span style={{ fontSize: '18px', fontWeight: 700, color: colors.champagne }}>
          {order.total_amount} lei
        </span>
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{
          padding: '12px',
          background: colors.charcoal,
          borderRadius: borderRadius.sm,
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>📝 {order.notes}</span>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Status change */}
          {nextStatus[order.status] && onStatusChange && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStatusChange(order.id, nextStatus[order.status]!)}
            >
              {nextStatusLabels[order.status]}
            </Button>
          )}

          {/* Payment (only for ready/delivered) */}
          {order.status === 'ready' && order.payment_status === 'pending' && onMarkPaid && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => onMarkPaid(order.id, 'cash')}
              >
                💵 Cash
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => onMarkPaid(order.id, 'card')}
              >
                💳 Card
              </Button>
              {onSplitPayment && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSplitPayment(order)}
                >
                  ✂️ Split
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'acum'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ore`
  return `${Math.floor(seconds / 86400)} zile`
}
