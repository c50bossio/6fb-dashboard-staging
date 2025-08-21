'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  
  // Debug authentication state
  console.log('🔒 [PROTECTED ROUTE] Auth state:', {
    hasUser: !!user,
    userEmail: user?.email,
    loading,
    isClient,
    currentPath: pathname
  })

  useEffect(() => {
    setIsClient(true)
    
    // Check force sign out FIRST before any other checks
    const forceSignOut = sessionStorage.getItem('force_sign_out') === 'true'
    if (forceSignOut) {
      sessionStorage.removeItem('force_sign_out')
      router.push('/login')
      return
    }
    
    // Only redirect if auth loading is complete AND there's no user
    // This prevents premature redirects during session recovery
    if (!loading && !user) {
      // Store the current path so we can return here after login
      // This ensures that if user manually navigates to login or their session expires,
      // they'll be returned to where they were trying to go
      if (pathname && pathname !== '/login' && pathname !== '/') {
        sessionStorage.setItem('auth_return_url', pathname)
        console.log('🔒 [PROTECTED ROUTE] Storing return URL for redirect:', pathname)
      }
      console.log('🔒 [PROTECTED ROUTE] No authenticated user, redirecting to login')
      router.push('/login')
    } else if (!loading && user) {
      // User is authenticated, stay on current page
      console.log('🔒 [PROTECTED ROUTE] User authenticated, staying on:', pathname)
    }
  }, [loading, user, router, pathname])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Loading application...</p>
          </div>
        </div>
      </div>
    )
  }

  // Check force sign out in render too for immediate redirect
  const forceSignOut = sessionStorage.getItem('force_sign_out') === 'true'
  if (forceSignOut) {
    sessionStorage.removeItem('force_sign_out')
    if (typeof window !== 'undefined') {
      router.push('/login')
    }
    return null
  }

  if (loading) {
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

  return <>{children}</>
}