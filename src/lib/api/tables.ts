import { supabase } from '@/lib/supabase'
import type { EventTable, TableAssignment, TableType, TableZone, ApiResponse } from '@/types'

export async function getEventTables(eventId: string): Promise<ApiResponse<EventTable[]>> {
  try {
    const { data, error } = await supabase
      .from('event_tables')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('table_number')

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch tables', status: 'error' }
  }
}

export async function createEventTable(
  eventId: string,
  input: {
    table_number: string
    table_type: TableType
    zone: TableZone
    grid_row: number
    grid_col: number
    min_spend?: number
    capacity?: number
  }
): Promise<ApiResponse<EventTable>> {
  try {
    const { data, error } = await supabase
      .from('event_tables')
      .insert({
        event_id: eventId,
        ...input,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to create table', status: 'error' }
  }
}

export async function deleteEventTable(tableId: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('event_tables')
      .delete()
      .eq('id', tableId)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: null, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to delete table', status: 'error' }
  }
}

export async function getTableAssignments(eventId: string): Promise<ApiResponse<TableAssignment[]>> {
  try {
    const { data, error } = await supabase
      .from('table_assignments')
      .select('*, waiters(*), event_tables(*)')
      .eq('event_id', eventId)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch assignments', status: 'error' }
  }
}

export async function assignTableToWaiter(
  eventId: string,
  tableId: string,
  waiterId: string
): Promise<ApiResponse<TableAssignment>> {
  try {
    // Remove existing assignment for this table
    await supabase
      .from('table_assignments')
      .delete()
      .eq('event_id', eventId)
      .eq('event_table_id', tableId)

    // Create new assignment
    const { data, error } = await supabase
      .from('table_assignments')
      .insert({
        event_id: eventId,
        event_table_id: tableId,
        waiter_id: waiterId,
      })
      .select('*, waiters(*), event_tables(*)')
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to assign table', status: 'error' }
  }
}

interface ResolveTableResult {
  status: 'ok' | 'upcoming' | 'ended' | 'no_event' | 'table_not_found' | 'venue_not_found' | 'error'
  venue?: Record<string, unknown>
  event?: Record<string, unknown>
  table?: Record<string, unknown>
  message?: string
  minutesUntilStart?: number
  isTestMode?: boolean
}

export async function resolveTableForOrder(
  venueSlug: string,
  tableNumber: string
): Promise<ResolveTableResult> {
  try {
    // Handle test mode
    if (venueSlug === 'testing' || venueSlug === 'demo') {
      const { data: venue } = await supabase
        .from('venues')
        .select('*')
        .limit(1)
        .single()

      if (!venue) {
        return { status: 'error', message: 'Venue not configured' }
      }

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('venue_id', venue.id)
        .eq('is_active', true)
        .order('event_date', { ascending: false })
        .limit(1)

      const event = events?.[0]
      if (!event) {
        return { status: 'no_event', venue, message: 'Niciun eveniment activ' }
      }

      const { data: table } = await supabase
        .from('event_tables')
        .select('*')
        .eq('event_id', event.id)
        .ilike('table_number', tableNumber)
        .limit(1)
        .single()

      if (!table) {
        const { data: anyTable } = await supabase
          .from('event_tables')
          .select('*')
          .eq('event_id', event.id)
          .limit(1)
          .single()

        return anyTable
          ? { status: 'ok', venue, event, table: anyTable, isTestMode: true }
          : { status: 'table_not_found', venue, event, message: `Masa ${tableNumber} nu există` }
      }

      return { status: 'ok', venue, event, table, isTestMode: true }
    }

    // Production mode - get venue by slug
    const { data: venue } = await supabase
      .from('venues')
      .select('*')
      .ilike('slug', venueSlug)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!venue) {
      return { status: 'venue_not_found', message: 'Locația nu a fost găsită' }
    }

    // Get today's event
    const today = new Date().toISOString().split('T')[0]
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .eq('event_date', today)
      .order('start_time', { ascending: true })

    if (!events?.length) {
      return { status: 'no_event', venue, message: 'Niciun eveniment azi' }
    }

    const event = events[0]
    
    // Check event timing
    const now = new Date()
    const eventStart = new Date(`${event.event_date}T${event.start_time}`)
    const minutesUntilStart = Math.round((eventStart.getTime() - now.getTime()) / 60000)

    if (minutesUntilStart > 60) {
      return {
        status: 'upcoming',
        venue,
        event,
        message: `Evenimentul începe la ${event.start_time}`,
        minutesUntilStart,
      }
    }

    // Find table
    const { data: table } = await supabase
      .from('event_tables')
      .select('*')
      .eq('event_id', event.id)
      .ilike('table_number', tableNumber)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!table) {
      return {
        status: 'table_not_found',
        venue,
        event,
        message: `Masa ${tableNumber} nu este configurată pentru acest eveniment`,
      }
    }

    return { status: 'ok', venue, event, table }
  } catch (err) {
    console.error('resolveTableForOrder error:', err)
    return { status: 'error', message: 'Eroare la încărcare' }
  }
}
