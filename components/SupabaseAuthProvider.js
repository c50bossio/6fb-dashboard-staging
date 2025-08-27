'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/browser-client'
import { hasAccessToTier } from '../lib/subscription-tiers'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function SupabaseAuthProvider({ children }) {
  // Temporary dev bypass for testing ViewSwitcher functionality
  if (typeof window !== 'undefined' && 
      (localStorage.getItem('dev_session') === 'true' || 
       document.cookie.includes('dev_auth=true'))) {
    
    const mockUser = {
      id: 'dev-user-123',
      email: 'dev@localhost.com'
    }
    
    const mockProfile = {
      id: 'dev-user-123',
      email: 'dev@localhost.com',
      full_name: 'Dev User',
      role: 'SHOP_OWNER',
      subscription_tier: 'shop_owner',
      subscription_status: 'active',
      shop_id: 'tomb45-channelside',
      onboarding_completed: true
    }

    const mockValue = {
      user: mockUser,
      profile: mockProfile,
      loading: false,
      supabase: createClient(),
      signInWithGoogle: () => Promise.resolve(),
      signIn: () => Promise.resolve(),
      signUp: () => Promise.resolve(),
      resetPassword: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
      updateProfile: () => Promise.resolve(mockProfile),
      refreshProfile: () => Promise.resolve(true),
      subscriptionTier: 'shop_owner',
      userRole: 'SHOP_OWNER',
      isIndividualBarber: false,
      isShopOwner: true,
      isEnterprise: false,
      isSuperAdmin: false,
      isEnterpriseOwner: false,
      hasTierAccess: () => true
    }
    
    return <AuthContext.Provider value={mockValue}>{children}</AuthContext.Provider>
  }

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        // Set reasonable defaults
        const profileWithDefaults = {
          ...profileData,
          subscription_tier: profileData.subscription_tier || 'individual',
          subscription_status: profileData.subscription_status || 'active',
          role: profileData.role || 'CLIENT',
          onboarding_completed: profileData.onboarding_completed
        }
        
        setProfile(profileWithDefaults)
        return profileWithDefaults
      }

      // Create profile if it doesn't exist
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return null

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          subscription_tier: 'individual',
          subscription_status: 'active',
          role: 'CLIENT'
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, { hasSession: !!session })

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

        // Handle redirects for actual sign-in events
        if (event === 'SIGNED_IN' && session) {
          // Check for stored return URL
          const returnUrl = typeof window !== 'undefined' 
            ? sessionStorage.getItem('auth_return_url') 
            : null
            
          if (returnUrl) {
            sessionStorage.removeItem('auth_return_url')
            router.push(returnUrl)
          } else {
            router.push('/dashboard')
          }
        }
        
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
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