import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [demoLink, setDemoLink] = useState('/manager')
  
  useEffect(() => {
    loadDemoLink()
  }, [])
  
  const loadDemoLink = async () => {
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('is_active', true)
      .order('event_date', { ascending: true })
      .limit(1)
    
    if (events?.length) {
      const { data: tables } = await supabase
        .from('event_tables')
        .select('id')
        .eq('event_id', events[0].id)
        .order('table_number')
        .limit(1)
      
      if (tables?.length) {
        setDemoLink(`/order/${events[0].id}/${tables[0].id}`)
      }
    }
  }

  return (
    <>
      <Head>
        <title>S I P - Elevate the Night</title>
        <meta name="description" content="Premium nightlife ordering platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{
        minHeight: '100vh',
        backgroundColor: '#08080a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '64px',
          fontWeight: 300,
          letterSpacing: '24px',
          color: '#d4af37',
          marginBottom: '16px',
          marginLeft: '24px',
        }}>S I P</h1>
        
        <div style={{
          width: '80px',
          height: '1px',
          backgroundColor: '#d4af37',
          marginBottom: '48px',
          opacity: 0.5,
        }} />
        
        <img 
          src="/intooit-white.png" 
          alt="Club Logo" 
          style={{ height: '40px', marginBottom: '32px', opacity: 0.9 }} 
        />
        
        <p style={{
          fontSize: '11px',
          letterSpacing: '6px',
          color: '#e5e4e2',
          textTransform: 'uppercase',
          marginBottom: '48px',
        }}>Elevate the Night</p>

        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          width: '100%',
          maxWidth: '300px',
        }}>
          <Link href={demoLink} style={{
            display: 'block',
            width: '100%',
            padding: '18px 32px',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#e5e4e2',
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            Demo Client (VIP 1)
          </Link>
          
          <Link href="/staff" style={{
            display: 'block',
            width: '100%',
            padding: '18px 32px',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#e5e4e2',
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            Staff Dashboard
          </Link>
          
          <Link href="/manager" style={{
            display: 'block',
            width: '100%',
            padding: '18px 32px',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#e5e4e2',
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            Manager Dashboard
          </Link>

          <Link href="/admin" style={{
            display: 'block',
            width: '100%',
            padding: '18px 32px',
            border: '1px solid rgba(212,175,55,0.3)',
            color: '#d4af37',
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            Admin Dashboard
          </Link>
        </nav>

        <p style={{
          marginTop: '64px',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '2px',
        }}>© 2025 S I P</p>
      </main>
    </>
  )
}
