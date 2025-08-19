'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    
    // Check force sign out FIRST before any other checks
    const forceSignOut = sessionStorage.getItem('force_sign_out') === 'true'
    if (forceSignOut) {
      sessionStorage.removeItem('force_sign_out')
      router.push('/login')
      return
    }
    
    // SUPABASE BEST PRACTICE: Simple auth check without complex bypasses
    const checkAuth = setTimeout(() => {
      if (!loading && !user) {
        router.push('/login')
      }
    }, 100) // Small delay to let auth state settle
    
    return () => clearTimeout(checkAuth)
  }, [loading, user, router])

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