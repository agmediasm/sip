import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { LogLevel, LogCategory } from '@/types'

interface UseLoggerReturn {
  log: (level: LogLevel, category: LogCategory, message: string, details?: Record<string, unknown>) => void
}

export function useLogger(venueId?: string): UseLoggerReturn {
  const log = useCallback(
    (level: LogLevel, category: LogCategory, message: string, details?: Record<string, unknown>) => {
      // Console log for development
      const logFn = level === 'error' || level === 'critical' ? console.error : console.log
      logFn(`[${level.toUpperCase()}] [${category}] ${message}`, details || '')

      // Send to database (fire and forget)
      supabase
        .from('logs')
        .insert({
          venue_id: venueId || null,
          level,
          category,
          message,
          details: details || {},
        })
        .then(() => {})
        .catch((err) => console.error('Failed to write log:', err))
    },
    [venueId]
  )

  return { log }
}
