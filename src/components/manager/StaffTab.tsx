import { useState, useEffect } from 'react'
import { Card, Button, Badge, Modal, Input, EmptyState, Spinner } from '@/components/ui'
import { Section, Grid } from '@/components/layout'
import { getWaiters, createWaiter, updateWaiter, deleteWaiter, restoreWaiter } from '@/lib/api'
import { colors, borderRadius } from '@/styles/theme'
import type { Waiter } from '@/types'

interface StaffTabProps {
  venueId: string
  eventId?: string
}

export function StaffTab({ venueId, eventId }: StaffTabProps) {
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editWaiter, setEditWaiter] = useState<Waiter | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadWaiters()
  }, [venueId, showInactive])

  const loadWaiters = async () => {
    setLoading(true)
    try {
      const result = await getWaiters(venueId, showInactive ? 'all' : 'active')
      if (result.data) {
        setWaiters(result.data)
      }
    } catch (err) {
      console.error('Load waiters error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const activeWaiters = waiters.filter(w => w.is_active)
  const inactiveWaiters = waiters.filter(w => !w.is_active)

  return (
    <div>
      <Section
        title="Staff"
        subtitle={`${activeWaiters.length} activi`}
        action={
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant={showInactive ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Ascunde inactivi' : 'Arată inactivi'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              + Staff nou
            </Button>
          </div>
        }
      >
        {waiters.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Niciun staff"
            description="Adaugă primul membru al echipei"
            action={
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Adaugă staff
              </Button>
            }
          />
        ) : (
          <Grid cols={3} gap="md">
            {activeWaiters.map(waiter => (
              <WaiterCard
                key={waiter.id}
                waiter={waiter}
                onEdit={() => setEditWaiter(waiter)}
              />
            ))}
            {showInactive && inactiveWaiters.map(waiter => (
              <WaiterCard
                key={waiter.id}
                waiter={waiter}
                onEdit={() => setEditWaiter(waiter)}
                onRestore={async () => {
                  await restoreWaiter(waiter.id)
                  loadWaiters()
                }}
              />
            ))}
          </Grid>
        )}
      </Section>

      {/* Create/Edit Modal */}
      {(showCreateModal || editWaiter) && (
        <WaiterFormModal
          venueId={venueId}
          waiter={editWaiter}
          onClose={() => {
            setShowCreateModal(false)
            setEditWaiter(null)
          }}
          onSave={loadWaiters}
        />
      )}
    </div>
  )
}

function WaiterCard({ 
  waiter, 
  onEdit,
  onRestore 
}: { 
  waiter: Waiter
  onEdit: () => void
  onRestore?: () => void
}) {
  return (
    <Card 
      variant={waiter.is_active ? 'default' : 'outlined'} 
      padding="md"
      style={{ opacity: waiter.is_active ? 1 : 0.6 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: colors.ivory }}>
              {waiter.name}
            </span>
            {!waiter.is_active && (
              <Badge variant="error" size="sm">INACTIV</Badge>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
            📞 {waiter.phone}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!waiter.is_active && onRestore && (
            <Button variant="success" size="sm" onClick={onRestore}>
              Reactivează
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            ✏️
          </Button>
        </div>
      </div>
    </Card>
  )
}

function WaiterFormModal({
  venueId,
  waiter,
  onClose,
  onSave,
}: {
  venueId: string
  waiter: Waiter | null
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(waiter?.name || '')
  const [phone, setPhone] = useState(waiter?.phone || '')
  const [pin, setPin] = useState(waiter?.pin || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (waiter) {
        const result = await updateWaiter(waiter.id, { name, phone, pin: pin || undefined })
        if (result.status === 'error') throw new Error(result.error || 'Failed')
      } else {
        const result = await createWaiter(venueId, { name, phone, pin: pin || undefined })
        if (result.status === 'error') throw new Error(result.error || 'Failed')
      }
      onSave()
      onClose()
    } catch (err) {
      setError('Nu s-a putut salva')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!waiter || !confirm('Sigur vrei să dezactivezi acest staff?')) return
    setLoading(true)
    try {
      await deleteWaiter(waiter.id)
      onSave()
      onClose()
    } catch (err) {
      setError('Nu s-a putut dezactiva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={waiter ? 'Editează staff' : 'Staff nou'} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Nume"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ion Popescu"
            fullWidth
          />
          <Input
            label="Telefon"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            fullWidth
          />
          <Input
            label="PIN (opțional)"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            maxLength={6}
            fullWidth
          />

          {error && (
            <p style={{ color: colors.error, fontSize: '13px', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {waiter && waiter.is_active && (
              <Button variant="danger" onClick={handleDelete} disabled={loading}>
                Dezactivează
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Anulează
            </Button>
            <Button variant="primary" type="submit" loading={loading} disabled={!name || !phone}>
              {waiter ? 'Salvează' : 'Creează'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
