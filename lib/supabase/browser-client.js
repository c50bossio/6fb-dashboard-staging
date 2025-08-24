import { createBrowserClient } from '@supabase/ssr'

// Enhanced browser client with PKCE cookie protection
export function createClient() {
  // Use base64-encoded JWT token to avoid Vercel environment variable corruption
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
    ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey,
    {
      cookies: {
        // SSR storage.getItem calls this get method for individual cookies!
        get(name) {
          // Protect against SSR issues - document is not available in server environment
          if (typeof document === 'undefined') return null
          
          const cookies = document.cookie
            .split(';')
            .map(cookie => cookie.trim().split('='))
            .filter(([n]) => n === name)
            .map(([n, value]) => ({ name: n, value: decodeURIComponent(value || '') }))
          
          const cookie = cookies[0]
          
          // Special handling for PKCE verifier
          if (name.includes('code-verifier') && cookie) {
            console.log('🍪 [BROWSER] PKCE verifier requested:', {
              name: name,
              value: cookie.value?.substring(0, 30) + '...',
              hasQuotes: cookie.value?.startsWith('"') && cookie.value?.endsWith('"')
            })
            
            if (cookie.value?.startsWith('"') && cookie.value?.endsWith('"')) {
              try {
                const unquotedValue = JSON.parse(cookie.value)
                console.log('🍪 [BROWSER] FIXING PKCE in get():', {
                  before: cookie.value.substring(0, 30) + '...',
                  after: unquotedValue.substring(0, 30) + '...'
                })
                return unquotedValue
              } catch (e) {
                console.log('🍪 [BROWSER] Could not unquote PKCE:', e.message)
              }
            }
          }
          
          return cookie?.value
        },
        getAll() {
          // Protect against SSR issues - document is not available in server environment
          if (typeof document === 'undefined') return []
          
          return document.cookie
            .split(';')
            .map(cookie => cookie.trim().split('='))
            .filter(([name]) => name)
            .map(([name, value]) => ({ 
              name, 
              value: decodeURIComponent(value || '')
            }))
        },
        setAll(cookiesToSet) {
          // Protect against SSR issues - document is not available in server environment
          if (typeof document === 'undefined') return
          
          cookiesToSet.forEach(({ name, value, options }) => {
            // 🚨 PREVENT PKCE COOKIE JSON-STRINGIFICATION
            let cookieValue = value
            if (name.includes('code-verifier')) {
              // Ensure PKCE verifier is never JSON-stringified
              if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
                try {
                  cookieValue = JSON.parse(value)
                  console.log('🍪 [BROWSER] Fixed JSON-stringified PKCE cookie during set')
                } catch (e) {
                  console.log('🍪 [BROWSER] PKCE cookie value parsing failed:', e.message)
                }
              }
              console.log('🍪 [BROWSER] Setting PKCE cookie:', {
                name,
                valuePreview: cookieValue?.substring(0, 20) + '...',
                isString: typeof cookieValue === 'string',
                hasQuotes: cookieValue?.startsWith('"') && cookieValue?.endsWith('"')
              })
            }
            
            const cookieOptions = {
              path: options?.path || '/',
              ...(options?.maxAge && { 'max-age': options.maxAge }),
              ...(options?.sameSite && { samesite: options.sameSite }),
              ...(options?.secure && { secure: true })
            }
            
            const cookieString = `${name}=${encodeURIComponent(cookieValue)}; ${Object.entries(cookieOptions)
              .map(([key, value]) => value === true ? key : `${key}=${value}`)
              .join('; ')}`
            
            document.cookie = cookieString
          })
        }
      }
    }
  )
}