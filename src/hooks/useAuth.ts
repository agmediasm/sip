import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useVenue } from './useVenue'
import { useLogger } from './useLogger'
import type { Waiter, LoginCredentials } from '@/types'

interface UseAuthReturn {
  user: Waiter | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
}

const STORAGE_KEY = 'sip_auth'

export function useAuth(role: 'staff' | 'manager' = 'staff'): UseAuthReturn {
  const { venue } = useVenue()
  const { log } = useLogger()
  const [user, setUser] = useState<Waiter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_${role}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setUser(parsed)
      } catch (e) {
        localStorage.removeItem(`${STORAGE_KEY}_${role}`)
      }
    }
    setLoading(false)
  }, [role])

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    if (!venue) {
      setError('Venue not loaded')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Sanitize phone - remove spaces, keep only digits and +
      const cleanPhone = credentials.phone.replace(/[^\d+]/g, '')

      if (role === 'manager') {
        // Manager login - check venue PIN
        const { data: venueData } = await supabase
          .from('venues')
          .select('manager_pin')
          .eq('id', venue.id)
          .single()

        if (!venueData || venueData.manager_pin !== credentials.pin) {
          setError('PIN incorect')
          log('warn', 'auth', 'Manager login failed - wrong PIN', { venueId: venue.id })
          return false
        }

        const managerUser = {
          id: 'manager',
          venue_id: venue.id,
          name: 'Manager',
          phone: '',
          is_active: true,
          created_at: new Date().toISOString(),
        }

        setUser(managerUser)
        localStorage.setItem(`${STORAGE_KEY}_${role}`, JSON.stringify(managerUser))
        log('info', 'auth', 'Manager logged in', { venueId: venue.id })
        return true
      }

      // Staff login
      const { data: waiter, error: dbError } = await supabase
        .from('waiters')
        .select('*')
        .eq('venue_id', venue.id)
        .eq('phone', cleanPhone)
        .eq('is_active', true)
        .single()

      if (dbError || !waiter) {
        setError('Număr de telefon invalid sau cont inactiv')
        log('warn', 'auth', 'Staff login failed - user not found', { phone: cleanPhone })
        return false
      }

      // Check PIN if set
      if (waiter.pin && waiter.pin !== credentials.pin) {
        setError('PIN incorect')
        log('warn', 'auth', 'Staff login failed - wrong PIN', { waiterId: waiter.id })
        return false
      }

      setUser(waiter)
      localStorage.setItem(`${STORAGE_KEY}_${role}`, JSON.stringify(waiter))
      log('info', 'auth', 'Staff logged in', { waiterId: waiter.id, name: waiter.name })
      return true

    } catch (err) {
      setError('Eroare la autentificare')
      console.error('Login error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [venue, role, log])

  const logout = useCallback(() => {
    if (user) {
      log('info', 'auth', `${role} logged out`, { userId: user.id })
    }
    setUser(null)
    localStorage.removeItem(`${STORAGE_KEY}_${role}`)
  }, [user, role, log])

  return {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
  }
}
