'use client'

import { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react'
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

export function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Removed dev bypass - production-ready authentication only
  const router = useRouter()
  const supabase = useMemo(() => createClient(), []) // Memoize supabase client to prevent re-creation

  useEffect(() => {
    let isMounted = true // Track if component is still mounted
    
    // Check initial session - Supabase only
    const checkUser = async () => {
      try {
        console.log('🔐 Checking Supabase session...')
        
        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && isMounted) {
          setUser(session.user)
          console.log('Initial user session found:', session.user.email)
          
          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileData && isMounted) {
            setProfile(profileData)
          }
        } else {
          console.log('No initial session found')
        }
      } catch (error) {
        console.error('Error checking user session:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkUser()
    
    // Fallback timeout to ensure loading state resolves - increased for complex multi-tenant setup
    const fallbackTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false')
      setLoading(false)
    }, 15000) // 15 second fallback to allow for tenant context setup

    // Set up auth state listener - Supabase only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.email || 'No user')
      
      if (session?.user) {
        console.log('🔐 Setting user in auth context:', session.user.email)
        setUser(session.user)
        
        // Fetch updated profile with better error handling
        try {
          console.log('🔐 Fetching user profile...')
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileError) {
            console.warn('🔐 Profile fetch error (may be expected for new users):', profileError)
          } else if (profileData) {
            console.log('🔐 Profile loaded successfully:', profileData.email)
            setProfile(profileData)
          }
        } catch (profileErr) {
          console.warn('🔐 Profile fetch failed:', profileErr)
          // Continue without profile - user can still access basic features
        }
        
        // Set loading to false after user and profile are set
        console.log('🔐 Auth flow completed, setting loading to false')
        setLoading(false)
        
      } else {
        console.log('🔐 Clearing user authentication state')
        setUser(null)
        setProfile(null)
      }

      // Handle auth events - don't redirect from public pages
        const currentPath = window.location.pathname
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/']
        const isPublicPath = publicPaths.includes(currentPath)
        
        if (event === 'SIGNED_OUT' && !isPublicPath) {
          // Only redirect to login if user was on a protected page
          router.push('/login')
        } else if (event === 'SIGNED_IN' && (currentPath === '/login' || currentPath === '/register')) {
          // Only redirect to dashboard if user is on login/register page
          router.push('/dashboard')
        }
    })

    return () => {
      isMounted = false // Prevent state updates after unmount
      subscription.unsubscribe()
      clearTimeout(fallbackTimeout)
    }
  }, [router, supabase])

  const signUp = async ({ email, password, metadata }) => {
    // Implement retry logic for rate limiting
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/dashboard`
          },
        })
        
        if (error) {
          // Handle rate limiting with intelligent retry
          if (error.status === 429 && retryCount < maxRetries) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
            console.log(`Rate limited, retrying in ${delay/1000} seconds... (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // If it's a rate limit error and we've exhausted retries, provide helpful message
          if (error.status === 429) {
            throw new Error('Registration is busy right now due to high volume. Try: (1) Use a different email provider like Outlook/Yahoo, (2) Add +test to your Gmail (e.g., yourname+test@gmail.com), or (3) Wait 15 minutes and try again.');
          }
          
          throw error;
        }
        
        // Success - check if email confirmation is required
        if (data?.user && !data.session) {
          return {
            ...data,
            requiresEmailConfirmation: true,
            message: 'Please check your email to verify your account before logging in.'
          }
        }
        
        return data;
        
      } catch (err) {
        if (retryCount >= maxRetries) {
          // Handle specific Supabase validation errors
          if (err.message && err.message.includes('email_address_invalid')) {
            throw new Error('Please enter a valid email address. Some email domains may not be supported.');
          } else if (err.message && err.message.includes('invalid')) {
            throw new Error('Please check your email address and try again.');
          }
          throw err;
        }
        // Continue retry loop for other errors too
        retryCount++;
        const delay = Math.min(1000 * retryCount, 5000); // Progressive delay up to 5s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const signIn = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Sign in error:', error)
        
        // Provide specific error messages for common issues
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address first. Check your inbox for a verification email from 6fbmentorship.com')
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment before trying again.')
        }
        
        throw error
      }
      
      console.log('Sign in successful:', data)
      return data
    } catch (err) {
      console.error('Sign in failed:', err)
      throw err
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear local state
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

  const resendEmailConfirmation = async (email) => {
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        console.error('Resend email error:', error)
        throw error
      }
      
      console.log('Resend email successful:', data)
      return data
    } catch (err) {
      console.error('Resend email failed:', err)
      throw err
    }
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

  // Removed dev bypass - production-ready authentication only

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendEmailConfirmation,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}