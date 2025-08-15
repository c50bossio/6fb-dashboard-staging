/**
 * Session Recovery Utility
 * 
 * Handles OAuth session synchronization issues and provides robust
 * session recovery mechanisms for the authentication system.
 */

export class SessionRecovery {
  constructor(supabaseClient) {
    this.supabase = supabaseClient
    this.maxRetries = 5
    this.baseDelay = 1000 // 1 second
    this.maxDelay = 8000 // 8 seconds
  }

  /**
   * Polls for session with exponential backoff and enhanced OAuth detection
   */
  async pollForSession(options = {}) {
    const {
      maxAttempts = this.maxRetries,
      onProgress = () => {},
      onError = () => {},
      isOAuthFlow = false
    } = options

    console.log(`🔄 Starting session polling (OAuth: ${isOAuthFlow}, max attempts: ${maxAttempts})`)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        onProgress({ attempt, maxAttempts, status: 'checking' })
        
        // Enhanced session detection for OAuth flows
        let session = null
        let sessionError = null
        
        // Method 1: Try standard getSession
        const { data: sessionData, error } = await this.supabase.auth.getSession()
        
        if (error) {
          console.warn(`❌ getSession error (attempt ${attempt}):`, error.message)
          sessionError = error
        } else if (sessionData?.session?.user) {
          session = sessionData.session
        }
        
        // Method 2: For OAuth flows, also try refreshSession if no session found
        if (!session && isOAuthFlow && attempt <= 2) {
          console.log(`🔄 OAuth flow - attempting session refresh (attempt ${attempt})`)
          try {
            const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession()
            
            if (!refreshError && refreshData?.session?.user) {
              console.log(`✅ Session found via refresh (attempt ${attempt})`)
              session = refreshData.session
            } else if (refreshError) {
              console.log(`⚠️ Session refresh failed (attempt ${attempt}):`, refreshError.message)
            }
          } catch (refreshErr) {
            console.log(`⚠️ Session refresh error (attempt ${attempt}):`, refreshErr.message)
          }
        }
        
        // Method 3: For OAuth flows, check server-side session via API call
        if (!session && isOAuthFlow && attempt <= 3) {
          console.log(`🌐 OAuth flow - checking server session (attempt ${attempt})`)
          try {
            const response = await fetch('/api/auth/session', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            })
            
            if (response.ok) {
              const serverData = await response.json()
              if (serverData.authenticated && serverData.user) {
                console.log(`🌐 Server session found (attempt ${attempt}):`, serverData.user.email)
                
                // Server has session but client doesn't - force client refresh
                const { data: forcedRefresh } = await this.supabase.auth.refreshSession()
                if (forcedRefresh?.session) {
                  session = forcedRefresh.session
                  console.log(`✅ Client session synchronized with server (attempt ${attempt})`)
                }
              }
            }
          } catch (serverErr) {
            console.log(`⚠️ Server session check failed (attempt ${attempt}):`, serverErr.message)
          }
        }
        
        // Success case
        if (session?.user) {
          console.log(`✅ Session recovered successfully (attempt ${attempt}):`, session.user.email)
          onProgress({ attempt, maxAttempts, status: 'success' })
          return { success: true, session, user: session.user }
        }
        
        // No session found
        console.log(`⏳ No session found (attempt ${attempt}/${maxAttempts})`)
        onProgress({ attempt, maxAttempts, status: 'retrying' })
        onError({ attempt, error: sessionError?.message || 'No session', type: 'no_session' })

