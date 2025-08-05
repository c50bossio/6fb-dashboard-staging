// Enhanced Session Management for 6FB AI Agent System
// Provides automatic session refresh, storage management, and security features

import { createClient } from './supabase/client'

class SessionManager {
  constructor() {
    this.supabase = createClient()
    this.refreshTimer = null
    this.sessionWarningTimer = null
    this.listeners = new Set()
    this.isRefreshing = false
    
    // Session configuration
    this.config = {
      autoRefresh: true,
      warningBeforeExpiry: 15 * 60 * 1000, // 15 minutes
      refreshBuffer: 5 * 60 * 1000,         // 5 minutes before expiry
      maxRetries: 3,
      retryDelay: 1000,
      enableStorage: true,
      storageKey: '6fb-session-data'
    }
    
    this.initializeSessionManagement()
  }

  // Initialize session management with automatic refresh
  initializeSessionManagement() {
    console.log('🔐 Initializing enhanced session management...')
    
    // Set up auth state listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event)
      
      if (session) {
        this.handleSessionUpdate(session)
      } else {
        this.handleSessionEnd()
      }
      
      // Notify all listeners
      this.notifyListeners(event, session)
    })
    
    // Check for existing session on initialization
    this.getCurrentSession()
  }

  // Get current session with validation
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session retrieval error:', error)
        return null
      }
      
      if (session) {
        console.log('✅ Current session found')
        this.handleSessionUpdate(session)
        return session
      }
      
      console.log('ℹ️ No current session')
      return null
      
    } catch (error) {
      console.error('❌ Session check failed:', error)
      return null
    }
  }

  // Handle session updates and setup refresh timers
  handleSessionUpdate(session) {
    console.log('🔄 Handling session update...')
    
    // Clear existing timers
    this.clearTimers()
    
    // Validate session expiry
    if (!session.expires_at) {
      console.warn('⚠️ Session has no expiry time')
      return
    }
    
    const expiresAt = new Date(session.expires_at * 1000)
    const now = new Date()
    const timeUntilExpiry = expiresAt - now
    
    console.log(`⏰ Session expires at: ${expiresAt.toLocaleString()}`)
    console.log(`⏰ Time until expiry: ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`)
    
    // Set up warning timer
    const warningTime = timeUntilExpiry - this.config.warningBeforeExpiry
    if (warningTime > 0) {
      this.sessionWarningTimer = setTimeout(() => {
        this.handleSessionWarning(session)
      }, warningTime)
    }
    
    // Set up refresh timer
    const refreshTime = timeUntilExpiry - this.config.refreshBuffer
    if (refreshTime > 0 && this.config.autoRefresh) {
      this.refreshTimer = setTimeout(() => {
        this.refreshSession()
      }, refreshTime)
    }
    
    // Store session metadata if enabled
    if (this.config.enableStorage) {
      this.storeSessionMetadata(session)
    }
  }

  // Handle session expiry warning
  handleSessionWarning(session) {
    console.log('⚠️ Session expiring soon - showing warning')
    
    const expiresAt = new Date(session.expires_at * 1000)
    const minutesLeft = Math.round((expiresAt - new Date()) / 1000 / 60)
    
    // Dispatch custom event for UI components to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sessionWarning', {
        detail: {
          minutesLeft,
          expiresAt,
          session
        }
      }))
    }
    
    // Notify listeners
    this.notifyListeners('session_warning', session)
  }

  // Handle session end
  handleSessionEnd() {
    console.log('🔓 Session ended')
    
    this.clearTimers()
    this.clearSessionStorage()
    
    // Notify listeners
    this.notifyListeners('session_ended', null)
  }

  // Refresh session with retry logic
  async refreshSession(retryCount = 0) {
    if (this.isRefreshing) {
      console.log('🔄 Session refresh already in progress')
      return
    }
    
    console.log(`🔄 Refreshing session (attempt ${retryCount + 1}/${this.config.maxRetries})`)
    this.isRefreshing = true
    
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        throw error
      }
      
      if (data?.session) {
        console.log('✅ Session refreshed successfully')
        this.handleSessionUpdate(data.session)
        this.notifyListeners('session_refreshed', data.session)
      }
      
    } catch (error) {
      console.error(`❌ Session refresh failed (attempt ${retryCount + 1}):`, error)
      
      // Retry logic
      if (retryCount < this.config.maxRetries - 1) {
        const delay = this.config.retryDelay * Math.pow(2, retryCount)
        console.log(`🔄 Retrying session refresh in ${delay}ms`)
        
        setTimeout(() => {
          this.refreshSession(retryCount + 1)
        }, delay)
      } else {
        console.error('❌ Session refresh failed after all retries - user will need to re-authenticate')
        
        // Dispatch failure event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sessionRefreshFailed', {
            detail: { error: error.message }
          }))
        }
        
        this.notifyListeners('session_refresh_failed', null)
      }
    } finally {
      this.isRefreshing = false
    }
  }

  // Store session metadata for persistence
  storeSessionMetadata(session) {
    if (typeof window === 'undefined') return
    
    try {
      const metadata = {
        user_id: session.user.id,
        email: session.user.email,
        expires_at: session.expires_at,
        last_refresh: new Date().toISOString(),
        provider: session.user.app_metadata?.provider || 'unknown'
      }
      
      localStorage.setItem(this.config.storageKey, JSON.stringify(metadata))
      
    } catch (error) {
      console.warn('⚠️ Failed to store session metadata:', error)
    }
  }

  // Clear session storage
  clearSessionStorage() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.config.storageKey)
    } catch (error) {
      console.warn('⚠️ Failed to clear session storage:', error)
    }
  }

  // Get stored session metadata
  getStoredSessionMetadata() {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.warn('⚠️ Failed to get stored session metadata:', error)
      return null
    }
  }

  // Clear all timers
  clearTimers() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    if (this.sessionWarningTimer) {
      clearTimeout(this.sessionWarningTimer)
      this.sessionWarningTimer = null
    }
  }

  // Add session event listener
  addListener(callback) {
    this.listeners.add(callback)
    
    // Return cleanup function
    return () => {
      this.listeners.delete(callback)
    }
  }

  // Notify all listeners of session events
  notifyListeners(event, session) {
    this.listeners.forEach(callback => {
      try {
        callback(event, session)
      } catch (error) {
        console.error('❌ Session listener error:', error)
      }
    })
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ Session manager configuration updated:', this.config)
  }

  // Get session health information
  async getSessionHealth() {
    try {
      const session = await this.getCurrentSession()
      
      if (!session) {
        return {
          status: 'no_session',
          authenticated: false,
          expires_at: null,
          time_until_expiry: null
        }
      }
      
      const expiresAt = new Date(session.expires_at * 1000)
      const now = new Date()
      const timeUntilExpiry = expiresAt - now
      const minutesUntilExpiry = Math.round(timeUntilExpiry / 1000 / 60)
      
      let status = 'healthy'
      if (timeUntilExpiry <= this.config.warningBeforeExpiry) {
        status = 'expiring_soon'
      } else if (timeUntilExpiry <= this.config.refreshBuffer) {
        status = 'needs_refresh'
      }
      
      return {
        status,
        authenticated: true,
        expires_at: expiresAt.toISOString(),
        time_until_expiry: timeUntilExpiry,
        minutes_until_expiry: minutesUntilExpiry,
        user_id: session.user.id,
        email: session.user.email,
        auto_refresh_enabled: this.config.autoRefresh,
        stored_metadata: this.getStoredSessionMetadata()
      }
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        authenticated: false
      }
    }
  }

  // Manual session refresh (for UI components)
  async forceRefresh() {
    console.log('🔄 Manual session refresh requested')
    return await this.refreshSession()
  }

  // Cleanup method
  destroy() {
    console.log('🧹 Destroying session manager')
    this.clearTimers()
    this.listeners.clear()
  }
}

// Create singleton instance
let sessionManager = null

export function getSessionManager() {
  if (!sessionManager) {
    sessionManager = new SessionManager()
  }
  return sessionManager
}

// React hook for session management
export function useSessionManager() {
  if (typeof window === 'undefined') {
    return {
      sessionManager: null,
      sessionHealth: null,
      refreshSession: () => {},
      addListener: () => () => {}
    }
  }
  
  const manager = getSessionManager()
  
  return {
    sessionManager: manager,
    sessionHealth: null, // This would be populated by a useEffect in actual React component
    refreshSession: () => manager.forceRefresh(),
    addListener: (callback) => manager.addListener(callback)
  }
}

export default SessionManager