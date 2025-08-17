'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/browser-client'

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
  const [loading, setLoading] = useState(false) // Start with false to not block login page
  const router = useRouter()
  const supabase = createClient()


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
      
      // Check for development mode
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const isDevPort = typeof window !== 'undefined' && window.location.port === '9999'
      
      if (isLocalhost && isDevPort && !isPublicPage) {
        console.log('🔧 Development mode detected - using demo user')
        const demoUser = {
          id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
          email: 'dev-enterprise@test.com',
          user_metadata: {
            full_name: 'Demo User'
          },
          aud: 'authenticated',
          role: 'authenticated'
        }
        
        const demoProfile = {
          id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
          email: 'dev-enterprise@test.com',
          full_name: 'Demo User',
          role: 'ENTERPRISE_OWNER',
          subscription_status: 'active',
          onboarding_completed: false,
          onboarding_step: 0
        }
        
        setUser(demoUser)
        setProfile(demoProfile)
        setLoading(false)
        return
      }
      
      // Only set loading true if we're on a protected page
      if (!isPublicPage) {
        setLoading(true)
      }
      
      try {
        console.log('CheckUser: Starting auth check...')
        // Simple auth check - trust Supabase
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          setUser(null)
          setProfile(null)
        } else if (user) {
          setUser(user)
          
          // Get user profile - handle errors gracefully
          try {
            console.log('Fetching profile for user in checkUser:', user.id)
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle()
            
            console.log('Profile query result:', { 
              hasData: !!profileData, 
              hasError: !!profileError,
              error: profileError
            })
            
            if (!profileError && profileData) {
              console.log('Profile loaded in checkUser:', profileData.email, 'onboarding:', profileData.onboarding_completed)
              setProfile(profileData)
              
              // No redirect needed - dashboard will handle onboarding overlay
            } else if (profileError) {
              console.error('Profile error in checkUser:', profileError)
            } else {
              console.log('No profile found for user in checkUser')
            }
          } catch (error) {
            console.error('Error loading profile in checkUser:', error)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
      })
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in successfully')
        setUser(session.user)
        
        try {
          // Fetch or create profile
          console.log('Fetching profile for user:', session.user.id)
          let userProfile = null
          
          // Simple profile fetch
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
        
          console.log('Auth state profile result:', { 
            hasData: !!profileData, 
            hasError: !!error,
            error: error
          })
          
          if (error && error.code === 'PGRST116') {
            // No profile exists, create one
            console.log('🆕 Creating profile for new user...')
            const newProfileData = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name || 
                       session.user.email.split('@')[0],
              role: 'SHOP_OWNER',
              subscription_status: 'active',
              onboarding_completed: false,
              onboarding_step: 0
            }
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfileData)
              .select()
              .single()
            
            if (createError) {
              console.error('❌ Profile creation error:', createError)
            } else if (newProfile) {
              console.log('✅ Profile created:', newProfile.email)
              setProfile(newProfile)
              userProfile = newProfile
            }
          } else if (profileData) {
            console.log('✅ Profile found:', profileData.email)
            setProfile(profileData)
            userProfile = profileData
          } else if (error) {
            console.error('❌ Profile error:', error)
          }
          
          // Simple navigation logic - redirect on sign-in from login page
          console.log('🔀 Current pathname:', window.location.pathname)
          console.log('📋 User profile status:', userProfile ? {
            hasProfile: true,
            onboarding_completed: userProfile.onboarding_completed
          } : { hasProfile: false })
          
          if (window.location.pathname === '/login') {
            // Redirect directly to dashboard - dashboard will handle onboarding overlay
            console.log('📝 Redirecting to /dashboard from login')
            router.push('/dashboard')
          } else {
            console.log('🚫 Not on login page, no redirect from auth state change')
          }
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error)
          // Still set the user even if profile fetch fails
          setUser(session.user)
        } finally {
          // Always set loading to false after SIGNED_IN event
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        
        const publicPaths = ['/login', '/register', '/forgot-password', '/success', '/pricing', '/', '/clear-all']
        if (!publicPaths.includes(window.location.pathname)) {
          router.push('/login')
        }
      } else if (event === 'USER_UPDATED' && session) {
        setUser(session.user)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user)
        setLoading(false)
      }
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
    // Always use the current origin for redirects to handle both dev and prod
    const redirectUrl = customRedirectTo || `${window.location.origin}/auth/callback`
    
    console.log('🔗 OAuth redirect URL:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          // Force the redirect to our callback page
          redirect_to: `${window.location.origin}/auth/callback`
        }
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
    
    // First, try to update
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle()
    
    if (error && error.code === 'PGRST116') {
      // No profile exists, create one with the updates
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          ...updates
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      setProfile(newProfile)
      return newProfile
    }
    
    if (error) throw error
    
    if (data) {
      setProfile(data)
    }
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
    resetPassword,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default SupabaseAuthProvider
export { SupabaseAuthProvider }