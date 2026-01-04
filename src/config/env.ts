// src/config/env.ts

// ============================================
// ENVIRONMENT VARIABLES - Type safe
// ============================================

// Only expose what's needed in frontend
// NEVER expose SERVICE_ROLE_KEY in frontend!

interface PublicEnv {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_ADMIN_URL: string
}

interface ServerEnv extends PublicEnv {
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_SECRET_KEY: string
}

// Validate required env vars exist
function getEnvVar(key: string, required = true): string {
  const value = process.env[key]
  
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  
  return value || ''
}

// Public env - safe to use in browser
export const publicEnv: PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', false) || 'https://app.sip-app.ro',
  NEXT_PUBLIC_ADMIN_URL: getEnvVar('NEXT_PUBLIC_ADMIN_URL', false) || 'https://admin.sip-app.ro',
}

// Server-only env - NEVER import this in frontend components!
export const serverEnv = (): ServerEnv => {
  // This will throw if called in browser
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() cannot be called in browser!')
  }
  
  return {
    ...publicEnv,
    SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    ADMIN_SECRET_KEY: getEnvVar('ADMIN_SECRET_KEY'),
  }
}

// Type guard for server-side
export const isServer = typeof window === 'undefined'

// Validate all env vars at startup
export function validateEnv(): void {
  console.log('✓ Environment variables validated')
  
  // Check public vars
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }
  
  // Check server vars only on server
  if (isServer) {
    const server = serverEnv()
    if (!server.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠ SUPABASE_SERVICE_ROLE_KEY not set - some features disabled')
    }
  }
}
