import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#08080a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
    },
    logo: {
      fontSize: '64px',
      fontWeight: '300',
      letterSpacing: '24px',
      color: '#d4af37',
      marginBottom: '16px',
    },
    tagline: {
      fontSize: '11px',
      letterSpacing: '6px',
      color: '#e5e4e2',
      textTransform: 'uppercase',
      marginBottom: '48px',
    },
    line: {
      width: '80px',
      height: '1px',
      backgroundColor: '#d4af37',
      marginBottom: '48px',
      opacity: 0.5,
    },
    nav: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      maxWidth: '300px',
    },
    link: {
      display: 'block',
      padding: '18px 32px',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#e5e4e2',
      fontSize: '12px',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },
    footer: {
      marginTop: '64px',
      fontSize: '10px',
      color: 'rgba(255,255,255,0.3)',
      letterSpacing: '2px',
    },
  }

  return (
    <>
      <Head>
        <title>S I P - Elevate the Night</title>
        <meta name="description" content="Premium nightlife ordering platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={styles.container}>
        <h1 style={styles.logo}>S I P</h1>
        <div style={styles.line} />
        <p style={styles.tagline}>Elevate the Night</p>

        <nav style={styles.nav}>
          <Link 
            href="/menu/SIP-VIP1" 
            style={styles.link}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#d4af37'
              e.target.style.color = '#d4af37'
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)'
              e.target.style.color = '#e5e4e2'
            }}
          >
            Demo Client (VIP 1)
          </Link>
          
          <Link 
            href="/staff" 
            style={styles.link}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#d4af37'
              e.target.style.color = '#d4af37'
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)'
              e.target.style.color = '#e5e4e2'
            }}
          >
            Staff Dashboard
          </Link>
          
          <Link 
            href="/manager" 
            style={styles.link}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#d4af37'
              e.target.style.color = '#d4af37'
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)'
              e.target.style.color = '#e5e4e2'
            }}
          >
            Manager Dashboard
          </Link>
        </nav>

        <p style={styles.footer}>© 2025 S I P</p>
      </main>
    </>
  )
}
