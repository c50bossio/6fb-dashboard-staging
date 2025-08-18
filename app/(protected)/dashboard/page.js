'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import DashboardOnboarding from '../../../components/dashboard/DashboardOnboarding'
// import OnboardingResumeButton from '../../../components/dashboard/OnboardingResumeButton' // Removed to avoid duplicate UI
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


  // Use real Supabase authentication only - no bypass allowed
  const effectiveUser = user
  const effectiveProfile = profile
  
  // Show loading state while auth is initializing
  // Require real authentication - no bypass allowed
  if (!user && loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }
  
  // Redirect to login if no authenticated user
  if (!user && !loading) {
    router.push('/login')
    return null
  }
  
  // If profile failed to load after timeout, we need to handle this properly
  // Instead of using mock data, we should create a real profile in Supabase
  const needsProfileCreation = user && !profile && loadingTimeout

  return (
    <div>
      {/* Show warning if profile needs to be created */}
      {needsProfileCreation && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Your profile needs to be set up. Please complete the onboarding process to continue.
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
      
      {/* Unified Dashboard Component - Pass only real authenticated user */}
      {effectiveUser && <UnifiedDashboard user={effectiveUser} profile={effectiveProfile} />}
      
      {/* Floating button removed - using top banner instead for cleaner UI */}
      
      {/* Show onboarding overlay if profile exists and onboarding is not complete */}
      {/* Or if user clicked Resume Setup, or if profile needs creation */}
      {((effectiveProfile && effectiveProfile.onboarding_completed === false) || 
        forceShowOnboarding || needsProfileCreation) && (
        <DashboardOnboarding 
          user={effectiveUser}
          profile={effectiveProfile}
          updateProfile={updateProfile}
          forceShow={forceShowOnboarding || needsProfileCreation}
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