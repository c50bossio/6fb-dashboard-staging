import { createBrowserClient } from '@supabase/ssr'

// Official Supabase pattern for browser client - no cookie handling needed
export function createClient() {
  // Use base64-encoded JWT token to avoid Vercel environment variable corruption
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
    ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey
  )
}

