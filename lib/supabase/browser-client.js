import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  console.log('🔧 Creating Supabase browser client with native PKCE support...')
  
  // Create client with completely native Supabase configuration for PKCE compatibility
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    }
  })
  
  // Add enhanced auth state logging for debugging
  if (process.env.NODE_ENV === 'development') {
    client.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Native auth state change: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
      })
    })
  }
  
  console.log('✅ Native Supabase client created for PKCE cookie compatibility')
  return client
}