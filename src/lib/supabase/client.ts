import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/config/env'

// Client pentru frontend - folosește ANON KEY (safe)
export const supabase = createClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Nu folosim Supabase Auth
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// Re-export pentru compatibilitate
export default supabase
