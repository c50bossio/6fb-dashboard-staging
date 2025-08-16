'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import DashboardOnboarding from '../../../components/dashboard/DashboardOnboarding'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  console.log('🏪 BarbershopDashboard component loading...')
  
  const { user, profile, loading, updateProfile } = useAuth()
  const router = useRouter()
  const [timeOfDay, setTimeOfDay] = useState('')
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  
  console.log('📊 Dashboard state:', {
    hasUser: !!user,
    userEmail: user?.email,
    hasProfile: !!profile,
    profileOnboarding: profile?.onboarding_completed,
    loading
  })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')
  }, [])

  // Add timeout for loading state to prevent infinite loading
  useEffect(() => {
    if (user && !profile && !loading) {
      console.log('⏱️ Starting profile loading timeout...')
      const timeout = setTimeout(() => {
        console.log('⚠️ Profile loading timeout reached, proceeding with fallback')
        setLoadingTimeout(true)
      }, 3000) // 3 second timeout

      return () => clearTimeout(timeout)
    }
  }, [user, profile, loading])
  
  useEffect(() => {
    console.log('🔍 Dashboard checking onboarding status...', {
      hasProfile: !!profile,
      profile: profile,
      onboarding: profile?.onboarding_completed,
      loading: loading
    })
    
    // Only redirect if we have a profile and onboarding is explicitly false
    // Don't redirect if profile is still loading
    if (!loading && profile && profile.onboarding_completed === false) {
      console.log('📝 Onboarding incomplete, will show onboarding in dashboard')
      // No redirect - dashboard will show onboarding
    } else if (!loading && !profile && user) {
      console.log('⚠️ User exists but no profile, may need to create one')
    }
  }, [profile, router, loading, user])


  // Development bypass - if bypass mode, create mock data
  const isBypass = typeof window !== 'undefined' && 
    (window.location.search.includes('bypass=true') || 
     localStorage.getItem('dev_bypass') === 'true')
  
  // Create mock user and profile for bypass mode
  const mockUser = isBypass ? {
    id: 'bbb243c4-cc7d-4458-af03-3bfff742aee5',
    email: 'dev@bookedbarber.com',
    user_metadata: { full_name: 'Dev User' }
  } : null
  
  const mockProfile = isBypass ? {
    id: 'bbb243c4-cc7d-4458-af03-3bfff742aee5',
    email: 'dev@bookedbarber.com',
    full_name: 'Dev User',
    shop_name: 'Tomb45 Barbershop',
    role: 'SHOP_OWNER',
    onboarding_completed: true
  } : null
  
  // Use mock data in bypass mode, real data otherwise
  const effectiveUser = isBypass ? mockUser : user
  const effectiveProfile = isBypass ? mockProfile : profile
  
  // Show loading state while checking onboarding (unless in bypass mode)
  // Add timeout protection to prevent infinite loading
  if (!isBypass && (loading || (!profile && user && !loadingTimeout))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          {user && !profile && !loading && (
            <p className="mt-2 text-sm text-gray-500">Fetching profile data...</p>
          )}
        </div>
      </div>
    )
  }
  
  // We no longer redirect when onboarding is needed - the dashboard will show with onboarding overlay
  
  // Create fallback user data if profile failed to load
  const fallbackUser = user && !profile && loadingTimeout ? {
    ...user,
    profile: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || 'Dev User',
      shop_name: 'Tomb45 Barbershop',
      role: 'SHOP_OWNER',
      onboarding_completed: true
    },
    barbershop_id: '8d5728b2-24ca-4d18-8823-0ed926e8913d' // Known barbershop ID
  } : null

  return (
    <div>
      {/* Show timeout warning if profile failed to load */}
      {loadingTimeout && !profile && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                ⚠️ Profile data couldn't be loaded, using fallback data. Dashboard functionality may be limited.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Unified Dashboard Component - Pass effective user (mock, real, or fallback) */}
      <UnifiedDashboard user={effectiveUser || fallbackUser || mockUser} />
      
      {/* Show onboarding overlay if profile exists and onboarding is not complete */}
      {profile && profile.onboarding_completed === false && (
        <DashboardOnboarding 
          user={user}
          profile={profile}
          updateProfile={updateProfile}
          onComplete={() => {
            // Refresh the page to update the dashboard after onboarding
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}