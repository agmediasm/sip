import { useRef, useCallback } from 'react'

// Base64 encoded short notification sound
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA0GVaHj6tCHNx0lXbXv8sRqKg'

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback((soundUrl?: string) => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(soundUrl || NOTIFICATION_SOUND)
      } else if (soundUrl) {
        audioRef.current.src = soundUrl
      }
      
      audioRef.current.play().catch((err) => {
        // Ignore autoplay errors - user hasn't interacted yet
        console.debug('Sound play failed (autoplay policy):', err)
      })
    } catch (err) {
      console.debug('Sound error:', err)
    }
  }, [])

  const playNotification = useCallback(() => {
    play(NOTIFICATION_SOUND)
  }, [play])

  return { play, playNotification }
}
