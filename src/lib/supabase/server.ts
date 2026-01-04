import { createClient } from '@supabase/supabase-js'
import { serverEnv, isServer } from '@/config/env'

// Client pentru server-side - folosește SERVICE ROLE KEY
// NICIODATĂ nu importa acest fișier în componente frontend!
export function getServerSupabase() {
  if (!isServer) {
    throw new Error('getServerSupabase() can only be called on server!')
  }
  
  const env = serverEnv()
  
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
