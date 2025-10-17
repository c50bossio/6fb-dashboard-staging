'use client'

import { useEffect, useState } from 'react'
import DevAuthProvider from './DevAuthProvider'
import SupabaseAuthProvider from './SupabaseAuthProvider'

/**
 * Auth Provider Wrapper
 * Automatically selects the appropriate auth provider based on environment
 */
export function AuthProviderWrapper({ children }) {
  const [provider, setProvider] = useState(null)
  
  useEffect(() => {
    // Check if we should use dev auth
    const isDevMode = process.env.NODE_ENV === 'development'
    const enableDevAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
    const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                              process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'
    
    // Use DevAuthProvider if in dev mode with dev auth enabled and no valid Supabase config
    const useDevAuth = isDevMode && enableDevAuth && !hasSupabaseConfig
    
    console.log('🔐 AuthWrapper: Selecting provider...', {
      isDevMode,
      enableDevAuth,
      hasSupabaseConfig,
      useDevAuth
    })
    
    setProvider(useDevAuth ? 'dev' : 'supabase')
  }, [])
  
  // Show loading while determining which provider to use
  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    )
  }
  
  // Use the appropriate provider
  if (provider === 'dev') {
    console.log('🔐 AuthWrapper: Using DevAuthProvider')
    return <DevAuthProvider>{children}</DevAuthProvider>
  }
  
  console.log('🔐 AuthWrapper: Using SupabaseAuthProvider')
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
}

export default AuthProviderWrapper