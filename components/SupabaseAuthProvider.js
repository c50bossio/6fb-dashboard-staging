'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { validateAndFixAuthProfile, getTierForRole } from '../lib/profile-sync-service'
import { hasAccessToTier, normalizeTierName } from '../lib/subscription-tiers'
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
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Tab switch protection refs
  const hasUserNavigatedRef = useRef(false)
  const pageLoadTimeRef = useRef(Date.now())
  const lastPathRef = useRef(null)

  // Simplified profile fetch without race conditions
  const fetchProfile = async (userId) => {
    if (!userId) return null
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return null
      }

      if (profileData) {
        // Use role-based tier defaults instead of hardcoded 'individual'
        const defaultTier = getTierForRole(profileData.role || 'CLIENT')
        
        const profileWithDefaults = {
          ...profileData,
          subscription_tier: profileData.subscription_tier || defaultTier,
          subscription_status: profileData.subscription_status || 'active',
          role: profileData.role || 'CLIENT',
          onboarding_completed: profileData.onboarding_completed
        }
        
        // Validate and auto-fix profile inconsistencies
        const validatedProfile = await validateAndFixAuthProfile(profileWithDefaults)
        
        setProfile(validatedProfile)
        return validatedProfile
      }

      // Create profile if it doesn't exist
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return null

      // Use consistent role-tier mapping for new profiles
      const newRole = 'CLIENT'
      const newTier = getTierForRole(newRole)
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          subscription_tier: newTier,
          subscription_status: 'active',
          role: newRole
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return null
      }

      if (newProfile) {
        setProfile(newProfile)
        return newProfile
      }

      return null
    } catch (error) {
      console.error('Profile fetch error:', error)
      return null
    }
  }

  // Initialize auth state once on mount
  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
        }

        if (isMounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
          
          setLoading(false)
          setInitialized(true)
          
          // Track initial path
          if (typeof window !== 'undefined') {
            lastPathRef.current = window.location.pathname
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [supabase])

  // Listen for auth changes after initialization
  useEffect(() => {
    if (!initialized) return
    
    // Track visibility changes for debugging and reset navigation flag
    const handleVisibilityChange = () => {
      console.log('👁️ [TAB DEBUG] Visibility changed:', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        time: new Date().toISOString()
      })
      
      // When tab becomes hidden, reset the page load timer to prevent false positives
      if (document.hidden) {
        pageLoadTimeRef.current = Date.now()
        console.log('🔄 [TAB DEBUG] Reset page load timer due to tab hide')
      }
    }
    
    // Track navigation to distinguish from tab switches
    const handleNavigation = () => {
      const currentPath = window.location.pathname
      if (lastPathRef.current !== currentPath) {
        console.log('🔄 [NAV DEBUG] Path changed:', {
          from: lastPathRef.current,
          to: currentPath
        })
        hasUserNavigatedRef.current = true
        lastPathRef.current = currentPath
      }
    }
    
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      // Use popstate to detect browser navigation
      window.addEventListener('popstate', handleNavigation)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentPath = window.location.pathname
        const isProtectedPath = !currentPath.startsWith('/login') && 
                               !currentPath.startsWith('/register') && 
                               currentPath !== '/'
        
        console.log('🔐 [AUTH DEBUG] Auth event:', {
          event,
          hasSession: !!session,
          hasNavigated: hasUserNavigatedRef.current,
          timeSinceLoad: Date.now() - pageLoadTimeRef.current,
          currentPath,
          isProtectedPath
        })
        
        // Filter out tab switch events
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ [AUTH DEBUG] Token refreshed (tab switch/focus) - NO REDIRECT')
          // Update session but don't redirect
          if (session?.user) {
            setUser(session.user)
            if (!profile || profile.id !== session.user.id) {
              await fetchProfile(session.user.id)
            }
          }
          return // NO REDIRECT
        }
        
        // Handle INITIAL_SESSION carefully - only on real navigation
        if (event === 'INITIAL_SESSION') {
          // If we're already on a protected page, don't redirect
          if (isProtectedPath && session?.user) {
            console.log('⏩ [AUTH DEBUG] INITIAL_SESSION but already on protected page - NO REDIRECT')
            // Just update the session
            setUser(session.user)
            if (!profile || profile.id !== session.user.id) {
              await fetchProfile(session.user.id)
            }
            return // NO REDIRECT
          }
          
          // If we haven't navigated and it's within 5 seconds of page load, ignore
          const timeSinceLoad = Date.now() - pageLoadTimeRef.current
          if (!hasUserNavigatedRef.current && timeSinceLoad < 5000) {
            console.log('⏩ [AUTH DEBUG] Ignoring INITIAL_SESSION (no navigation detected)')
            return // NO REDIRECT
          }
        }

        // Update auth state based on session
        if (session?.user) {
          setUser(session.user)
          
          // Fetch profile if we don't have one or user changed
          if (!profile || profile.id !== session.user.id) {
            await fetchProfile(session.user.id)
          }
        } else {
          setUser(null)
          setProfile(null)
        }

        // Handle redirects ONLY for actual sign-in events (not tab switches)
        // SIGNED_IN can fire on tab focus, so we need to be VERY careful
        if (event === 'SIGNED_IN' && session) {
          // Never redirect if we're already on a protected page
          if (isProtectedPath) {
            console.log('➡️ [AUTH DEBUG] SIGNED_IN but already on protected page - NO REDIRECT')
            // Just update the session
            setUser(session.user)
            if (!profile || profile.id !== session.user.id) {
              await fetchProfile(session.user.id)
            }
            return // NO REDIRECT
          }
          
          // Only redirect if this is a real login action (user actively navigated)
          // AND we're not within the first 10 seconds of page load (tab switch protection)
          const timeSinceLoad = Date.now() - pageLoadTimeRef.current
          const shouldRedirect = hasUserNavigatedRef.current && timeSinceLoad > 10000
          
          console.log('➡️ [AUTH DEBUG] SIGNED_IN event', {
            shouldRedirect,
            hasNavigated: hasUserNavigatedRef.current,
            timeSinceLoad,
            currentPath,
            isProtectedPath
          })
          
          if (shouldRedirect) {
            // Check for stored return URL
            const returnUrl = typeof window !== 'undefined' 
              ? sessionStorage.getItem('auth_return_url') 
              : null
              
            if (returnUrl) {
              console.log('➡️ [AUTH DEBUG] Redirecting to stored URL:', returnUrl)
              sessionStorage.removeItem('auth_return_url')
              router.push(returnUrl)
            } else {
              // Only redirect to dashboard if we're on an auth page
              if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
                console.log('➡️ [AUTH DEBUG] Redirecting from auth page to dashboard')
                router.push('/dashboard')
              } else {
                console.log('➡️ [AUTH DEBUG] Not on auth page, NO REDIRECT')
              }
            }
          } else {
            console.log('➡️ [AUTH DEBUG] Skipping SIGNED_IN redirect (tab switch protection active)')
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 [AUTH DEBUG] SIGNED_OUT - redirecting to login')
          setUser(null)
          setProfile(null)
          hasUserNavigatedRef.current = true // Mark as navigation
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('popstate', handleNavigation)
      }
    }
  }, [initialized, profile?.id, router, supabase])

  // Update profile function
  const updateProfile = async (updates) => {
    if (!user?.id) return null
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      setProfile(data)
      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    // Mark as user navigation since they're explicitly signing in
    hasUserNavigatedRef.current = true
    
    const returnUrl = typeof window !== 'undefined' 
      ? sessionStorage.getItem('auth_return_url') || '/dashboard'
      : '/dashboard'
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?return_url=${encodeURIComponent(returnUrl)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    })
    
    if (error) throw error
  }

  // Email/password sign in
  const signIn = async ({ email, password }) => {
    // Mark as user navigation since they're explicitly signing in
    hasUserNavigatedRef.current = true
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  // Sign up
  const signUp = async ({ email, password, metadata }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  }

  // Reset password
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    })
    
    if (error) throw error
    return data
  }

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Refresh profile data
  const refreshProfile = async () => {
    if (!user?.id) return false
    
    try {
      const refreshedProfile = await fetchProfile(user.id)
      return !!refreshedProfile
    } catch (error) {
      console.error('Profile refresh failed:', error)
      return false
    }
  }

  // Helper functions for tier checking
  const subscriptionTier = profile?.subscription_tier || 'individual'
  const userRole = profile?.role || 'CLIENT'
  const isIndividualBarber = subscriptionTier === 'individual'
  const isShopOwner = ['shop_owner', 'shop', 'PROFESSIONAL'].includes(subscriptionTier)
  const isEnterprise = ['enterprise', 'ENTERPRISE'].includes(subscriptionTier)
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isEnterpriseOwner = userRole === 'ENTERPRISE_OWNER'
  
  const hasTierAccess = (requiredTier) => {
    if (isSuperAdmin || isEnterpriseOwner) return true
    
    // Use centralized tier utility for consistent access control
    return hasAccessToTier(subscriptionTier, requiredTier)
  }

  const value = {
    user,
    profile,
    loading,
    supabase,
    signInWithGoogle,
    signIn,
    signUp,
    resetPassword,
    signOut,
    updateProfile,
    refreshProfile,
    // Tier helpers
    subscriptionTier,
    userRole,
    isIndividualBarber,
    isShopOwner,
    isEnterprise,
    isSuperAdmin,
    isEnterpriseOwner,
    hasTierAccess
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default SupabaseAuthProvider
export { SupabaseAuthProvider }