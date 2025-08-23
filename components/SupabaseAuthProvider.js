'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  
  // Track if we're currently fetching to prevent duplicate calls
  const fetchingProfileRef = useRef(false)
  const lastFetchedUserId = useRef(null)

  // Fetch user profile with subscription tier
  const fetchProfile = async (userId) => {
    if (!userId || typeof userId !== 'string' || userId.length === 0) {
      console.log('🔍 [AUTH DEBUG] Invalid userId provided to fetchProfile:', userId)
      return null
    }
    
    // Skip if we're already fetching for this user
    if (fetchingProfileRef.current && lastFetchedUserId.current === userId) {
      console.log('🔍 [AUTH DEBUG] Already fetching profile for this user, skipping duplicate')
      return null
    }
    
    try {
      fetchingProfileRef.current = true
      lastFetchedUserId.current = userId
      console.log('🔍 [AUTH DEBUG] Fetching profile for userId:', userId)
      
      // PHASE 2: Single table approach - query only profiles table
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle to handle no rows or multiple rows gracefully
      
      console.log('🔍 [AUTH DEBUG] Profile query results:', {
        hasProfile: !!existingProfile,
        profileError: fetchError?.message,
        profileRole: existingProfile?.role,
        subscriptionTier: existingProfile?.subscription_tier,
        subscriptionStatus: existingProfile?.subscription_status
      })
      
      if (existingProfile) {
        // Use profile data directly (no merging needed)
        const profileWithDefaults = {
          ...existingProfile,
          // Ensure required fields have defaults
          subscription_tier: existingProfile.subscription_tier || 'individual',
          subscription_status: existingProfile.subscription_status || 'active',
          role: existingProfile.role || 'CLIENT',
          onboarding_completed: existingProfile.onboarding_completed ?? false
        }
        
        console.log('🔍 [AUTH DEBUG] Profile fetched successfully:', {
          email: profileWithDefaults.email,
          role: profileWithDefaults.role,
          subscriptionTier: profileWithDefaults.subscription_tier,
          subscriptionStatus: profileWithDefaults.subscription_status,
          onboardingCompleted: profileWithDefaults.onboarding_completed
        })
        setProfile(profileWithDefaults)
        fetchingProfileRef.current = false
        return profileWithDefaults
      }
      
      // If no profile exists, create one
      if (!existingProfile) {
        console.log('No profile found, creating default profile...')
        
        // Get the current user from auth to access email and metadata
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          console.error('Cannot create profile: No authenticated user found')
          fetchingProfileRef.current = false
          return null
        }
        
        console.log('🔍 [AUTH DEBUG] Creating profile with user data:', {
          userId: authUser.id,
          email: authUser.email,
          fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name
        })
        
        // Check if this is truly the first user (no barbershops exist)
        const { data: existingBarbershops } = await supabase
          .from('barbershops')
          .select('id')
          .limit(1)
        
        const isFirstUser = !existingBarbershops || existingBarbershops.length === 0
        console.log('🔍 [FRESH USER CHECK] Is this the first user?', isFirstUser)
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: authUser.email, // Use email from authenticated user
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
            // avatar_url removed - column doesn't exist in profiles table
            subscription_tier: isFirstUser ? 'shop_owner' : 'individual', // First user gets shop_owner tier to access shop features
            subscription_status: 'active',
            onboarding_completed: false, // Always false for new profiles
            onboarding_step: 0,
            onboarding_status: 'active',
            role: isFirstUser ? 'SHOP_OWNER' : 'CLIENT' // First user becomes shop owner
          }, {
            onConflict: 'id' // Update if profile with this ID already exists
          })
          .select()
          .maybeSingle() // Use maybeSingle here too to handle edge cases
        
        if (newProfile) {
          setProfile(newProfile)
          fetchingProfileRef.current = false
          return newProfile
        }
        
        if (createError) {
          console.error('Error creating/updating profile:', {
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint
          })
          fetchingProfileRef.current = false
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      fetchingProfileRef.current = false
      lastFetchedUserId.current = null
    }
    
    fetchingProfileRef.current = false
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
        console.log('🔍 [AUTH DEBUG] Getting initial session...')
        const { data: { session } } = await supabase.auth.getSession()
        
        console.log('🔍 [AUTH DEBUG] Session result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          sessionExpiry: session?.expires_at,
          sessionIsValid: session ? new Date(session.expires_at * 1000) > new Date() : false
        })
        
        // 🔧 DEVELOPMENT: Enhanced fallback with fresh user detection
        if (!session && process.env.NODE_ENV === 'development') {
          console.log('🔧 [DEV AUTH] No session found, using development fallback...')
          
          try {
            // Check if database is completely clean (fresh production state)
            const { data: existingBarbershops } = await supabase
              .from('barbershops')
              .select('id')
              .limit(1)
            
            const isCleanDatabase = !existingBarbershops || existingBarbershops.length === 0
            console.log('🔍 [DEV AUTH] Is database clean?', isCleanDatabase)
            
            if (isCleanDatabase) {
              // Database is clean - user would be first legitimate user
              console.log('🚀 [DEV AUTH] Clean database detected - simulating fresh user experience')
              const mockUser = {
                id: 'fresh-user-simulation',
                email: 'fresh@barbershop.com',
                user_metadata: {
                  full_name: 'Fresh Barbershop Owner',
                  email: 'fresh@barbershop.com'
                }
              }
              
              const mockProfile = {
                id: mockUser.id,
                email: mockUser.email,
                role: 'SHOP_OWNER',
                subscription_tier: 'shop_owner', // Use shop_owner tier to access shop features
                subscription_status: 'active',
                full_name: 'Fresh Barbershop Owner',
                onboarding_completed: false // Force onboarding for clean database
              }
              
              setUser(mockUser)
              setProfile(mockProfile)
              setLoading(false)
              
              console.log('🚀 [DEV AUTH] Fresh user simulation ready - onboarding will trigger!')
              return
            } else {
              // Database has content - use regular admin user
              console.log('🔧 [DEV AUTH] Database has content - using admin user')
              const mockUser = {
                id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
                email: 'c50bossio@gmail.com',
                user_metadata: {
                  full_name: 'Christopher Bossio',
                  email: 'c50bossio@gmail.com'
                },
                app_metadata: {
                  role: 'SUPER_ADMIN',
                  subscription_tier: 'enterprise'
                }
              }
              
              const mockProfile = {
                id: mockUser.id,
                email: mockUser.email,
                role: 'SUPER_ADMIN',
                subscription_tier: 'enterprise',
                subscription_status: 'active',
                full_name: 'Christopher Bossio',
                onboarding_completed: true
              }
              
              setUser(mockUser)
              setProfile(mockProfile)
              setLoading(false)
              
              console.log('🔧 [DEV AUTH] Admin user authentication completed!')
              return
            }
          } catch (error) {
            console.error('🔧 [DEV AUTH] Error checking database state:', error)
            // Fallback to admin user if check fails
            const mockUser = {
              id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
              email: 'c50bossio@gmail.com',
              user_metadata: { full_name: 'Christopher Bossio' }
            }
            const mockProfile = {
              id: mockUser.id,
              email: mockUser.email,
              role: 'SUPER_ADMIN',
              subscription_tier: 'enterprise',
              subscription_status: 'active',
              full_name: 'Christopher Bossio',
              onboarding_completed: true
            }
            setUser(mockUser)
            setProfile(mockProfile)
            setLoading(false)
            return
          }
        }
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('🔍 [AUTH DEBUG] Fetching profile for user:', session.user.id)
          // Don't let profile fetch block loading completion
          fetchProfile(session.user.id).catch(console.error)
        } else {
          console.log('🔍 [AUTH DEBUG] No session found, user will need to login')
        }
        
        setLoading(false)
      } catch (error) {
        console.error('🔍 [AUTH DEBUG] Error getting initial session:', error)
        setLoading(false) // Always complete loading even on error
      }
    }

    getInitialSession()

    // Track if this is the initial page load
    let isInitialLoad = true
    
    // Listen for auth changes - official Supabase pattern
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 [AUTH DEBUG] Auth state change:', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          timestamp: new Date().toISOString(),
          isInitialLoad
        })
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('🔍 [AUTH DEBUG] Session valid, fetching profile...')
          // Don't await profile fetch to prevent blocking
          fetchProfile(session.user.id).then(async (fetchedProfile) => {
            // Note: avatar_url column doesn't exist in profiles table
            // If we need avatar functionality, it should be added to the schema first
            // For now, we can use the avatar from user metadata directly when needed
            if (fetchedProfile) {
              // Store the Google picture URL in the profile object for UI use
              // without trying to save it to the database
              if (session.user.user_metadata?.picture) {
                fetchedProfile.avatar_url = session.user.user_metadata.picture
                setProfile(fetchedProfile)
              }
            }
          }).catch(console.error)
        } else {
          console.log('🔍 [AUTH DEBUG] No session, clearing profile')
          setProfile(null)
        }
        
        setLoading(false)

        // Debug: Log current location before any redirect logic
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'unknown'
        console.log('🔍 [AUTH DEBUG] Current path before redirect logic:', currentPath)
        
        // CRITICAL FIX: Never redirect on initial page load
        // Only redirect when user explicitly signs in AFTER the page has loaded
        if (isInitialLoad) {
          console.log('✅ [AUTH DEBUG] Initial page load - NO REDIRECT. Staying on:', currentPath)
          isInitialLoad = false
          return // Exit early, no redirects on initial load
        }
        
        // Only redirect on actual sign-in (not on session recovery/refresh)
        // INITIAL_SESSION is fired on page load/refresh when recovering existing session
        // SIGNED_IN is fired only when user actively signs in
        if (event === 'SIGNED_IN') {
          console.log('🚨 [AUTH DEBUG] SIGNED_IN event after initial load - checking if redirect needed')
          
          // Double-check this isn't a refresh by checking if we just loaded
          const timeSinceLoad = Date.now() - window.performance.timing.navigationStart
          if (timeSinceLoad < 5000) { // If less than 5 seconds since page load
            console.log('✅ [AUTH DEBUG] SIGNED_IN event too close to page load, likely a refresh. NO REDIRECT.')
            return
          }
          
          // Check for stored return URL from ProtectedRoute
          const returnUrl = sessionStorage.getItem('auth_return_url')
          if (returnUrl) {
            console.log('🔍 [AUTH DEBUG] User signed in, redirecting to stored URL:', returnUrl)
            sessionStorage.removeItem('auth_return_url')
            router.push(returnUrl)
          } else {
            console.log('🔍 [AUTH DEBUG] User signed in, redirecting to dashboard')
            router.push('/dashboard')
          }
        }
        
        // Do NOT redirect on INITIAL_SESSION or TOKEN_REFRESHED events
        // These occur during page refresh and should not cause navigation
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          console.log('✅ [AUTH DEBUG] Session recovered/refreshed, staying on current page:', currentPath)
        }
        
        // Log any other events that might cause issues
        if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_OUT') {
          console.log('⚠️ [AUTH DEBUG] Unexpected auth event:', event)
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🔍 [AUTH DEBUG] User signed out, redirecting to login')
          setProfile(null)
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase])

  const signInWithGoogle = async () => {
    // Check if there's a stored return URL to include in OAuth callback
    const returnUrl = sessionStorage.getItem('auth_return_url')
    const redirectPath = returnUrl || '/dashboard'
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?return_url=${encodeURIComponent(redirectPath)}`,
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

  // Refresh profile data without page reload
  const refreshProfile = async () => {
    if (!user?.id) {
      console.log('🔄 [REFRESH] No user ID available for refresh')
      return false
    }
    
    try {
      console.log('🔄 [REFRESH] Starting profile refresh for user:', user.id)
      
      // Temporarily store original profile
      const originalProfile = profile
      
      // Force a fresh profile fetch by resetting fetch guards
      fetchingProfileRef.current = false
      lastFetchedUserId.current = null
      
      const refreshedProfile = await fetchProfile(user.id)
      
      if (refreshedProfile) {
        console.log('✅ [REFRESH] Profile refreshed successfully:', {
          onboardingCompleted: refreshedProfile.onboarding_completed,
          role: refreshedProfile.role,
          subscriptionTier: refreshedProfile.subscription_tier,
          shopId: refreshedProfile.shop_id || refreshedProfile.barbershop_id
        })
        return true
      } else {
        console.log('⚠️ [REFRESH] Profile refresh returned null - keeping original profile')
        setProfile(originalProfile)
        return false
      }
    } catch (error) {
      console.error('❌ [REFRESH] Profile refresh failed:', error)
      return false
    }
  }

  const value = {
    user,
    profile,
    loading,
    supabase,  // Add supabase client to context
    signInWithGoogle,
    signIn,
    signUp,
    resetPassword,
    signOut,
    updateProfile,
    refreshProfile, // Add refresh method to context
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