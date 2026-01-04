import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/hooks/useRealtime'
import { Card, Button, Spinner, EmptyState } from '@/components/ui'
import { colors, borderRadius } from '@/styles/theme'
import type { LogEntry, LogLevel, LogCategory } from '@/types'

interface LiveLogsProps {
  venueId: string | null
}

export function LiveLogs({ venueId }: LiveLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    level: LogLevel | 'all'
    category: LogCategory | 'all'
  }>({ level: 'all', category: 'all' })
  const [autoScroll, setAutoScroll] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Load initial logs
  useEffect(() => {
    loadLogs()
  }, [venueId, filter])

  // Realtime subscription
  useRealtime(
    { table: 'logs', event: 'INSERT', enabled: !isPaused },
    (payload) => {
      const newLog = payload.new as unknown as LogEntry
      
      // Check if matches filter
      if (venueId && newLog.venue_id !== venueId) return
      if (filter.level !== 'all' && newLog.level !== filter.level) return
      if (filter.category !== 'all' && newLog.category !== filter.category) return

      setLogs(prev => [...prev.slice(-199), newLog]) // Keep last 200
    }
  )

  // Auto scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const loadLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (venueId) {
        query = query.eq('venue_id', venueId)
      }

      if (filter.level !== 'all') {
        query = query.eq('level', filter.level)
      }

      if (filter.category !== 'all') {
        query = query.eq('category', filter.category)
      }

      const { data } = await query

      setLogs((data || []).reverse())
    } catch (err) {
      console.error('Load logs error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const levelConfig: Record<LogLevel, { color: string; icon: string }> = {
    debug: { color: colors.textMuted, icon: '🔍' },
    info: { color: colors.success, icon: '✅' },
    warn: { color: colors.warning, icon: '⚠️' },
    error: { color: colors.error, icon: '❌' },
    critical: { color: '#ff0000', icon: '🔴' },
  }

  const categoryIcons: Record<LogCategory, string> = {
    auth: '🔐',
    order: '🛒',
    payment: '💳',
    menu: '📋',
    system: '⚙️',
    security: '🛡️',
    performance: '⚡',
  }

  return (
    <Card variant="default" padding="none" style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Level filter */}
          <select
            value={filter.level}
            onChange={(e) => setFilter(f => ({ ...f, level: e.target.value as LogLevel | 'all' }))}
            style={{
              padding: '8px 12px',
              background: colors.charcoal,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              color: colors.ivory,
              fontSize: '12px',
            }}
          >
            <option value="all">Toate nivelurile</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          {/* Category filter */}
          <select
            value={filter.category}
            onChange={(e) => setFilter(f => ({ ...f, category: e.target.value as LogCategory | 'all' }))}
            style={{
              padding: '8px 12px',
              background: colors.charcoal,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              color: colors.ivory,
              fontSize: '12px',
            }}
          >
            <option value="all">Toate categoriile</option>
            <option value="auth">Auth</option>
            <option value="order">Order</option>
            <option value="payment">Payment</option>
            <option value="menu">Menu</option>
            <option value="system">System</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
          </select>

          <span style={{ 
            fontSize: '12px', 
            color: colors.textMuted,
            padding: '0 8px',
          }}>
            {logs.length} logs
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '12px',
            color: colors.textMuted,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>

          <Button
            variant={isPaused ? 'success' : 'ghost'}
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </Button>

          <Button variant="ghost" size="sm" onClick={clearLogs}>
            🗑️ Clear
          </Button>

          <Button variant="ghost" size="sm" onClick={loadLogs}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Logs list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px',
        background: '#0d0d0f',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No logs"
            description="Log-urile vor apărea aici în timp real"
          />
        ) : (
          <div style={{ padding: '8px' }}>
            {logs.map((log, idx) => {
              const config = levelConfig[log.level]
              const time = new Date(log.created_at).toLocaleTimeString('ro-RO', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })

              return (
                <div
                  key={log.id || idx}
                  style={{
                    padding: '6px 8px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    background: log.level === 'error' || log.level === 'critical' 
                      ? `${colors.error}10` 
                      : 'transparent',
                  }}
                >
                  <span style={{ color: colors.textMuted, minWidth: '70px' }}>
                    {time}
                  </span>
                  <span style={{ minWidth: '20px' }}>
                    {config.icon}
                  </span>
                  <span style={{ 
                    minWidth: '60px',
                    color: config.color,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}>
                    {log.level}
                  </span>
                  <span style={{ minWidth: '20px' }}>
                    {categoryIcons[log.category]}
                  </span>
                  <span style={{ 
                    minWidth: '80px',
                    color: colors.textSecondary,
                    fontSize: '10px',
                  }}>
                    [{log.category}]
                  </span>
                  <span style={{ color: colors.ivory, flex: 1 }}>
                    {log.message}
                  </span>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details style={{ cursor: 'pointer' }}>
                      <summary style={{ color: colors.champagne, fontSize: '10px' }}>
                        details
                      </summary>
                      <pre style={{ 
                        margin: '4px 0 0',
                        padding: '8px',
                        background: colors.charcoal,
                        borderRadius: '4px',
                        fontSize: '10px',
                        overflow: 'auto',
                      }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </Card>
  )
}
