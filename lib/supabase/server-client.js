import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
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
              // Ensure cookies work with OAuth redirects on custom domain
              const cookieOptions = {
                ...options,
                // Critical: Don't set domain for custom domains (let browser auto-detect)
                domain: undefined,
                // Required for HTTPS in production
                secure: process.env.NODE_ENV === 'production',
                // Essential for OAuth redirect chain - allows cross-site redirects
                sameSite: 'lax',
                // Ensure sufficient duration for OAuth flow completion
                maxAge: options?.maxAge || 60 * 60 * 24 * 7, // 7 days default
                // Ensure path is root for OAuth cookies
                path: options?.path || '/'
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}