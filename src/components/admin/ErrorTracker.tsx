import { useState, useEffect } from 'react'
import { Card, Button, Badge, Spinner, EmptyState, Modal } from '@/components/ui'
import { Section } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { colors, borderRadius } from '@/styles/theme'

interface ErrorTrackerProps {
  venueId: string | null
}

interface ErrorReport {
  id: string
  venue_id: string | null
  error_type: string
  error_message: string
  stack_trace: string | null
  component: string | null
  user_action: string | null
  resolved: boolean
  created_at: string
}

export function ErrorTracker({ venueId }: ErrorTrackerProps) {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null)

  useEffect(() => {
    loadErrors()
  }, [venueId, showResolved])

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

      if (!showResolved) {
        query = query.eq('resolved', false)
      }

      const { data } = await query
      if (data) setErrors(data)
    } catch (err) {
      console.error('Load errors error:', err)
    } finally {
      setLoading(false)
    }
  }

  const markResolved = async (errorId: string) => {
    try {
      await supabase
        .from('error_reports')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', errorId)
      loadErrors()
      setSelectedError(null)
    } catch (err) {
      console.error('Mark resolved error:', err)
    }
  }

  const unresolvedCount = errors.filter(e => !e.resolved).length

  return (
    <div>
      <Section
        title={`🔴 Error Tracker ${unresolvedCount > 0 ? `(${unresolvedCount} nerezolvate)` : ''}`}
        action={
          <Button
            variant={showResolved ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Ascunde rezolvate' : 'Arată rezolvate'}
          </Button>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner />
          </div>
        ) : errors.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Nicio eroare"
            description={showResolved ? 'Nicio eroare înregistrată' : 'Toate erorile au fost rezolvate'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errors.map((error) => (
              <Card 
                key={error.id} 
                variant={error.resolved ? 'outlined' : 'default'} 
                padding="md"
                hoverable
                onClick={() => setSelectedError(error)}
                style={{ cursor: 'pointer', opacity: error.resolved ? 0.6 : 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge variant={error.resolved ? 'success' : 'error'}>
                        {error.resolved ? 'REZOLVAT' : 'ACTIV'}
                      </Badge>
                      <span style={{ color: colors.ivory, fontWeight: 500 }}>
                        {error.error_type}
                      </span>
                    </div>
                    <p style={{ 
                      margin: '8px 0 0', 
                      fontSize: '13px', 
                      color: colors.textMuted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '600px',
                    }}>
                      {error.error_message}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: colors.textMuted }}>
                    {new Date(error.created_at).toLocaleString('ro-RO')}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* Error Details Modal */}
      {selectedError && (
        <Modal 
          isOpen 
          onClose={() => setSelectedError(null)} 
          title="Detalii Eroare" 
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Tip
              </label>
              <p style={{ margin: '4px 0', color: colors.ivory }}>{selectedError.error_type}</p>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                Mesaj
              </label>
              <p style={{ margin: '4px 0', color: colors.error }}>{selectedError.error_message}</p>
            </div>

            {selectedError.component && (
              <div>
                <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Component
                </label>
                <p style={{ margin: '4px 0', color: colors.ivory }}>{selectedError.component}</p>
              </div>
            )}

            {selectedError.stack_trace && (
              <div>
                <label style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Stack Trace
                </label>
                <pre style={{
                  margin: '4px 0',
                  padding: '12px',
                  background: colors.charcoal,
                  borderRadius: borderRadius.sm,
                  color: colors.textSecondary,
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}>
                  {selectedError.stack_trace}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button variant="ghost" onClick={() => setSelectedError(null)}>
                Închide
              </Button>
              {!selectedError.resolved && (
                <Button variant="success" onClick={() => markResolved(selectedError.id)}>
                  ✓ Marchează rezolvat
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
