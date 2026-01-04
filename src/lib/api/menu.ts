import { supabase } from '@/lib/supabase'
import type { MenuItem, Category, EventMenu, ApiResponse } from '@/types'

export async function getCategories(venueId: string): Promise<ApiResponse<Category[]>> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    // Deduplicate by name
    const uniqueCats: Category[] = []
    const seenNames = new Set<string>()
    for (const cat of data || []) {
      const nameLower = cat.name.toLowerCase()
      if (!seenNames.has(nameLower)) {
        seenNames.add(nameLower)
        uniqueCats.push(cat)
      }
    }

    return { data: uniqueCats, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch categories', status: 'error' }
  }
}

export async function getAllMenuItems(venueId: string): Promise<ApiResponse<MenuItem[]>> {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order')

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch menu items', status: 'error' }
  }
}

export async function getEventMenu(eventId: string): Promise<ApiResponse<EventMenu[]>> {
  try {
    const { data, error } = await supabase
      .from('event_menu')
      .select('*, menu_items(*)')
      .eq('event_id', eventId)
      .eq('is_available', true)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: data || [], error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to fetch event menu', status: 'error' }
  }
}

export async function createMenuItem(
  venueId: string,
  input: {
    name: string
    description?: string
    default_price: number
    category_id: string
    product_type: string
    badge?: string
  }
): Promise<ApiResponse<MenuItem>> {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        venue_id: venueId,
        ...input,
        is_available: true,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to create menu item', status: 'error' }
  }
}

export async function updateMenuItem(
  itemId: string,
  input: Partial<MenuItem>
): Promise<ApiResponse<MenuItem>> {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update(input)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to update menu item', status: 'error' }
  }
}

export async function deleteMenuItem(itemId: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: false })
      .eq('id', itemId)

    if (error) {
      return { data: null, error: error.message, status: 'error' }
    }

    return { data: null, error: null, status: 'success' }
  } catch (err) {
    return { data: null, error: 'Failed to delete menu item', status: 'error' }
  }
}

export async function setEventMenuPrice(
  eventId: string,
  menuItemId: string,
  customPrice: number | null
): Promise<ApiResponse<EventMenu>> {
  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('event_menu')
      .select('id')
      .eq('event_id', eventId)
      .eq('menu_item_id', menuItemId)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('event_menu')
        .update({ custom_price: customPrice })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null, status: 'success' }
    } else {
      const { data, error } = await supabase
        .from('event_menu')
        .insert({
          event_id: eventId,
          menu_item_id: menuItemId,
          custom_price: customPrice,
          is_available: true,
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null, status: 'success' }
    }
  } catch (err) {
    return { data: null, error: 'Failed to set event price', status: 'error' }
  }
}
