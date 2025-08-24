import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Simplified server client - let Supabase handle cookies with minimal intervention
export async function createClient(fixedCookies = null) {
  const cookieStore = await cookies()
  
  // Use base64-encoded JWT token to avoid Vercel environment variable corruption
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
    ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey,
    {
      cookies: {
        // SSR storage.getItem calls this get method for individual cookies!
        async get(name) {
          console.error('🚨 [SERVER-CLIENT] GET CALLED for:', name)
          
          // Check if we have fixed cookies
          if (fixedCookies) {
            const fixedCookie = fixedCookies.find(c => c.name === name)
            if (fixedCookie) {
              console.error('🚨 [SERVER-CLIENT] Returning FIXED cookie:', {
                name: fixedCookie.name,
                value: fixedCookie.value?.substring(0, 30) + '...',
                hasQuotes: fixedCookie.value?.startsWith('"')
              })
              return fixedCookie.value
            }
          }
          
          // Get cookie from store
          const cookie = cookieStore.get(name)
          
          // Special handling for PKCE verifier
          if (name.includes('code-verifier')) {
            console.error('🚨 [SERVER-CLIENT] PKCE verifier requested:', {
              name: name,
              found: !!cookie,
              value: cookie?.value?.substring(0, 30) + '...',
              hasQuotes: cookie?.value?.startsWith('"') && cookie?.value?.endsWith('"')
            })
            
            if (cookie?.value?.startsWith('"') && cookie?.value?.endsWith('"')) {
              try {
                const unquotedValue = JSON.parse(cookie.value)
                console.error('🚨 [SERVER-CLIENT] FIXING PKCE in get():', {
                  before: cookie.value.substring(0, 30) + '...',
                  after: unquotedValue.substring(0, 30) + '...'
                })
                return unquotedValue
              } catch (e) {
                console.error('🚨 [SERVER-CLIENT] Could not unquote PKCE:', e.message)
              }
            }
          }
          
          return cookie?.value
        },
        async set(name, value, options) {
          console.error('🚨 [SERVER-CLIENT] SET CALLED:', { name, valueLength: value?.length })
          cookieStore.set(name, value, {
            ...options,
            path: options?.path || '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: options?.sameSite || 'lax',
            httpOnly: false  // Required for PKCE
          })
        },
        async remove(name, options) {
          console.error('🚨 [SERVER-CLIENT] REMOVE CALLED:', name)
          cookieStore.delete(name)
        },
        // Legacy getAll method (kept for compatibility but SSR uses get method)
        getAll() {
          // If fixed cookies were provided, use them instead of cookie store
          if (fixedCookies) {
            console.error('🚨 [SERVER-CLIENT] GETALL - Using fixed cookies')
            return fixedCookies
          }
          
          // Fallback to original cookie store behavior
          const allCookies = cookieStore.getAll()
          console.error('🚨 [SERVER-CLIENT] GETALL - Total cookies:', allCookies.length)
          
          // Fix any quoted PKCE cookies
          allCookies.forEach(cookie => {
            if (cookie.name.includes('code-verifier') && 
                cookie.value?.startsWith('"') && cookie.value?.endsWith('"')) {
              try {
                cookie.value = JSON.parse(cookie.value)
                console.error('🚨 [SERVER-CLIENT] Fixed PKCE in getAll')
              } catch (e) {
                console.error('🚨 [SERVER-CLIENT] Could not parse PKCE:', e.message)
              }
            }
          })
          
          return allCookies
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                path: options?.path || '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: options?.sameSite || 'lax',
                httpOnly: false  // Required for PKCE
              })
            })
          } catch (error) {
            console.error('Cookie setting failed:', error)
          }
        },
      },
    }
  )
}