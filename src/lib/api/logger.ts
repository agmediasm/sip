import { supabase } from '@/lib/supabase'
import type { LogEntry, LogLevel, LogCategory, ApiResponse } from '@/types'

export async function createLog(
  venueId: string | null,
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('logs').insert({
      venue_id: venueId,
      level,
      category,
      message,
      details: details || {},
    })
  } catch (err) {
    console.error('Failed to create log:', err)
  }
}

export async function getLogs(
  options?: {
    venueId?: string
    level?: LogLevel
    category?: LogCategory
    limit?: number
    offset?: number
  }
): Promise<ApiResponse<LogEntry[]>> {
  try {
    let query = supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (options?.venueId) {
      query = query.eq('venue_id', options.venueId)
    }

    if (options?.level) {
      query = query.eq('level', options.level)
    }

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch logs', status: 'error' }
  }
}

export async function getErrorLogs(
  venueId?: string,
  limit: number = 50
): Promise<ApiResponse<LogEntry[]>> {
  return getLogs({
    venueId,
    level: 'error',
    limit,
  })
}

export async function getRecentActivity(
  venueId: string,
  limit: number = 20
): Promise<ApiResponse<LogEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('venue_id', venueId)
      .in('category', ['order', 'payment', 'auth'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch activity', status: 'error' }
  }
}
