import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useVenue } from './useVenue'

interface SessionTrackingOptions {
  userType: 'guest' | 'staff' | 'manager'
  userId?: string
  userName?: string
  tableId?: string
}

export function useSessionTracking(options: SessionTrackingOptions) {
  const { venue } = useVenue()
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!venue) return

    // Create session
    const createSession = async () => {
      try {
        // Get device info
        const deviceInfo = {
          browser: getBrowser(),
          os: getOS(),
          device: getDevice(),
        }

        const { data, error } = await supabase
          .from('active_sessions')
          .insert({
            venue_id: venue.id,
            user_type: options.userType,
            user_id: options.userId,
            user_name: options.userName,
            table_id: options.tableId,
            device_info: deviceInfo,
            is_active: true,
          })
          .select('id')
          .single()

        if (data) {
          sessionIdRef.current = data.id
        }
      } catch (err) {
        console.error('Create session error:', err)
      }
    }

    createSession()

    // Update activity every 30 seconds
    const activityInterval = setInterval(() => {
      if (sessionIdRef.current) {
        supabase
          .from('active_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', sessionIdRef.current)
          .then(() => {})
      }
    }, 30000)

    // End session on unmount or page close
    const endSession = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliability on page close
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/active_sessions?id=eq.${sessionIdRef.current}`
        const body = JSON.stringify({ is_active: false })
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, body)
        } else {
          supabase
            .from('active_sessions')
            .update({ is_active: false })
            .eq('id', sessionIdRef.current)
        }
      }
    }

    window.addEventListener('beforeunload', endSession)

    return () => {
      clearInterval(activityInterval)
      window.removeEventListener('beforeunload', endSession)
      endSession()
    }
  }, [venue, options.userType, options.userId, options.userName, options.tableId])
}

// Helper functions for device detection
function getBrowser(): string {
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Unknown'
}

function getOS(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown'
}

function getDevice(): string {
  const ua = navigator.userAgent
  if (ua.includes('Mobile') || ua.includes('Android')) return 'Mobile'
  if (ua.includes('Tablet') || ua.includes('iPad')) return 'Tablet'
  return 'Desktop'
}
