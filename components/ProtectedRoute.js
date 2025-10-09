'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading, error, profile } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [isOAuthFlow, setIsOAuthFlow] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [gracePeriodOver, setGracePeriodOver] = useState(false)

  // Detect OAuth flow
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setIsOAuthFlow(params.has('code'))
    }
  }, [])

  // Clear initial load state once auth provider has had time to initialize
  useEffect(() => {
    if (user || (!loading && !error)) {
      setInitialLoad(false)
    }
  }, [user, loading, error])

  // Reduced console logging - only log on initial render or when there are issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (error || loadingTimeout)) {
      console.log('🛡️ [ProtectedRoute] Status:', {
        isClient,
        loading,
        has_user: !!user,
        has_profile: !!profile,
        has_error: !!error,
        loadingTimeout,
        isOAuthFlow
      })
    }
  }, [error, loadingTimeout, isOAuthFlow]) // Only log when issues occur

  // Ensure client-side rendering consistency
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Grace period to allow SupabaseAuthProvider to complete initialization
  // Prevents race condition where we redirect before session check completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setGracePeriodOver(true)
    }, 1000) // 1 second grace period

    return () => clearTimeout(timer)
  }, [])

  // Simple timeout protection - if still loading after 5 seconds, show error
  useEffect(() => {
    if (loading && isClient) {
      const timer = setTimeout(() => {
        console.error('⏰ [ProtectedRoute] Auth check taking too long')
        setLoadingTimeout(true)
      }, 5000) // 5 second timeout (longer than 3s auth check)

      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [loading, isClient])

  // Show loading during SSR to ensure consistent HTML structure
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-muted-foreground">Loading application...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading timeout error with recovery options
  if (loadingTimeout && loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Login Required</h3>
            <p className="text-muted-foreground mb-6">
              Your session has expired or could not be verified. Please log in again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Go to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Try Refreshing
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state - simple redirect to login
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Authentication Error</h3>
            <p className="text-muted-foreground mb-6">
              Your session could not be verified. Please log in again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Go to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Try Refreshing
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // With middleware handling redirects, we just need to handle loading states
  // Show loading during initial auth check or when explicitly loading
  if (loading || initialLoad) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-muted-foreground">
              {isOAuthFlow
                ? 'Completing your Google login...'
                : error
                  ? 'Retrying authentication...'
                  : 'Loading your dashboard...'
              }
            </p>
            {isOAuthFlow && !error && (
              <p className="mt-2 text-sm text-muted-foreground/80">
                Setting up your profile...
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm text-muted-foreground/80">
                If this takes too long, please refresh the page
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Development authentication bypass (simplified)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const enableDevAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'

  if (!user && isDevelopment && enableDevAuth && !loading) {
    console.log('🔧 DEV MODE: Protected route allowing development access')
    return <>{children}</>
  }

  // Trust middleware - if we got here, middleware already validated
  // Only redirect if there's an explicit error or timeout
  // Don't redirect just because user object hasn't loaded yet
  if (!user && !loading && error) {
    console.log('🚫 [ProtectedRoute] Auth error detected, redirecting to login...')

    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render protected content - trust middleware validated access
  // User object will be populated async by SupabaseAuthProvider
  return <>{children}</>
}