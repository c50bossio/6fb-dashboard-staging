import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '../supabase-simple.js'

// Ensure environment variables are loaded
if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env' })
  require('dotenv').config({ path: '.env.local' })
}

/**
 * Creates Supabase server client with proper cookie handling for SSR
 * Following current Supabase SSR best practices with fallback
 */
export async function createClient() {
  try {
    const cookieStore = await cookies()
    
    // Get environment variables with base64 fallback support
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
      ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables, using service client fallback')
      return createServiceClient()
    }
    
    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        // Standard server-side cookie getter
        async get(name) {
          try {
            const cookie = cookieStore.get(name)
            return cookie?.value
          } catch (error) {
            console.warn(`Failed to get cookie ${name}:`, error.message)
            return undefined
          }
        },
        
        // Standard server-side cookie setter
        async set(name, value, options) {
          try {
            cookieStore.set(name, value, {
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false, // Required for client-side access
              ...options
            })
          } catch (error) {
            // Handle cases where cookies cannot be set (e.g., in middleware)
            console.warn(`Failed to set cookie ${name}:`, error.message)
          }
        },
        
        // Standard server-side cookie remover
        async remove(name, options) {
          try {
            cookieStore.set(name, '', {
              path: '/',
              expires: new Date(0),
              ...options
            })
          } catch (error) {
            console.warn(`Failed to remove cookie ${name}:`, error.message)
          }
        }
      }
    })

    return client
  } catch (error) {
    console.error('❌ Failed to create server client, using fallback:', error.message)
    return createServiceClient()
  }
}

/**
 * Creates a read-only Supabase server client for middleware and edge functions
 */
export async function createClientForMiddleware() {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
    ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name) {
        const cookie = cookieStore.get(name)
        return cookie?.value
      },
      // No set/remove methods for read-only middleware client
      async set() {},
      async remove() {}
    }
  })
}