'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/browser-client'
import SessionRecovery from '../lib/auth/session-recovery'

const AuthContext = createContext({})

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
  const [loading, setLoading] = useState(false)
  const [sessionRecovery, setSessionRecovery] = useState(null)
  const [lastSessionCheck, setLastSessionCheck] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // Initialize session recovery system
  useEffect(() => {
    const recovery = new SessionRecovery(supabase)
    setSessionRecovery(recovery)
  }, [supabase])

  useEffect(() => {
    const checkUser = async () => {
      const publicPaths = ['/login', '/register', '/forgot-password', '/subscribe', '/success', '/pricing', '/']
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
      
      const isPublicPage = publicPaths.some(path => {
        if (path === '/') {
          return currentPath === '/'  // Only exact match for root
        }
        return currentPath === path || currentPath.startsWith(path + '/') || currentPath.startsWith(path + '?')
      })
      
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        process.env.NODE_ENV === 'development'
      )
      
      if (isDevelopment && currentPath.includes('/dashboard/campaigns')) {
        console.log('🚀 DEVELOPMENT MODE: Direct bypass for campaigns page')
        const mockUser = {
          id: 'demo-user-001',
          email: 'demo@test.com',
          user_metadata: { full_name: 'Demo User' }
        }
        const mockProfile = {
          id: 'demo-user-001',
          email: 'demo@test.com',
          full_name: 'Demo User',
          role: 'SHOP_OWNER'
        }
        setUser(mockUser)
        setProfile(mockProfile)
        setLoading(false)
        console.log('✅ Mock user set immediately - no auth check needed')
        return
      }
      
      const isOAuthRedirect = urlParams.get('from') === 'oauth_success' || 
                             currentPath === '/welcome' ||
                             currentPath.includes('auth/callback')
      
      console.log('Auth check - Current path:', currentPath, 'Is public:', isPublicPage, 'OAuth redirect:', isOAuthRedirect, 'Will set loading:', !isPublicPage)
      
      if (!isPublicPage) {
        setLoading(true)
      }
      
      try {
        const authAttempts = isOAuthRedirect ? 5 : 1
        let sessionData = null
        
        // Enhanced session checking with recovery
        for (let attempt = 1; attempt <= authAttempts; attempt++) {
          console.log(`Auth attempt ${attempt}/${authAttempts}${isOAuthRedirect ? ' (OAuth redirect detected)' : ''}`)
          
          const { data: { user }, error } = await supabase.auth.getUser()
          
          if (error) {
            console.error(`Auth check error (attempt ${attempt}):`, error)
            
            // Try session recovery on auth errors for OAuth flows
            if (isOAuthRedirect && sessionRecovery && attempt < authAttempts) {
              console.log('🔧 Attempting session recovery due to auth error...')
              const recoveryResult = await sessionRecovery.recoverSession({ strategy: 'refresh' })
              
              if (recoveryResult.success) {
                console.log('✅ Session recovered after auth error')
                sessionData = { user: recoveryResult.session.user }
                break
              }
            }
            
            if (attempt === authAttempts) {
              setUser(null)
              setProfile(null)
            }
          } else if (user) {
            console.log('User authenticated:', user.email)
            sessionData = { user }
            
            // Validate session consistency for OAuth flows
            if (isOAuthRedirect && sessionRecovery) {
              const validation = await sessionRecovery.validateSessionConsistency()
              if (!validation.consistent) {
                console.warn('⚠️ Session inconsistency detected, attempting recovery...')
                const recoveryResult = await sessionRecovery.recoverSession({ strategy: 'validate' })
                if (recoveryResult.success) {
                  sessionData = { user: recoveryResult.session.user }
                }
              }
            }
            break
          } else {
            console.log(`No authenticated user (attempt ${attempt})`)
            
            // Try session recovery for OAuth flows when no user found
            if (isOAuthRedirect && sessionRecovery && attempt < authAttempts) {
              console.log('🔍 No user found, trying session polling...')
              const pollResult = await sessionRecovery.pollForSession({ 
                maxAttempts: 2,
                isOAuthFlow: true 
              })
              
              if (pollResult.success) {
                console.log('✅ User found via session polling')
                sessionData = { user: pollResult.user }
                break
              }
            }
            
            if (isOAuthRedirect && attempt < authAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1500))
            } else if (attempt === authAttempts) {
              setUser(null)
              setProfile(null)
            }
          }
        }
        
        setLastSessionCheck(Date.now())
        
        if (sessionData?.user) {
          setUser(sessionData.user)
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionData.user.id)
            .single()
          
          if (profileData) {
            setProfile(profileData)
            console.log('✅ OAuth session synchronized successfully - profile loaded')
            
            // Check if user needs to complete onboarding when accessing protected routes
            const protectedPaths = ['/dashboard', '/(protected)']
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
            const isProtectedRoute = protectedPaths.some(path => currentPath.startsWith(path))
            
            if (isProtectedRoute && profileData.onboarding_completed === false) {
              console.log('🚨 User accessing protected route without completing onboarding, redirecting to welcome')
              router.push('/welcome')
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
        console.log('✅ Auth check complete - loading set to false')
      }
    }
    
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change event:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        lastCheck: lastSessionCheck ? new Date(lastSessionCheck).toISOString() : 'never'
      })
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in successfully')
        setUser(session.user)
        
        // Enhanced profile fetching with retry logic
        let profileData = null
        if (sessionRecovery) {
          const profileResult = await sessionRecovery.getUserProfile(session.user.id)
          if (profileResult.success) {
            profileData = profileResult.profile
          } else {
            console.warn('⚠️ Profile fetch failed via session recovery, trying direct query...')
          }
        }
        
        // Fallback to direct query if session recovery failed
        if (!profileData) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!error) {
            profileData = data
          } else {
            console.error('❌ Profile fetch failed:', error)
          }
        }
        
        if (profileData) {
          setProfile(profileData)
        }
        
        // Enhanced navigation logic with session validation
        if (window.location.pathname === '/login') {
          // Validate session before navigation
          if (sessionRecovery) {
            const validation = await sessionRecovery.validateSessionConsistency()
            if (!validation.consistent) {
              console.warn('⚠️ Session inconsistent during sign-in, recovering...')
              await sessionRecovery.recoverSession({ strategy: 'validate' })
            }
          }
          
          // Check if user has completed onboarding
          if (profileData && profileData.onboarding_completed === false) {
            console.log('🚨 User has not completed onboarding, redirecting to welcome page')
            router.push('/welcome?from=signin_success')
          } else {
            console.log('✅ User onboarding complete, redirecting to dashboard')
            router.push('/dashboard')
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out')
        setUser(null)
        setProfile(null)
        setLastSessionCheck(null)
        
        const publicPaths = ['/login', '/register', '/forgot-password', '/success', '/pricing', '/', '/clear-all']
        if (!publicPaths.includes(window.location.pathname)) {
          router.push('/login')
        }
      } else if (event === 'USER_UPDATED' && session) {
        console.log('👤 User data updated')
        setUser(session.user)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🔄 Token refreshed successfully')
        setUser(session.user)
        setLastSessionCheck(Date.now())
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('🔑 Password recovery initiated')
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

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

  const signInWithGoogle = async (customRedirectTo) => {
    console.log('🔐 Starting Google OAuth')
    
    const redirectUrl = customRedirectTo || `${window.location.origin}/auth/callback`
    console.log('🔄 OAuth redirect URL:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      }
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    try {
      console.log('🔐 Starting sign out process...')
      
      if (typeof window !== 'undefined') {
        console.log('🧹 Clearing dev session...')
        localStorage.removeItem('dev_session')
        
        sessionStorage.setItem('force_sign_out', 'true')
        
        document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        
        const criticalKeys = ['sb-access-token', 'sb-refresh-token', 'supabase.auth.token', 'auth-token']
        let clearedCount = 0
        criticalKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key)
            clearedCount++
          }
        })
        console.log('✅ Cleared critical auth items:', clearedCount)
      }
      
      console.log('🔄 Starting Supabase signOut in background...')
      supabase.auth.signOut().catch(error => {
        console.error('⚠️ Supabase signOut error (non-blocking):', error)
      })
      
      console.log('✅ Local session cleared, redirecting immediately...')
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      return { success: true }
    } catch (error) {
      console.error('❌ Sign out error:', error)
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      return { success: false, error }
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

  // Session recovery helper functions
  const recoverSession = async (strategy = 'auto') => {
    if (!sessionRecovery) {
      console.warn('⚠️ Session recovery not initialized')
      return { success: false, error: 'Session recovery not available' }
    }
    
    console.log('🔧 Manual session recovery requested')
    const result = await sessionRecovery.recoverSession({ strategy })
    
    if (result.success) {
      setUser(result.session.user)
      setLastSessionCheck(Date.now())
    }
    
    return result
  }

  const validateSession = async () => {
    if (!sessionRecovery) {
      console.warn('⚠️ Session recovery not initialized')
      return { consistent: false, error: 'Session recovery not available' }
    }
    
    return await sessionRecovery.validateSessionConsistency()
  }

  const refreshSessionManually = async () => {
    try {
      console.log('🔄 Manual session refresh requested')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      if (data.session) {
        setUser(data.session.user)
        setLastSessionCheck(Date.now())
        console.log('✅ Session refreshed manually')
        return { success: true, session: data.session }
      }
      
      return { success: false, error: 'No session in refresh response' }
    } catch (error) {
      console.error('❌ Manual session refresh failed:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    // Enhanced session management
    recoverSession,
    validateSession,
    refreshSessionManually,
    lastSessionCheck,
    sessionRecovery,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { SupabaseAuthProvider }