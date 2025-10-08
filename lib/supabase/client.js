// Official Supabase browser client for Next.js 14 App Router
// Uses @supabase/ssr package (recommended by Supabase)
import { createBrowserClient } from '@supabase/ssr'

let client = null
let cookiesCleared = false

/**
 * Clears stale Supabase cookies that can cause getSession() to hang
 * This fixes GitHub issue supabase/supabase#35754
 */
function clearStaleSupabaseCookies() {
  if (typeof window === 'undefined' || cookiesCleared) return

  try {
    // Get all cookies
    const cookies = document.cookie.split(';')

    // Clear all Supabase cookies
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim()
      if (cookieName.startsWith('sb-')) {
        // Clear cookie with multiple domain/path combinations
        const clearOptions = [
          { domain: window.location.hostname, path: '/' },
          { domain: `.${window.location.hostname}`, path: '/' },
          { domain: '', path: '/' }
        ]

        clearOptions.forEach(opts => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${opts.domain}; path=${opts.path}`
        })
      }
    })

    cookiesCleared = true
    console.log('🧹 Cleared stale Supabase cookies')
  } catch (err) {
    console.warn('Could not clear stale cookies:', err.message)
  }
}

/**
 * Creates or returns existing Supabase browser client
 * Uses singleton pattern to prevent multiple instances
 */
export function createClient() {
  // Return existing client if already created
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }

  // Create client (don't clear cookies automatically - preserves valid sessions)
  client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )

  console.log('✅ Supabase client created')
  return client
}

/**
 * Manually clear cookies and recreate client
 * Use this when getUser() times out due to stale cookies
 */
export function recreateClient() {
  console.log('🔄 Recreating Supabase client with fresh cookie state...')
  clearStaleSupabaseCookies()
  client = null
  cookiesCleared = false // Allow clearing again if needed
  return createClient()
}
