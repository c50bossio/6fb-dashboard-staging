'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading, error, resetAndRetry } = useAuth()
  const [isClient, setIsClient] = useState(false)

  // All hooks must be called before any conditional returns
  useEffect(() => {
    setIsClient(true)
  }, [])

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

  // Show error state with recovery options
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => resetAndRetry()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // With middleware handling redirects, we just need to handle loading states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">
              {error ? 'Retrying authentication...' : 'Loading your dashboard...'}
            </p>
            {error && (
              <p className="mt-2 text-sm text-gray-500">
                If this takes too long, please refresh the page
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Development authentication bypass for testing OAuth flows
  const isDevelopment = process.env.NODE_ENV === 'development'
  const enableDevAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
  
  // Detect OAuth callback flows to prevent mock auth interference
  const isOAuthFlow = typeof window !== 'undefined' && (
    window.location.pathname.includes('/dashboard') && 
    (document.referrer.includes('accounts.google.com') ||
     sessionStorage.getItem('oauth_callback_completed') ||
     window.location.search.includes('code=') ||
     window.location.hash.includes('access_token'))
  )
  
  // Create mock user for development when no user is authenticated (but NOT during OAuth flows)
  if (!user && isDevelopment && enableDevAuth && !isOAuthFlow) {
    console.log('🔧 DEV MODE: Using mock authentication for testing')
    
    const mockUser = {
      id: 'dev-user-123',
      email: 'dev@test.com',
      user_metadata: {
        full_name: 'Development User'
      }
    }
    
    // Render children with mock user for development testing
    return (
      <div>
        {/* Development banner */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Development Mode:</strong> Using mock authentication. In production, proper OAuth will be required.
              </p>
            </div>
          </div>
        </div>
        {children}
      </div>
    )
  }

  // Middleware should have handled unauthorized access, but add fallback
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Authentication required...</p>
            <p className="mt-2 text-sm text-gray-500">
              Please <a href="/login" className="text-blue-600 hover:text-blue-800 underline">sign in</a> to continue.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated, render the protected content
  return <>{children}</>
}