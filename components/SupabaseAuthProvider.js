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
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()
  
  // Single Supabase client instance
  const supabase = useMemo(() => createClient(), [])

  // Handle hydration
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Fetch user profile
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
    // Don't initialize until hydration is complete
    if (!hydrated) return

    let isMounted = true
    let timeoutId = null
    let initializationPromise = null

    const initialize = async () => {
      try {
        console.log('🔐 Auth: Initializing authentication after hydration...')
        
        // Check if we're in development mode with auth bypass
        const isDevMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
        
        if (isDevMode && (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co')) {
          console.log('🔐 Auth: Development mode with auth bypass enabled')
          // Set mock user for development
          const mockUser = {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            user_metadata: { full_name: 'Development User' }
          }
          const mockProfile = {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            full_name: 'Development User',
            subscription_tier: 'pro',
            subscription_status: 'active',
            role: 'BARBER'
          }
          
          if (isMounted) {
            setUser(mockUser)
            setProfile(mockProfile)
            setLoading(false)
          }
          return
        }
        
        // Set a maximum timeout to ensure loading always resolves
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.log('🔐 Auth: Timeout reached, forcing loading to false')
            setLoading(false)
          }
        }, 3000) // Reduced to 3 seconds for faster resolution
        
        // Get initial session with explicit timeout
        let session = null
        try {
          const sessionPromise = Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout')), 2000)
            )
          ])
          
          const result = await sessionPromise
          session = result?.data?.session
          console.log('🔐 Auth: Session check completed:', session?.user ? 'User found' : 'No user')
        } catch (sessionError) {
          console.log('🔐 Auth: Session check timed out or failed, continuing without session')
          // Continue without session - this is fine for development
          session = null
        }
        
        if (isMounted) {
          if (session?.user) {
            setUser(session.user)
            console.log('🔐 Auth: Fetching profile for user:', session.user.id)
            
            // Profile fetch with timeout and error handling
            try {
              const profilePromise = Promise.race([
                fetchProfile(session.user.id),
                new Promise((resolve) => 
                  setTimeout(() => {
                    console.log('🔐 Auth: Profile fetch timed out, continuing without profile')
                    resolve(null)
                  }, 1500)
                )
              ])
              
              await profilePromise
              console.log('🔐 Auth: Profile fetch completed')
            } catch (profileError) {
              console.error('🔐 Auth: Profile fetch failed:', profileError)
              // Continue anyway, don't block the UI
            }
          } else {
            // No user session, ensure we clear any existing state
            setUser(null)
            setProfile(null)
          }
          
          // Clear timeout since we completed successfully
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          
          setLoading(false)
          console.log('🔐 Auth: Initialization completed, loading set to false')
        }
      } catch (error) {
        console.error('🔐 Auth: Initialization error:', error)
        if (isMounted) {
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          setLoading(false)
          console.log('🔐 Auth: Error occurred, loading set to false')
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
        console.log('🔐 Auth: Auth state change event:', event)
        
        if (isMounted) {
          if (session?.user) {
            setUser(session.user)
            try {
              await fetchProfile(session.user.id)
            } catch (error) {
              console.error('🔐 Auth: Profile fetch failed during state change:', error)
            }
          } else {
            setUser(null)
            setProfile(null)
          }

          // Handle sign out
          if (event === 'SIGNED_OUT') {
            console.log('🔐 Auth: User signed out, redirecting to login')
            router.push('/login')
          }
        }
      }
    )

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
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

  const value = {
    user,
    profile,
    loading: loading || !hydrated, // Include hydration state in loading
    hydrated,
    supabase,
    signInWithGoogle,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default SupabaseAuthProvider
export { SupabaseAuthProvider }