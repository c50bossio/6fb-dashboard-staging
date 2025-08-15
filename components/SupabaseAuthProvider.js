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
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const publicPaths = ['/login', '/register', '/forgot-password', '/subscribe', '/success', '/pricing', '/']
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
      
      const isPublicPage = publicPaths.some(path => {
        if (path === '/') {
          return currentPath === '/'  // Only exact match for root
        }
        return currentPath === path || currentPath.startsWith(path + '/') || currentPath.startsWith(path + '?')
      })
      
      const isDevelopment = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        process.env.NODE_ENV === 'development'
      )
      
      if (isDevelopment && currentPath.includes('/dashboard/campaigns')) {
        console.log('🚀 DEVELOPMENT MODE: Direct bypass for campaigns page')
        const mockUser = {
          id: 'demo-user-001',
          email: 'demo@test.com',
          user_metadata: { full_name: 'Demo User' }
        }
        const mockProfile = {
          id: 'demo-user-001',
          email: 'demo@test.com',
          full_name: 'Demo User',
          role: 'SHOP_OWNER'
        }
        setUser(mockUser)
        setProfile(mockProfile)
        setLoading(false)
        console.log('✅ Mock user set immediately - no auth check needed')
        return
      }
      
      const isOAuthRedirect = urlParams.get('from') === 'oauth_success' || 
                             currentPath === '/welcome' ||
                             currentPath.includes('auth/callback')
      
      console.log('Auth check - Current path:', currentPath, 'Is public:', isPublicPage, 'OAuth redirect:', isOAuthRedirect, 'Will set loading:', !isPublicPage)
      
      if (!isPublicPage) {
        setLoading(true)
      }
      
      try {
        let authAttempts = isOAuthRedirect ? 3 : 1
        let sessionData = null
        
        for (let attempt = 1; attempt <= authAttempts; attempt++) {
          console.log(`Auth attempt ${attempt}/${authAttempts}${isOAuthRedirect ? ' (OAuth redirect detected)' : ''}`)
          
          const { data: { user }, error } = await supabase.auth.getUser()
          
          if (error) {
            console.error(`Auth check error (attempt ${attempt}):`, error)
            if (attempt === authAttempts) {
              setUser(null)
              setProfile(null)
            }
          } else if (user) {
            console.log('User authenticated:', user.email)
            sessionData = { user }
            break
          } else {
            console.log(`No authenticated user (attempt ${attempt})`)
            if (isOAuthRedirect && attempt < authAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            } else if (attempt === authAttempts) {
              setUser(null)
              setProfile(null)
            }
          }
        }
        
        if (sessionData?.user) {
          setUser(sessionData.user)
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionData.user.id)
            .single()
          
          if (profileData) {
            setProfile(profileData)
            console.log('✅ OAuth session synchronized successfully - profile loaded')
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
        console.log('✅ Auth check complete - loading set to false')
      }
    }
    
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
        }
        
        if (window.location.pathname === '/login') {
          router.push('/dashboard')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        
        const publicPaths = ['/login', '/register', '/forgot-password', '/success', '/pricing', '/', '/clear-all']
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

  const signInWithGoogle = async (customRedirectTo) => {
    console.log('🔐 Starting Google OAuth')
    
    const redirectUrl = customRedirectTo || `${window.location.origin}/auth/callback`
    console.log('🔄 OAuth redirect URL:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      }
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    try {
      console.log('🔐 Starting sign out process...')
      
      if (typeof window !== 'undefined') {
        console.log('🧹 Clearing dev session...')
        localStorage.removeItem('dev_session')
        
        sessionStorage.setItem('force_sign_out', 'true')
        
        document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        
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
      
      console.log('🔄 Starting Supabase signOut in background...')
      supabase.auth.signOut().catch(error => {
        console.error('⚠️ Supabase signOut error (non-blocking):', error)
      })
      
      console.log('✅ Local session cleared, redirecting immediately...')
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      return { success: true }
    } catch (error) {
      console.error('❌ Sign out error:', error)
      
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