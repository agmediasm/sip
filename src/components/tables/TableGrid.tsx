import { Card, Badge } from '@/components/ui'
import { colors, borderRadius } from '@/styles/theme'
import type { EventTable, TableAssignment } from '@/types'

interface TableGridProps {
  tables: EventTable[]
  assignments?: TableAssignment[]
  onTableClick?: (table: EventTable) => void
  selectedTableId?: string
}

export function TableGrid({ tables, assignments = [], onTableClick, selectedTableId }: TableGridProps) {
  const getAssignment = (tableId: string) => {
    return assignments.find(a => a.event_table_id === tableId)
  }

  const typeColors = {
    vip: colors.vip,
    normal: colors.normal,
    bar: colors.bar,
  }

  if (tables.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '48px', marginBottom: '16px' }}>🪑</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.ivory }}>
          Nicio masă asignată
        </h3>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: colors.textMuted }}>
          Contactează managerul pentru asignarea meselor
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '12px',
    }}>
      {tables.map((table) => {
        const assignment = getAssignment(table.id)
        const isSelected = table.id === selectedTableId
        const typeColor = typeColors[table.table_type] || colors.normal

        return (
          <div
            key={table.id}
            onClick={() => onTableClick?.(table)}
            style={{
              padding: '16px',
              background: isSelected ? colors.charcoal : colors.onyx,
              border: `2px solid ${isSelected ? colors.champagne : colors.border}`,
              borderRadius: borderRadius.lg,
              cursor: onTableClick ? 'pointer' : 'default',
              transition: 'all 0.2s',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${typeColor}20`,
              borderRadius: borderRadius.md,
              border: `2px solid ${typeColor}`,
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: typeColor,
              }}>
                {table.table_number}
              </span>
            </div>

            <Badge variant={table.table_type as 'vip' | 'normal' | 'bar'} size="sm">
              {table.table_type.toUpperCase()}
            </Badge>

            {assignment?.waiters && (
              <p style={{
                margin: '8px 0 0',
                fontSize: '11px',
                color: colors.textMuted,
              }}>
                {(assignment.waiters as { name: string }).name}
              </p>
            )}

            {table.min_spend && (
              <p style={{
                margin: '4px 0 0',
                fontSize: '10px',
                color: colors.textMuted,
              }}>
                Min: {table.min_spend} lei
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
