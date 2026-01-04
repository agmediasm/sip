import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLogger } from './useLogger'

interface AdminUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'support'
}

interface UseAdminAuthReturn {
  admin: AdminUser | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const ADMIN_STORAGE_KEY = 'sip_admin_auth'

export function useAdminAuth(): UseAdminAuthReturn {
  const { log } = useLogger()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_STORAGE_KEY)
    if (saved) {
      try {
        setAdmin(JSON.parse(saved))
      } catch (e) {
        localStorage.removeItem(ADMIN_STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // În producție, folosește hashing pentru parole!
      // Aceasta e doar pentru demo
      const { data, error: dbError } = await supabase
        .from('admin_users')
        .select('id, email, name, role')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single()

      if (dbError || !data) {
        setError('Email sau parolă incorectă')
        log('warn', 'security', 'Admin login failed', { email })
        return false
      }

      // TODO: Verifică parola hash în producție
      // Pentru acum, acceptăm orice parolă pentru admin existent

      setAdmin(data)
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data))
      
      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)

      log('info', 'auth', 'Admin logged in', { adminId: data.id, email: data.email })
      return true

    } catch (err) {
      setError('Eroare la autentificare')
      console.error('Admin login error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [log])

  const logout = useCallback(() => {
    if (admin) {
      log('info', 'auth', 'Admin logged out', { adminId: admin.id })
    }
    setAdmin(null)
    localStorage.removeItem(ADMIN_STORAGE_KEY)
  }, [admin, log])

  return {
    admin,
    isAuthenticated: !!admin,
    loading,
    error,
    login,
    logout,
  }
}
