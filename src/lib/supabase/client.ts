import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Direct values - Vercel env vars not loading properly
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://avptbuuimqmfmekpwqvb.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cHRidXVpbXFtZm1la3B3cXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMzY2ODYsImV4cCI6MjA0ODkxMjY4Nn0.LBjP4wZ9O4RkHpW_zfLlPcjqSYDzzAT5xprcRbXwoXc'

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
