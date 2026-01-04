import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Head from 'next/head'

const colors = {
  noir: '#0a0a0c',
  champagne: '#d4af37',
  ivory: '#faf9f6',
  textMuted: 'rgba(255,255,255,0.5)',
}

export default function SubdomainTablePage() {
  const router = useRouter()
  const { table: tableNumber } = router.query
  const [venueSlug, setVenueSlug] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      let subdomain: string | null = null
      
      setDebugInfo(`Host: ${hostname}`)
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        subdomain = 'testing'
      } else if (hostname.includes('.sip-app.ro')) {
        const parts = hostname.split('.')
        if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'sip-app') {
          subdomain = parts[0]
        }
      } else if (hostname.includes('.vercel.app')) {
        subdomain = 'testing'
      }
      
      setDebugInfo(prev => prev + ` | Subdomain: ${subdomain}`)
      
      if (subdomain) {
        setVenueSlug(subdomain)
      }
      setIsDetecting(false)
    }
  }, [])

  useEffect(() => {
    if (!isDetecting && venueSlug && tableNumber) {
      window.location.href = `/m/${venueSlug}/${tableNumber}`
    }
  }, [isDetecting, venueSlug, tableNumber])

  if (isDetecting || !tableNumber) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: colors.noir, 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Head><title>S I P</title></Head>
        <div style={{ 
          fontSize: 48, 
          fontWeight: 300, 
          letterSpacing: 16, 
          color: colors.champagne,
          marginBottom: 24
        }}>S I P</div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 16 }}>
          Se încarcă...
        </div>
      </div>
    )
  }

  if (!venueSlug) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: colors.noir, 
        color: colors.ivory,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          <div style={{ fontSize: 16, color: colors.textMuted, marginBottom: 32 }}>
            Accesează meniul prin link-ul primit
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 24 }}>
            {debugInfo}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.noir, 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Head><title>S I P - {tableNumber}</title></Head>
      <div style={{ 
        fontSize: 48, 
        fontWeight: 300, 
        letterSpacing: 16, 
        color: colors.champagne,
        marginBottom: 24
      }}>S I P</div>
      <div style={{ fontSize: 14, color: colors.textMuted }}>
        Se deschide meniul...
      </div>
    </div>
  )
}
