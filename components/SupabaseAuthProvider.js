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
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  
  // Log initialization for debugging
  useEffect(() => {
    console.log('[Auth] Provider initialized, loading:', loading)
  }, [])

  useEffect(() => {
    // Check initial session
    const checkUser = async () => {
      try {
        // Use getUser for secure authentication check
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Auth check error:', error)
          setUser(null)
          setProfile(null)
        } else if (user) {
          console.log('User authenticated:', user.email)
          setUser(user)
          
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profileData) {
            setProfile(profileData)
          }
        } else {
          console.log('No authenticated user')
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setUser(null)
        setProfile(null)
      } finally {
        // Always set loading to false after checking
        setLoading(false)
      }
    }

    // Set loading to false immediately for public pages where auth isn't required
    const publicPaths = ['/login', '/register', '/forgot-password', '/', '/subscribe']
    if (typeof window !== 'undefined' && publicPaths.includes(window.location.pathname)) {
      setLoading(false)
    }
    
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
        }
        
        // Redirect if on login page
        if (window.location.pathname === '/login') {
          router.push('/dashboard')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        
        // Redirect to login if on protected page
        const publicPaths = ['/login', '/register', '/forgot-password', '/', '/clear-all']
        if (!publicPaths.includes(window.location.pathname)) {
          router.push('/login')
        }
      } else if (event === 'USER_UPDATED' && session) {
        setUser(session.user)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

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

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { SupabaseAuthProvider }