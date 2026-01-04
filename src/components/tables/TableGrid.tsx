import { colors, borderRadius } from '@/styles/theme'
import type { EventTable, TableAssignment, Waiter } from '@/types'

interface TableGridProps {
  tables: EventTable[]
  assignments?: TableAssignment[]
  orders?: Record<string, number> // tableId -> active orders count
  onTableClick?: (table: EventTable) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelect?: (tableId: string) => void
  zone?: 'front' | 'back' | 'all'
}

export function TableGrid({ 
  tables, 
  assignments = [],
  orders = {},
  onTableClick,
  selectable,
  selectedIds = [],
  onSelect,
  zone = 'all'
}: TableGridProps) {
  const filteredTables = zone === 'all' 
    ? tables 
    : tables.filter(t => t.zone === zone)

  if (filteredTables.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: colors.textMuted 
      }}>
        Nicio masă configurată
      </div>
    )
  }

  // Calculate grid dimensions
  const maxRow = Math.max(...filteredTables.map(t => t.grid_row), 0) + 1
  const maxCol = Math.max(...filteredTables.map(t => t.grid_col), 0) + 1

  // Create grid map
  const gridMap = new Map<string, EventTable>()
  filteredTables.forEach(table => {
    gridMap.set(`${table.grid_row}-${table.grid_col}`, table)
  })

  const getAssignment = (tableId: string) => {
    return assignments.find(a => a.event_table_id === tableId)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${maxCol}, 1fr)`,
      gap: '8px',
      padding: '16px',
      background: colors.onyx,
      borderRadius: borderRadius.lg,
    }}>
      {Array.from({ length: maxRow * maxCol }, (_, idx) => {
        const row = Math.floor(idx / maxCol)
        const col = idx % maxCol
        const table = gridMap.get(`${row}-${col}`)

        if (!table) {
          return <div key={idx} style={{ aspectRatio: '1' }} />
        }

        const assignment = getAssignment(table.id)
        const activeOrders = orders[table.id] || 0
        const isSelected = selectedIds.includes(table.id)

        const typeColors = {
          vip: colors.vip,
          normal: colors.normal,
          bar: colors.bar,
        }

        const waiter = assignment?.waiters as Waiter | undefined

        return (
          <div
            key={table.id}
            onClick={() => {
              if (selectable && onSelect) {
                onSelect(table.id)
              } else if (onTableClick) {
                onTableClick(table)
              }
            }}
            style={{
              aspectRatio: '1',
              background: isSelected ? `${typeColors[table.table_type]}30` : colors.charcoal,
              border: `2px solid ${isSelected ? typeColors[table.table_type] : colors.border}`,
              borderRadius: borderRadius.md,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: onTableClick || selectable ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              position: 'relative',
              minHeight: '70px',
            }}
          >
            {/* Table number */}
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: typeColors[table.table_type],
            }}>
              {table.table_number}
            </span>

            {/* Assigned waiter */}
            {waiter && (
              <span style={{
                fontSize: '10px',
                color: colors.textMuted,
                marginTop: '4px',
              }}>
                {waiter.name?.split(' ')[0]}
              </span>
            )}

            {/* Active orders badge */}
            {activeOrders > 0 && (
              <div style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: colors.error,
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {activeOrders}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
