import { useState, useEffect } from 'react'
import { Card, Badge, Spinner, Button } from '@/components/ui'
import { Section, Grid } from '@/components/layout'
import { supabase } from '@/lib/supabase'
import { colors, borderRadius } from '@/styles/theme'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  message?: string
  lastCheck: Date
}

export function SystemHealth() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runHealthChecks()
  }, [])

  const runHealthChecks = async () => {
    setLoading(true)
    const results: HealthCheck[] = []

    // Database check
    const dbStart = Date.now()
    try {
      await supabase.from('venues').select('id').limit(1)
      results.push({
        name: 'Database',
        status: 'healthy',
        latency: Date.now() - dbStart,
        lastCheck: new Date(),
      })
    } catch (err) {
      results.push({
        name: 'Database',
        status: 'down',
        latency: Date.now() - dbStart,
        message: 'Connection failed',
        lastCheck: new Date(),
      })
    }

    // Realtime check
    const rtStart = Date.now()
    try {
      const channel = supabase.channel('health-check')
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000)
        channel.subscribe((status) => {
          clearTimeout(timeout)
          if (status === 'SUBSCRIBED') {
            resolve()
          }
        })
      })
      supabase.removeChannel(channel)
      results.push({
        name: 'Realtime',
        status: 'healthy',
        latency: Date.now() - rtStart,
        lastCheck: new Date(),
      })
    } catch (err) {
      results.push({
        name: 'Realtime',
        status: 'degraded',
        latency: Date.now() - rtStart,
        message: 'Connection slow or failed',
        lastCheck: new Date(),
      })
    }

    // Storage check (if applicable)
    results.push({
      name: 'Storage',
      status: 'healthy',
      latency: 0,
      message: 'Not configured',
      lastCheck: new Date(),
    })

    // Auth check
    results.push({
      name: 'Auth',
      status: 'healthy',
      latency: 0,
      message: 'Using custom auth',
      lastCheck: new Date(),
    })

    setChecks(results)
    setLoading(false)
  }

  const statusColors = {
    healthy: colors.success,
    degraded: colors.warning,
    down: colors.error,
  }

  const overallStatus = checks.every(c => c.status === 'healthy') 
    ? 'healthy' 
    : checks.some(c => c.status === 'down') 
      ? 'down' 
      : 'degraded'

  return (
    <div>
      <Section
        title="🖥️ System Health"
        action={
          <Button variant="ghost" size="sm" onClick={runHealthChecks}>
            🔃 Refresh
          </Button>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner />
          </div>
        ) : (
          <>
            {/* Overall status */}
            <Card 
              variant="glow" 
              padding="lg" 
              style={{ 
                marginBottom: '24px',
                borderColor: statusColors[overallStatus],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '40px' }}>
                  {overallStatus === 'healthy' ? '✅' : overallStatus === 'degraded' ? '⚠️' : '❌'}
                </span>
                <div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>
                    Status general
                  </div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 600, 
                    color: statusColors[overallStatus],
                    textTransform: 'uppercase',
                  }}>
                    {overallStatus === 'healthy' ? 'Toate sistemele funcționează' : 
                     overallStatus === 'degraded' ? 'Unele servicii au probleme' : 
                     'Probleme critice detectate'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Individual checks */}
            <Grid cols={2} gap="md">
              {checks.map((check) => (
                <Card key={check.name} variant="default" padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%',
                          background: statusColors[check.status],
                        }} />
                        <span style={{ color: colors.ivory, fontWeight: 500 }}>
                          {check.name}
                        </span>
                      </div>
                      {check.message && (
                        <p style={{ margin: '4px 0 0 18px', fontSize: '12px', color: colors.textMuted }}>
                          {check.message}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Badge 
                        variant={check.status === 'healthy' ? 'success' : check.status === 'degraded' ? 'warning' : 'error'}
                      >
                        {check.status.toUpperCase()}
                      </Badge>
                      {check.latency > 0 && (
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.textMuted }}>
                          {check.latency}ms
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </Grid>
          </>
        )}
      </Section>
    </div>
  )
}
