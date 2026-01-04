import { Card, Badge } from '@/components/ui'
import { colors } from '@/styles/theme'
import type { EventTable } from '@/types'

interface TableCardProps {
  table: EventTable
  waiterName?: string
  activeOrders?: number
  totalSpent?: number
  onClick?: () => void
}

export function TableCard({ table, waiterName, activeOrders = 0, totalSpent = 0, onClick }: TableCardProps) {
  const typeColors = {
    vip: colors.vip,
    normal: colors.normal,
    bar: colors.bar,
  }

  return (
    <Card 
      variant="default" 
      hoverable={!!onClick}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: typeColors[table.table_type] 
            }}>
              {table.table_number}
            </span>
            <Badge variant={table.table_type}>{table.table_type.toUpperCase()}</Badge>
          </div>
          {waiterName && (
            <div style={{ fontSize: '13px', color: colors.textMuted }}>
              👤 {waiterName}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          {activeOrders > 0 && (
            <div style={{ 
              color: colors.warning, 
              fontSize: '13px', 
              fontWeight: 600,
              marginBottom: '4px' 
            }}>
              {activeOrders} comenzi active
            </div>
          )}
          {totalSpent > 0 && (
            <div style={{ 
              color: colors.champagne, 
              fontSize: '15px', 
              fontWeight: 600 
            }}>
              {totalSpent} LEI
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
