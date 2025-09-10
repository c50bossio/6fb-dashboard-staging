'use client'

// Reduced logging for production-ready development

import { useRouter } from 'next/navigation'
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Create simple browser client for now
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only log errors for missing environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('🚨 Missing Supabase environment variables')
}

const supabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key'
)

const createSupabaseClient = () => supabaseClient

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
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()
  
  // Auth subscription ref for cleanup
  const authSubscriptionRef = useRef(null)
  
  // Single Supabase client instance
  const supabase = useMemo(() => createSupabaseClient(), [])

  // Handle hydration
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Fetch user profile 
  const fetchProfile = async (userId) => {
    if (!userId) return null
    
    // Check if we're in dev mode
    const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
    
    if (isDevMode && userId === 'dev-user-123') {
      const mockProfile = {
        id: 'dev-user-123',
        email: 'dev@bookedbarber.com',
        full_name: 'Dev User',
        barbershop_id: 'dev-barbershop-123',
        barbershop_id: 'dev-barbershop-123',
        role: 'SHOP_OWNER',
        subscription_tier: 'premium',
        subscription_status: 'active'
      }
      setProfile(mockProfile)
      return mockProfile
    }
    
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
        const hasShopId = profileData.barbershop_id || profileData.barbershop_id
        
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

  // Initialize auth state
  // Main auth effect using proper Supabase onAuthStateChange pattern
  useEffect(() => {
    
    if (!hydrated) {
      return
    }

    let isMounted = true
    let authTimeout
    
    // Timeout to prevent infinite loading
    const globalTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⏰ AUTH: Timeout reached, completing auth')
        setLoading(false)
      }
    }, 10000)

    const initAuth = async () => {
      try {
        // Check if development mode is enabled
        if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
          const mockUser = {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            user_metadata: { full_name: 'Development User' }
          }
          const mockProfile = {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            full_name: 'Development User',
            role: 'SHOP_OWNER'
          }
          
          if (isMounted) {
            setUser(mockUser)
            setProfile(mockProfile)
            setLoading(false)
          }
          return
        }

        // Check for existing session first
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession()
        
        
        // Check cookies directly for debugging
        if (typeof document !== 'undefined') {
          const cookies = document.cookie
          const authCookies = cookies.split(';').filter(c => c.includes('auth-token'))
          
          // If we have auth cookies but no session, this might be an OAuth callback timing issue
          if (authCookies.length > 0 && !existingSession) {
            try {
              // Wait a bit and try again (OAuth callback timing issue)
              await new Promise(resolve => setTimeout(resolve, 500))
              const { data: { session: refreshedSession } } = await supabase.auth.getSession()
              if (refreshedSession?.user && isMounted) {
                await handleAuthSuccess(refreshedSession)
                return
              }
            } catch (refreshError) {
              console.warn('⚠️ AUTH: Session refresh failed:', refreshError.message)
            }
          }
        }
        
        if (existingSession?.user && isMounted) {
          clearTimeout(authTimeout)
          clearTimeout(globalTimeout)
          await handleAuthSuccess(existingSession)
          return
        } else {
        }

        
        // Set up auth state listener for OAuth callbacks
        authSubscriptionRef.current = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) {
            return
          }
          
          
          if (event === 'SIGNED_IN' && session?.user) {
            clearTimeout(authTimeout)
            clearTimeout(globalTimeout)
            await handleAuthSuccess(session)
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              setUser(null)
              setProfile(null)
              setLoading(false)
              router.push('/login')
            }
          } else {
          }
        }).data.subscription


        // Set auth timeout for callback detection
        authTimeout = setTimeout(() => {
          if (isMounted) {
            setLoading(false)
          }
        }, 8000)

      } catch (error) {
        console.error('❌ AUTH: Init error:', error.message, error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const handleAuthSuccess = async (session) => {
      
      if (!isMounted || !session?.user) return
      
      setUser(session.user)
      
      try {
        const profileData = await fetchProfile(session.user.id)
        
        if (profileData) {
          setProfile(profileData)
        } else {
          // Create minimal profile
          const minimalProfile = {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            role: 'CLIENT'
          }
          setProfile(minimalProfile)
        }
      } catch (profileError) {
        console.warn('⚠️ AUTH: Profile load failed:', profileError.message)
        // Fallback profile
        setProfile({
          id: session.user.id,
          email: session.user.email,
          full_name: 'User',
          role: 'CLIENT'
        })
      }
      
      setLoading(false)
    }

    initAuth()

    return () => {
      isMounted = false
      clearTimeout(globalTimeout)
      clearTimeout(authTimeout)
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe()
      }
    }
  }, [hydrated, supabase, router])

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

  const finalLoading = loading || !hydrated
  
  const value = {
    user,
    profile,
    loading: finalLoading, // Include hydration state in loading
    hydrated,
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