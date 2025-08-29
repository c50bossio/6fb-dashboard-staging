'use client'

import { createBrowserClient } from '@supabase/ssr'
import { createContext, useContext, useEffect, useState } from 'react'

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
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId) => {
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
            full_name: authUser.user_metadata?.full_name || '',
            created_at: new Date().toISOString(),
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
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  }

  const signUp = async ({ email, password, metadata }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })
    
    if (error) throw error
  }

  const value = {
    user,
    profile,
    loading,
    supabase,
    signOut,
    signIn,
    signUp,
    resetPassword,
    refreshProfile: () => fetchProfile(user?.id),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}