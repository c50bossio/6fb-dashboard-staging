'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import both providers to avoid SSR issues
const SupabaseAuthProvider = dynamic(() => import('./SupabaseAuthProvider'), {
  ssr: false,
  loading: () => <AuthLoading />
})

const DevAuthProvider = dynamic(() => import('./DevAuthProvider'), {
  ssr: false,
  loading: () => <AuthLoading />
})

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading authentication...</p>
      </div>
    </div>
  )
}

/**
 * Smart Auth Provider
 * Intelligently selects between Supabase and Dev auth providers
 * Can be forced to dev mode via localStorage or query param
 */
export function SmartAuthProvider({ children }) {
  const [authMode, setAuthMode] = useState(null)
  
  useEffect(() => {
    // Check for forced dev mode via query param or localStorage
    const urlParams = new URLSearchParams(window.location.search)
    const forceDevMode = urlParams.get('devauth') === 'true' || 
                         localStorage.getItem('forceDevAuth') === 'true'
    
    // Check environment configuration
    const isDevEnv = process.env.NODE_ENV === 'development'
    const devAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
    
    // Determine which auth provider to use
    if (forceDevMode) {
      console.log('🔐 SmartAuth: Using Development Auth Provider (forced)')
      setAuthMode('dev')
    } else if (isDevEnv && devAuthEnabled && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('🔐 SmartAuth: Using Development Auth Provider (no Supabase)')
      setAuthMode('dev')
      
      // Store preference if set via query param
      if (urlParams.get('devauth') === 'true') {
        localStorage.setItem('forceDevAuth', 'true')
      }
    } else {
      console.log('🔐 SmartAuth: Using Supabase Auth Provider')
      setAuthMode('supabase')
    }
    
    // Add development helper message
    if (isDevEnv) {
      console.log('💡 Tip: Add ?devauth=true to URL to force development auth mode')
    }
  }, [])
  
  // Handle auth mode toggle (for development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add global function for easy toggling in console
      window.toggleDevAuth = () => {
        const current = localStorage.getItem('forceDevAuth') === 'true'
        localStorage.setItem('forceDevAuth', (!current).toString())
        window.location.reload()
      }
      
      console.log('💡 Dev Tip: Run window.toggleDevAuth() in console to switch auth modes')
    }
  }, [])
  
  if (!authMode) {
    return <AuthLoading />
  }
  
  if (authMode === 'dev') {
    return <DevAuthProvider>{children}</DevAuthProvider>
  }
  
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
}

export default SmartAuthProvider