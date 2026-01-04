import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventTable, TableAssignment } from '@/types'

interface UseTablesReturn {
  tables: EventTable[]
  assignments: TableAssignment[]
  loading: boolean
  error: string | null
  getMyTables: (waiterId: string) => EventTable[]
  refetch: () => Promise<void>
}

export function useTables(eventId?: string): UseTablesReturn {
  const [tables, setTables] = useState<EventTable[]>([])
  const [assignments, setAssignments] = useState<TableAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
    if (!eventId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [tablesRes, assignRes] = await Promise.all([
        supabase
          .from('event_tables')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_active', true)
          .order('table_number'),
        supabase
          .from('table_assignments')
          .select('*, waiters(*)')
          .eq('event_id', eventId),
      ])

      if (tablesRes.data) setTables(tablesRes.data)
      if (assignRes.data) setAssignments(assignRes.data)
    } catch (err) {
      setError('Failed to load tables')
      console.error('useTables error:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const getMyTables = useCallback((waiterId: string): EventTable[] => {
    const myTableIds = assignments
      .filter(a => a.waiter_id === waiterId)
      .map(a => a.event_table_id)
    
    return tables.filter(t => myTableIds.includes(t.id))
  }, [tables, assignments])

  return {
    tables,
    assignments,
    loading,
    error,
    getMyTables,
    refetch: fetchTables,
  }
}
