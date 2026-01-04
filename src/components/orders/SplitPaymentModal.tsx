import { useState } from 'react'
import { Modal, Button, QuantitySelector } from '@/components/ui'
import { colors } from '@/styles/theme'
import type { Order, PaymentType } from '@/types'

interface SplitPaymentModalProps {
  order: Order
  onClose: () => void
  onConfirm: (itemIds: string[], quantities: number[], paymentType: PaymentType) => void
}

export function SplitPaymentModal({ order, onClose, onConfirm }: SplitPaymentModalProps) {
  const items = order.order_items || []
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    items.forEach(item => {
      initial[item.id] = 0
    })
    return initial
  })

  const selectedTotal = items.reduce((sum, item) => {
    const qty = selectedQuantities[item.id] || 0
    return sum + (qty * item.unit_price)
  }, 0)

  const hasSelection = Object.values(selectedQuantities).some(qty => qty > 0)

  const handleConfirm = (paymentType: PaymentType) => {
    const itemIds: string[] = []
    const quantities: number[] = []

    items.forEach(item => {
      const qty = selectedQuantities[item.id] || 0
      if (qty > 0) {
        itemIds.push(item.id)
        quantities.push((item.paid_quantity || 0) + qty)
      }
    })

    onConfirm(itemIds, quantities, paymentType)
  }

  return (
    <Modal isOpen onClose={onClose} title="Plată parțială" size="md">
      <p style={{ color: colors.textMuted, marginBottom: '20px', fontSize: '14px' }}>
        Selectează produsele de plătit:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {items.map(item => {
          const remainingQty = item.quantity - (item.paid_quantity || 0)
          if (remainingQty <= 0) return null

          return (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: colors.charcoal,
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ color: colors.ivory, fontWeight: 500 }}>
                  {item.name}
                </div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>
                  {item.unit_price} LEI × {remainingQty} rămase
                </div>
              </div>
              <QuantitySelector
                value={selectedQuantities[item.id] || 0}
                onChange={(qty) => setSelectedQuantities(prev => ({ ...prev, [item.id]: qty }))}
                min={0}
                max={remainingQty}
                size="sm"
              />
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        background: colors.onyx,
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <span style={{ color: colors.textSecondary }}>Total de plată:</span>
        <span style={{ fontSize: '24px', fontWeight: 600, color: colors.champagne }}>
          {selectedTotal} LEI
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button variant="ghost" onClick={onClose} fullWidth>
          Anulează
        </Button>
        <Button 
          variant="success" 
          onClick={() => handleConfirm('cash')} 
          fullWidth
          disabled={!hasSelection}
        >
          💵 Cash
        </Button>
        <Button 
          variant="primary" 
          onClick={() => handleConfirm('card')} 
          fullWidth
          disabled={!hasSelection}
        >
          💳 Card
        </Button>
      </div>
    </Modal>
  )
}
