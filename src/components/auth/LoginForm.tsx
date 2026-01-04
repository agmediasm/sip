import { useState } from 'react'
import { Card, Input, Button } from '@/components/ui'
import { colors, borderRadius } from '@/styles/theme'
import type { LoginCredentials } from '@/types'

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<boolean>
  error?: string | null
  title?: string
  subtitle?: string
}

export function LoginForm({ onLogin, error, title = 'Login', subtitle }: LoginFormProps) {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onLogin({ phone, pin })
    setLoading(false)
  }

  return (
    <Card variant="elevated" padding="lg" style={{ width: '100%', maxWidth: '360px' }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: 600, 
        color: colors.ivory,
        marginBottom: '8px',
        textAlign: 'center',
      }}>
        {title}
      </h2>
      
      {subtitle && (
        <p style={{ 
          fontSize: '14px', 
          color: colors.textMuted,
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          {subtitle}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Telefon"
            type="tel"
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />

          <Input
            label="PIN"
            type="password"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={6}
            fullWidth
          />

          {error && (
            <div style={{
              padding: '12px',
              background: `${colors.error}20`,
              border: `1px solid ${colors.error}`,
              borderRadius: borderRadius.sm,
              color: colors.error,
              fontSize: '13px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            variant="primary" 
            fullWidth 
            loading={loading}
            disabled={!phone}
          >
            Intră
          </Button>
        </div>
      </form>
    </Card>
  )
}
