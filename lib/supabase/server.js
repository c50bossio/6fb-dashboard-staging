import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create a Supabase client for server-side operations with proper cookie handling
export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  // Create server client with enhanced cookie handling for OAuth and session persistence
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        const cookie = cookieStore.get(name)
        console.log(`🍪 Getting cookie ${name}:`, cookie?.value ? 'found' : 'not found')
        return cookie?.value
      },
      set(name, value, options) {
        try {
          // Enhanced cookie options for better persistence
          const enhancedOptions = {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            // Extend maxAge if not set
            maxAge: options?.maxAge || 60 * 60 * 24 * 7 // Default 7 days
          }
          
          cookieStore.set({ name, value, ...enhancedOptions })
          console.log(`🍪 Set cookie ${name} with enhanced options`)
        } catch (error) {
          // The `set` method is only available in Server Components
          // This error can be ignored in Route Handlers
          console.log(`⚠️ Cookie set error (expected in route handlers): ${name}`)
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: '', maxAge: 0, ...options })
          console.log(`🍪 Removed cookie ${name}`)
        } catch (error) {
          // The `remove` method is only available in Server Components
          console.log(`⚠️ Cookie remove error (expected in route handlers): ${name}`)
        }
      },
    },
  })
}

// Create a Supabase client that uses the user's session from cookies
export async function createAuthenticatedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  const cookieStore = cookies()
  
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
    },
  })
}