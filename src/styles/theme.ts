// src/styles/theme.ts

export const colors = {
  // Base
  noir: '#0a0a0c',
  onyx: '#131316',
  charcoal: '#1c1c20',
  slate: '#252529',
  
  // Accent
  champagne: '#d4af37',
  champagneLight: '#e8c964',
  champagneDark: '#b8942d',
  gold: '#ffd700',
  
  // Text
  ivory: '#faf9f6',
  cream: '#f5f5dc',
  platinum: '#e5e4e2',
  
  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
  
  // Text opacity
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.5)',
  
  // Status
  success: '#10b981',
  successDark: '#059669',
  error: '#ef4444',
  warning: '#f59e0b',
  
  // Glow
  glowChampagne: 'rgba(212, 175, 55, 0.15)',
  glowGold: 'rgba(255, 215, 0, 0.1)',
  
  // Table types
  vip: '#d4af37',
  normal: '#3b82f6',
  bar: '#8b5cf6',
} as const

export type ColorName = keyof typeof colors

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
} as const

export const shadows = {
  sm: '0 2px 8px rgba(0,0,0,0.2)',
  md: '0 4px 16px rgba(0,0,0,0.3)',
  lg: '0 8px 32px rgba(0,0,0,0.4)',
  glow: '0 0 20px rgba(212, 175, 55, 0.3)',
} as const

export const zIndex = {
  dropdown: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const

// CSS-in-JS helper
export const getColor = (name: ColorName): string => colors[name]
