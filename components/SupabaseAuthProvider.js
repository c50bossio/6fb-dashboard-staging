'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
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
  const [loading, setLoading] = useState(true) // Start with true to check auth state first
  const router = useRouter()
  
  // Use useMemo to ensure single client instance per provider
  const supabase = useMemo(() => createClient(), [])


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
      
      // Always check auth state, but don't block login page
      if (isPublicPage) {
        setLoading(false) // Don't block public pages
      } else {
        setLoading(true) // Protected pages need auth check
      }
      
      try {
        // Simple auth check - trust Supabase
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          setUser(null)
          setProfile(null)
        } else if (user) {
          setUser(user)
          
          // Get user profile - handle errors gracefully
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle()
            
            
            if (!profileError && profileData) {
              setProfile(profileData)
              
              // No redirect needed - dashboard will handle onboarding overlay
            } else if (profileError) {
              console.error('Profile error in checkUser:', profileError)
            } else {
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
      
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        
        try {
          // Fetch or create profile
          let userProfile = null
          
          // Simple profile fetch
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
        
          
          if (error && error.code === 'PGRST116') {
            // No profile exists, create one
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
              setProfile(newProfile)
              userProfile = newProfile
            }
          } else if (profileData) {
            setProfile(profileData)
            userProfile = profileData
          } else if (error) {
            console.error('❌ Profile error:', error)
          }
          
          // Simple navigation logic - redirect on sign-in from login page
          console.log('Auth state change - SIGNED_IN completed, current path:', window.location.pathname)
          
          if (window.location.pathname === '/login' || window.location.pathname === '/login-clean') {
            // Wait a bit for React state to update before redirecting
            setTimeout(() => {
              console.log('Redirecting from auth provider after state update...')
              router.push('/dashboard')
            }, 500)
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
    // For production, ensure we use the correct redirect URL
    // Supabase will handle the OAuth flow and redirect back to our app
    const redirectUrl = customRedirectTo || `${window.location.origin}/auth/callback`
    
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Skip any extra query params that might interfere
        skipBrowserRedirect: false
      }
    })
    
    if (error) {
      console.error('❌ Google OAuth error:', error)
      throw error
    }
    
    return data
  }

  const signOut = async () => {
    try {
      
      // Import auth helpers dynamically to avoid circular deps
      const { performSignOut } = await import('../lib/supabase/auth-helpers')
      
      // Immediately clear React state
      setUser(null)
      setProfile(null)
      
      // Use the robust sign out helper
      const result = await performSignOut(supabase)
      
      if (result.success) {
        
        // Set flag for ProtectedRoute to detect
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('force_sign_out', 'true')
        }
        
        // Use router for navigation to maintain SPA behavior
        router.push('/login')
        
        return { success: true }
      } else {
        console.warn('⚠️ Sign out completed with warnings:', result.error)
        
        // Still redirect even if there were issues
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('force_sign_out', 'true')
          router.push('/login')
        }
        
        return { success: true, warnings: result.error }
      }
    } catch (error) {
      console.error('❌ Sign out error:', error)
      
      // Fallback: clear state and redirect
      setUser(null)
      setProfile(null)
      
      if (typeof window !== 'undefined') {
        // Import and use auth helpers for cleanup
        try {
          const { clearAuthStorage } = await import('../lib/supabase/auth-helpers')
          clearAuthStorage()
        } catch (helperError) {
          console.error('Failed to load auth helpers:', helperError)
          // Fallback to simple clear
          localStorage.clear()
          sessionStorage.clear()
        }
        
        sessionStorage.setItem('force_sign_out', 'true')
        router.push('/login')
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
    
    try {
      // First, try to update without select to avoid 406 errors
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      
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
      
      if (error) {
        console.warn('Profile update error:', error)
        // Continue anyway for non-critical errors
      }
      
      // Fetch updated profile separately
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (updatedProfile) {
        setProfile(updatedProfile)
      }
      return updatedProfile
      
    } catch (error) {
      console.error('UpdateProfile failed:', error)
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

export default SupabaseAuthProvider
export { SupabaseAuthProvider }