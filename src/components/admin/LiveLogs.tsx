import { useState, useEffect } from 'react'
import { Card, Button, Badge, Spinner, EmptyState } from '@/components/ui'
import { Section } from '@/components/layout'
import { getLogs } from '@/lib/api'
import { colors, borderRadius } from '@/styles/theme'
import type { LogEntry, LogLevel, LogCategory } from '@/types'

interface LiveLogsProps {
  venueId: string | null
}

export function LiveLogs({ venueId }: LiveLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ level?: LogLevel; category?: LogCategory }>({})
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadLogs()
    
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000) // Refresh every 5s
      return () => clearInterval(interval)
    }
  }, [venueId, filter, autoRefresh])

  const loadLogs = async () => {
    try {
      const result = await getLogs({
        venueId: venueId || undefined,
        level: filter.level,
        category: filter.category,
        limit: 100,
      })
      if (result.data) {
        setLogs(result.data)
      }
    } catch (err) {
      console.error('Load logs error:', err)
    } finally {
      setLoading(false)
    }
  }

  const levelColors: Record<LogLevel, string> = {
    debug: colors.textMuted,
    info: colors.normal,
    warn: colors.warning,
    error: colors.error,
    critical: colors.error,
  }

  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical']
  const categories: LogCategory[] = ['auth', 'order', 'payment', 'menu', 'system', 'security', 'performance']

  return (
    <div>
      <Section title="📋 Live Logs">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <select
            value={filter.level || ''}
            onChange={(e) => setFilter({ ...filter, level: e.target.value as LogLevel || undefined })}
            style={{
              padding: '8px 12px',
              background: colors.charcoal,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              color: colors.ivory,
              fontSize: '13px',
            }}
          >
            <option value="">Toate nivelurile</option>
            {levels.map(l => (
              <option key={l} value={l}>{l.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={filter.category || ''}
            onChange={(e) => setFilter({ ...filter, category: e.target.value as LogCategory || undefined })}
            style={{
              padding: '8px 12px',
              background: colors.charcoal,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              color: colors.ivory,
              fontSize: '13px',
            }}
          >
            <option value="">Toate categoriile</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>

          <Button
            variant={autoRefresh ? 'success' : 'ghost'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </Button>

          <Button variant="ghost" size="sm" onClick={loadLogs}>
            🔃 Refresh
          </Button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Niciun log"
            description="Nu există logs pentru filtrele selectate"
          />
        ) : (
          <Card variant="default" padding="none" style={{ overflow: 'hidden' }}>
            <div style={{ maxHeight: '600px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: colors.charcoal }}>
                    <th style={thStyle}>Timp</th>
                    <th style={thStyle}>Nivel</th>
                    <th style={thStyle}>Categorie</th>
                    <th style={thStyle}>Mesaj</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={tdStyle}>
                        {new Date(log.created_at).toLocaleTimeString('ro-RO')}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ 
                          color: levelColors[log.level], 
                          fontWeight: 600,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                        }}>
                          {log.level}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Badge variant="premium" size="sm">{log.category}</Badge>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '400px' }}>
                        <div style={{ color: colors.ivory }}>{log.message}</div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <pre style={{ 
                            margin: '4px 0 0', 
                            fontSize: '10px', 
                            color: colors.textMuted,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Section>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '11px',
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '13px',
  color: colors.textSecondary,
  verticalAlign: 'top',
}
