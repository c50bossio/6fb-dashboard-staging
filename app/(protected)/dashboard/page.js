'use client'

import { useRouter } from 'next/navigation'
import DashboardErrorBoundary from '../../../components/dashboard/DashboardErrorBoundary'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
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
  
  // Redirect to login if no authenticated user
  if (!user) {
    router.push('/login')
    return null
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