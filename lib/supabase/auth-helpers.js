import { createClient } from './browser-client'

/**
 * Production-ready authentication helpers with proper error handling and state management
 */

/**
 * Clear all authentication-related data from browser storage
 * @param {Object} options - Configuration options
 * @param {boolean} options.preserveDevSession - Whether to preserve development session data
 * @returns {void}
 */
export function clearAuthStorage(options = {}) {
  const { preserveDevSession = false } = options
  
  // Target specific Supabase auth keys instead of clearing everything
  const authPatterns = [
    /^sb-.*-auth-token$/,
    /^sb-.*-auth-token-code-verifier$/,
    /^supabase\.auth\.token$/,
    /^supabase-auth-token$/
  ]
  
  // Clear localStorage
  const localStorageKeys = Object.keys(localStorage)
  localStorageKeys.forEach(key => {
    const shouldClear = authPatterns.some(pattern => pattern.test(key))
    if (shouldClear) {
      localStorage.removeItem(key)
    }
    
    // Also clear dev session unless preserving
    if (!preserveDevSession && (key === 'dev_session' || key === 'dev_bypass')) {
      localStorage.removeItem(key)
    }
  })
  
  // Clear sessionStorage
  const sessionStorageKeys = Object.keys(sessionStorage)
  sessionStorageKeys.forEach(key => {
    const shouldClear = authPatterns.some(pattern => pattern.test(key))
    if (shouldClear) {
      sessionStorage.removeItem(key)
    }
  })
  
  // Clear auth cookies more precisely
  clearAuthCookies()
}

/**
 * Clear authentication-related cookies
 * @returns {void}
 */
export function clearAuthCookies() {
  // Get all cookies
  const cookies = document.cookie.split(';')
  
  cookies.forEach(cookie => {
    const eqPos = cookie.indexOf('=')
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
    
    // Only clear auth-related cookies
    if (name.startsWith('sb-') || name.includes('supabase')) {
      // Clear for current domain
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      
      // Clear for parent domain if on subdomain
      const hostname = window.location.hostname
      if (hostname.includes('.')) {
        const domain = hostname.substring(hostname.indexOf('.'))
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`
      }
    }
  })
}

/**
 * Perform a complete sign out with proper cleanup
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
export async function performSignOut(supabase) {
  try {
    // Step 1: Get current session to ensure we have something to sign out
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      // No session to sign out from, just clear local data
      clearAuthStorage()
      return { success: true, alreadySignedOut: true }
    }
    
    // Step 2: Attempt sign out with proper error handling
    const { error } = await supabase.auth.signOut({
      scope: 'global' // Sign out from all devices if using Supabase Auth v2
    })
    
    if (error) {
      console.error('Supabase signOut error:', error)
      // Even if Supabase fails, clear local storage
      clearAuthStorage()
      return { success: false, error }
    }
    
    // Step 3: Verify sign out succeeded
    const { data: { session: remainingSession } } = await supabase.auth.getSession()
    
    if (remainingSession) {
      // Session still exists, force clear
      console.warn('Session persisted after signOut, forcing clear')
      clearAuthStorage()
      
      // Try to invalidate the session on the server
      await fetch('/api/auth/signout', { 
        method: 'POST',
        credentials: 'same-origin'
      }).catch(() => {})
      
      return { success: true, forcedClear: true }
    }
    
    // Step 4: Clean up storage as final step
    clearAuthStorage()
    
    return { success: true }
  } catch (error) {
    console.error('Sign out failed:', error)
    // Always clear local storage on error
    clearAuthStorage()
    return { success: false, error }
  }
}

/**
 * Check if user has an active session
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<{hasSession: boolean, user?: Object}>}
 */
export async function checkSession(supabase) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return { hasSession: false }
    }
    
    // Verify the session is still valid
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      // Session exists but is invalid
      clearAuthStorage()
      return { hasSession: false }
    }
    
    return { hasSession: true, user }
  } catch (error) {
    console.error('Session check failed:', error)
    return { hasSession: false }
  }
}

/**
 * Handle OAuth callback with proper error recovery
 * @param {Object} supabase - Supabase client instance
 * @param {string} code - OAuth authorization code
 * @returns {Promise<{success: boolean, session?: Object, error?: Error}>}
 */
export async function handleOAuthCallback(supabase, code) {
  try {
    // First check for existing session
    const { hasSession, user } = await checkSession(supabase)
    
    if (hasSession && user) {
      console.log('Existing valid session found')
      return { success: true, session: { user }, existingSession: true }
    }
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // Check if it's a "code already used" error
      if (error.message?.includes('already used') || error.message?.includes('expired')) {
        // Try to get session one more time
        const { hasSession: retrySession, user: retryUser } = await checkSession(supabase)
        if (retrySession && retryUser) {
          return { success: true, session: { user: retryUser }, recovered: true }
        }
      }
      
      throw error
    }
    
    return { success: true, session: data.session }
  } catch (error) {
    console.error('OAuth callback failed:', error)
    return { success: false, error }
  }
}

/**
 * Initialize authentication state on app load
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<{user?: Object, session?: Object}>}
 */
export async function initializeAuth(supabase) {
  try {
    // Check for force sign out flag first
    if (sessionStorage.getItem('force_sign_out') === 'true') {
      sessionStorage.removeItem('force_sign_out')
      clearAuthStorage()
      return { user: null, session: null }
    }
    
    // Get current session
    const { hasSession, user } = await checkSession(supabase)
    
    if (!hasSession) {
      return { user: null, session: null }
    }
    
    return { user, session: { user } }
  } catch (error) {
    console.error('Auth initialization failed:', error)
    return { user: null, session: null }
  }
}