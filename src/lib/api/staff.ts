import { supabase } from '@/lib/supabase'
import type { Waiter, ApiResponse } from '@/types'

export async function getWaiters(
  venueId: string,
  filter: 'all' | 'active' | 'inactive' = 'active'
): Promise<ApiResponse<Waiter[]>> {
  try {
    let query = supabase
      .from('waiters')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')

    if (filter === 'active') {
      query = query.eq('is_active', true)
    } else if (filter === 'inactive') {
      query = query.eq('is_active', false)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch waiters', status: 'error' }
  }
}

export async function loginWaiter(phone: string): Promise<ApiResponse<Waiter>> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, '')
    
    const { data, error } = await supabase
      .from('waiters')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('is_active', true)
      .single()

    if (error) {
      return { data: null, error: 'Număr invalid sau cont inactiv', status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to login', status: 'error' }
  }
}

export async function createWaiter(
  venueId: string,
  input: { name: string; phone: string; pin?: string }
): Promise<ApiResponse<Waiter>> {
  try {
    const cleanPhone = input.phone.replace(/[^\d+]/g, '')

    // Check for duplicate phone
    const { data: existing } = await supabase
      .from('waiters')
      .select('id')
      .eq('venue_id', venueId)
      .eq('phone', cleanPhone)
      .single()

    if (existing) {
      return { data: null, error: 'Acest număr există deja', status: 'error' }
    }

    const { data, error } = await supabase
      .from('waiters')
      .insert({
        venue_id: venueId,
        name: input.name,
        phone: cleanPhone,
        pin: input.pin || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to create waiter', status: 'error' }
  }
}

export async function updateWaiter(
  waiterId: string,
  input: Partial<Waiter>
): Promise<ApiResponse<Waiter>> {
  try {
    const { data, error } = await supabase
      .from('waiters')
      .update(input)
      .eq('id', waiterId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to update waiter', status: 'error' }
  }
}

export async function deleteWaiter(waiterId: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('waiters')
      .update({ is_active: false })
      .eq('id', waiterId)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: null, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to delete waiter', status: 'error' }
  }
}

export async function restoreWaiter(waiterId: string): Promise<ApiResponse<Waiter>> {
  try {
    const { data, error } = await supabase
      .from('waiters')
      .update({ is_active: true })
      .eq('id', waiterId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to restore waiter', status: 'error' }
  }
}

export async function getEventWaiters(eventId: string): Promise<ApiResponse<Waiter[]>> {
  try {
    const { data, error } = await supabase
      .from('event_waiters')
      .select('*, waiters(*)')
      .eq('event_id', eventId)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    const waiters = data?.map(ew => ew.waiters).filter(Boolean) || []
    return { data: waiters as Waiter[], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch event waiters', status: 'error' }
  }
}
