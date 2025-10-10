// Official Supabase browser client for Next.js 14 App Router
// Uses @supabase/ssr package (recommended by Supabase)
import { createBrowserClient } from '@supabase/ssr'

let client = null

/**
 * Clears stale Supabase cookies that can cause getSession() to hang
 * This fixes GitHub issue supabase/supabase#35754
 *
 * IMPORTANT: Only clears session cookies, preserves OAuth flow cookies
 * (code verifier, state) to prevent breaking active OAuth logins
 *
 * @param {boolean} force - Force clear even if already cleared
 */
export function clearStaleSupabaseCookies(force = false) {
  if (typeof window === 'undefined') return false

  try {
    // Check if we're in an OAuth flow - DON'T clear cookies mid-OAuth!
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('code')) {
      console.log('⚠️ OAuth flow detected - skipping cookie clear to preserve code verifier')
      return false
    }

    // Get all cookies
    const cookies = document.cookie.split(';')
    let clearedCount = 0

    // Only clear session-related cookies, NOT OAuth flow cookies
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim()

      // CRITICAL: Skip PKCE code verifier cookies during OAuth flow!
      // Code verifier cookie: sb-*-auth-token-code-verifier
      // We must preserve this for the OAuth callback to exchange the auth code
      if (cookieName.includes('-code-verifier')) {
        console.log('⚠️ Preserving PKCE code verifier cookie:', cookieName)
        return // Skip this cookie
      }

      // Clear only session auth-token cookies, not code verifier or OAuth state
      if (cookieName.startsWith('sb-') &&
          (cookieName.includes('-auth-token') ||
           cookieName.includes('-session'))) {

        // Clear cookie with multiple domain/path combinations
        const clearOptions = [
          { domain: window.location.hostname, path: '/' },
          { domain: `.${window.location.hostname}`, path: '/' },
          { domain: '', path: '/' }
        ]

        clearOptions.forEach(opts => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${opts.domain}; path=${opts.path}`
        })

        clearedCount++
      }
    })

    if (clearedCount > 0 || force) {
      console.log(`🧹 Cleared ${clearedCount} stale Supabase session cookie(s)`)
    }

    return clearedCount > 0
  } catch (err) {
    console.warn('Could not clear stale cookies:', err.message)
    return false
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

  // Create client with @supabase/ssr's createBrowserClient
  // CRITICAL: This package automatically handles:
  // - PKCE flow (enabled by default)
  // - Code verifier storage in cookies (sb-*-auth-token-code-verifier)
  // - Session storage in cookies (accessible to server-side OAuth callback)
  // Do NOT add custom flowType, storageKey, or storage config - breaks OAuth!
  client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
    // No auth config needed - @supabase/ssr handles everything automatically
  )

  console.log('✅ Supabase client created with enhanced auth config')
  return client
}

/**
 * Manually clear cookies and recreate client
 * Use this when getUser() times out due to stale cookies
 */
export function recreateClient() {
  console.log('🔄 Recreating Supabase client with fresh cookie state...')

  // Force clear all cookies
  clearStaleSupabaseCookies(true)

  // Reset client instance
  client = null

  // Create fresh client
  return createClient()
}
