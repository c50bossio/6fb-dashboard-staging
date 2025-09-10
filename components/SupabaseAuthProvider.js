'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
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
  // Start with loading true to ensure auth is checked before rendering
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let timeoutId = null
    
    // Check initial session
    const checkUser = async () => {
      console.log('🔐 SupabaseAuthProvider: Starting auth check...')
      
      // Set a timeout to ensure loading is set to false after 5 seconds
      timeoutId = setTimeout(() => {
        console.warn('🔐 SupabaseAuthProvider: Auth check timeout - forcing loading to false')
        setLoading(false)
      }, 5000)
      
      // Only set loading true if we're on a protected page
      const publicPaths = ['/login', '/register', '/forgot-password', '/', '/subscribe']
      const isPublicPage = typeof window !== 'undefined' && publicPaths.includes(window.location.pathname)
      
      console.log('🔐 SupabaseAuthProvider: Current path:', window.location.pathname, 'Is public:', isPublicPage)
      
      if (!isPublicPage) {
        console.log('🔐 SupabaseAuthProvider: Setting loading to true for protected page')
        setLoading(true)
      }
      
      try {
        console.log('🔐 SupabaseAuthProvider: Getting user from Supabase...')
        // Use getUser for secure authentication check
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('🔐 SupabaseAuthProvider: getUser result:', { user: !!user, error: !!error, userId: user?.id })
        
        if (error) {
          console.error('🔐 SupabaseAuthProvider: Auth check error:', error)
          setUser(null)
          setProfile(null)
        } else if (user) {
          console.log('🔐 SupabaseAuthProvider: User authenticated:', user.email, user.id)
          setUser(user)
          
          // Fetch profile with retry logic - should exist due to trigger
          let profileData = null
          let attempts = 0
          const maxAttempts = 3
          
          while (!profileData && attempts < maxAttempts) {
            attempts++
            console.log(`🔐 SupabaseAuthProvider: Fetching profile, attempt ${attempts}...`)
            const { data, error: profileError } = await supabase
              .from('profiles')
              .select('id, email, full_name, first_name, last_name, avatar_url, role, subscription_tier, subscription_status, created_at, updated_at')
              .eq('id', user.id)
              .single()
            
            if (data) {
              console.log('🔐 SupabaseAuthProvider: Profile fetched successfully:', data.email)
              profileData = data
              setProfile(data)
            } else if (profileError) {
              console.warn(`🔐 SupabaseAuthProvider: Profile fetch attempt ${attempts} failed:`, profileError)
              if (attempts < maxAttempts) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000))
              } else {
                console.error('🔐 SupabaseAuthProvider: Profile not found after all retries:', profileError)
              }
            }
          }
        } else {
          console.log('🔐 SupabaseAuthProvider: No authenticated user')
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('🔐 SupabaseAuthProvider: Error in checkUser:', error)
        setUser(null)
        setProfile(null)
      } finally {
        // Clear timeout and set loading to false
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        console.log('🔐 SupabaseAuthProvider: Setting loading to false in finally block')
        setLoading(false)
      }
    }
    
    console.log('🔐 SupabaseAuthProvider: useEffect triggered, calling checkUser...')
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 SupabaseAuthProvider: Auth event:', event)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('🔐 SupabaseAuthProvider: User signed in', { email: session.user.email, provider: session.user.app_metadata?.provider })
        setUser(session.user)
        
        // Fetch profile with retry logic - should exist due to trigger
        let profileData = null
        let attempts = 0
        const maxAttempts = 3
        
        while (!profileData && attempts < maxAttempts) {
          attempts++
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, first_name, last_name, avatar_url, role, subscription_tier, subscription_status, created_at, updated_at')
            .eq('id', session.user.id)
            .single()
          
          if (data) {
            profileData = data
            setProfile(data)
          } else if (profileError) {
            console.warn(`Sign-in profile fetch attempt ${attempts} failed:`, profileError)
            if (attempts < maxAttempts) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000))
            } else {
              console.error('Profile not found after all retries, this should not happen with triggers:', profileError)
              // Profile should exist due to database trigger
              // If it doesn't, the OAuth callback or signup flow will handle creation
            }
          }
        }
        
        // Redirect if on login page
        if (window.location.pathname === '/login') {
          router.push('/dashboard')
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔓 SupabaseAuthProvider: User signed out')
        setUser(null)
        setProfile(null)
        
        // Redirect to login if on protected page
        const publicPaths = ['/login', '/register', '/forgot-password', '/', '/clear-all']
        if (!publicPaths.includes(window.location.pathname)) {
          router.push('/login')
        }
      } else if (event === 'USER_UPDATED' && session) {
        console.log('🔄 SupabaseAuthProvider: User updated', { email: session.user.email })
        setUser(session.user)
      }
      
      setLoading(false)
    })

    return () => {
      console.log('🔐 SupabaseAuthProvider: Cleaning up subscriptions')
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array - only run once on mount

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

    // Supabase Auth handles user creation
    // Database trigger will create profile automatically
    // No need for manual profile creation
    
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
    console.log('🔓 SupabaseAuthProvider: Signing out user')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const clearAllSessions = async () => {
    console.log('🧹 SupabaseAuthProvider: Clearing all sessions and dev data')
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear local state
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      // Clear any cached data in browser
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might contain cached auth data
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Clear sessionStorage as well
        sessionStorage.clear()
        
        console.log('🧹 Cleared browser storage keys:', keysToRemove)
      }
      
      console.log('✅ All sessions and dev data cleared successfully')
    } catch (error) {
      console.error('❌ Error clearing sessions:', error)
      throw error
    }
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

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    clearAllSessions,
    resetPassword,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { SupabaseAuthProvider }