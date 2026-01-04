import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Hardcoded temporarily - Vercel env vars not loading
const SUPABASE_URL = 'https://avprbuuimqmfmekpwqvb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cHJidXVpbXFtZm1la3B3cXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTI4NTEsImV4cCI6MjA4MjQ4ODg1MX0.IuRzFAjFbGjWZP_Wk4K5t-Aozf8QxyOua-_O9jJtba4'

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
