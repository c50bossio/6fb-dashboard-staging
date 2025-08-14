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
  // Start with loading false for better UX on public pages
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check initial session
    const checkUser = async () => {
      // Only set loading true if we're on a protected page
      const publicPaths = ['/login', '/register', '/forgot-password', '/', '/subscribe']
      const isPublicPage = typeof window !== 'undefined' && publicPaths.includes(window.location.pathname)
      
      if (!isPublicPage) {
        setLoading(true)
      }
      
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

  const signInWithGoogle = async (planId = null, billingPeriod = null) => {
    // If plan data is provided, use the new secure OAuth session method
    if (planId && billingPeriod) {
      console.log('🔒 Starting secure OAuth with plan data:', { planId, billingPeriod })
      
      try {
        // Import the OAuth session utility dynamically to avoid SSR issues
        const { initiateOAuthWithPlan } = await import('../lib/oauth-session')
        console.log('📦 OAuth session module imported successfully')
        
        const { data, error } = await initiateOAuthWithPlan(planId, billingPeriod)
        console.log('🚀 initiateOAuthWithPlan result:', { hasData: !!data, hasError: !!error })
        
        if (error) throw error
        return data
      } catch (err) {
        console.error('❌ Error in signInWithGoogle with plan:', err)
        throw err
      }
    }
    
    // Fallback to standard OAuth for cases without plan data
    console.log('🔓 Starting standard OAuth without plan data')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    try {
      console.log('🔐 Starting sign out process...')
      
      // Clear development session indicators FIRST
      // This ensures the ProtectedRoute bypass is disabled
      if (typeof window !== 'undefined') {
        console.log('🧹 Clearing dev session...')
        localStorage.removeItem('dev_session')
        
        // Set force sign out flag to ensure redirect even with dev bypass
        sessionStorage.setItem('force_sign_out', 'true')
        
        // Clear dev_auth cookie
        document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        
        // Clear critical auth items only (faster than scanning all localStorage)
        const criticalKeys = ['sb-access-token', 'sb-refresh-token', 'supabase.auth.token', 'auth-token']
        let clearedCount = 0
        criticalKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key)
            clearedCount++
          }
        })
        console.log('✅ Cleared critical auth items:', clearedCount)
      }
      
      // Start Supabase sign out in background (don't wait for it)
      console.log('🔄 Starting Supabase signOut in background...')
      supabase.auth.signOut().catch(error => {
        console.error('⚠️ Supabase signOut error (non-blocking):', error)
      })
      
      // Immediate redirect - don't wait for Supabase since we cleared all local data
      console.log('✅ Local session cleared, redirecting immediately...')
      
      if (typeof window !== 'undefined') {
        // Instant redirect - no waiting for network calls
        window.location.href = '/login'
      }
      
      return { success: true }
    } catch (error) {
      console.error('❌ Sign out error:', error)
      
      // Still try to redirect even on error
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      return { success: false, error }
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
    resetPassword,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { SupabaseAuthProvider }