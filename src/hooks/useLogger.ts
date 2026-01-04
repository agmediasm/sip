import { useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useVenue } from './useVenue'
import type { LogLevel, LogCategory } from '@/types'

interface UseLoggerReturn {
  log: (level: LogLevel, category: LogCategory, message: string, details?: Record<string, unknown>) => void
  error: (message: string, error?: unknown, details?: Record<string, unknown>) => void
  info: (category: LogCategory, message: string, details?: Record<string, unknown>) => void
  warn: (category: LogCategory, message: string, details?: Record<string, unknown>) => void
}

// Buffer logs to send in batches (performance)
const logBuffer: Array<{
  venue_id: string | null
  level: LogLevel
  category: LogCategory
  message: string
  details: Record<string, unknown>
  created_at: string
}> = []
let flushTimeout: ReturnType<typeof setTimeout> | null = null

async function flushLogs() {
  if (logBuffer.length === 0) return
  
  const logsToSend = [...logBuffer]
  logBuffer.length = 0
  
  try {
    await supabase.from('logs').insert(logsToSend)
  } catch (err) {
    console.error('Failed to flush logs:', err)
    // Put logs back in buffer
    logBuffer.push(...logsToSend)
  }
}

export function useLogger(): UseLoggerReturn {
  const { venue } = useVenue()
  const venueIdRef = useRef<string | null>(null)
  venueIdRef.current = venue?.id || null

  const log = useCallback((
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, unknown>
  ) => {
    // Always console.log in development
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    consoleMethod(`[${level.toUpperCase()}] [${category}] ${message}`, details || '')

    // Add to buffer for DB insert
    logBuffer.push({
      venue_id: venueIdRef.current,
      level,
      category,
      message,
      details: details || {},
      created_at: new Date().toISOString(),
    })

    // Debounce flush
    if (flushTimeout) clearTimeout(flushTimeout)
    flushTimeout = setTimeout(flushLogs, 1000) // Flush after 1 second of inactivity
  }, [])

  const error = useCallback((message: string, err?: unknown, details?: Record<string, unknown>) => {
    const errorObj = err as Error | undefined
    log('error', 'system', message, {
      ...details,
      error: errorObj?.message || String(err),
      stack: errorObj?.stack,
    })
  }, [log])

  const info = useCallback((category: LogCategory, message: string, details?: Record<string, unknown>) => {
    log('info', category, message, details)
  }, [log])

  const warn = useCallback((category: LogCategory, message: string, details?: Record<string, unknown>) => {
    log('warn', category, message, details)
  }, [log])

  return { log, error, info, warn }
}
