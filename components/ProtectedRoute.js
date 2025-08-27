'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  
  // Ensure we're client-side before doing anything
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle authentication redirects
  useEffect(() => {
    if (!isClient || loading) return

    // Check for force sign out flag
    const forceSignOut = sessionStorage.getItem('force_sign_out') === 'true'
    if (forceSignOut) {
      sessionStorage.removeItem('force_sign_out')
      router.push('/login')
      return
    }

    // If no user and auth loading is complete, redirect to login
    if (!user) {
      // Store return URL for after authentication
      if (pathname && pathname !== '/login' && pathname !== '/') {
        sessionStorage.setItem('auth_return_url', pathname)
      }
      router.push('/login')
    }
  }, [isClient, loading, user, router, pathname])

  // Show loading while client-side hydration happens
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

  // Show loading while auth is being determined
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

  // Show loading while redirect is happening
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated, render the protected content
  return <>{children}</>
}