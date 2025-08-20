import { createBrowserClient } from '@supabase/ssr'

// Official Supabase pattern for browser client - no cookie handling needed
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

