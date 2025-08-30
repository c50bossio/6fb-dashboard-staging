'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Development-only Auth Provider
 * Provides mock authentication for testing without Supabase
 */
export function DevAuthProvider({ children }) {
  const [user] = useState({
    id: 'dev-user-123',
    email: 'dev@6fb.local',
    user_metadata: { full_name: 'Development User' }
  })
  
  const [profile] = useState({
    id: 'dev-user-123',
    email: 'dev@6fb.local',
    full_name: 'Development User',
    subscription_tier: 'pro',
    subscription_status: 'active',
    role: 'BARBER',
    barbershop_id: 'dev-shop-123',
    barberbarbershop_id: 'dev-shop-123'
  })
  
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      console.log('🔐 DevAuth: Mock authentication ready')
      setLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Mock auth methods
  const signIn = async () => {
    console.log('🔐 DevAuth: Mock sign in')
    return { error: null }
  }
  
  const signOut = async () => {
    console.log('🔐 DevAuth: Mock sign out')
    return { error: null }
  }
  
  const signUp = async () => {
    console.log('🔐 DevAuth: Mock sign up')
    return { error: null }
  }
  
  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    signUp,
    isAuthenticated: true,
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: (table) => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }) }),
          in: () => ({ data: [], error: null }),
          single: async () => ({ data: null, error: null })
        }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null })
      })
    }
  }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default DevAuthProvider