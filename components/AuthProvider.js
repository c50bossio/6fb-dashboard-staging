'use client'

import { createBrowserClient } from '@supabase/ssr'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionRecovered, setSessionRecovered] = useState(false)
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Enhanced profile fetching with error handling
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return
      }

      if (data) {
        setProfile(data)
      } else {
        // Create profile if it doesn't exist
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const newProfile = {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
            first_name: authUser.user_metadata?.given_name || authUser.user_metadata?.first_name || '',
            last_name: authUser.user_metadata?.family_name || authUser.user_metadata?.last_name || '',
            avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
            role: 'CLIENT',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
          } else {
            setProfile(createdProfile)
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    }
  }, [supabase])

  // Session recovery with retry mechanism
  const recoverSession = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error(`Session recovery attempt ${i + 1} failed:`, error)
          if (i === retries - 1) return false
          continue
        }
        
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          return true
        }
        
        return false
      } catch (error) {
        console.error(`Session recovery attempt ${i + 1} exception:`, error)
        if (i === retries - 1) return false
      }
    }
    return false
  }, [supabase, fetchProfile])

  useEffect(() => {
    let mounted = true
    let refreshTimer = null

    // Enhanced session initialization
    const initializeSession = async () => {
      try {
        // Try to get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Session initialization error:', error)
          // Try to recover session
          const recovered = await recoverSession()
          setSessionRecovered(recovered)
        } else if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          setSessionRecovered(true)
          
          // Set up automatic token refresh before expiry
          if (session.expires_at) {
            const expiresIn = session.expires_at * 1000 - Date.now()
            const refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000) // 5 minutes before expiry, minimum 1 minute
            
            refreshTimer = setTimeout(async () => {
              try {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
                if (refreshError) {
                  console.error('Token refresh failed:', refreshError)
                  await recoverSession()
                }
              } catch (error) {
                console.error('Token refresh exception:', error)
              }
            }, refreshTime)
          }
        } else {
          setSessionRecovered(true)
        }
      } catch (error) {
        console.error('Session initialization exception:', error)
        setSessionRecovered(true)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    // Enhanced auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state change:', event, !!session?.user)
      
      try {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          
          // Redirect to dashboard after successful authentication
          if (event === 'SIGNED_IN' && typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const next = urlParams.get('next') || '/dashboard'
            const currentPath = window.location.pathname
            
            // Only redirect if we're on login page or root
            if (currentPath === '/login' || currentPath === '/') {
              router.push(next)
            }
          }
        } else {
          setUser(null)
          setProfile(null)
          
          // Redirect to login after logout
          if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            const publicRoutes = ['/login', '/signup', '/', '/auth']
            const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route))
            
            if (!isPublicRoute) {
              router.push('/login')
            }
          }
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      if (refreshTimer) clearTimeout(refreshTimer)
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, recoverSession, router])

  // Enhanced authentication methods with improved error handling
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setProfile(null)
      
      // Clear any stored session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
      }
      
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  }, [supabase])

  const signIn = useCallback(async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // Session will be handled by onAuthStateChange
      return data
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }, [supabase])

  const signUp = useCallback(async ({ email, password, metadata }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }, [supabase])

  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      })
      
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  const value = {
    user,
    profile,
    loading,
    sessionRecovered,
    supabase,
    signOut,
    signIn,
    signUp,
    resetPassword,
    refreshProfile,
    recoverSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}