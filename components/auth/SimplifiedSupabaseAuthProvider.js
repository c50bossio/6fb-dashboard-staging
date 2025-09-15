'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from "@/lib/supabase/client"

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within a SimplifiedSupabaseAuthProvider')
  }
  return context
}

function SimplifiedSupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // Simple profile fetching without complex caching
  const fetchProfile = async (userId) => {
    if (!userId) return null

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, avatar_url, role, subscription_tier, subscription_status, created_at, updated_at')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch failed:', error.message)
        return null
      }

      return data
    } catch (error) {
      console.error('Profile fetch error:', error.message)
      return null
    }
  }

  // Simple auth check without debouncing or complex caching
  const checkUser = async () => {
    try {
      setError(null)
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        console.warn('Auth check error:', error.message)
        setError(error.message)
        setUser(null)
        setProfile(null)
        return
      }

      setUser(user)

      if (user) {
        const profileData = await fetchProfile(user.id)
        setProfile(profileData)
      } else {
        setProfile(null)
      }
    } catch (error) {
      console.error('Error in checkUser:', error)
      setError(error.message)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // Reset and retry functionality for error recovery
  const resetAndRetry = async () => {
    setError(null)
    setLoading(true)
    await checkUser()
  }

  // Initialize auth and set up listener
  useEffect(() => {
    let mounted = true
    let subscription = null

    // Initial auth check
    checkUser()

    // Set up auth state change listener
    const setupAuthListener = async () => {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return

          console.log('Auth event:', event)

          if (event === 'SIGNED_IN' && session) {
            setLoading(true)
            setUser(session.user)
            setError(null)

            const profileData = await fetchProfile(session.user.id)
            if (mounted) {
              setProfile(profileData)
              setLoading(false)
            }

            // Redirect after login if on login page
            if (typeof window !== 'undefined' && window.location.pathname === '/login') {
              router.push('/dashboard')
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setProfile(null)
            setError(null)
            setLoading(false)

            // Redirect to login if on protected page
            const protectedPaths = ['/dashboard', '/profile', '/settings', '/analytics']
            if (typeof window !== 'undefined' &&
                protectedPaths.some(path => window.location.pathname.startsWith(path))) {
              router.push('/login')
            }
          } else if (event === 'USER_UPDATED' && session) {
            setUser(session.user)
            setError(null)
            // Refetch profile for updated data
            const profileData = await fetchProfile(session.user.id)
            if (mounted) {
              setProfile(profileData)
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setUser(session.user)
            setError(null)
          }
        })

        subscription = data.subscription
      } catch (error) {
        console.error('Failed to initialize auth listener:', error)
        if (mounted) {
          setError(error.message)
          setLoading(false)
        }
      }
    }

    setupAuthListener()

    // Cleanup function
    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [supabase, router])

  // Auth methods
  const signUp = async ({ email, password, metadata }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/dashboard`
      },
    })

    if (error) throw error
    return data
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      }
    })

    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error
    return data
  }

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
    return data
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

  // Development authentication bypass (simplified)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const enableDevAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'

  if (!user && isDevelopment && enableDevAuth && !loading) {
    console.log('🔧 DEV MODE: Using mock authentication')

    const mockUser = {
      id: 'dev-user-123',
      email: 'dev@test.com',
      user_metadata: {
        full_name: 'Development User'
      }
    }

    return (
      <AuthContext.Provider value={{
        user: mockUser,
        profile: {
          id: 'dev-user-123',
          email: 'dev@test.com',
          full_name: 'Development User',
          role: 'CLIENT'
        },
        loading: false,
        error: null,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        resetAndRetry,
      }}>
        <div>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Development Mode:</strong> Using mock authentication. In production, proper OAuth will be required.
                </p>
              </div>
            </div>
          </div>
          {children}
        </div>
      </AuthContext.Provider>
    )
  }

  const value = {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    resetAndRetry,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { SimplifiedSupabaseAuthProvider }