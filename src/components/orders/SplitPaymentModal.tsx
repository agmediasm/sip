import { useState } from 'react'
import { Modal, Button, Card } from '@/components/ui'
import { colors, borderRadius } from '@/styles/theme'
import type { Order, PaymentType } from '@/types'

interface SplitPaymentModalProps {
  order: Order
  onClose: () => void
  onConfirm: (itemIds: string[], quantities: number[], paymentType: PaymentType) => void
}

export function SplitPaymentModal({ order, onClose, onConfirm }: SplitPaymentModalProps) {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')

  const items = order.order_items || []

  const toggleItem = (itemId: string, maxQty: number) => {
    const current = selectedItems.get(itemId) || 0
    const newMap = new Map(selectedItems)
    
    if (current >= maxQty) {
      newMap.delete(itemId)
    } else {
      newMap.set(itemId, current + 1)
    }
    
    setSelectedItems(newMap)
  }

  const selectedTotal = Array.from(selectedItems.entries()).reduce((sum, [itemId, qty]) => {
    const item = items.find(i => i.id === itemId)
    return sum + (item ? item.unit_price * qty : 0)
  }, 0)

  const handleConfirm = () => {
    const itemIds = Array.from(selectedItems.keys())
    const quantities = Array.from(selectedItems.values())
    onConfirm(itemIds, quantities, paymentType)
  }

  return (
    <Modal isOpen onClose={onClose} title="Plată parțială" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: colors.textSecondary }}>
          Selectează produsele pentru care se face plata:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item) => {
            const unpaidQty = item.quantity - item.paid_quantity
            const selectedQty = selectedItems.get(item.id) || 0
            const isSelected = selectedQty > 0

            if (unpaidQty <= 0) return null

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id, unpaidQty)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: isSelected ? colors.charcoal : colors.onyx,
                  border: `1px solid ${isSelected ? colors.champagne : colors.border}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? colors.champagne : colors.slate,
                    color: isSelected ? colors.noir : colors.textMuted,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {selectedQty > 0 ? selectedQty : unpaidQty}
                  </div>
                  <span style={{ color: colors.ivory }}>{item.name}</span>
                </div>
                <span style={{ color: colors.textSecondary }}>
                  {item.unit_price} lei/buc
                </span>
              </div>
            )
          })}
        </div>

        {/* Payment type selection */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant={paymentType === 'cash' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setPaymentType('cash')}
            style={{ flex: 1 }}
          >
            💵 Cash
          </Button>
          <Button
            variant={paymentType === 'card' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setPaymentType('card')}
            style={{ flex: 1 }}
          >
            💳 Card
          </Button>
        </div>

        {/* Total & Confirm */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: colors.charcoal,
          borderRadius: borderRadius.md,
        }}>
          <span style={{ fontSize: '14px', color: colors.textSecondary }}>
            Total selectat:
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: colors.champagne }}>
            {selectedTotal} lei
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Anulează
          </Button>
          <Button 
            variant="success" 
            size="lg" 
            fullWidth 
            onClick={handleConfirm}
            disabled={selectedItems.size === 0}
          >
            Confirmă plata
          </Button>
        </div>
      </div>
    </Modal>
  )
}
