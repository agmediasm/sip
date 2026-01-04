import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from '@/config/env'

// Fallback pentru development/missing env
const SUPABASE_URL = publicEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Warning in development if env vars are missing
if (typeof window !== 'undefined' && !publicEnv.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL not set. Make sure environment variables are configured in Vercel.')
}

// Client pentru frontend - folosește ANON KEY (safe)
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
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
