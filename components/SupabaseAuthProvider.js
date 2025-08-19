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
      
      // SUPABASE BEST PRACTICE: Set loading state appropriately
      setLoading(!isPublicPage)
      
      try {
        // SUPABASE BEST PRACTICE: Use getSession() instead of getUser() for initial check
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.log('No active session found')
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        
        // User is authenticated, fetch complete profile with associations
        console.log('Session found, fetching profile for:', session.user.email)
        
        // SUPABASE BEST PRACTICE: Single query with all related data
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('Profile fetch error:', profileError)
          setUser(session.user)
          setProfile(null)
        } else if (profileData) {
          // Fetch barbershop data based on role
          let barbershopData = null
          
          if (profileData.role === 'shop_owner' || profileData.role === 'SHOP_OWNER') {
            const { data: ownedShop } = await supabase
              .from('barbershops')
              .select('id, name, slug')
              .eq('owner_id', session.user.id)
              .maybeSingle()
            
            if (ownedShop) {
              barbershopData = ownedShop
            }
          } else if (profileData.role === 'BARBER' || profileData.role === 'barber') {
            const { data: staffData } = await supabase
              .from('barbershop_staff')
              .select('barbershop_id, barbershops!inner(id, name, slug)')
              .eq('user_id', session.user.id)
              .eq('is_active', true)
              .maybeSingle()
            
            if (staffData) {
              barbershopData = staffData.barbershops
            }
          }
          
          // Add barbershop data if found
          if (barbershopData) {
            profileData.barbershop_id = barbershopData.id
            profileData.barbershops = barbershopData
          }
          
          // SUPABASE BEST PRACTICE: Set all state in one operation
          setUser(session.user)
          setProfile(profileData)
        } else {
          // User exists but no profile
          console.log('User exists but no profile found')
          setUser(session.user)
          setProfile(null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change event:', event, 'Has session:', !!session)
      
      // SUPABASE BEST PRACTICE: Handle INITIAL_SESSION separately
      if (event === 'INITIAL_SESSION') {
        // Skip - already handled in checkUser() above
        return
      }
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in successfully:', session.user.email)
        setUser(session.user)
        
        try {
          // Fetch or create profile
          let userProfile = null
          
          // Fetch from users table
          const { data: profileData, error } = await supabase
            .from('users')
            .select('*')
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
              role: 'shop_owner',  // Use lowercase for database constraint
              subscription_status: 'active',
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
            // For shop owners, check if they own a barbershop
            if (profileData.role === 'shop_owner' || profileData.role === 'SHOP_OWNER') {
              const { data: ownedShop } = await supabase
                .from('barbershops')
                .select('id, name, slug')
                .eq('owner_id', session.user.id)
                .maybeSingle()
              
              if (ownedShop) {
                // Add barbershop_id to profile data for compatibility
                profileData.barbershop_id = ownedShop.id
                profileData.barbershops = ownedShop
              }
            }
            
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
      console.log('Sign out initiated...')
      
      // Immediately clear React state
      setUser(null)
      setProfile(null)
      
      // Perform sign out directly
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out API error:', error)
        // Continue with cleanup even if API call fails
      }
      
      // Clear auth storage directly without dynamic import
      if (typeof window !== 'undefined') {
        // Clear localStorage auth tokens
        const authPatterns = [
          /^sb-.*-auth-token$/,
          /^supabase\.auth\.token$/,
          /^supabase-auth-token$/
        ]
        
        Object.keys(localStorage).forEach(key => {
          if (authPatterns.some(pattern => pattern.test(key))) {
            localStorage.removeItem(key)
          }
        })
        
        // Clear sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (authPatterns.some(pattern => pattern.test(key))) {
            sessionStorage.removeItem(key)
          }
        })
        
        // Clear auth cookies
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=')
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
          if (name.startsWith('sb-') || name.includes('supabase')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          }
        })
        
        // Set flag for ProtectedRoute to detect
        sessionStorage.setItem('force_sign_out', 'true')
      }
      
      console.log('Sign out complete, redirecting to login...')
      
      // Use router for navigation
      router.push('/login')
      
      return { success: true }
    } catch (error) {
      console.error('❌ Critical sign out error:', error)
      
      // Fallback: clear state and redirect anyway
      setUser(null)
      setProfile(null)
      
      if (typeof window !== 'undefined') {
        // Try to clear storage even on error
        try {
          localStorage.clear()
          sessionStorage.clear()
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