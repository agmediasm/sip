// Subdomain-based table page
// URL: intooit.sip-app.ro/VIP1 -> venue=intooit, table=VIP1

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase, resolveTableForOrder, getCategories, getEventMenu, createOrder, createOrderItems, getTableOrders } from '../lib/supabase'

const colors = {
  noir: '#0a0a0c',
  onyx: '#131316', 
  charcoal: '#1c1c20',
  champagne: '#d4af37',
  champagneDark: '#b8942d',
  ivory: '#faf9f6',
  textPrimary: 'rgba(255,255,255,0.95)',
  textMuted: 'rgba(255,255,255,0.5)',
  success: '#10b981',
  glowChampagne: 'rgba(212, 175, 55, 0.15)'
}

export default function SubdomainTablePage() {
  const router = useRouter()
  const { table: tableNumber } = router.query
  const [venueSlug, setVenueSlug] = useState(null)
  const [isDetecting, setIsDetecting] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')

  // Detect subdomain on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      let subdomain = null
      
      console.log('Hostname:', hostname)
      setDebugInfo(`Host: ${hostname}`)
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        subdomain = 'testing'
      } else if (hostname.includes('.sip-app.ro')) {
        const parts = hostname.split('.')
        // intooit.sip-app.ro -> ['intooit', 'sip-app', 'ro']
        if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'sip-app') {
          subdomain = parts[0]
        }
      } else if (hostname.includes('.vercel.app')) {
        subdomain = 'testing'
      }
      
      console.log('Detected subdomain:', subdomain)
      setDebugInfo(prev => prev + ` | Subdomain: ${subdomain}`)
      
      if (subdomain) {
        setVenueSlug(subdomain)
      }
      setIsDetecting(false)
    }
  }, [])

  // Once we have venueSlug and table, redirect to the proper page
  useEffect(() => {
    if (!isDetecting && venueSlug && tableNumber) {
      console.log('Redirecting to:', `/m/${venueSlug}/${tableNumber}`)
      // Use window.location for hard redirect to ensure proper routing
      window.location.href = `/m/${venueSlug}/${tableNumber}`
    }
  }, [isDetecting, venueSlug, tableNumber])

  // Loading state
  if (isDetecting || !tableNumber) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: colors.noir, 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif"
      }}>
        <Head><title>S I P</title></Head>
        <div style={{ 
          fontSize: 48, 
          fontWeight: 300, 
          letterSpacing: 16, 
          color: colors.champagne,
          marginBottom: 24
        }}>S I P</div>
        <div style={{ 
          fontSize: 12, 
          color: colors.textMuted,
          marginTop: 16
        }}>Se încarcă...</div>
      </div>
    )
  }

  // No subdomain detected - show error
  if (!venueSlug) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: colors.noir, 
        color: colors.ivory,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        textAlign: 'center',
        padding: 32
      }}>
        <Head><title>S I P</title></Head>
        <div>
          <div style={{ 
            fontSize: 48, 
            fontWeight: 300, 
            letterSpacing: 16, 
            color: colors.champagne, 
            marginBottom: 24 
          }}>S I P</div>
          <div style={{ 
            fontSize: 16, 
            color: colors.textMuted, 
            marginBottom: 32 
          }}>
            Accesează meniul prin link-ul primit
          </div>
          <div style={{ 
            fontSize: 12, 
            color: 'rgba(255,255,255,0.3)',
            marginTop: 24
          }}>
            {debugInfo}
          </div>
        </div>
      </div>
    )
  }

  // Redirecting...
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.noir, 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif"
    }}>
      <Head><title>S I P - {tableNumber}</title></Head>
      <div style={{ 
        fontSize: 48, 
        fontWeight: 300, 
        letterSpacing: 16, 
        color: colors.champagne,
        marginBottom: 24
      }}>S I P</div>
      <div style={{ 
        fontSize: 14, 
        color: colors.textMuted 
      }}>Se deschide meniul...</div>
    </div>
  )
}
