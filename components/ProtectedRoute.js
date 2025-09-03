'use client'

import { LoadingSpinner } from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const [emergencyBypass, setEmergencyBypass] = useState(false)
  
  // Debug logging (only in debug mode to reduce console noise)
  if (process.env.NEXT_PUBLIC_DEBUG_PROTECTED_ROUTE === 'true') {
    console.log('🛡️ [PROTECTED ROUTE DEBUG]', {
      user: !!user,
      loading,
      userId: user?.id,
      emergencyBypass,
      timestamp: Date.now()
    })
  }
  
  // Emergency bypass if auth is stuck
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG_PROTECTED_ROUTE === 'true') {
      console.log('🛡️ [PROTECTED ROUTE DEBUG] Setting emergency bypass timer...')
    }
    const timer = setTimeout(() => {
      if (process.env.NEXT_PUBLIC_DEBUG_PROTECTED_ROUTE === 'true') {
        console.log('🛡️ [PROTECTED ROUTE DEBUG] EMERGENCY BYPASS TRIGGERED!')
      }
      setEmergencyBypass(true)
    }, 2000) // 2 second emergency bypass
    
    return () => {
      if (process.env.NEXT_PUBLIC_DEBUG_PROTECTED_ROUTE === 'true') {
        console.log('🛡️ [PROTECTED ROUTE DEBUG] Cleanup bypass timer')
      }
      clearTimeout(timer)
    }
  }, [])
  
  // Check if we're in dev mode
  const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
  
  if (process.env.NEXT_PUBLIC_DEBUG_PROTECTED_ROUTE === 'true') {
    console.log('🛡️ [PROTECTED ROUTE DEBUG] Dev mode:', isDevMode)
  }
  
  // Show loading while determining auth state (unless emergency bypass is active)
  if (loading && !emergencyBypass) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Loading...</p>
            <p className="mt-2 text-xs text-gray-500">
              DEBUG: Auth loading state active | User: {user ? 'present' : 'null'} | Time: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // In dev mode, allow access even without a user
  if (isDevMode) {
    return children
  }

  // Middleware should handle redirects for unauthenticated users
  // If we get here without a user, show loading (shouldn't happen)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Authenticating...</p>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated, render the protected content
  return children
}