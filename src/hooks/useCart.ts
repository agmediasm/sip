import { useState, useEffect, useCallback } from 'react'
import type { CartItem, MenuItem } from '@/types'

const CART_STORAGE_KEY = 'sip_cart'

interface UseCartReturn {
  items: CartItem[]
  totalItems: number
  totalAmount: number
  addItem: (menuItem: MenuItem, quantity?: number) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  isInCart: (menuItemId: string) => boolean
  getItemQuantity: (menuItemId: string) => number
}

export function useCart(tableId?: string): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([])
  const storageKey = tableId ? `${CART_STORAGE_KEY}_${tableId}` : CART_STORAGE_KEY

  // Load cart from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        localStorage.removeItem(storageKey)
      }
    }
  }, [storageKey])

  // Save cart to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (items.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } else {
      localStorage.removeItem(storageKey)
    }
  }, [items, storageKey])

  const addItem = useCallback((menuItem: MenuItem, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id)
      
      if (existing) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      
      return [...prev, { menuItem, quantity }]
    })
  }, [])

  const removeItem = useCallback((menuItemId: string) => {
    setItems(prev => prev.filter(item => item.menuItem.id !== menuItemId))
  }, [])

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId)
      return
    }
    
    setItems(prev =>
      prev.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity }
          : item
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const isInCart = useCallback((menuItemId: string): boolean => {
    return items.some(item => item.menuItem.id === menuItemId)
  }, [items])

  const getItemQuantity = useCallback((menuItemId: string): number => {
    const item = items.find(item => item.menuItem.id === menuItemId)
    return item?.quantity || 0
  }, [items])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce((sum, item) => {
    const price = item.customPrice || item.menuItem.default_price
    return sum + (price * item.quantity)
  }, 0)

  return {
    items,
    totalItems,
    totalAmount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
  }
}
