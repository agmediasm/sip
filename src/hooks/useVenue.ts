import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Venue } from '@/types'

interface UseVenueReturn {
  venue: Venue | null
  venueSlug: string | null
  loading: boolean
  error: string | null
}

// Detectează venue din subdomain sau query param
function getVenueSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null
  
  const hostname = window.location.hostname
  const params = new URLSearchParams(window.location.search)
  
  // Query param override (pentru testing): ?venue=intooit
  const venueParam = params.get('venue')
  if (venueParam) return venueParam
  
  // Local development - default to 'intooit' or use query param
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'intooit'
  }
  
  // Vercel preview URLs
  if (hostname.includes('vercel.app')) {
    return 'intooit'
  }
  
  // Production: subdomain.sip-app.ro sau subdomain.domain.ro
  const parts = hostname.split('.')
  
  // Check for subdomain pattern (xxx.domain.tld)
  if (parts.length >= 3) {
    const subdomain = parts[0]
    // Exclude admin, www, app, sip
    if (!['admin', 'www', 'app', 'sip'].includes(subdomain)) {
      return subdomain
    }
  }
  
  // Main domain without subdomain - use default venue
  // This handles: sip-app.ro, www.sip-app.ro, app.sip-app.ro
  return 'intooit'
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