        // Calculate delay with exponential backoff
        if (attempt < maxAttempts) {
          // For OAuth flows, use longer delays to allow session propagation
          const baseDelay = isOAuthFlow ? 2000 : this.baseDelay
          const delay = Math.min(
            baseDelay * Math.pow(1.5, attempt - 1), // Slower growth for OAuth
            isOAuthFlow ? 10000 : this.maxDelay // Longer max delay for OAuth
          )
          console.log(`⏱️ OAuth flow - waiting ${delay}ms before next attempt...`)
          await this.sleep(delay)
        }
      } catch (error) {
        console.error(`💥 Session polling error (attempt ${attempt}):`, error)
        onError({ attempt, error: error.message, type: 'polling_error' })
        
        if (attempt === maxAttempts) {
          return { success: false, error: error.message, attempts: attempt }
        }
      }
    }

    console.warn(`⚠️ Session polling failed after ${maxAttempts} attempts`)
    return { success: false, error: 'Session polling timeout', attempts: maxAttempts }
  }

  /**
   * Validates session across client and server
   */
  async validateSessionConsistency() {
    try {
      console.log('🔍 Validating session consistency...')
      
      // Check client-side session
      const { data: { session: clientSession } } = await this.supabase.auth.getSession()
      
      // Check server-side session via API
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Session validation failed: ${response.status}`)
      }
      
      const serverData = await response.json()
      
      const isConsistent = !!(clientSession?.user && serverData.authenticated)
      
      console.log('📊 Session consistency check:', {
        clientSession: !!clientSession?.user,
        serverSession: serverData.authenticated,
        consistent: isConsistent
      })
      
      return {
        consistent: isConsistent,
        clientSession,
        serverSession: serverData,
        user: clientSession?.user || null
      }
    } catch (error) {
      console.error('❌ Session validation error:', error)
      return {
        consistent: false,
        error: error.message,
        user: null
      }
    }
  }

  /**
   * Attempts to recover session using multiple strategies
   */
  async recoverSession(options = {}) {
    const { strategy = 'auto', forceRefresh = false } = options
    
    console.log(`🔧 Starting session recovery (strategy: ${strategy})`)
    
    try {
      // Strategy 1: Force refresh current session
      if (strategy === 'refresh' || strategy === 'auto') {
        console.log('🔄 Attempting session refresh...')
        const { data, error } = await this.supabase.auth.refreshSession()
        
        if (!error && data.session) {
          console.log('✅ Session recovered via refresh')
          return { success: true, method: 'refresh', session: data.session }
        }
      }

      // Strategy 2: Manual session validation and sync
      if (strategy === 'validate' || strategy === 'auto') {
        console.log('🔍 Attempting session validation...')
        const validation = await this.validateSessionConsistency()
        
        if (validation.consistent && validation.user) {
          console.log('✅ Session recovered via validation')
          return { success: true, method: 'validation', session: validation.clientSession }
        }
      }

      // Strategy 3: Clear and reinitialize (last resort)
      if (strategy === 'reinit' || (strategy === 'auto' && forceRefresh)) {
        console.log('🔄 Attempting session reinitialization...')
        await this.clearAuthState()
        
        // Wait a moment then check for session
        await this.sleep(1000)
        const pollResult = await this.pollForSession({ maxAttempts: 3 })
        
        if (pollResult.success) {
          console.log('✅ Session recovered via reinitialization')
          return { success: true, method: 'reinit', session: pollResult.session }
        }
      }

      console.warn('⚠️ All session recovery strategies failed')
      return { success: false, error: 'All recovery strategies exhausted' }
      
    } catch (error) {
      console.error('💥 Session recovery failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clears all authentication state
   */
  async clearAuthState() {
    console.log('🧹 Clearing authentication state...')
    
    if (typeof window !== 'undefined') {
      // Clear localStorage auth keys
      const authKeys = [
        'sb-auth-token',
        'sb-refresh-token', 
        'supabase.auth.token',
        'auth-token'
      ]
      
      authKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
          console.log(`🗑️ Cleared localStorage: ${key}`)
        }
      })

      // Clear auth cookies
      const authCookies = ['sb-auth-token', 'sb-refresh-token']
      authCookies.forEach(name => {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`
        console.log(`🍪 Cleared cookie: ${name}`)
      })
    }
  }

  /**
   * Detects if current request is from OAuth flow
   */
  isOAuthRedirect() {
    if (typeof window === 'undefined') return false
    
    const urlParams = new URLSearchParams(window.location.search)
    const currentPath = window.location.pathname
    
    return !!(
      urlParams.get('from') === 'oauth_success' ||
      urlParams.get('code') ||
      currentPath.includes('/auth/callback') ||
      currentPath === '/welcome' ||
      document.referrer.includes('accounts.google.com')
    )
  }

  /**
   * Creates a promise that resolves after specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Gets user profile with retry logic
   */
  async getUserProfile(userId, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`👤 Fetching user profile (attempt ${attempt}/${maxRetries})`)
        
        const { data: profile, error } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) {
          console.warn(`❌ Profile fetch error (attempt ${attempt}):`, error.message)
          if (attempt === maxRetries) throw error
        } else if (profile) {
          console.log('✅ Profile fetched successfully:', profile.email)
          return { success: true, profile }
        }
        
        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt) // Progressive delay
        }
      } catch (error) {
        console.error(`💥 Profile fetch failed (attempt ${attempt}):`, error)
        if (attempt === maxRetries) {
          return { success: false, error: error.message }
        }
      }
    }
    
    return { success: false, error: 'Profile fetch timeout' }
  }
}

export default SessionRecovery