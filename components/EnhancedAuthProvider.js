'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authConfig } from '@/lib/auth-config'

const AuthContext = createContext({})

export function EnhancedAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()
  const refreshTimerRef = useRef(null)

  // Check for development session
  const checkDevSession = useCallback(() => {
    if (typeof window === 'undefined') return null
    
    const devAuth = document.cookie.includes('dev_auth=true')
    const devSessionStr = localStorage.getItem('dev_session')
    
    if (devAuth || devSessionStr) {
      try {
        const devSession = devSessionStr ? JSON.parse(devSessionStr) : authConfig.development.mockUser
        console.log('🔓 Development session active:', devSession.user?.email)
        return devSession
      } catch (e) {
        console.error('Failed to parse dev session:', e)
      }
    }
    return null
  }, [])

  // Initialize session
  const initializeSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check for dev session first
      const devSession = checkDevSession()
      if (devSession) {
        setUser(devSession.user)
        setSession(devSession)
        setLoading(false)
        return
      }
      
      // Check for real Supabase session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        setError(sessionError.message)
      } else if (currentSession) {
        console.log('✅ Session restored:', currentSession.user?.email)
        setUser(currentSession.user)
        setSession(currentSession)
        
        // Schedule session refresh
        scheduleSessionRefresh(currentSession)
      } else {
        console.log('No active session')
      }
    } catch (err) {
      console.error('Failed to initialize session:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [checkDevSession, supabase])

  // Schedule automatic session refresh
  const scheduleSessionRefresh = useCallback((session) => {
    if (!session?.expires_at) return
    
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    
    const expiresAt = new Date(session.expires_at).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    
    // Refresh when 70% of session time has passed or 5 minutes before expiry
    const refreshTime = Math.min(
      timeUntilExpiry * 0.7,
      timeUntilExpiry - (5 * 60 * 1000)
    )
    
    if (refreshTime > 0) {
      console.log(`⏰ Session refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`)
      
      refreshTimerRef.current = setTimeout(async () => {
        console.log('🔄 Refreshing session...')
        const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
        
        if (error) {
          console.error('Failed to refresh session:', error)
          // Session expired, redirect to login
          router.push('/login')
        } else if (newSession) {
          console.log('✅ Session refreshed successfully')
          setSession(newSession)
          setUser(newSession.user)
          // Schedule next refresh
          scheduleSessionRefresh(newSession)
        }
      }, refreshTime)
    }
  }, [router, supabase])

  // Sign in function
  const signIn = useCallback(async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      if (data.session) {
        console.log('✅ Sign in successful:', data.user?.email)
        setUser(data.user)
        setSession(data.session)
        scheduleSessionRefresh(data.session)
        return { success: true }
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [supabase, scheduleSessionRefresh])

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      setError(null)
      
      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      
      // Clear dev session
      localStorage.removeItem('dev_session')
      sessionStorage.removeItem('dev_session')
      document.cookie = 'dev_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      console.log('✅ Signed out successfully')
      setUser(null)
      setSession(null)
      router.push('/login')
    } catch (err) {
      console.error('Sign out error:', err)
      setError(err.message)
    }
  }, [supabase, router])

  // Listen for auth state changes
  useEffect(() => {
    // Initialize session on mount
    initializeSession()
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
          setSession(session)
          if (session) {
            scheduleSessionRefresh(session)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current)
          }
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user ?? null)
        }
      }
    )
    
    // Cleanup on unmount
    return () => {
      subscription?.unsubscribe()
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [supabase, initializeSession, scheduleSessionRefresh])

  // Periodically check session validity (backup mechanism)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (session && !checkDevSession()) {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (!currentSession) {
          console.warn('⚠️ Session lost, redirecting to login')
          setUser(null)
          setSession(null)
          router.push('/login')
        }
      }
    }, authConfig.session.autoRefreshInterval)
    
    return () => clearInterval(interval)
  }, [session, supabase, router, checkDevSession])

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signOut,
    refreshSession: async () => {
      const { data: { session: newSession } } = await supabase.auth.refreshSession()
      if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
        scheduleSessionRefresh(newSession)
      }
      return newSession
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useEnhancedAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider')
  }
  return context
}