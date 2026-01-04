import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useVenue } from './useVenue'
import type { MenuItem, Category, EventMenu } from '@/types'

interface UseMenuReturn {
  menuItems: MenuItem[]
  categories: Category[]
  eventMenu: EventMenu[]
  loading: boolean
  error: string | null
  getItemPrice: (item: MenuItem) => number
  refetch: () => Promise<void>
}

export function useMenu(eventId?: string): UseMenuReturn {
  const { venue } = useVenue()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [eventMenu, setEventMenu] = useState<EventMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMenu = useCallback(async () => {
    if (!venue) return

    try {
      setLoading(true)
      setError(null)

      // Fetch categories
      const { data: catsData } = await supabase
        .from('categories')
        .select('*')
        .eq('venue_id', venue.id)
        .eq('is_active', true)
        .order('sort_order')

      if (catsData) {
        // Deduplicate by name
        const uniqueCats: Category[] = []
        const seenNames = new Set<string>()
        for (const cat of catsData) {
          const nameLower = cat.name.toLowerCase()
          if (!seenNames.has(nameLower)) {
            seenNames.add(nameLower)
            uniqueCats.push(cat)
          }
        }
        setCategories(uniqueCats)
      }

      // Fetch menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('venue_id', venue.id)
        .eq('is_available', true)
        .order('sort_order')

      if (itemsData) {
        setMenuItems(itemsData)
      }

      // Fetch event menu if eventId provided
      if (eventId) {
        const { data: eventMenuData } = await supabase
          .from('event_menu')
          .select('*, menu_items(*)')
          .eq('event_id', eventId)
          .eq('is_available', true)

        if (eventMenuData) {
          setEventMenu(eventMenuData)
        }
      }
    } catch (err) {
      setError('Failed to load menu')
      console.error('useMenu error:', err)
    } finally {
      setLoading(false)
    }
  }, [venue, eventId])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  // Get effective price for an item (event price or default)
  const getItemPrice = useCallback((item: MenuItem): number => {
    if (eventId) {
      const eventItem = eventMenu.find(em => em.menu_item_id === item.id)
      if (eventItem?.custom_price) {
        return eventItem.custom_price
      }
    }
    return item.default_price
  }, [eventId, eventMenu])

  return {
    menuItems,
    categories,
    eventMenu,
    loading,
    error,
    getItemPrice,
    refetch: fetchMenu,
  }
}
