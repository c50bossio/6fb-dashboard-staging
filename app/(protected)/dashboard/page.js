'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardErrorBoundary from '../../../components/dashboard/DashboardErrorBoundary'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  // Check for potential authentication issues
  if (user && !profile) {
    console.warn('🏠 Dashboard: WARNING - User exists but no profile found')
    console.warn('🏪 BookedBarber: This may indicate a profile creation or fetch issue')
  }

  if (profile && !profile.barbershop_id && !profile.barbershop_id && profile.role !== 'CLIENT') {
    console.warn('🏠 Dashboard: WARNING - Profile exists but no shop association')
    console.warn('🏪 BookedBarber: Role is', profile.role, 'but no barbershop_id or barbershop_id')
  }
  
  // Check if we're in dev mode
  const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
  
  // Handle redirect in useEffect to avoid hooks order issues
  useEffect(() => {
    // Skip redirect in dev mode
    if (isDevMode) {
      return
    }
    
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router, isDevMode])
  
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
  
  // If no user and not in dev mode, show loading while redirect happens
  if (!user && !isDevMode) {
    console.error('Dashboard: No user found after auth loading complete')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">Redirecting to login...</p>
        </div>
      </div>
    )
  }
  
  // In dev mode, create mock user and profile if needed
  const mockUser = isDevMode && !user ? {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'dev@bookedbarber.com',
    user_metadata: { full_name: 'Dev User' }
  } : user
  
  const mockProfile = isDevMode && !profile ? {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'dev@bookedbarber.com',
    full_name: 'Dev User',
    barbershop_id: 'b1234567-89ab-cdef-0123-456789abcdef',
    barbershop_id: 'b1234567-89ab-cdef-0123-456789abcdef',
    role: 'SHOP_OWNER',
    subscription_tier: 'premium',
    subscription_status: 'active'
  } : profile

  // Successfully authenticated user - render dashboard

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Main Dashboard - Onboarding is now handled globally in layout.js */}
      <DashboardErrorBoundary>
        <UnifiedDashboard user={mockUser} profile={mockProfile} />
      </DashboardErrorBoundary>
    </div>
  )
}