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
    console.log('🔄 Starting OAuth callback processing with code:', code?.substring(0, 10) + '...')
    
    // First check for existing session (quick check)
    console.log('📋 Quick session check...')
    try {
      const { data: { session: quickSession } } = await supabase.auth.getSession()
      if (quickSession?.user) {
        console.log('✅ Found existing session for user:', quickSession.user.email)
        return { success: true, session: quickSession, existingSession: true }
      }
    } catch (quickError) {
      console.log('⚠️ Quick session check failed, continuing with code exchange')
    }
    
    console.log('📤 No existing session, exchanging code for session...')
    
    // Try to exchange code with a shorter timeout
    const exchangeTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Exchange timeout')), 5000)
    )
    
    let data, error
    try {
      const result = await Promise.race([
        supabase.auth.exchangeCodeForSession(code),
        exchangeTimeout
      ])
      data = result.data
      error = result.error
    } catch (timeoutErr) {
      console.log('⏱️ Exchange timed out, checking for session anyway...')
      // Even if exchange times out, check if session was created
      const { data: { session: timeoutSession } } = await supabase.auth.getSession()
      if (timeoutSession?.user) {
        console.log('✅ Session found despite timeout')
        return { success: true, session: timeoutSession, recovered: true }
      }
      throw new Error('Code exchange timeout and no session found')
    }
    
    console.log('📥 Code exchange result:', { 
      hasData: !!data,
      hasSession: !!data?.session,
      hasUser: !!data?.session?.user,
      hasError: !!error,
      errorMessage: error?.message
    })
    
    if (error) {
      console.error('❌ Code exchange failed:', error)
      
      // Check if it's a "code already used" error
      if (error.message?.includes('already used') || error.message?.includes('expired') || error.message?.includes('pkce')) {
        console.log('🔄 Code issue detected, checking for existing session...')
        
        // Wait a moment for session to propagate
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Try to get session
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        if (retrySession?.user) {
          console.log('✅ Found session for user:', retrySession.user.email)
          return { success: true, session: retrySession, recovered: true }
        }
        
        console.log('❌ No session found after code error')
      }
      
      throw error
    }
    
    if (data?.session?.user) {
      console.log('✅ New session created for user:', data.session.user.email)
      return { success: true, session: data.session }
    } else {
      console.error('❌ No session in exchange data')
      throw new Error('No session returned from code exchange')
    }
  } catch (error) {
    console.error('❌ OAuth callback failed:', error)
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