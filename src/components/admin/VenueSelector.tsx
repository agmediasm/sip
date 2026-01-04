import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { colors, borderRadius } from '@/styles/theme'
import type { Venue } from '@/types'

interface VenueSelectorProps {
  selectedVenueId: string | null
  onChange: (venueId: string | null) => void
}

export function VenueSelector({ selectedVenueId, onChange }: VenueSelectorProps) {
  const [venues, setVenues] = useState<Pick<Venue, 'id' | 'name' | 'slug'>[]>([])

  useEffect(() => {
    loadVenues()
  }, [])

  const loadVenues = async () => {
    const { data } = await supabase
      .from('venues')
      .select('id, name, slug')
      .order('name')
    
    if (data) setVenues(data)
  }

  return (
    <select
      value={selectedVenueId || 'all'}
      onChange={(e) => onChange(e.target.value === 'all' ? null : e.target.value)}
      style={{
        padding: '10px 16px',
        background: colors.charcoal,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        color: colors.ivory,
        fontSize: '13px',
        minWidth: '180px',
        cursor: 'pointer',
      }}
    >
      <option value="all">🌐 Toate venue-urile</option>
      {venues.map(venue => (
        <option key={venue.id} value={venue.id}>
          {venue.name}
        </option>
      ))}
    </select>
  )
}
