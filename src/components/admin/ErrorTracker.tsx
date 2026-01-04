import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, Button, Badge, Modal, Spinner, EmptyState } from '@/components/ui'
import { colors, borderRadius } from '@/styles/theme'

interface ErrorReport {
  id: string
  venue_id: string
  error_type: string
  error_message: string
  stack_trace?: string
  component?: string
  user_action?: string
  browser_info?: Record<string, unknown>
  resolved: boolean
  resolved_at?: string
  resolved_by?: string
  notes?: string
  created_at: string
}

interface ErrorTrackerProps {
  venueId: string | null
}

export function ErrorTracker({ venueId }: ErrorTrackerProps) {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null)
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0 })

  useEffect(() => {
    loadErrors()
  }, [venueId, filter])

  const loadErrors = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (venueId) {
        query = query.eq('venue_id', venueId)
      }

      if (filter === 'open') {
        query = query.eq('resolved', false)
      } else if (filter === 'resolved') {
        query = query.eq('resolved', true)
      }

      const { data } = await query

      setErrors(data || [])

      // Calculate stats
      const allErrors = data || []
      setStats({
        total: allErrors.length,
        open: allErrors.filter(e => !e.resolved).length,
        resolved: allErrors.filter(e => e.resolved).length,
      })
    } catch (err) {
      console.error('Load errors error:', err)
    } finally {
      setLoading(false)
    }
  }

  const markResolved = async (errorId: string, notes?: string) => {
    try {
      await supabase
        .from('error_reports')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: 'Admin',
          notes,
        })
        .eq('id', errorId)

      loadErrors()
      setSelectedError(null)
    } catch (err) {
      console.error('Mark resolved error:', err)
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <Card 
          variant={filter === 'all' ? 'glow' : 'default'} 
          padding="md"
          hoverable
          onClick={() => setFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 600, color: colors.ivory }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted }}>TOTAL ERRORS</div>
          </div>
        </Card>

        <Card 
          variant={filter === 'open' ? 'glow' : 'default'} 
          padding="md"
          hoverable
          onClick={() => setFilter('open')}
          style={{ cursor: 'pointer', borderColor: filter === 'open' ? colors.error : undefined }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 600, color: colors.error }}>
              {stats.open}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted }}>OPEN</div>
          </div>
        </Card>

        <Card 
          variant={filter === 'resolved' ? 'glow' : 'default'} 
          padding="md"
          hoverable
          onClick={() => setFilter('resolved')}
          style={{ cursor: 'pointer', borderColor: filter === 'resolved' ? colors.success : undefined }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 600, color: colors.success }}>
              {stats.resolved}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted }}>RESOLVED</div>
          </div>
        </Card>
      </div>

      {/* Errors list */}
      <Card variant="default" padding="none">
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.ivory }}>
            🔴 Error Reports
          </h3>
          <Button variant="ghost" size="sm" onClick={loadErrors}>
            🔄 Refresh
          </Button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner />
          </div>
        ) : errors.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No errors"
            description={filter === 'open' ? 'Nu sunt erori nerezolvate!' : 'Nu sunt erori în această categorie'}
          />
        ) : (
          <div>
            {errors.map(error => (
              <div
                key={error.id}
                onClick={() => setSelectedError(error)}
                style={{
                  padding: '16px',
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  background: error.resolved ? 'transparent' : `${colors.error}08`,
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px',
                    }}>
                      <Badge variant={error.resolved ? 'success' : 'error'}>
                        {error.resolved ? 'RESOLVED' : 'OPEN'}
                      </Badge>
                      <span style={{ 
                        fontSize: '12px', 
                        color: colors.textMuted,
                        fontFamily: 'monospace',
                      }}>
                        {error.error_type}
                      </span>
                    </div>
                    <div style={{ 
                      color: colors.ivory,
                      fontSize: '14px',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {error.error_message}
                    </div>
                    {error.component && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: colors.textMuted,
                        fontFamily: 'monospace',
                      }}>
                        → {error.component}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: colors.textMuted,
                    whiteSpace: 'nowrap',
                  }}>
                    {getTimeAgo(error.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Error detail modal */}
      {selectedError && (
        <Modal
          isOpen
          onClose={() => setSelectedError(null)}
          title="Error Details"
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Type
              </label>
              <div style={{ fontFamily: 'monospace', color: colors.error }}>
                {selectedError.error_type}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Message
              </label>
              <div style={{ color: colors.ivory }}>
                {selectedError.error_message}
              </div>
            </div>

            {selectedError.stack_trace && (
              <div>
                <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Stack Trace
                </label>
                <pre style={{
                  padding: '12px',
                  background: colors.charcoal,
                  borderRadius: borderRadius.md,
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  color: colors.textSecondary,
                }}>
                  {selectedError.stack_trace}
                </pre>
              </div>
            )}

            {selectedError.user_action && (
              <div>
                <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                  User Action
                </label>
                <div style={{ color: colors.ivory }}>
                  {selectedError.user_action}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                {new Date(selectedError.created_at).toLocaleString('ro-RO')}
              </div>
              
              {!selectedError.resolved && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => markResolved(selectedError.id)}
                >
                  ✓ Mark Resolved
                </Button>
              )}
            </div>

            {/* Copy button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const text = `Error: ${selectedError.error_type}\n${selectedError.error_message}\n\n${selectedError.stack_trace || ''}`
                navigator.clipboard.writeText(text)
              }}
            >
              📋 Copy to Clipboard
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
