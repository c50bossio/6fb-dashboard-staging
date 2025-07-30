'use client'

import { createContext, useContext } from 'react'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    // Return stub data for simplified app
    return {
      user: null,
      loading: false,
      isAuthenticated: false,
      login: async () => ({ success: false }),
      logout: async () => {},
      register: async () => ({ success: false })
    }
  }
  return context
}

export function AuthProvider({ children }) {
  const value = {
    user: null,
    loading: false,
    isAuthenticated: false,
    login: async () => ({ success: false }),
    logout: async () => {},
    register: async () => ({ success: false })
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}