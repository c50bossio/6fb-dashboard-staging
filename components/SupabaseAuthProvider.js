'use client'

import { useRouter } from 'next/navigation'
import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

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
  
  // Auth subscription ref for cleanup
  const authSubscriptionRef = useRef(null)
  
  // Single Supabase client instance - use singleton from UNIFIED_CLIENT
  const supabase = createClient()

  // Fetch user profile 
  const fetchProfile = async (userId) => {
    if (!userId) return null
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('🔐 Auth: Error fetching profile:', error)
        return null
      }
      

      if (profileData) {
        // Check for shop association issues
        const hasShopId = profileData.shop_id || profileData.barbershop_id
        
        setProfile(profileData)
        return profileData
      }

      // Create profile if it doesn't exist
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        console.error('🔐 Auth: Cannot create profile - no authenticated user')
        return null
      }

      // Extract metadata from the auth user
      const metadata = authUser.user_metadata || {}
      const appMetadata = authUser.app_metadata || {}
      
      // Determine full name from various OAuth sources
      const fullName = metadata.full_name || 
                      metadata.name ||
                      `${metadata.given_name || ''} ${metadata.family_name || ''}`.trim() ||
                      authUser.email?.split('@')[0] ||
                      'User'

      const profileToCreate = {
        id: userId,
        email: authUser.email,
        full_name: fullName,
        avatar_url: metadata.avatar_url || metadata.picture || null,
        phone: metadata.phone || null,
        subscription_tier: 'individual',
        subscription_status: 'active',
        role: metadata.role || 'CLIENT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Shop fields (set during onboarding)
        shop_id: null,
        barbershop_id: null,
        
        // Onboarding
        onboarding_completed: false,
        onboarding_step: 'welcome',
        
        // OAuth info
        oauth_provider: appMetadata.provider || 'email',
        last_sign_in_at: authUser.last_sign_in_at || new Date().toISOString()
      }


      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .upsert(profileToCreate, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (createError) {
        console.error('🔐 Auth: Profile creation failed:', createError)
        console.error('Error details:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        })
        
        // Try simpler fallback
        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: authUser.email,
            full_name: fullName,
            role: 'CLIENT'
          })
          .select()
          .single()
          
        if (fallbackError) {
          console.error('🔐 Auth: Fallback profile creation also failed:', fallbackError)
          return null
        }
        
        setProfile(fallbackProfile)
        return fallbackProfile
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

  // Initialize auth state using Supabase best practices
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && isMounted) {
          setUser(session.user)
          const profileData = await fetchProfile(session.user.id)
          if (profileData) {
            setProfile(profileData)
          }
        }
        
        if (isMounted) {
          setLoading(false)
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return
          
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user)
            const profileData = await fetchProfile(session.user.id)
            if (profileData) {
              setProfile(profileData)
            }
            setLoading(false)
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setProfile(null)
            setLoading(false)
            router.push('/login')
          } else if (event === 'TOKEN_REFRESHED') {
            // Handle token refresh silently
            if (session?.user) {
              setUser(session.user)
            }
          }
        })

        authSubscriptionRef.current = subscription

      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
      authSubscriptionRef.current?.unsubscribe()
    }
  }, [router, supabase])

  // Auth methods
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) throw error
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

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

  // Tier access helper function
  const hasTierAccess = (requiredTier) => {
    if (!profile) return false
    
    const tierHierarchy = {
      'individual': 1,
      'pro': 2,
      'enterprise': 3
    }
    
    const userTier = profile.subscription_tier || 'individual'
    const userLevel = tierHierarchy[userTier] || 0
    const requiredLevel = tierHierarchy[requiredTier] || 0
    
    return userLevel >= requiredLevel
  }

  const value = {
    user,
    profile,
    loading,
    supabase,
    signInWithGoogle,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasTierAccess
  }
  

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default SupabaseAuthProvider
export { SupabaseAuthProvider }