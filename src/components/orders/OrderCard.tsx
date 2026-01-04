import { colors, borderRadius } from '@/styles/theme'
import { Card, Badge, Button } from '@/components/ui'
import type { Order, OrderStatus, PaymentType } from '@/types'

interface OrderCardProps {
  order: Order
  onStatusChange?: (orderId: string, status: OrderStatus) => void
  onMarkPaid?: (orderId: string, paymentType: PaymentType) => void
  onSplitPayment?: (order: Order) => void
  showActions?: boolean
}

export function OrderCard({ 
  order, 
  onStatusChange, 
  onMarkPaid, 
  onSplitPayment,
  showActions = true 
}: OrderCardProps) {
  const tableName = order.event_tables?.table_number || 'N/A'
  const tableType = order.event_tables?.table_type || 'normal'
  const total = order.total_amount || 0
  const items = order.order_items || []
  const createdAt = new Date(order.created_at)
  const minutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000)

  const statusConfig: Record<OrderStatus, { label: string; color: string; nextStatus: OrderStatus | null; nextLabel: string | null }> = {
    new: { label: 'Nouă', color: colors.warning, nextStatus: 'preparing', nextLabel: 'Începe' },
    preparing: { label: 'În preparare', color: colors.champagne, nextStatus: 'ready', nextLabel: 'Gata' },
    ready: { label: 'Gata', color: colors.success, nextStatus: null, nextLabel: null },
    delivered: { label: 'Livrat', color: colors.textMuted, nextStatus: null, nextLabel: null },
    cancelled: { label: 'Anulat', color: colors.error, nextStatus: null, nextLabel: null },
  }

  const config = statusConfig[order.status]
  const badgeVariant = tableType === 'vip' ? 'vip' : tableType === 'bar' ? 'bar' : 'normal'

  return (
    <Card variant="default" padding="none" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Badge variant={badgeVariant}>{tableName}</Badge>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>
            {minutesAgo}m ago
          </span>
        </div>
        <Badge variant={order.status === 'new' ? 'warning' : order.status === 'ready' ? 'success' : 'premium'}>
          {config.label}
        </Badge>
      </div>

      {/* Items */}
      <div style={{ padding: '16px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: idx < items.length - 1 ? `1px solid ${colors.border}` : 'none',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ 
                color: colors.champagne, 
                fontWeight: 600,
                minWidth: '24px',
              }}>
                {item.quantity}×
              </span>
              <span style={{ color: colors.ivory }}>{item.name}</span>
            </div>
            <span style={{ color: colors.textSecondary }}>
              {item.total_price} LEI
            </span>
          </div>
        ))}

        {order.notes && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: colors.charcoal,
            borderRadius: borderRadius.sm,
            fontSize: '13px',
            color: colors.warning,
          }}>
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${colors.border}`,
        background: colors.charcoal,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: showActions ? '16px' : 0,
        }}>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>Total</span>
          <span style={{ 
            fontSize: '20px', 
            fontWeight: 600, 
            color: colors.champagne,
          }}>
            {total} LEI
          </span>
        </div>

        {showActions && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Status change button */}
            {config.nextStatus && onStatusChange && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onStatusChange(order.id, config.nextStatus!)}
                style={{ flex: 1 }}
              >
                {config.nextLabel}
              </Button>
            )}

            {/* Payment buttons - only for ready orders */}
            {order.status === 'ready' && order.payment_status !== 'paid' && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onMarkPaid?.(order.id, 'cash')}
                  style={{ flex: 1 }}
                >
                  💵 Cash
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onMarkPaid?.(order.id, 'card')}
                  style={{ flex: 1 }}
                >
                  💳 Card
                </Button>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSplitPayment?.(order)}
                    style={{ flex: 1 }}
                  >
                    ✂️ Split
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
