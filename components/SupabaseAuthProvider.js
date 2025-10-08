'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"

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
          console.log(`👤 Profile loaded successfully`)
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

  // Initialize auth on mount and listen for changes
  useEffect(() => {
    let mounted = true

    // Get initial session (fast, reads from local storage/cookies)
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth session...')

        // Use getSession() which reads local cookies - instant, no network request
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          console.warn('⚠️ Session error:', sessionError.message)
          setError(sessionError.message)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        const user = session?.user ?? null
        console.log('🔐 Session loaded:', user ? `User: ${user.email}` : 'No session')

        setUser(user)

        // Fetch profile if user exists
        if (user && mounted) {
          const profileData = await fetchProfile(user.id)
          if (mounted) {
            setProfile(profileData)
            if (!profileData) {
              setError('Profile not found. Please contact support.')
            }
          }
        } else {
          setProfile(null)
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err)
        if (mounted) {
          setError('Failed to initialize session')
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('🔐 Auth event:', event, session?.user ? `User: ${session.user.email}` : 'No session')

      const user = session?.user ?? null
      setUser(user)

      // Fetch profile when user signs in or changes
      if (user && mounted) {
        const profileData = await fetchProfile(user.id)
        if (mounted) {
          console.log('👤 Profile fetched after auth change:', profileData ? 'Success' : 'Failed')
          setProfile(profileData)
        }
      } else {
        setProfile(null)
      }

      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

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

  const resetAndRetry = useCallback(async () => {
    console.log('🔄 Resetting auth state and retrying...')
    setError(null)
    setLoading(true)

    // Retry getting session
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    setUser(user)
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }, [supabase, fetchProfile])

  const clearAuthAndRedirect = useCallback(() => {
    console.log('🚨 Clearing all auth state and redirecting to login...')
    setUser(null)
    setProfile(null)
    setError(null)
    router.push('/login?error=Session expired. Please log in again.')
  }, [router])

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
