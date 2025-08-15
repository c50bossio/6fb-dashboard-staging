import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  console.log('🔧 Creating server Supabase client with native PKCE cookie compatibility...')
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        let cookie = cookieStore.get(name)
        
        // Special handling for PKCE code verifier cookie naming compatibility
        if (!cookie && (name.includes('pkce') || name.includes('code') || name.includes('verifier'))) {
          console.log(`🔍 PKCE: Cookie ${name} not found, trying native Supabase naming patterns...`)
          
          // Try native Supabase naming pattern: supabase.auth.token-code-verifier
          if (name.includes('code-verifier')) {
            const nativeNames = [
              'supabase.auth.token-code-verifier',
              'sb-auth-token-code-verifier',
              name.replace(/^sb-.*?-auth-token-/, 'supabase.auth.token-')
            ]
            
            for (const nativeName of nativeNames) {
              const nativeCookie = cookieStore.get(nativeName)
              if (nativeCookie) {
                console.log(`✅ PKCE: Found code verifier with alternative naming: ${nativeName}`)
                return nativeCookie.value
              }
            }
          }
          
          console.log(`❌ PKCE: Code verifier cookie not found with any naming pattern for ${name}`)
        }
        
        // Enhanced debugging for OAuth PKCE cookies
        if (name.includes('pkce') || name.includes('code') || name.includes('verifier')) {
          console.log(`🔐 PKCE Cookie GET: ${name} →`, cookie?.value ? 'FOUND' : 'MISSING')
          if (cookie?.value) {
            console.log(`  └─ Value length: ${cookie.value.length} chars`)
          }
        } else if (name.includes('auth-token') || name.includes('supabase')) {
          console.log(`🍪 Auth Cookie GET: ${name} →`, cookie?.value ? 'FOUND' : 'MISSING')
        }
        
        return cookie?.value
      },
      set(name, value, options) {
        try {
          // Native PKCE-compatible cookie options
          const nativePkceOptions = {
            ...options,
            httpOnly: false, // Required: PKCE cookies must be accessible to client
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'lax', // Required: Allow OAuth redirects
            path: '/', // Required: Accessible across all routes
            // Use provided maxAge or sensible default for OAuth flow
            maxAge: options?.maxAge || (name.includes('pkce') || name.includes('code') ? 600 : 60 * 60 * 24 * 7) // 10 min for PKCE, 7 days for others
          }
          
          cookieStore.set({ name, value, ...nativePkceOptions })
          
          // Enhanced logging for PKCE flow
          if (name.includes('pkce') || name.includes('code') || name.includes('verifier')) {
            console.log(`🔐 PKCE Cookie SET: ${name}`, {
              valueLength: value?.length || 0,
              maxAge: nativePkceOptions.maxAge,
              sameSite: nativePkceOptions.sameSite,
              httpOnly: nativePkceOptions.httpOnly
            })
          } else {
            console.log(`🍪 Cookie SET: ${name} (OAuth-compatible)`)
          }
        } catch (error) {
          console.error(`❌ Cookie SET failed for ${name}:`, error.message)
          // Don't throw - this is expected in some route handler contexts
        }
      },
      remove(name, options) {
        try {
          const removeOptions = {
            ...options,
            path: '/',
            maxAge: 0,
            expires: new Date(0)
          }
          
          cookieStore.set({ name, value: '', ...removeOptions })
          
          if (name.includes('pkce') || name.includes('code') || name.includes('verifier')) {
            console.log(`🔐 PKCE Cookie REMOVED: ${name}`)
          } else {
            console.log(`🍪 Cookie REMOVED: ${name}`)
          }
        } catch (error) {
          console.error(`❌ Cookie REMOVE failed for ${name}:`, error.message)
        }
      },
    },
  })
}

export function createAuthenticatedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  const cookieStore = cookies()
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
    },
  })
}