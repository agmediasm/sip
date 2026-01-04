import { useState } from 'react'
import { Card, Button, Badge, Modal, Input, EmptyState } from '@/components/ui'
import { Section } from '@/components/layout'
import { createEvent, updateEvent, deleteEvent } from '@/lib/api'
import { colors, borderRadius } from '@/styles/theme'
import type { Event } from '@/types'

interface EventsTabProps {
  venueId: string
  events: Event[]
  selectedEvent: Event | null
  onSelectEvent: (event: Event | null) => void
  onRefresh: () => void
}

export function EventsTab({ venueId, events, selectedEvent, onSelectEvent, onRefresh }: EventsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)

  return (
    <div>
      <Section
        title="Evenimente"
        action={
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            + Eveniment nou
          </Button>
        }
      >
        {events.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Niciun eveniment"
            description="Creează primul eveniment pentru a începe"
            action={
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Creează eveniment
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map(event => (
              <Card
                key={event.id}
                variant={selectedEvent?.id === event.id ? 'glow' : 'default'}
                padding="md"
                hoverable
                onClick={() => onSelectEvent(event)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: colors.ivory }}>
                        {event.name}
                      </span>
                      <Badge variant={event.is_active ? 'success' : 'error'}>
                        {event.is_active ? 'ACTIV' : 'INACTIV'}
                      </Badge>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
                      {event.event_date} • {event.start_time}
                      {event.end_time && ` - ${event.end_time}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditEvent(event)
                      }}
                    >
                      ✏️
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* Create/Edit Modal */}
      {(showCreateModal || editEvent) && (
        <EventFormModal
          venueId={venueId}
          event={editEvent}
          onClose={() => {
            setShowCreateModal(false)
            setEditEvent(null)
          }}
          onSave={onRefresh}
        />
      )}
    </div>
  )
}

function EventFormModal({ 
  venueId, 
  event, 
  onClose, 
  onSave 
}: { 
  venueId: string
  event: Event | null
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(event?.name || '')
  const [eventDate, setEventDate] = useState(event?.event_date || new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState(event?.start_time || '20:00')
  const [endTime, setEndTime] = useState(event?.end_time || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (event) {
        const result = await updateEvent(event.id, { name, event_date: eventDate, start_time: startTime, end_time: endTime || undefined })
        if (result.status === 'error') throw new Error(result.error || 'Failed')
      } else {
        const result = await createEvent(venueId, { name, event_date: eventDate, start_time: startTime, end_time: endTime || undefined })
        if (result.status === 'error') throw new Error(result.error || 'Failed')
      }
      onSave()
      onClose()
    } catch (err) {
      setError('Nu s-a putut salva evenimentul')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !confirm('Sigur vrei să ștergi acest eveniment?')) return
    setLoading(true)
    try {
      await deleteEvent(event.id)
      onSave()
      onClose()
    } catch (err) {
      setError('Nu s-a putut șterge')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen 
      onClose={onClose} 
      title={event ? 'Editează eveniment' : 'Eveniment nou'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Nume eveniment"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Vineri Seara"
            fullWidth
          />
          <Input
            label="Data"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            fullWidth
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input
              label="Ora start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              fullWidth
            />
            <Input
              label="Ora final (opțional)"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              fullWidth
            />
          </div>

          {error && (
            <p style={{ color: colors.error, fontSize: '13px', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {event && (
              <Button variant="danger" onClick={handleDelete} disabled={loading}>
                Șterge
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Anulează
            </Button>
            <Button variant="primary" type="submit" loading={loading} disabled={!name}>
              {event ? 'Salvează' : 'Creează'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
