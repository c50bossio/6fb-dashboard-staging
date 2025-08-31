'use client'

console.log('📱 DASHBOARD PAGE: Module loading...')

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardErrorBoundary from '../../../components/dashboard/DashboardErrorBoundary'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

console.log('📱 DASHBOARD PAGE: All imports successful')
console.log('📱 DASHBOARD PAGE: useAuth import verified from SupabaseAuthProvider')

export default function BarbershopDashboard() {
  const startTime = performance.now()
  console.log('📱 DASHBOARD COMPONENT: Function executing...')
  console.log('⏱️ Timing: Dashboard component start at', new Date().toISOString())
  
  const router = useRouter()
  console.log('📱 DASHBOARD COMPONENT: Router loaded')
  
  const { user, profile, loading: authLoading } = useAuth()
  console.log('📱 DASHBOARD COMPONENT: useAuth hook called')
  console.log('⏱️ Timing: useAuth hook called took', (performance.now() - startTime).toFixed(2), 'ms')
  
  // Enhanced debug logging with BookedBarber-specific details
  console.log('🏠 Dashboard: Detailed auth state check:', {
    authLoading,
    hasUser: !!user,
    userEmail: user?.email,
    userMetadata: user?.user_metadata,
    hasProfile: !!profile,
    profileRole: profile?.role,
    shopId: profile?.shop_id,
    barbershopId: profile?.barbershop_id,
    subscriptionTier: profile?.subscription_tier,
    subscriptionStatus: profile?.subscription_status,
    onboardingCompleted: profile?.onboarding_completed
  })

  // Check for potential authentication issues
  if (user && !profile) {
    console.warn('🏠 Dashboard: WARNING - User exists but no profile found')
    console.warn('🏪 BookedBarber: This may indicate a profile creation or fetch issue')
  }

  if (profile && !profile.shop_id && !profile.barbershop_id && profile.role !== 'CLIENT') {
    console.warn('🏠 Dashboard: WARNING - Profile exists but no shop association')
    console.warn('🏪 BookedBarber: Role is', profile.role, 'but no barbershop_id or barbershop_id')
  }
  
  // Check if we're in dev mode
  const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
  
  // Handle redirect in useEffect to avoid hooks order issues
  useEffect(() => {
    const effectStart = performance.now()
    console.log('🏠 Dashboard: Redirect useEffect triggered')
    console.log('⏱️ Timing: Redirect check at', new Date().toISOString())
    
    // Skip redirect in dev mode
    if (isDevMode) {
      console.log('🏠 Dashboard: Dev mode enabled, skipping authentication redirect')
      return
    }
    
    if (!authLoading && !user) {
      console.log('🏠 Dashboard: No user found, redirecting to login')
      console.log('⏱️ Timing: Redirect decision took', (performance.now() - effectStart).toFixed(2), 'ms')
      router.push('/login')
    } else if (!authLoading && user) {
      console.log('🏠 Dashboard: User found, staying on dashboard')
      console.log('🏪 BookedBarber: Preparing dashboard render for user:', user.email)
      console.log('⏱️ Timing: Dashboard ready check took', (performance.now() - effectStart).toFixed(2), 'ms')
    }
  }, [authLoading, user, router])
  
  // Show loading state while auth is initializing
  if (authLoading) {
    console.log('🏠 Dashboard: Rendering auth loading state')
    console.log('⏱️ Timing: Auth loading render at', (performance.now() - startTime).toFixed(2), 'ms from start')
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
    console.log('🏠 Dashboard: Rendering no-user redirect state')
    console.log('❌ Error: No user found after auth loading complete')
    console.log('⏱️ Timing: No-user render at', (performance.now() - startTime).toFixed(2), 'ms from start')
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
    id: 'dev-user-123',
    email: 'dev@bookedbarber.com',
    user_metadata: { full_name: 'Dev User' }
  } : user
  
  const mockProfile = isDevMode && !profile ? {
    id: 'dev-user-123',
    email: 'dev@bookedbarber.com',
    full_name: 'Dev User',
    shop_id: 'dev-barbershop-123',
    barbershop_id: 'dev-barbershop-123',
    role: 'SHOP_OWNER',
    subscription_tier: 'premium',
    subscription_status: 'active'
  } : profile

  // If we get here, we have a user - log the success
  console.log('🏠 Dashboard: Successfully rendering dashboard for authenticated user')
  console.log('🏪 BookedBarber: User authenticated, passing to UnifiedDashboard')
  console.log('⏱️ Timing: Main dashboard render at', (performance.now() - startTime).toFixed(2), 'ms from start')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Main Dashboard - Onboarding is now handled globally in layout.js */}
      <DashboardErrorBoundary>
        <UnifiedDashboard user={mockUser} profile={mockProfile} />
      </DashboardErrorBoundary>
    </div>
  )
}