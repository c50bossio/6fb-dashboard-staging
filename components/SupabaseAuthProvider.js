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
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Fetch user profile with subscription tier
  const fetchProfile = async (userId) => {
    if (!userId) return null
    
    try {
      // Get both profile and user data to merge subscription info
      const [profileResult, userResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('users').select('subscription_tier, subscription_status, role').eq('id', userId).single()
      ])
      
      const { data: existingProfile, error: fetchError } = profileResult
      const { data: userData } = userResult
      
      if (existingProfile) {
        // Merge users table data with profiles table data for complete access info
        const mergedProfile = {
          ...existingProfile,
          // Use users table subscription_tier if available (more recent)
          subscription_tier: userData?.subscription_tier || existingProfile.subscription_tier || 'individual',
          subscription_status: userData?.subscription_status || existingProfile.subscription_status || 'active',
          // Keep profile role as primary, but fallback to users role if needed
          role: existingProfile.role || userData?.role || 'CLIENT'
        }
        
        console.log('Profile fetched and merged:', mergedProfile)
        setProfile(mergedProfile)
        return mergedProfile
      }
      
      // If no profile exists, create one
      if (fetchError?.code === 'PGRST116') {
        console.log('No profile found, creating default profile...')
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user?.email,
            full_name: user?.user_metadata?.full_name || '',
            subscription_tier: 'individual', // Default tier
            subscription_status: 'active',
            onboarding_completed: false
          })
          .select()
          .single()
        
        if (newProfile) {
          setProfile(newProfile)
          return newProfile
        }
        
        if (createError) {
          console.error('Error creating profile:', createError)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
    
    return null
  }

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

  useEffect(() => {
    // Get initial session and profile
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Don't let profile fetch block loading completion
          fetchProfile(session.user.id).catch(console.error)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error getting initial session:', error)
        setLoading(false) // Always complete loading even on error
      }
    }

    getInitialSession()

    // Listen for auth changes - official Supabase pattern
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Don't await profile fetch to prevent blocking
          fetchProfile(session.user.id).catch(console.error)
        } else {
          setProfile(null)
        }
        
        setLoading(false)

        if (event === 'SIGNED_IN') {
          router.push('/dashboard')
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase])

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        // Ensure PKCE is used for better security and compatibility
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    })
    
    if (error) {
      console.error('OAuth initiation failed:', error)
      throw error
    }
    return data
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

  // Sign up new user
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

  // Reset password (magic link)
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Helper functions for tier checking
  const subscriptionTier = profile?.subscription_tier || 'individual'
  const userRole = profile?.role || 'CLIENT'
  const isIndividualBarber = subscriptionTier === 'individual'
  const isShopOwner = subscriptionTier === 'shop_owner' || subscriptionTier === 'shop'
  const isEnterprise = subscriptionTier === 'enterprise'
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isEnterpriseOwner = userRole === 'ENTERPRISE_OWNER'
  
  // Check if user has access to a tier (hierarchical)
  const hasTierAccess = (requiredTier) => {
    // SUPER_ADMIN and ENTERPRISE_OWNER roles bypass all tier restrictions
    if (isSuperAdmin || isEnterpriseOwner) {
      return true
    }
    
    const tierLevels = {
      'individual': 1,
      'shop_owner': 2,
      'shop': 2, // Alias for shop_owner
      'enterprise': 3
    }
    
    const userLevel = tierLevels[subscriptionTier] || 1
    const requiredLevel = tierLevels[requiredTier] || 1
    
    return userLevel >= requiredLevel
  }

  const value = {
    user,
    profile,
    loading,
    signInWithGoogle,
    signIn,
    signUp,
    resetPassword,
    signOut,
    updateProfile,
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