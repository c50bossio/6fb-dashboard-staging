import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Enhanced server client for custom domain OAuth with PKCE support
export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // OAuth-compatible cookie options - DO NOT set custom domain
              // Custom domains break PKCE cookie accessibility across Supabase OAuth flow
              const enhancedOptions = {
                ...options,
                path: '/',
                // Always use default domain for OAuth compatibility
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
                // NOTE: Removed custom domain setting to fix PKCE cookie issues
              }
              
              cookieStore.set(name, value, enhancedOptions)
            })
          } catch (error) {
            // Enhanced error handling for debugging
            console.error('Cookie setting failed:', error)
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}