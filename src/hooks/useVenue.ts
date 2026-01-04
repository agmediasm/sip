import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Venue } from '@/types'

interface UseVenueReturn {
  venue: Venue | null
  venueSlug: string | null
  loading: boolean
  error: string | null
}

// Detectează venue din subdomain
function getVenueSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null
  
  const hostname = window.location.hostname
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Poți folosi query param pentru test: ?venue=intooit
    const params = new URLSearchParams(window.location.search)
    return params.get('venue') || 'demo'
  }
  
  // Production: subdomain.sip-app.ro
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const subdomain = parts[0]
    // Exclude admin, www, app
    if (!['admin', 'www', 'app'].includes(subdomain)) {
      return subdomain
    }
  }
  
  return null
}

export function useVenue(): UseVenueReturn {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const venueSlug = getVenueSlugFromHost()

  useEffect(() => {
    if (!venueSlug) {
      setLoading(false)
      setError('Venue not found')
      return
    }

    async function loadVenue() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: dbError } = await supabase
          .from('venues')
          .select('*')
          .eq('slug', venueSlug)
          .eq('is_active', true)
          .single()

        if (dbError || !data) {
          setError('Venue not found or inactive')
          return
        }

        setVenue(data)
      } catch (err) {
        setError('Failed to load venue')
        console.error('useVenue error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadVenue()
  }, [venueSlug])

  return { venue, venueSlug, loading, error }
}
