'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          console.log('User authenticated:', session.user.email)
          
          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileData) {
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        console.log('User authenticated:', session.user.email)
        
        // Fetch updated profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          
        if (profileData) {
          setProfile(profileData)
        }
      } else {
        setUser(null)
        setProfile(null)
        console.log('User logged out')
      }

      // Handle auth events
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      } else if (event === 'SIGNED_IN') {
        router.push('/dashboard')
      }
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
      password: newPassword,
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
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}