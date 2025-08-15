import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        flowType: 'implicit', // Use implicit flow instead of PKCE
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        debug: true
      }
    }
  )
  
  console.log('🔓 Using implicit flow (bypassing PKCE)')
  
  return client
}