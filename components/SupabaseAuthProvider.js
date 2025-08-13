'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'

import { createClient } from '../lib/supabase/client'
import { 
  isDevBypassEnabled, 
  getTestUser, 
  getTestSession, 
  getTestProfile 
} from '../lib/auth/dev-bypass'

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
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  // Emergency timeout to prevent infinite loading (production fallback)
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      console.warn('🚨 EMERGENCY: Forcing loading = false after 5 seconds')
      setLoading(false)
    }, 5000) // Increased to 5 seconds for OAuth callback handling
    
    return () => clearTimeout(emergencyTimeout)
  }, [])
  

  useEffect(() => {
    let isMounted = true
    
    // DISABLED: Dev bypass was overriding real OAuth user data
    // Only enable via NEXT_PUBLIC_DEV_MODE=true environment variable
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && isDevBypassEnabled()) {
      console.log('🔐 DEV BYPASS: Using test user for all pages')
      const testUser = getTestUser()
      const testProfile = getTestProfile()
      
      if (isMounted && testUser && testProfile) {
        setUser(testUser)
        setProfile(testProfile)
        setLoading(false)
        console.log('✅ Test user loaded:', testUser.email)
      }
      return () => { isMounted = false }
    }
    
    // DISABLED: Development mode bypass was overriding real OAuth user data
    // Development mode bypass for testing - DISABLED for OAuth testing
    // To enable dev bypass, add ?dev_bypass=true to URL
    const isDevelopment = process.env.NODE_ENV === 'development'
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    // const forceDevBypass = urlParams && urlParams.get('dev_bypass') === 'true'
    // 
    // if (forceDevBypass && isDevelopment) {
    //   console.log('🔧 DEV MODE: Auth bypass enabled via ?dev_bypass=true')
    //   const devUser = {
    //     id: 'dev-user-123',
    //     email: 'dev@localhost.com',
    //     user_metadata: { full_name: 'Dev User', role: 'SHOP_OWNER' }
    //   }
    //   const devProfile = {
    //     id: 'dev-user-123',
    //     email: 'dev@localhost.com',
    //     full_name: 'Dev User',
    //     role: 'SHOP_OWNER',
    //     shop_id: 'demo-shop-001',
    //     shop_name: 'Demo Barbershop'
    //   }
    //   
    //   if (isMounted) {
    //     setUser(devUser)
    //     setProfile(devProfile)
    //     setLoading(false)
    //   }
    //   return () => { isMounted = false }
    // }
    
    // Add timeout to prevent hanging (reduced for production)
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Auth loading timeout - forcing loading = false')
        setLoading(false)
      }
    }, 2000) // 2 second timeout for faster loading
    
    // Check if we're coming from OAuth callback (reuse urlParams from above)
    const isOAuthCallback = urlParams && (urlParams.has('code') || window.location.pathname.includes('/auth/callback'))
    
    // Check initial session with retry logic for OAuth callbacks
    const checkUser = async (retryCount = 0) => {
      try {
        console.log('🔍 Checking initial session... (attempt', retryCount + 1, ')')
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session check error:', error)
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }
        
        console.log('🔍 Session check result:', session ? 'Found session' : 'No session')
        console.log('🍪 Cookies available:', typeof document !== 'undefined' ? document.cookie : 'SSR')
        
        // If no session and we're coming from OAuth, retry a few times
        if (!session && isOAuthCallback && retryCount < 3) {
          console.log('⏳ OAuth callback detected, retrying session check in 500ms...')
          setTimeout(() => {
            if (isMounted) {
              checkUser(retryCount + 1)
            }
          }, 500)
          return
        }
        
        if (session?.user && isMounted) {
          console.log('✅ Session found for user:', session.user.email)
          setUser(session.user)
          
          // Fetch user profile
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
              
            if (profileData && isMounted) {
              console.log('✅ Profile loaded:', profileData.email)
              setProfile(profileData)
            }
          } catch (profileErr) {
            console.warn('Profile fetch failed:', profileErr)
            // Try to create profile if it doesn't exist
            if (profileErr.code === 'PGRST116') {
              console.log('📝 Creating profile for authenticated user...')
              const { data: newProfile } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                  role: 'CLIENT'
                })
                .select()
                .single()
              
              if (newProfile && isMounted) {
                setProfile(newProfile)
              }
            }
          }
        } else {
          // No session found - ensure we clear user state
          if (isMounted) {
            console.log('🔍 No session found')
            setUser(null)
            setProfile(null)
          }
        }
      } catch (error) {
        console.error('Error checking user session:', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        // ALWAYS set loading to false, regardless of session state
        if (isMounted && (retryCount >= 3 || !isOAuthCallback)) {
          console.log('🏁 Final loading state: false')
          setLoading(false)
        }
      }
    }

    checkUser()
    
    // Safety net: ensure loading is false after max wait time
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Safety timeout reached - forcing loading = false')
        setLoading(false)
      }
    }, 1500) // Faster safety timeout for production
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed! Event:', event, 'Session:', !!session)
      console.log('📍 Current path:', window.location.pathname)
      
      if (!isMounted) {
        console.log('⚠️ Component unmounted, ignoring auth state change')
        return
      }
      
      if (session?.user) {
        console.log('👤 User authenticated:', session.user.email)
        setUser(session.user)
        setLoading(false)
        
        // Fetch profile for authenticated user
        try {
          console.log('📋 Fetching user profile...')
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileError) {
            console.warn('⚠️ Profile fetch error:', profileError)
            // Create profile if it doesn't exist
            if (profileError.code === 'PGRST116') {
              console.log('🆕 Creating new profile for user...')
              const { data: newProfile } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || 'User',
                  role: session.user.user_metadata?.role || 'CLIENT'
                })
                .select()
                .single()
              
              if (newProfile) {
                setProfile(newProfile)
              }
            }
          } else if (profileData) {
            console.log('✅ Profile loaded:', profileData.email)
            setProfile(profileData)
          }
        } catch (profileErr) {
          console.warn('❌ Profile operation failed:', profileErr)
        }
        
        // Handle successful sign-in redirect
        if (event === 'SIGNED_IN') {
          console.log('🎉 SIGNED_IN event detected!')
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          console.log('📍 Current path:', currentPath)
          
          if (currentPath === '/login' || currentPath === '/register') {
            console.log('➡️ Redirecting to dashboard...')
            // Try different redirect methods
            try {
              router.push('/dashboard')
              console.log('✅ router.push called')
              
              // Fallback: use window.location if router doesn't work
              setTimeout(() => {
                if (typeof window !== 'undefined' && window.location.pathname === '/login') {
                  console.log('⚠️ Router.push didn\'t work, using window.location')
                  window.location.href = '/dashboard'
                }
              }, 1000)
            } catch (err) {
              console.error('❌ Router error:', err)
              // Direct navigation fallback
              if (typeof window !== 'undefined') {
                window.location.href = '/dashboard'
              }
            }
          }
        }
      } else {
        console.log('👻 No user session')
        setUser(null)
        setProfile(null)
        setLoading(false)
        
        // Handle sign-out redirect
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/']
          if (!publicPaths.includes(currentPath)) {
            console.log('➡️ Redirecting to login...')
            router.push('/login')
          }
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(loadingTimeout)
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signUp = async ({ email, password, metadata }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9999'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${origin}/dashboard`
      },
    })
    
    if (error) {
      // Handle specific errors
      if (error.status === 429) {
        throw new Error('Too many registration attempts. Please wait a moment and try again.')
      }
      if (error.message?.includes('email_address_invalid')) {
        throw new Error('Please enter a valid email address.')
      }
      throw error
    }
    
    // Check if email confirmation is required
    if (data?.user && !data.session) {
      return {
        ...data,
        requiresEmailConfirmation: true,
        message: 'Please check your email to verify your account before logging in.'
      }
    }
    
    return data
  }

  const signIn = async ({ email, password }) => {
    console.log('🔐 SupabaseAuthProvider: signIn called with email:', email)
    console.log('📍 Current loading state:', loading)
    console.log('👤 Current user state:', user)
    
    try {
      console.log('🚀 Calling supabase.auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('📦 SupabaseAuthProvider: signIn response:', { 
        data: data ? { user: data.user?.email, session: !!data.session } : null, 
        error 
      })
      
      if (error) {
        console.error('❌ Sign in error:', error)
        
        // Provide specific error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address first. Check your inbox for a verification email.')
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment before trying again.')
        } else if (error.message.includes('User not found')) {
          throw new Error('Account not found. Please register first or check your email address.')
        }
        
        throw error
      }
      
      console.log('✅ Sign in successful! User:', data.user?.email)
      console.log('🔄 Waiting for auth state change listener to handle redirect...')
      
      // Force loading state update after successful sign in
      setLoading(false)
      
      // Ensure auth state is updated immediately
      if (data?.user) {
        setUser(data.user)
        
        // Manually trigger navigation after state update
        setTimeout(() => {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          if (currentPath === '/login') {
            console.log('🚀 Manual redirect to dashboard after successful login')
            router.push('/dashboard')
          }
        }, 100)
      }
      
      return data
    } catch (error) {
      console.error('💥 Sign in exception:', error)
      // Make sure loading is false on error
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    console.log('🔐 SupabaseAuthProvider: signOut called')
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Supabase signOut error:', error)
        throw error
      }
      
      console.log('✅ Supabase signOut successful')
      
      // Clear state immediately
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      // Clear any cached auth data
      if (typeof window !== 'undefined') {
        // Clear localStorage auth keys
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('sb-') || 
          key.includes('supabase') || 
          key.includes('auth')
        )
        authKeys.forEach(key => localStorage.removeItem(key))
        
        // Clear sessionStorage as well
        const sessionKeys = Object.keys(sessionStorage).filter(key => 
          key.includes('sb-') || 
          key.includes('supabase') || 
          key.includes('auth')
        )
        sessionKeys.forEach(key => sessionStorage.removeItem(key))
      }
      
      console.log('🧹 Auth data cleared from storage')
      
    } catch (error) {
      console.error('💥 SignOut error:', error)
      
      // Even if signOut fails, clear local state
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      throw error
    }
  }

  const resetPassword = async (email) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9999'
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
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

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9999'
    
    try {
      console.log('🚀 Starting Google OAuth flow...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) {
        console.error('❌ Google sign in error:', error)
        throw error
      }
      
      console.log('✅ Google sign in initiated:', data)
      
      // Fallback: if Supabase didn't redirect, do it manually
      if (data?.url && typeof window !== 'undefined') {
        console.log('🔄 Manual redirect to:', data.url)
        window.location.href = data.url
      }
      
      return data
    } catch (error) {
      console.error('💥 OAuth exception:', error)
      throw error
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Use only named export to avoid conflicts
export { SupabaseAuthProvider }