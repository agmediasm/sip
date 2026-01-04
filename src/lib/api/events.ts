import { supabase } from '@/lib/supabase'
import type { Event, ApiResponse } from '@/types'

export async function getEvents(venueId: string): Promise<ApiResponse<Event[]>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('event_date', { ascending: false })

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch events', status: 'error' }
  }
}

export async function getAllEvents(venueId: string): Promise<ApiResponse<Event[]>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venueId)
      .order('event_date', { ascending: false })

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch events', status: 'error' }
  }
}

export async function getEvent(eventId: string): Promise<ApiResponse<Event>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch event', status: 'error' }
  }
}

export async function createEvent(
  venueId: string,
  input: {
    name: string
    event_date: string
    start_time: string
    end_time?: string
    description?: string
  }
): Promise<ApiResponse<Event>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        venue_id: venueId,
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
    return { data: null, error: 'Failed to create event', status: 'error' }
  }
}

export async function updateEvent(
  eventId: string,
  input: Partial<Event>
): Promise<ApiResponse<Event>> {
  try {
    const { data, error } = await supabase
      .from('events')
      .update(input)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to update event', status: 'error' }
  }
}

export async function deleteEvent(eventId: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('events')
      .update({ is_active: false })
      .eq('id', eventId)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: null, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to delete event', status: 'error' }
  }
}

// Get active event for a venue (for QR scanning)
export async function getActiveEvent(venueId: string): Promise<ApiResponse<Event | null>> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .eq('event_date', today)
      .order('start_time', { ascending: true })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || null, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch active event', status: 'error' }
  }
}
