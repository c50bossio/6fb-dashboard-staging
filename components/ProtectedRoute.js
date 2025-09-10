'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // All hooks must be called before any conditional returns
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle redirect in useEffect to avoid setState during render
  useEffect(() => {
    if (!loading && !user && isClient) {
      console.log('🔐 ProtectedRoute: No user found, redirecting to login...')
      router.push('/login')
    }
  }, [loading, user, router, isClient])

  // Always show loading state during SSR to ensure consistent HTML structure
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

  // Authentication is now required in all environments
  console.log('🔐 ProtectedRoute: Checking authentication for:', window.location.pathname)
  console.log('🔐 ProtectedRoute state:', { loading, user: !!user, userEmail: user?.email })

  if (loading) {
    console.log('🔐 ProtectedRoute: Still loading auth...')
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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
            <p className="mt-4 text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      </div>
    )
  }

  console.log('🔐 ProtectedRoute: User authenticated, rendering children')

  return <>{children}</>
}