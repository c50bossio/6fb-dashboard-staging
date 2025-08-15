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
   * Polls for session with exponential backoff
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
        
        // Try to get current session
        const { data: { session }, error } = await this.supabase.auth.getSession()
        
        if (error) {
          console.warn(`❌ Session check error (attempt ${attempt}):`, error.message)
          onError({ attempt, error: error.message, type: 'session_error' })
        } else if (session?.user) {
          console.log(`✅ Session recovered successfully (attempt ${attempt}):`, session.user.email)
          onProgress({ attempt, maxAttempts, status: 'success' })
          return { success: true, session, user: session.user }
        } else {
          console.log(`⏳ No session found (attempt ${attempt}/${maxAttempts})`)
          onProgress({ attempt, maxAttempts, status: 'retrying' })
        }

        // Calculate delay with exponential backoff
        if (attempt < maxAttempts) {
          const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt - 1),
            this.maxDelay
          )
          console.log(`⏱️ Waiting ${delay}ms before next attempt...`)
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