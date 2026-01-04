import { useState } from 'react'
import { Button, Input, Card } from '@/components/ui'
import { colors } from '@/styles/theme'
import type { LoginCredentials } from '@/types'

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<boolean>
  error?: string | null
  title?: string
  subtitle?: string
  showPin?: boolean
}

export function LoginForm({ onLogin, error, title, subtitle, showPin = false }: LoginFormProps) {
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
    <Card variant="default" padding="lg" style={{ width: '100%', maxWidth: '400px' }}>
      {title && (
        <h2 style={{ 
          margin: '0 0 8px', 
          fontSize: '20px', 
          fontWeight: 600, 
          color: colors.ivory,
          textAlign: 'center'
        }}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{ 
          margin: '0 0 24px', 
          fontSize: '14px', 
          color: colors.textMuted,
          textAlign: 'center'
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

          {showPin && (
            <Input
              label="PIN"
              type="password"
              placeholder="****"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
              fullWidth
            />
          )}

          {error && (
            <p style={{ margin: 0, fontSize: '13px', color: colors.error, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
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
