'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

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
  const supabase = useMemo(() => createClient(), [])
  

  useEffect(() => {
    let isMounted = true
    
    // Add timeout to prevent hanging
    const loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ Auth loading timeout - forcing loading = false')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    // Check initial session
    const checkUser = async () => {
      try {
        console.log('🔍 Checking initial session...')
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session check error:', error)
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }
        
        if (session?.user && isMounted) {
          setUser(session.user)
          
          // Fetch user profile
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
              
            if (profileData && isMounted) {
              setProfile(profileData)
            }
          } catch (profileErr) {
            console.warn('Profile fetch failed:', profileErr)
          }
        } else {
          // No session found - ensure we clear user state
          if (isMounted) {
            setUser(null)
            setProfile(null)
          }
        }
      } catch (error) {
        console.error('Error checking user session:', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        // ALWAYS set loading to false, regardless of session state
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkUser()
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      if (!isMounted) return
      
      if (session?.user) {
        setUser(session.user)
        setLoading(false)
        
        // Fetch profile for authenticated user
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileData) {
            setProfile(profileData)
          }
        } catch (profileErr) {
          console.warn('Profile fetch failed:', profileErr)
        }
        
        // Handle successful sign-in redirect
        if (event === 'SIGNED_IN') {
          const currentPath = window.location.pathname
          if (currentPath === '/login' || currentPath === '/register') {
            router.push('/dashboard')
          }
        }
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
        
        // Handle sign-out redirect
        if (event === 'SIGNED_OUT') {
          const currentPath = window.location.pathname
          const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/']
          if (!publicPaths.includes(currentPath)) {
            router.push('/login')
          }
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(loadingTimeout)
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
    
    if (error) {
      // Handle specific errors
      if (error.status === 429) {
        throw new Error('Too many registration attempts. Please wait a moment and try again.')
      }
      if (error.message?.includes('email_address_invalid')) {
        throw new Error('Please enter a valid email address.')
      }
      throw error
    }
    
    // Check if email confirmation is required
    if (data?.user && !data.session) {
      return {
        ...data,
        requiresEmailConfirmation: true,
        message: 'Please check your email to verify your account before logging in.'
      }
    }
    
    return data
  }

  const signIn = async ({ email, password }) => {
    console.log('SupabaseAuthProvider: signIn called with email:', email)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('SupabaseAuthProvider: signIn response:', { data, error })
      
      if (error) {
        console.error('Sign in error:', error)
        
        // Provide specific error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address first. Check your inbox for a verification email.')
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment before trying again.')
        } else if (error.message.includes('User not found')) {
          throw new Error('Account not found. Please register first or check your email address.')
        }
        
        throw error
      }
      
      console.log('Sign in successful:', data)
      return data
    } catch (error) {
      console.error('Sign in exception:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setUser(null)
    setProfile(null)
    router.push('/login')
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

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
    
    if (error) {
      console.error('Google sign in error:', error)
      throw error
    }
    
    console.log('Google sign in initiated:', data)
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

// Use only named export to avoid conflicts
export { SupabaseAuthProvider }