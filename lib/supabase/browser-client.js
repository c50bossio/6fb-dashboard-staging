import { createBrowserClient } from '@supabase/ssr'

// Official Supabase pattern with OAuth-compatible cookie configuration
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
        },
        set(name, value, options = {}) {
          // Ensure cookies work with OAuth redirects
          const cookieOptions = {
            ...options,
            // Critical: Don't set domain explicitly for custom domains
            domain: undefined,
            // Required for HTTPS OAuth redirects
            secure: window.location.protocol === 'https:',
            // Essential for OAuth redirect chain
            sameSite: 'lax',
            // Ensure cookies persist long enough for OAuth flow
            maxAge: options.maxAge || 60 * 60 * 24 * 7 // 7 days default
          }
          
          const cookieString = Object.entries(cookieOptions)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => {
              if (key === 'maxAge') return `max-age=${value}`
              if (key === 'sameSite') return `samesite=${value}`
              if (typeof value === 'boolean') return value ? key : null
              return `${key}=${value}`
            })
            .filter(Boolean)
            .join('; ')
          
          document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieString}`
        },
        remove(name, options = {}) {
          this.set(name, '', { 
            ...options, 
            maxAge: 0 
          })
        }
      }
    }
  )
}

