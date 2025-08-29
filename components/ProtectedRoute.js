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

  // Simple redirect logic - trust Supabase's auth state
  useEffect(() => {
    if (!isClient || loading) return

    // If no user after loading completes, redirect to login
    if (!user) {
      // Store return URL for after authentication
      if (pathname && pathname !== '/login' && pathname !== '/') {
        sessionStorage.setItem('auth_return_url', pathname)
      }
      router.push('/login')
    }
  }, [isClient, loading, user, router, pathname])

  // Show loading while determining auth state
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Loading...</p>
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