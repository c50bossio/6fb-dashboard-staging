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
    console.log(`🔍 [fetchProfile] Fetching profile for user: ${userId}`)

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        if (data) {
          console.log(`✅ [fetchProfile] Profile loaded:`, {
            full_name: data.full_name,
            role: data.role,
            organization_id: data.organization_id,
            barbershop_id: data.barbershop_id
          })
          return data
        }
      } catch (error) {
        console.error(`❌ [fetchProfile] Attempt ${attempt + 1}/${retries} failed:`, error.message)

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          const waitMs = 500 * Math.pow(2, attempt)
          console.log(`⏳ [fetchProfile] Retrying in ${waitMs}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitMs))
        }
      }
    }

    console.error(`❌ [fetchProfile] Failed to load profile after ${retries} attempts`)
    return null
  }, [supabase])

  // Set up auth - Hybrid pattern for reliability
  // 1. Get initial user immediately (fast, local JWT validation)
  // 2. Set up listener for real-time auth changes
  useEffect(() => {
    let mounted = true
    let timeoutId = null

    console.log('🔐 [SupabaseAuthProvider] Initializing auth...')

    // Get initial user state - getUser() is fast (local JWT validation, no network call)
    const initializeAuth = async () => {
      try {
        console.log('🔍 [SupabaseAuthProvider] Getting initial user...')

        // Set timeout fallback in case getUser hangs (defensive)
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.warn('⏰ [SupabaseAuthProvider] getUser() timeout, assuming no user')
            setUser(null)
            setLoading(false)
          }
        }, 3000)

        const { data: { user }, error } = await supabase.auth.getUser()

        // Clear timeout since we got a response
        if (timeoutId) clearTimeout(timeoutId)

        if (!mounted) return

        if (error) {
          console.warn('⚠️ [SupabaseAuthProvider] Auth error:', error.message)
          setUser(null)
        } else if (user) {
          console.log('✅ [SupabaseAuthProvider] User authenticated:', user.email)
          setUser(user)
        } else {
          console.log('ℹ️ [SupabaseAuthProvider] No authenticated user')
          setUser(null)
        }

        setLoading(false)
      } catch (err) {
        console.error('❌ [SupabaseAuthProvider] Failed to initialize auth:', err.message)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Set up listener for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      console.log('🔐 [SupabaseAuthProvider] Auth event:', event, session?.user?.email || 'no user')

      // Handle auth events
      if (event === 'SIGNED_IN') {
        console.log('👤 [SupabaseAuthProvider] User signed in:', session?.user?.email)
        setUser(session?.user ?? null)
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 [SupabaseAuthProvider] User signed out')
        setUser(null)
        setProfile(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 [SupabaseAuthProvider] Token refreshed:', session?.user?.email)
        setUser(session?.user ?? null)
      } else if (event === 'USER_UPDATED') {
        console.log('📝 [SupabaseAuthProvider] User updated:', session?.user?.email)
        setUser(session?.user ?? null)
      }
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [supabase])

  // Separate effect to fetch profile when user changes
  // This keeps async operations OUT of the onAuthStateChange listener
  useEffect(() => {
    if (!user) {
      // No user, clear profile
      console.log('🚫 [Profile Effect] No user, clearing profile')
      setProfile(null)
      return
    }

    console.log('👤 [Profile Effect] User detected, loading profile...', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider
    })

    // User exists, fetch their profile
    let isMounted = true

    const loadProfile = async () => {
      const profileData = await fetchProfile(user.id)
      if (isMounted) {
        if (profileData) {
          console.log('✅ [Profile Effect] Profile set in state')
          setProfile(profileData)
          setError(null)
        } else {
          console.error('❌ [Profile Effect] Profile not found in database')
          setError('Profile not found. Please contact support.')
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [user, fetchProfile])

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
    console.log('🔄 Resetting auth state...')
    setError(null)
    setLoading(true)

    // Force re-check by triggering a new auth state change
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
