'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClient, recreateClient } from "@/lib/supabase/client"

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  // Create Supabase client once (singleton pattern in client.js ensures single instance)
  const supabase = useMemo(() => createClient(), [])

  // Profile fetch with retry logic
  const fetchProfile = useCallback(async (userId, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        if (data) {
          console.log(`👤 Profile loaded successfully (attempt ${attempt + 1}/${retries})`)
          return data
        }
      } catch (error) {
        console.error(`Error fetching profile (attempt ${attempt + 1}/${retries}):`, error.message)

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)))
        }
      }
    }
    return null
  }, [supabase])

  // Simplified session initialization using getUser() with timeout protection
  const initializeSession = useCallback(async () => {
    try {
      console.log('🔐 Initializing session with getUser()...')

      // Check if there are any Supabase cookies
      const hasSupabaseCookies = typeof document !== 'undefined' &&
        document.cookie.split(';').some(c => c.trim().startsWith('sb-'))

      // Wrap getUser() with timeout to detect hanging (stale cookie issue)
      let getUserResult
      try {
        getUserResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('getUser_timeout')), 5000)
          )
        ])
      } catch (timeoutError) {
        if (timeoutError.message === 'getUser_timeout') {
          console.warn('⏰ getUser() timed out')

          // If no cookies exist, user is simply not logged in (not a service error)
          if (!hasSupabaseCookies) {
            console.log('🔓 No session cookies found - user not logged in')
            setUser(null)
            setProfile(null)
            setLoading(false)
            return
          }

          console.warn('🧹 Stale cookies detected, clearing and retrying...')

          // Clear stale cookies and recreate client
          const freshClient = recreateClient()

          // Retry once with fresh client
          try {
            getUserResult = await Promise.race([
              freshClient.auth.getUser(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getUser_timeout_retry')), 5000)
              )
            ])
            console.log('✅ Retry successful after clearing stale cookies')
          } catch (retryError) {
            console.error('❌ getUser() still timing out after cookie clear')
            setError('Authentication service unavailable. Please refresh the page.')
            setUser(null)
            setProfile(null)
            setLoading(false)
            return
          }
        } else {
          throw timeoutError
        }
      }

      const { data, error } = getUserResult

      if (error) {
        console.warn('❌ getUser error:', error.message)
        // Not logged in is not an error state, just no user
        if (error.message !== 'Auth session missing!') {
          setError(error.message)
        }
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      const user = data?.user
      console.log('🔐 User check result:', user ? `User: ${user.email}` : 'No user')

      setUser(user ?? null)

      // Fetch profile if user exists
      if (user) {
        const profileData = await fetchProfile(user.id, 3)
        console.log('👤 Profile loaded:', profileData ? 'Success' : 'Failed')
        setProfile(profileData)

        if (!profileData) {
          setError('Profile not found. Please contact support.')
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    } catch (err) {
      console.error('❌ Session initialization error:', err)
      setError('Failed to initialize session')
      setUser(null)
      setProfile(null)
      setLoading(false)
    }
  }, [supabase, fetchProfile])

  // Reset and retry function for error recovery
  const resetAndRetry = useCallback(async () => {
    console.log('🔄 Resetting auth state and retrying...')
    setError(null)
    setLoading(true)
    await initializeSession()
  }, [initializeSession])

  // Clear all auth state and redirect to login
  const clearAuthAndRedirect = useCallback(() => {
    console.log('🚨 Clearing all auth state and redirecting to login...')
    setUser(null)
    setProfile(null)
    setError(null)
    router.push('/login?error=Session expired. Please log in again.')
  }, [router])

  // Initialize auth on mount
  useEffect(() => {
    initializeSession()

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth event:', event, session?.user ? `User: ${session.user.email}` : 'No session')

      const user = session?.user ?? null
      setUser(user)

      // Fetch profile when user signs in or changes
      if (user) {
        const profileData = await fetchProfile(user.id, 3)
        console.log('👤 Profile fetched after auth change:', profileData ? 'Success' : 'Failed')
        setProfile(profileData)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, initializeSession, fetchProfile])

  // Auth methods
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async ({ email, password, metadata }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard` }
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push('/login')
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    resetAndRetry,
    clearAuthAndRedirect,
  }), [user, profile, loading, error, resetAndRetry, clearAuthAndRedirect])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { SupabaseAuthProvider }
