'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from "@/lib/supabase/client"

const AuthContext = createContext({})

// Debug logging utility with environment-based levels
const createLogger = () => {
  const isDev = process.env.NODE_ENV === 'development'
  const isDebug = typeof window !== 'undefined' && localStorage.getItem('debug_auth') === 'true'
  
  return {
    debug: (...args) => {
      if (isDebug) console.log('🔐 [DEBUG]', ...args)
    },
    info: (...args) => {
      if (isDev || isDebug) console.log('🔐 [INFO]', ...args)
    },
    warn: (...args) => {
      if (isDev || isDebug) console.warn('🔐 [WARN]', ...args)
    },
    error: (...args) => {
      console.error('🔐 [ERROR]', ...args)
    },
    critical: (...args) => {
      console.error('🔐 [CRITICAL]', ...args)
    }
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Start with loading true to ensure auth is checked before rendering
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const logger = createLogger()
  
  // Enhanced session cache with request deduplication
  const sessionCache = useRef({ 
    user: null, 
    profile: null, 
    timestamp: 0,
    pendingAuthCheck: null,
    pendingProfileFetch: null
  })
  const CACHE_TTL = 60000 // Increased to 60 seconds for stable sessions
  const SHORT_CACHE_TTL = 5000 // Short cache for rapid requests
  
  // Debounce timer for auth checks
  const checkUserTimeout = useRef(null)
  
  // Performance monitoring with minimal overhead
  const performanceMetrics = useRef({ 
    authCheckCount: 0, 
    profileFetchCount: 0, 
    cacheHits: 0,
    lastAuthTime: 0,
    slowAuthWarnings: 0,
    sessionId: Math.random().toString(36).substring(2, 9)
  })
  
  // OAuth flow detection with caching
  const oauthState = useRef({
    isOAuthFlow: false,
    lastCheck: 0,
    checkInterval: 1000 // Cache OAuth detection for 1 second
  })
  
  // Component mount state to prevent memory leaks
  const isMounted = useRef(true)
  
  // Request cancellation for cleanup
  const abortController = useRef(new AbortController())
  
  // Optimized OAuth flow detection with caching
  const detectOAuthFlow = useCallback(() => {
    const now = Date.now()
    
    // Return cached result if still valid
    if (now - oauthState.current.lastCheck < oauthState.current.checkInterval) {
      return oauthState.current.isOAuthFlow
    }
    
    // Check for OAuth indicators
    const isOAuth = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=') ||
      window.location.pathname.includes('/auth/callback') ||
      document.referrer.includes('accounts.google.com') ||
      sessionStorage.getItem('oauth_callback_completed')
    )
    
    // Cache the result
    oauthState.current.isOAuthFlow = isOAuth
    oauthState.current.lastCheck = now
    
    return isOAuth
  }, [])

  // Optimized profile fetching with request deduplication
  const fetchProfile = useCallback(async (userId, skipCache = false) => {
    if (!isMounted.current) return null
    
    const startTime = Date.now()
    const cacheKey = `profile_${userId}`
    
    // Check for existing pending request to prevent duplicates
    if (!skipCache && sessionCache.current.pendingProfileFetch) {
      logger.debug('Profile fetch already in progress, waiting...')
      try {
        return await sessionCache.current.pendingProfileFetch
      } catch (error) {
        // If pending request failed, continue with new request
        sessionCache.current.pendingProfileFetch = null
      }
    }
    
    // Check cache first unless explicitly skipping
    if (!skipCache && sessionCache.current.profile && 
        sessionCache.current.profile.id === userId &&
        sessionCache.current.timestamp > Date.now() - CACHE_TTL) {
      performanceMetrics.current.cacheHits++
      logger.debug('Profile cache hit for user:', userId)
      return sessionCache.current.profile
    }
    
    // Create and store the pending promise
    const profilePromise = (async () => {
      performanceMetrics.current.profileFetchCount++
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, first_name, last_name, avatar_url, role, subscription_tier, subscription_status, created_at, updated_at')
          .eq('id', userId)
          .single()
        
        const duration = Date.now() - startTime
        
        // Only log slow warnings for non-OAuth flows and very slow requests
        if (duration > 5000 && !detectOAuthFlow()) {
          performanceMetrics.current.slowAuthWarnings++
          logger.warn('Slow profile fetch:', duration + 'ms')
        }
        
        if (data && isMounted.current) {
          sessionCache.current.profile = data
          sessionCache.current.timestamp = Date.now()
          logger.debug('Profile fetched successfully for user:', userId)
          return data
        } else if (error && error.code !== 'PGRST116') {
          // Only log errors that aren't "no rows" errors
          logger.warn('Profile fetch failed:', error.message)
          return null
        }
        
        return null
      } catch (error) {
        if (isMounted.current) {
          logger.error('Profile fetch error:', error.message)
        }
        return null
      } finally {
        // Clear the pending request
        sessionCache.current.pendingProfileFetch = null
      }
    })()
    
    // Store the promise to prevent duplicate requests
    sessionCache.current.pendingProfileFetch = profilePromise
    
    return profilePromise
  }, [supabase, logger, detectOAuthFlow])

  // Optimized user check with enhanced caching and request deduplication
  const checkUser = useCallback(async (skipCache = false, reason = 'unknown') => {
    if (!isMounted.current) return
    
    const startTime = Date.now()
    performanceMetrics.current.authCheckCount++
    
    // Clear any pending check
    if (checkUserTimeout.current) {
      clearTimeout(checkUserTimeout.current)
      checkUserTimeout.current = null
    }
    
    // Check for existing pending auth check to prevent duplicates
    if (!skipCache && sessionCache.current.pendingAuthCheck) {
      logger.debug('Auth check already in progress, waiting...')
      try {
        return await sessionCache.current.pendingAuthCheck
      } catch (error) {
        // If pending request failed, continue with new request
        sessionCache.current.pendingAuthCheck = null
      }
    }
    
    // Detect OAuth flow using cached detection
    const isOAuthFlow = detectOAuthFlow()
    const isRecentOAuthCallback = typeof window !== 'undefined' && 
      sessionStorage.getItem('oauth_callback_completed')
    
    // Enhanced cache checking with different TTLs based on context
    const cacheAge = Date.now() - sessionCache.current.timestamp
    const effectiveTTL = isOAuthFlow || isRecentOAuthCallback ? SHORT_CACHE_TTL : CACHE_TTL
    
    if (!skipCache && !isOAuthFlow && !isRecentOAuthCallback && 
        sessionCache.current.user && cacheAge < effectiveTTL) {
      performanceMetrics.current.cacheHits++
      logger.debug('Auth cache hit, age:', cacheAge + 'ms')
      
      if (isMounted.current) {
        setUser(sessionCache.current.user)
        setProfile(sessionCache.current.profile)
        setLoading(false)
      }
      return
    }
    
    // Create the auth check promise to prevent duplicates
    const authPromise = (async () => {
      const publicPaths = ['/login', '/register', '/forgot-password', '/', '/subscribe']
      const isPublicPage = typeof window !== 'undefined' && publicPaths.includes(window.location.pathname)
      
      // Only show loading for protected pages
      if (!isPublicPage && loading === false && isMounted.current) {
        setLoading(true)
      }
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (!isMounted.current) return
        
        if (error) {
          // Reduce console noise for common auth errors
          if (error.message !== 'Invalid JWT' && error.message !== 'JWT expired') {
            logger.warn('Auth check error:', error.message)
          }
          setUser(null)
          setProfile(null)
          sessionCache.current = { 
            ...sessionCache.current,
            user: null, 
            profile: null, 
            timestamp: Date.now(),
            pendingAuthCheck: null
          }
        } else if (user) {
          // Keep loading true until profile is also loaded for authenticated users
          setUser(user)
          sessionCache.current.user = user
          sessionCache.current.timestamp = Date.now()
          
          // Fetch profile with cache optimization
          const profileData = await fetchProfile(user.id, skipCache)
          if (profileData && isMounted.current) {
            setProfile(profileData)
          }
          
          // Don't set loading false yet - let the finally block handle it
          // This prevents the race condition where user exists but loading=false too early
        } else {
          setUser(null)
          setProfile(null)
          sessionCache.current = { 
            ...sessionCache.current,
            user: null, 
            profile: null, 
            timestamp: Date.now(),
            pendingAuthCheck: null
          }
        }
      } catch (error) {
        if (isMounted.current) {
          logger.error('Error in checkUser:', error)
          setUser(null)
          setProfile(null)
        }
      } finally {
        const duration = Date.now() - startTime
        performanceMetrics.current.lastAuthTime = duration
        
        // Only warn about very slow auth for non-OAuth flows
        if (duration > 5000 && !isOAuthFlow && isMounted.current) {
          performanceMetrics.current.slowAuthWarnings++
          logger.warn('Slow auth check:', duration + 'ms', 'Reason:', reason)
        }
        
        if (isMounted.current) {
          setLoading(false)
        }
        
        // Clear the pending request
        sessionCache.current.pendingAuthCheck = null
      }
    })()
    
    // Store the promise to prevent duplicate requests
    sessionCache.current.pendingAuthCheck = authPromise
    
    return authPromise
  }, [supabase, fetchProfile, loading, logger, detectOAuthFlow])

  // Performance monitoring method
  const getPerformanceMetrics = useCallback(() => {
    const metrics = performanceMetrics.current
    const cacheHitRate = metrics.authCheckCount > 0 ? (metrics.cacheHits / metrics.authCheckCount * 100).toFixed(1) : '0'
    
    return {
      ...metrics,
      cacheHitRate: cacheHitRate + '%',
      averageAuthTime: metrics.lastAuthTime + 'ms'
    }
  }, [])

  useEffect(() => {
    // Initialize mount state and abort controller
    isMounted.current = true
    abortController.current = new AbortController()
    
    let timeoutId = null
    let subscription = null
    
    // React Strict Mode handling - prevent double execution
    const effectId = Math.random().toString(36).substring(2, 9)
    logger.debug('useEffect initializing with ID:', effectId)
    
    // Enhanced OAuth callback detection
    const isOAuthCallback = typeof window !== 'undefined' && (
      window.location.pathname.includes('/dashboard') && 
      (document.referrer.includes('accounts.google.com') ||
       sessionStorage.getItem('oauth_callback_completed') ||
       window.location.search.includes('code='))
    )
    
    // Mark OAuth callback completion
    if (isOAuthCallback && typeof window !== 'undefined') {
      sessionStorage.setItem('oauth_callback_completed', 'true')
      // Clear after 30 seconds to prevent persistent detection
      setTimeout(() => {
        sessionStorage.removeItem('oauth_callback_completed')
      }, 30000)
    }
    
    // Debounced auth check with enhanced caching
    const debouncedCheck = () => {
      if (!isMounted.current) return
      
      if (checkUserTimeout.current) {
        clearTimeout(checkUserTimeout.current)
      }
      
      // Use cached OAuth detection
      const isOAuth = detectOAuthFlow() || isOAuthCallback
      const hasOAuthParams = typeof window !== 'undefined' && (
        window.location.hash.includes('access_token') ||
        window.location.search.includes('code=') ||
        window.location.pathname.includes('/auth/callback') ||
        isOAuthCallback
      )
      
      // Force immediate auth check for OAuth callback
      const delay = isOAuthCallback ? 0 : (hasOAuthParams ? 50 : 300)
      
      checkUserTimeout.current = setTimeout(() => {
        if (isMounted.current) {
          checkUser(hasOAuthParams || isOAuthCallback, isOAuthCallback ? 'oauth-callback' : 'initial-mount')
        }
      }, delay)
    }
    
    // Enhanced timeout fallback with reduced logging
    timeoutId = setTimeout(() => {
      if (isMounted.current && loading) {
        const isOAuth = detectOAuthFlow() || isOAuthCallback
        const timeout = isOAuth ? '30s' : '20s'
        logger.warn('Auth timeout - forcing loading false after', timeout)
        setLoading(false)
      }
    }, (detectOAuthFlow() || isOAuthCallback) ? 30000 : 20000)
    
    // Initialize auth check
    debouncedCheck()

    // Enhanced auth state change listener with session state synchronization
    const initializeAuthListener = async () => {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted.current) return // Prevent state updates if unmounted
          
          const isOAuth = detectOAuthFlow()
          
          // Drastically reduce console noise - only log critical events
          if (event === 'SIGNED_IN' && !isOAuth) {
            logger.info('Auth event:', event, session?.user?.email || 'no user')
          } else if (event === 'SIGNED_OUT') {
            logger.info('Auth event:', event)
          }
          
          if (event === 'SIGNED_IN' && session) {
            // Keep loading true until both user and profile are set
            setLoading(true)
            setUser(session.user)
            sessionCache.current.user = session.user
            sessionCache.current.timestamp = Date.now()
            
            // Mark OAuth callback completion for better state management
            if (isOAuth && typeof window !== 'undefined') {
              sessionStorage.setItem('oauth_callback_completed', 'true')
            }
            
            // Use optimized profile fetching - skip cache for fresh login
            const profileData = await fetchProfile(session.user.id, true)
            if (profileData && isMounted.current) {
              setProfile(profileData)
            }
            
            // Only set loading to false after both user and profile operations complete
            if (isMounted.current) {
              setLoading(false)
            }
            
            // Redirect if on login page - add small delay to ensure state propagates
            if (typeof window !== 'undefined' && window.location.pathname === '/login') {
              setTimeout(() => {
                if (isMounted.current) {
                  router.push('/dashboard')
                }
              }, 100)
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setProfile(null)
            sessionCache.current = { 
              user: null, 
              profile: null, 
              timestamp: 0,
              pendingAuthCheck: null,
              pendingProfileFetch: null
            }
            
            if (isMounted.current) {
              setLoading(false)
            }
            
            // Redirect to login if on protected page
            const publicPaths = ['/login', '/register', '/forgot-password', '/', '/clear-all']
            if (typeof window !== 'undefined' && !publicPaths.includes(window.location.pathname)) {
              router.push('/login')
            }
          } else if (event === 'USER_UPDATED' && session) {
            setUser(session.user)
            sessionCache.current.user = session.user
            // Invalidate profile cache to refetch updated data
            sessionCache.current.profile = null
            sessionCache.current.timestamp = 0
            
            if (isMounted.current) {
              setLoading(false)
            }
          } else {
            // For any other events, ensure loading is false if no valid session
            if (!session && isMounted.current) {
              setLoading(false)
            }
          }
        })
        
        subscription = data.subscription
      } catch (error) {
        logger.error('Failed to initialize auth listener:', error)
        if (isMounted.current) {
          setLoading(false)
        }
      }
    }
    
    initializeAuthListener()

    // Enhanced cleanup function
    return () => {
      logger.debug('useEffect cleanup for ID:', effectId)
      isMounted.current = false
      
      // Cancel any pending requests
      if (abortController.current) {
        abortController.current.abort()
      }
      
      // Clear timeouts
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (checkUserTimeout.current) {
        clearTimeout(checkUserTimeout.current)
      }
      
      // Clean up subscription
      if (subscription) {
        subscription.unsubscribe()
      }
      
      // Clear pending requests to prevent memory leaks
      sessionCache.current.pendingAuthCheck = null
      sessionCache.current.pendingProfileFetch = null
    }
  }, [supabase, router, checkUser, fetchProfile, detectOAuthFlow, logger, loading]) // Fixed dependencies

  const signUp = async ({ email, password, metadata }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/dashboard`
      },
    })
    
    if (error) throw error

    // Supabase Auth handles user creation
    // Database trigger will create profile automatically
    // No need for manual profile creation
    
    return data
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      }
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    logger.info('Signing out user')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const clearAllSessions = async () => {
    logger.info('Clearing all sessions and dev data')
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear local state
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      // Clear any cached data in browser
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might contain cached auth data
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Clear sessionStorage as well
        sessionStorage.clear()
        
        logger.debug('Cleared browser storage keys:', keysToRemove)
      }
      
      logger.info('All sessions and dev data cleared successfully')
    } catch (error) {
      logger.error('Error clearing sessions:', error)
      throw error
    }
  }

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) throw error
    return data
  }

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
    return data
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    
    setProfile(data)
    return data
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    clearAllSessions,
    resetPassword,
    updatePassword,
    updateProfile,
    getPerformanceMetrics,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { SupabaseAuthProvider }