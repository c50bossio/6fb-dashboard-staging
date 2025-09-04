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
  
  // Tab switch tracking refs - prevent unwanted refreshes
  const hasUserNavigatedRef = useRef(false)
  const pageLoadTimeRef = useRef(Date.now())
  const lastPathRef = useRef(null)
  
  // Session comparison refs - prevent duplicate events
  const currentSessionRef = useRef(null)
  const lastAccessTokenRef = useRef(null)
  
  // Single Supabase client instance - use singleton from UNIFIED_CLIENT
  const supabase = createClient()
  
  // Emergency timeout to prevent infinite loading
  React.useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Authentication timeout - forcing load completion')
        setLoading(false)
      }
    }, 5000)
    
    return () => clearTimeout(emergencyTimeout)
  }, [])

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
        const hasShopId = profileData.barbershop_id
        
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
    let authTimeout = null

    // Add visibility change monitoring for tab switch debugging
    const handleVisibilityChange = () => {
      console.log('👁️ [TAB DEBUG] Visibility changed:', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString()
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    const initAuth = async () => {
      try {
        console.log('🔐 [AUTH DEBUG] Starting auth initialization...')
        
        // Set up timeout to prevent infinite loading
        authTimeout = setTimeout(() => {
          if (isMounted) {
            console.log('🔐 [AUTH DEBUG] Auth initialization timeout - forcing loading=false')
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        }, 5000) // 5 second timeout (reduced for faster debugging)
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('🔐 [AUTH DEBUG] Session check result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          email: session?.user?.email,
          sessionError,
          isMounted
        })
        
        if (session?.user && isMounted) {
          console.log('🔐 [AUTH DEBUG] Setting user from session:', session.user.id)
          setUser(session.user)
          
          try {
            const profileData = await fetchProfile(session.user.id)
            if (profileData) {
              setProfile(profileData)
            }
          } catch (profileError) {
            console.error('🔐 [AUTH DEBUG] Profile fetch failed, continuing without profile:', profileError)
            // Continue with just the user, don't block loading
          }
        } else {
          console.log('🔐 [AUTH DEBUG] No session or user found:', { hasSession: !!session, hasUser: !!session?.user, isMounted })
        }
        
        // Clear timeout and set loading false
        if (authTimeout) {
          clearTimeout(authTimeout)
          authTimeout = null
        }
        
        if (isMounted) {
          console.log('🔐 [AUTH DEBUG] Setting loading to false')
          setLoading(false)
        }

        // Set up auth state listener with advanced tab switch protection
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return
          
          // Session comparison - prevent duplicate events
          const newAccessToken = session?.access_token
          const currentAccessToken = lastAccessTokenRef.current
          const sessionId = session?.user?.id
          const currentSessionId = currentSessionRef.current?.user?.id
          
          // Check if this is a duplicate event with same session data
          if (newAccessToken && newAccessToken === currentAccessToken && sessionId === currentSessionId) {
            console.log('🔄 [AUTH DEBUG] Duplicate event filtered:', event)
            return // Skip duplicate events
          }
          
          // Update session tracking
          currentSessionRef.current = session
          lastAccessTokenRef.current = newAccessToken
          
          // Track navigation vs tab switching
          const currentPath = window.location.pathname
          const pathChanged = lastPathRef.current !== null && lastPathRef.current !== currentPath
          if (pathChanged && lastPathRef.current !== null) {
            hasUserNavigatedRef.current = true
          }
          lastPathRef.current = currentPath
          
          console.log(`🔐 [AUTH DEBUG] Event: ${event}, hasNavigated: ${hasUserNavigatedRef.current}, pathChanged: ${pathChanged}, sessionChanged: ${sessionId !== currentSessionId}`)
          
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user)
            const profileData = await fetchProfile(session.user.id)
            if (profileData) {
              setProfile(profileData)
            }
            setLoading(false)
          } else if (event === 'SIGNED_OUT') {
            // Reset session tracking on logout
            currentSessionRef.current = null
            lastAccessTokenRef.current = null
            setUser(null)
            setProfile(null)
            setLoading(false)
            router.push('/login')
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('✅ [AUTH DEBUG] Token refreshed (background) - NO REDIRECT')
            // Handle token refresh silently - DO NOT REDIRECT
            if (session?.user) {
              setUser(session.user)
            }
            return // Critical: prevent any redirect logic
          } else if (event === 'INITIAL_SESSION' && !hasUserNavigatedRef.current) {
            console.log('✅ [AUTH DEBUG] Initial session without navigation - NO REDIRECT')
            // Page load or tab switch, not actual navigation
            if (session?.user) {
              setUser(session.user)
              const profileData = await fetchProfile(session.user.id)
              if (profileData) {
                setProfile(profileData)
              }
            }
            setLoading(false)
            return // Critical: prevent any redirect logic
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
      if (authTimeout) {
        clearTimeout(authTimeout)
      }
      authSubscriptionRef.current?.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, supabase])

  // Auth methods
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`
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

  // Background token refresh function
  const refreshTokensInBackground = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.warn('Background token refresh failed:', response.status)
        return false
      }
      
      const result = await response.json()
      console.log('✅ [AUTH DEBUG] Background token refresh successful')
      return true
    } catch (error) {
      console.error('Background token refresh error:', error)
      return false
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
    refreshTokensInBackground,
    hasTierAccess
  }
  

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default SupabaseAuthProvider
export { SupabaseAuthProvider }