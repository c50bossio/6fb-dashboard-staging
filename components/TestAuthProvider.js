'use client'

console.log('🧪 TEST AUTH PROVIDER: Module loading...')

import React, { createContext, useContext } from 'react'

console.log('🧪 TEST AUTH PROVIDER: Imports successful')

const TestAuthContext = createContext({})

export const useAuth = () => {
  console.log('🧪 TEST AUTH PROVIDER: useAuth called')
  return {
    user: {
      id: 'test-user-123',
      email: 'test@example.com'
    },
    profile: {
      id: 'test-user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'CLIENT'
    },
    loading: false,  // FIXED: Set to false to exit loading state
    hydrated: true
  }
}

function TestAuthProvider({ children }) {
  console.log('🧪 TEST AUTH PROVIDER: Component rendering...')
  
  return (
    <TestAuthContext.Provider value={{}}>
      {children}
    </TestAuthContext.Provider>
  )
}

export default TestAuthProvider
export { TestAuthProvider }
export { TestAuthProvider as SupabaseAuthProvider }