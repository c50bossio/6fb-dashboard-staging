'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardErrorBoundary from '../../../components/dashboard/DashboardErrorBoundary'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  // Handle redirect in useEffect to avoid hooks order issues
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])
  
  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">Loading your dashboard...</p>
        </div>
      </div>
    )
  }
  
  // If no user, show loading while redirect happens
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Main Dashboard - Onboarding is now handled globally in layout.js */}
      {user && (
        <DashboardErrorBoundary>
          <UnifiedDashboard user={user} profile={profile} />
        </DashboardErrorBoundary>
      )}
    </div>
  )
}