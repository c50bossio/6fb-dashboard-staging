'use client'

console.log('🔐 AUTH PROVIDER: Module loading...')

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createClient } from '../lib/supabase/browser-client'

console.log('🔐 AUTH PROVIDER: All imports successful')

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function SupabaseAuthProvider({ children }) {
  console.log('🔐 AUTH PROVIDER: Component function executing...')
  
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()
  
  console.log('🔐 AUTH PROVIDER: State initialized')
  console.log('🔍 AUTH PROVIDER: Initial state:', { loading, hydrated, user: !!user, profile: !!profile })
  
  // Single Supabase client instance
  const supabase = useMemo(() => createClient(), [])

  // Handle hydration
  useEffect(() => {
    console.log('🔐 AUTH PROVIDER: Hydration effect running, setting hydrated to true')
    setHydrated(true)
  }, [])

  // Fetch user profile with BookedBarber-specific debugging
  const fetchProfile = async (userId) => {
    if (!userId) {
      console.log('🔐 Auth: No userId provided to fetchProfile')
      return null
    }
    
    try {
      console.log('🔐 Auth: Querying profiles table for userId:', userId)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('🔐 Auth: Error fetching profile:', error)
        return null
      }
      
      console.log('🔐 Auth: Profile query result:', profileData ? 'Profile found' : 'No profile found')

      if (profileData) {
        // BookedBarber-specific debugging
        console.log('🏪 BookedBarber: Profile details:', {
          role: profileData.role,
          shop_id: profileData.shop_id,
          barbershop_id: profileData.barbershop_id,
          subscription_tier: profileData.subscription_tier,
          subscription_status: profileData.subscription_status
        })
        
        // Check for shop association issues
        const hasShopId = profileData.shop_id || profileData.barbershop_id
        console.log('🏪 BookedBarber: Shop association check:', {
          hasDirectShop: !!profileData.shop_id,
          hasBarbershopId: !!profileData.barbershop_id,
          needsStaffLookup: !hasShopId
        })
        
        setProfile(profileData)
        return profileData
      }

      // Create profile if it doesn't exist
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return null

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || '',
          subscription_tier: 'individual',
          subscription_status: 'active',
          role: 'CLIENT'
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (!createError && newProfile) {
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
  useEffect(() => {
    console.log('🔐 AUTH PROVIDER: Main auth effect triggered, hydrated:', hydrated)
    // Don't initialize until hydration is complete
    if (!hydrated) {
      console.log('🔐 AUTH PROVIDER: Skipping auth init, not yet hydrated')
      return
    }

    let isMounted = true
    let initializationPromise = null

    const initialize = async () => {
      try {
        console.log('🔐 Auth: Initializing authentication after hydration...')
        
        // Debug environment variables
        console.log('🔍 Environment Debug:', {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_ENABLE_DEV_AUTH: process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH,
          isDevelopment: process.env.NODE_ENV === 'development',
          isDevAuthEnabled: process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
        })
        
        // Check if we're in development mode with auth bypass
        const isDevMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
        console.log('🔐 Auth: isDevMode check result:', isDevMode)
        
        if (isDevMode) {
          console.log('🔐 Auth: Development mode with auth bypass enabled')
          console.log('🏪 BookedBarber: Using mock user for development testing')
          // Set mock user for development
          const mockUser = {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            user_metadata: { full_name: 'Development User' },
            app_metadata: { provider: 'dev' }
          }
          const mockProfile = {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            full_name: 'Development User',
            subscription_tier: 'pro',
            subscription_status: 'active',
            role: 'SHOP_OWNER',
            shop_id: 'dev-shop-123',
            onboarding_completed: true
          }
          
          if (isMounted) {
            setUser(mockUser)
            setProfile(mockProfile)
            setLoading(false)
            console.log('🏪 BookedBarber: Mock user and profile set, dashboard should load')
          }
          return
        }
        
        // Get initial session using Supabase best practices with immediate fallback
        try {
          const sessionStart = performance.now()
          console.log('🔐 Auth: Getting current session...')
          console.log('⏱️ Timing: Auth session fetch started at', new Date().toISOString())
          
          // Try multiple approaches to get session - bypass hanging getSession()
          let session = null
          let error = null
          
          try {
            // First try: Quick timeout on getSession (3 seconds)
            const sessionPromise = supabase.auth.getSession()
            const quickTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Quick session fetch timeout')), 3000)
            )
            
            const sessionResult = await Promise.race([sessionPromise, quickTimeout])
            session = sessionResult.data?.session
            error = sessionResult.error
            
            console.log('🔐 Auth: getSession() completed in', (performance.now() - sessionStart).toFixed(2), 'ms')
          } catch (sessionError) {
            console.warn('🔐 Auth: getSession() failed/timed out, trying alternative approach:', sessionError.message)
            
            // Fallback: Try to get user directly with timeout
            try {
              const userStart = performance.now()
              const userPromise = supabase.auth.getUser()
              const userTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('getUser timeout')), 3000)
              )
              
              const { data: { user }, error: userError } = await Promise.race([userPromise, userTimeout])
              console.log('🔐 Auth: getUser() completed in', (performance.now() - userStart).toFixed(2), 'ms')
              
              if (user && !userError) {
                console.log('🔐 Auth: Creating session from user data')
                // Create a minimal session object
                session = {
                  user,
                  access_token: 'recovered',
                  expires_at: Date.now() / 1000 + 3600 // 1 hour from now
                }
              } else {
                console.warn('🔐 Auth: getUser() also failed:', userError?.message)
              }
            } catch (userError) {
              console.error('🔐 Auth: Both getSession() and getUser() failed:', userError.message)
              console.warn('🔐 Auth: Proceeding without authentication - user will need to login again')
            }
          }
          
          const sessionTime = performance.now() - sessionStart
          
          // Absolute safety net - never allow infinite hang
          if (sessionTime > 8000) {
            console.error('🔐 Auth: Total auth process exceeded 8 seconds, forcing completion')
            console.error('❌ Error: This indicates a serious Supabase connectivity issue')
          }
          
          console.log('🔐 Auth: Session response details:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userEmail: session?.user?.email,
            userId: session?.user?.id,
            accessToken: session?.access_token ? 'present' : 'missing',
            refreshToken: session?.refresh_token ? 'present' : 'missing',
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none',
            providerUsed: session?.user?.app_metadata?.provider,
            lastSignInAt: session?.user?.last_sign_in_at,
            error: error?.message || 'none',
            fetchTime: sessionTime.toFixed(2) + 'ms'
          })

          // Check for potential OAuth callback scenarios
          if (session?.user && session.user.app_metadata?.provider === 'google') {
            console.log('🔐 Auth: Google OAuth session detected')
            console.log('🏪 BookedBarber: Checking for post-OAuth redirect scenario')
            
            // Check if this looks like a fresh OAuth login
            const lastSignIn = new Date(session.user.last_sign_in_at)
            const now = new Date()
            const timeSinceSignIn = now - lastSignIn
            
            if (timeSinceSignIn < 60000) { // Less than 1 minute ago
              console.log('🔐 Auth: Recent Google OAuth login detected')
              console.log('🏪 BookedBarber: This may be a post-OAuth callback, time since signin:', timeSinceSignIn + 'ms')
            }
          }
          
          if (error) {
            console.warn('🔐 Auth: Session error (continuing anyway):', error.message)
          }
          
          if (isMounted) {
            if (session?.user) {
              console.log('🔐 Auth: Session found for user:', session.user.email)
              console.log('🏪 BookedBarber: User authenticated successfully via', session.access_token === 'recovered' ? 'recovery method' : 'normal session')
              setUser(session.user)
              
              // Fetch profile without timeout - let Supabase handle retries naturally
              try {
                console.log('🔐 Auth: Fetching user profile...')
                console.log('⏱️ Timing: Profile fetch started at', new Date().toISOString())
                const profileStart = performance.now()
                const profileData = await fetchProfile(session.user.id)
                const profileTime = performance.now() - profileStart
                
                if (profileData) {
                  console.log('🔐 Auth: Profile loaded successfully')
                  console.log('🏪 BookedBarber: Profile details for dashboard:', {
                    role: profileData.role,
                    hasShopId: !!profileData.shop_id,
                    hasBarbershopId: !!profileData.barbershop_id,
                    subscriptionTier: profileData.subscription_tier,
                    subscriptionStatus: profileData.subscription_status,
                    onboardingCompleted: profileData.onboarding_completed,
                    fetchTime: profileTime.toFixed(2) + 'ms'
                  })
                  console.log('🏪 BookedBarber: Ready for dashboard render')
                } else {
                  console.log('🔐 Auth: No profile data, but continuing...')
                  console.warn('🏪 BookedBarber: Dashboard may have limited functionality without profile')
                  console.log('⏱️ Timing: Profile fetch (no data) took', profileTime.toFixed(2), 'ms')
                }
              } catch (profileError) {
                console.warn('🔐 Auth: Profile fetch failed (continuing anyway):', profileError.message)
                console.error('🏪 BookedBarber: This may cause dashboard loading issues')
                console.error('❌ Error: Profile fetch error:', profileError)
                // Don't block the UI - profile will be loaded on next auth state change
              }
            } else {
              console.log('🔐 Auth: No active session found')
              console.log('🏪 BookedBarber: User will be redirected to login')
              setUser(null)
              setProfile(null)
            }
            
            setLoading(false)
            console.log('🔐 Auth: Initialization complete, loading disabled')
            console.log('🏪 BookedBarber: Auth provider ready, dashboard should render')
          }
        } catch (initError) {
          console.error('🔐 Auth: Initialization error:', initError)
          console.error('❌ Error: Auth init failed with:', initError.message)
          
          if (initError.message === 'Session fetch timeout') {
            console.warn('🔐 Auth: Session fetch timed out - this is a known Supabase issue')
            console.warn('🏪 BookedBarber: Proceeding without session, user may need to refresh')
          }
          
          if (isMounted) {
            // Even on error, don't stay in loading state forever
            setLoading(false)
            console.log('🔐 Auth: Error occurred, but loading disabled to unblock UI')
            console.log('🏪 BookedBarber: Dashboard will render in logged-out state')
          }
        }
      } catch (outerError) {
        console.error('🔐 Auth: Outer initialization error:', outerError)
        if (isMounted) {
          setLoading(false)
          console.log('🔐 Auth: Outer error occurred, loading disabled')
        }
      }
    }

    // Ensure we don't have multiple initialization attempts
    if (!initializationPromise) {
      initializationPromise = initialize()
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const stateChangeStart = performance.now()
        console.log('🔐 Auth: Auth state change event:', event)
        console.log('⏱️ Timing: Auth state change at', new Date().toISOString())
        console.log('🔐 Auth: State change details:', {
          event,
          hasSession: !!session,
          userEmail: session?.user?.email,
          userId: session?.user?.id,
          provider: session?.user?.app_metadata?.provider,
          isMounted
        })

        // Special handling for Google OAuth callback
        if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
          console.log('🔐 Auth: Google OAuth sign-in detected')
          console.log('🏪 BookedBarber: Processing Google OAuth callback')
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('🔐 Auth: Token refresh detected')
          console.log('🏪 BookedBarber: Session token was refreshed')
        }
        
        if (isMounted) {
          if (session?.user) {
            console.log('🔐 Auth: Setting user from auth state change')
            setUser(session.user)
            try {
              console.log('🔐 Auth: Fetching profile during auth state change...')
              const profileStart = performance.now()
              await fetchProfile(session.user.id)
              console.log('⏱️ Timing: Profile fetch during state change took', (performance.now() - profileStart).toFixed(2), 'ms')
            } catch (error) {
              console.error('🔐 Auth: Profile fetch failed during state change:', error)
              console.error('❌ Error: This may leave user in inconsistent state')
            }
          } else {
            console.log('🔐 Auth: Clearing user and profile from auth state change')
            setUser(null)
            setProfile(null)
          }

          // Handle sign out
          if (event === 'SIGNED_OUT') {
            console.log('🔐 Auth: User signed out, redirecting to login')
            console.log('🏪 BookedBarber: Cleaning up dashboard state')
            router.push('/login')
          }

          console.log('⏱️ Timing: Auth state change processing took', (performance.now() - stateChangeStart).toFixed(2), 'ms')
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
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

  const finalLoading = loading || !hydrated
  console.log('🔍 AUTH PROVIDER: Final loading calculation:', { loading, hydrated, finalLoading })
  
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
    updateProfile
  }
  
  console.log('🔍 AUTH PROVIDER: Context value being provided:', {
    hasUser: !!user,
    hasProfile: !!profile,
    loading: finalLoading,
    hydrated
  })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default SupabaseAuthProvider
export { SupabaseAuthProvider }