import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, Badge, Spinner } from '@/components/ui'
import { colors } from '@/styles/theme'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  lastCheck: Date
  message?: string
}

export function SystemHealth() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFullCheck, setLastFullCheck] = useState<Date>(new Date())

  useEffect(() => {
    runHealthChecks()
    // Check every 60 seconds
    const interval = setInterval(runHealthChecks, 60000)
    return () => clearInterval(interval)
  }, [])

  const runHealthChecks = async () => {
    setLoading(true)
    const results: HealthCheck[] = []

    // 1. Supabase Database Check
    try {
      const start = Date.now()
      const { error } = await supabase.from('venues').select('id').limit(1)
      const latency = Date.now() - start

      results.push({
        name: 'Supabase Database',
        status: error ? 'down' : latency > 2000 ? 'degraded' : 'healthy',
        latency,
        lastCheck: new Date(),
        message: error?.message,
      })
    } catch (err) {
      results.push({
        name: 'Supabase Database',
        status: 'down',
        latency: 0,
        lastCheck: new Date(),
        message: 'Connection failed',
      })
    }

    // 2. Supabase Realtime Check
    try {
      const start = Date.now()
      const channel = supabase.channel('health-check')
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000)
        channel.subscribe((status) => {
          clearTimeout(timeout)
          if (status === 'SUBSCRIBED') resolve()
          else reject(new Error(status))
        })
      })

      const latency = Date.now() - start
      supabase.removeChannel(channel)

      results.push({
        name: 'Supabase Realtime',
        status: latency > 3000 ? 'degraded' : 'healthy',
        latency,
        lastCheck: new Date(),
      })
    } catch (err) {
      const error = err as Error
      results.push({
        name: 'Supabase Realtime',
        status: 'down',
        latency: 0,
        lastCheck: new Date(),
        message: error?.message || 'Connection failed',
      })
    }

    // 3. API Response Check
    try {
      const start = Date.now()
      const { error } = await supabase.from('logs').select('id').limit(1)
      const latency = Date.now() - start

      results.push({
        name: 'API Response',
        status: error ? 'degraded' : latency > 1500 ? 'degraded' : 'healthy',
        latency,
        lastCheck: new Date(),
      })
    } catch (err) {
      results.push({
        name: 'API Response',
        status: 'down',
        latency: 0,
        lastCheck: new Date(),
        message: 'API unreachable',
      })
    }

    // 4. Storage Check (simplified)
    results.push({
      name: 'Storage',
      status: 'healthy',
      latency: 0,
      lastCheck: new Date(),
      message: 'Not monitored',
    })

    setChecks(results)
    setLastFullCheck(new Date())
    setLoading(false)
  }

  const getOverallStatus = () => {
    if (checks.some(c => c.status === 'down')) return 'down'
    if (checks.some(c => c.status === 'degraded')) return 'degraded'
    return 'healthy'
  }

  const statusConfig = {
    healthy: { color: colors.success, label: 'Operational', icon: '✅' },
    degraded: { color: colors.warning, label: 'Degraded', icon: '⚠️' },
    down: { color: colors.error, label: 'Down', icon: '❌' },
  }

  const overallStatus = getOverallStatus()
  const overall = statusConfig[overallStatus]

  return (
    <div>
      {/* Overall status */}
      <Card 
        variant="glow" 
        padding="lg" 
        style={{ 
          marginBottom: '24px',
          borderColor: overall.color,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{overall.icon}</div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 600, 
          color: overall.color,
          marginBottom: '8px',
        }}>
          System {overall.label}
        </div>
        <div style={{ fontSize: '13px', color: colors.textMuted }}>
          Last check: {lastFullCheck.toLocaleTimeString('ro-RO')}
        </div>
      </Card>

      {/* Individual checks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && checks.length === 0 ? (
          <Card variant="default" padding="lg">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Spinner />
            </div>
          </Card>
        ) : (
          checks.map((check, idx) => {
            const config = statusConfig[check.status]

            return (
              <Card key={idx} variant="default" padding="md">
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{config.icon}</span>
                    <div>
                      <div style={{ 
                        fontWeight: 600, 
                        color: colors.ivory,
                        marginBottom: '2px',
                      }}>
                        {check.name}
                      </div>
                      {check.message && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: colors.textMuted 
                        }}>
                          {check.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {check.latency > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: 600,
                          color: check.latency > 1000 ? colors.warning : colors.ivory,
                        }}>
                          {check.latency}ms
                        </div>
                        <div style={{ fontSize: '10px', color: colors.textMuted }}>
                          latency
                        </div>
                      </div>
                    )}
                    <Badge variant={check.status === 'healthy' ? 'success' : check.status === 'degraded' ? 'warning' : 'error'}>
                      {config.label}
                    </Badge>
                  </div>
                </div>

                {/* Latency bar */}
                {check.latency > 0 && (
                  <div style={{
                    marginTop: '12px',
                    height: '4px',
                    background: colors.charcoal,
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(100, (check.latency / 3000) * 100)}%`,
                      height: '100%',
                      background: check.latency > 2000 
                        ? colors.error 
                        : check.latency > 1000 
                          ? colors.warning 
                          : colors.success,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Uptime info */}
      <Card variant="default" padding="md" style={{ marginTop: '24px' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: colors.textMuted }}>
          📊 System Info
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          fontSize: '13px',
        }}>
          <div>
            <div style={{ color: colors.textMuted }}>Environment</div>
            <div style={{ color: colors.ivory, fontWeight: 500 }}>Production</div>
          </div>
          <div>
            <div style={{ color: colors.textMuted }}>Region</div>
            <div style={{ color: colors.ivory, fontWeight: 500 }}>EU (Frankfurt)</div>
          </div>
          <div>
            <div style={{ color: colors.textMuted }}>Version</div>
            <div style={{ color: colors.ivory, fontWeight: 500 }}>2.0.0</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
