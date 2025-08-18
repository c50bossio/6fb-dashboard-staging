'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import DashboardOnboarding from '../../../components/dashboard/DashboardOnboarding'
import OnboardingResumeButton from '../../../components/dashboard/OnboardingResumeButton'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  console.log('BarbershopDashboard component loading...')
  
  const { user, profile, loading, updateProfile } = useAuth()
  const router = useRouter()
  const [timeOfDay, setTimeOfDay] = useState('')
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  
  // State for forcing onboarding display
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false)
  
  // Check URL parameter for forcing onboarding display (for demos/pitches)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const showOnboardingParam = urlParams.get('onboarding') === 'true'
      if (showOnboardingParam) {
        console.log('URL parameter detected: forcing onboarding to show')
        setForceShowOnboarding(true)
      }
    }
  }, [])
  
  // Add event listener for Launch Onboarding button
  useEffect(() => {
    const handleLaunchOnboarding = (event) => {
      console.log('Launch onboarding event received:', event.detail)
      setForceShowOnboarding(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('launchOnboarding', handleLaunchOnboarding)
      
      return () => {
        window.removeEventListener('launchOnboarding', handleLaunchOnboarding)
      }
    }
  }, [])
  
  console.log('Dashboard state:', {
    hasUser: !!user,
    userEmail: user?.email,
    userId: user?.id,
    hasProfile: !!profile,
    profileEmail: profile?.email,
    profileOnboarding: profile?.onboarding_completed,
    loading,
    loadingTimeout
  })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')
  }, [])

  // Add timeout for loading state to prevent infinite loading
  useEffect(() => {
    // Start timeout as soon as we have a user, regardless of loading state
    if (user && !profile && loading) {
      console.log('Starting profile loading timeout...')
      const timeout = setTimeout(() => {
        console.log('Profile loading timeout reached, proceeding with fallback')
        setLoadingTimeout(true)
      }, 5000) // Increased to 5 seconds to give profile time to load

      return () => clearTimeout(timeout)
    }
    // Reset timeout if profile loads
    if (profile) {
      setLoadingTimeout(false)
    }
  }, [user, profile, loading])
  
  useEffect(() => {
    console.log('Dashboard checking onboarding status...', {
      hasProfile: !!profile,
      profile: profile,
      onboarding: profile?.onboarding_completed,
      loading: loading
    })
    
    // Only redirect if we have a profile and onboarding is explicitly false
    // Don't redirect if profile is still loading
    if (!loading && profile && profile.onboarding_completed === false) {
      console.log('Onboarding incomplete, will show onboarding in dashboard')
      // No redirect - dashboard will show onboarding
    } else if (!loading && !profile && user) {
      console.log('User exists but no profile, may need to create one')
    }
  }, [profile, router, loading, user])


  // Development bypass - if bypass mode, create mock data
  const isBypass = typeof window !== 'undefined' && 
    (window.location.search.includes('bypass=true') || 
     localStorage.getItem('dev_bypass') === 'true')
  
  // Try to get actual user data from session storage
  let sessionUser = null
  if (typeof window !== 'undefined') {
    const sessionData = localStorage.getItem('user_session')
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData)
        sessionUser = session.user
      } catch (err) {
        console.log('Could not parse user session')
      }
    }
  }
  
  // Create mock user and profile for bypass mode, using real data if available
  const mockUser = isBypass ? {
    id: sessionUser?.id || 'bbb243c4-cc7d-4458-af03-3bfff742aee5',
    email: sessionUser?.email || 'dev@bookedbarber.com',
    user_metadata: { 
      full_name: sessionUser?.name || 'Dev User',
      avatar_url: sessionUser?.avatar
    }
  } : null
  
  const mockProfile = isBypass ? {
    id: sessionUser?.id || 'bbb243c4-cc7d-4458-af03-3bfff742aee5',
    email: sessionUser?.email || 'dev@bookedbarber.com',
    full_name: sessionUser?.name || 'Dev User',
    shop_name: 'Tomb45 Barbershop',
    role: 'SHOP_OWNER',
    onboarding_completed: false  // Changed to false to show onboarding
  } : null
  
  // Use mock data in bypass mode, real data otherwise
  let effectiveUser = isBypass ? mockUser : user
  let effectiveProfile = isBypass ? mockProfile : profile
  
  // Show loading state while auth is initializing
  // Once we have user or timeout, proceed with dashboard
  // Skip loading if in bypass mode
  if (!isBypass && !user && loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }
  
  // If bypass mode is enabled, always use mock data to avoid auth issues
  if (isBypass) {
    effectiveUser = mockUser || {
      id: 'bbb243c4-cc7d-4458-af03-3bfff742aee5',
      email: 'dev@bookedbarber.com',
      user_metadata: { full_name: 'Dev User' }
    }
    effectiveProfile = mockProfile || {
      id: 'bbb243c4-cc7d-4458-af03-3bfff742aee5',
      email: 'dev@bookedbarber.com',
      full_name: 'Dev User',
      shop_name: 'Tomb45 Barbershop',
      role: 'SHOP_OWNER',
      onboarding_completed: false
    }
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
      onboarding_completed: false  // Set to false so onboarding shows
    },
    barbershop_id: '8d5728b2-24ca-4d18-8823-0ed926e8913d' // Known barbershop ID
  } : null

  return (
    <div>
      {/* Show timeout warning if profile failed to load and we're using fallback */}
      {loadingTimeout && !profile && !loading && user && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Profile data couldn't be loaded, using fallback data. Dashboard functionality may be limited.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Show setup reminder banner if onboarding is incomplete */}
      {effectiveProfile && !effectiveProfile.onboarding_completed && !forceShowOnboarding && (
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg p-4 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Complete Your Setup</h3>
                <p className="text-sm text-brand-100">Finish setting up your account to unlock all features</p>
              </div>
            </div>
            <button
              onClick={() => setForceShowOnboarding(true)}
              className="bg-white text-brand-600 px-4 py-2 rounded-lg font-medium hover:bg-brand-50 transition-colors"
            >
              Resume Setup
            </button>
          </div>
        </div>
      )}
      
      {/* Unified Dashboard Component - Pass effective user (mock, real, or fallback) */}
      <UnifiedDashboard user={effectiveUser || fallbackUser || mockUser} profile={profile} />
      
      {/* Floating Resume Button - Shows when onboarding was skipped */}
      <OnboardingResumeButton 
        profile={effectiveProfile}
        onClick={() => setForceShowOnboarding(true)}
      />
      
      {/* Show onboarding overlay if profile exists and onboarding is not complete */}
      {/* Also show if we're using fallback data and onboarding isn't complete */}
      {/* Or if user clicked Resume Setup */}
      {(((effectiveProfile && effectiveProfile.onboarding_completed === false) || 
        (fallbackUser && fallbackUser.profile && fallbackUser.profile.onboarding_completed === false)) || forceShowOnboarding) && (
        <DashboardOnboarding 
          user={effectiveUser}
          profile={effectiveProfile || (fallbackUser && fallbackUser.profile)}
          updateProfile={updateProfile}
          forceShow={forceShowOnboarding}
          onComplete={() => {
            setForceShowOnboarding(false)
            // Refresh the page to update the dashboard after onboarding
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}