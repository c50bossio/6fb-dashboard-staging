'use client'

import { LoadingSpinner } from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  // Check if we're in dev mode
  const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
  
  // Show loading while determining auth state
  if (loading) {
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