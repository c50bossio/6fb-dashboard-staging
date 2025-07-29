'use client'

import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedRoute({ 
  children, 
  fallbackUrl = '/auth',
  showLoading = true,
  redirectOnUnauthorized = true
}) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated && redirectOnUnauthorized) {
      const currentPath = window.location.pathname
      const callbackUrl = encodeURIComponent(currentPath)
      router.push(`${fallbackUrl}?redirect=${callbackUrl}`)
    }
  }, [loading, isAuthenticated, redirectOnUnauthorized, router, fallbackUrl])

  // Show loading state
  if (loading) {
    if (showLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }
    return null
  }

  // Show unauthorized state
  if (!isAuthenticated) {
    if (!redirectOnUnauthorized) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-600">⚠️</div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You need to be signed in to access this page.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push(fallbackUrl)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // User is authenticated, render children
  return children
}

// HOC version for easier wrapping
export function withProtectedRoute(Component, protectionOptions = {}) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute {...protectionOptions}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}