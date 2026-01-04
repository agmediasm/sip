import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useLogger } from './useLogger'

type RealtimeCallback = (payload: unknown) => void

interface UseRealtimeOptions {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  enabled?: boolean
}

export function useRealtime(
  options: UseRealtimeOptions,
  callback: RealtimeCallback
): void {
  const { log } = useLogger()
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (options.enabled === false) return

    const channelName = `realtime-${options.table}-${options.filter || 'all'}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: 'public',
          table: options.table,
          filter: options.filter,
        },
        (payload) => {
          log('debug', 'system', `Realtime: ${options.table} ${payload.eventType}`)
          callbackRef.current(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          log('debug', 'system', `Realtime subscribed: ${options.table}`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.table, options.filter, options.event, options.enabled, log])
}
