// Subdomain-based table page
// URL: nuba.sip-app.ro/VIP1 -> venue=nuba, table=VIP1

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Head from 'next/head'

// Import the main menu component logic
import SmartMenuPage from './m/[venue]/[table]'

export default function SubdomainTablePage() {
  const router = useRouter()
  const { table } = router.query
  const [venueSlug, setVenueSlug] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      
      // Extract subdomain from hostname
      // Examples:
      // nuba.sip-app.ro -> nuba
      // intooit.sip-app.ro -> intooit
      // localhost -> testing
      // sip-app.ro -> null (main domain)
      
      let subdomain = null
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        subdomain = 'testing'
      } else if (hostname.includes('.sip-app.ro')) {
        const parts = hostname.split('.')
        if (parts.length >= 3 && parts[0] !== 'www') {
          subdomain = parts[0]
        }
      } else if (hostname.includes('.vercel.app')) {
        // For Vercel preview deployments, use testing mode
        subdomain = 'testing'
      }
      
      if (subdomain) {
        setVenueSlug(subdomain)
      }
      setIsLoading(false)
    }
  }, [])

  // If no subdomain found, redirect to home or show error
  if (!isLoading && !venueSlug) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0c', 
        color: '#faf9f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        textAlign: 'center',
        padding: 32
      }}>
        <Head><title>S I P</title></Head>
        <div>
          <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 16, color: '#d4af37', marginBottom: 24 }}>S I P</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
            Accesează meniul prin link-ul primit
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Exemplu: nuba.sip-app.ro/VIP1
          </div>
        </div>
      </div>
    )
  }

  // Still loading
  if (isLoading || !table) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0c', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Head><title>S I P</title></Head>
        <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 16, color: '#d4af37' }}>S I P</div>
      </div>
    )
  }

  // Redirect to the proper route with venue and table
  // This way we reuse the existing /m/[venue]/[table] logic
  if (typeof window !== 'undefined' && venueSlug && table) {
    router.replace(`/m/${venueSlug}/${table}`)
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0c', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Head><title>S I P</title></Head>
        <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: 16, color: '#d4af37' }}>S I P</div>
      </div>
    )
  }

  return null
}
