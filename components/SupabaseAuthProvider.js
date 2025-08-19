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
          
          // Get user profile from users table with barbershop associations
          try {
            // First get the user profile from users table
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select(`
                *,
                barbershops!barbershop_id (
                  id,
                  name,
                  slug
                ),
                organizations!organization_id (
                  id,
                  name
                )
              `)
              .eq('id', user.id)
              .maybeSingle()
            
            if (!profileError && profileData) {
              // Check if user has direct barbershop_id or needs to fetch from barbershop_staff
              if (!profileData.barbershop_id && profileData.role === 'BARBER') {
                // Employee barber - fetch barbershop via barbershop_staff table
                const { data: staffData } = await supabase
                  .from('barbershop_staff')
                  .select('barbershop_id, barbershops!inner(id, name, slug)')
                  .eq('user_id', user.id)
                  .eq('is_active', true)
                  .maybeSingle()
                
                if (staffData) {
                  profileData.barbershop_id = staffData.barbershop_id
                  profileData.barbershops = staffData.barbershops
                }
              }
              
              setProfile(profileData)
              
              // No redirect needed - dashboard will handle onboarding overlay
            } else if (profileError) {
              console.error('Profile error in checkUser:', profileError)
            } else {
              console.log('No profile found for user:', user.id)
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
      console.log('🔐 Auth state change event:', event, 'Has session:', !!session)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in successfully:', session.user.email)
        setUser(session.user)
        
        try {
          // Fetch or create profile
          let userProfile = null
          
          // Fetch from users table with barbershop associations
          const { data: profileData, error } = await supabase
            .from('users')
            .select(`
              *,
              barbershops!barbershop_id (
                id,
                name,
                slug
              ),
              organizations!organization_id (
                id,
                name
              )
            `)
            .eq('id', session.user.id)
            .maybeSingle()
        
          
          if (error && error.code === 'PGRST116') {
            // No profile exists, create one with enhanced user data
            const newProfileData = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name || 
                       session.user.email.split('@')[0],
              role: 'SHOP_OWNER',
              subscription_status: 'active',
              onboarding_completed: false,
              onboarding_step: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            console.log('Creating new profile for OAuth user:', newProfileData)
            
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert(newProfileData)
              .select()
              .single()
            
            if (createError) {
              console.error('❌ Profile creation error:', createError)
              // Set user anyway - profile can be created later
              setUser(session.user)
              setProfile(null)
            } else if (newProfile) {
              console.log('✅ Profile created successfully:', newProfile)
              setProfile(newProfile)
              userProfile = newProfile
            }
          } else if (profileData) {
            setProfile(profileData)
            userProfile = profileData
          } else if (error) {
            console.error('❌ Profile error:', error)
          }
          
          // Direct navigation logic - immediate redirect on sign-in from login page
          const currentPath = window.location.pathname
          const currentUrl = window.location.href
          console.log('Auth state change - SIGNED_IN completed, current path:', currentPath, 'Full URL:', currentUrl)
          
          // Check if we're on login page (including with OAuth code parameters)
          // Also check the full URL in case the pathname isn't what we expect
          if (currentPath === '/login' || 
              currentPath === '/login-clean' ||
              currentPath.startsWith('/login') ||
              currentUrl.includes('/login')) {
            console.log('✅ Redirecting to dashboard immediately after successful sign-in')
            // Clean the URL and redirect
            window.history.replaceState({}, document.title, '/login')
            router.push('/dashboard')
          } else {
            console.log('⚠️ Not on login page, current path:', currentPath)
            // If we're not on login but user just signed in, still redirect to dashboard
            if (!currentPath.startsWith('/dashboard')) {
              console.log('🔄 Redirecting to dashboard from:', currentPath)
              router.push('/dashboard')
            }
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
    // Optimized OAuth redirect - direct to login page for auth state handling
    const redirectUrl = customRedirectTo || `${window.location.origin}/login`
    
    console.log('🔐 Starting Google OAuth with redirect to:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false
      }
    })
    
    if (error) {
      console.error('❌ Google OAuth error:', error)
      throw error
    }
    
    console.log('✅ Google OAuth initiated successfully')
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
        .from('users')
        .update(updates)
        .eq('id', user.id)
      
      if (error && error.code === 'PGRST116') {
        // No profile exists, create one with the updates
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
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
        .from('users')
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