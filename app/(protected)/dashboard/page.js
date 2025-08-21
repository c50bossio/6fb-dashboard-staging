'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import DashboardErrorBoundary from '../../../components/dashboard/DashboardErrorBoundary'
import DashboardOnboarding from '../../../components/dashboard/DashboardOnboarding'
// import OnboardingResumeButton from '../../../components/dashboard/OnboardingResumeButton' // Removed to avoid duplicate UI
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  console.log('BarbershopDashboard component loading...')
  
  const { user, profile, loading, updateProfile } = useAuth()
  const router = useRouter()
  const [timeOfDay, setTimeOfDay] = useState('')
  
  // State for forcing onboarding display
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false)
  
  // State for setup completion celebration
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false)
  
  // Check URL parameters for forcing onboarding display (for demos/pitches)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const showOnboardingParam = urlParams.get('onboarding') === 'true'
      const showOnboardingNewParam = urlParams.get('show_onboarding') === 'true'
      const forceShowParam = urlParams.get('force_show') === 'true'
      
      if (showOnboardingParam || showOnboardingNewParam || forceShowParam) {
        console.log('URL parameter detected: forcing onboarding to show', {
          onboarding: showOnboardingParam,
          show_onboarding: showOnboardingNewParam,
          force_show: forceShowParam
        })
        setForceShowOnboarding(true)
      }
    }
  }, [])
  
  // Auto-clear logic moved to render cycle to prevent timing race condition
  
  // Enhanced event listener for Launch Onboarding button with debugging and fallbacks
  useEffect(() => {
    const handleLaunchOnboarding = (event) => {
      console.log('🎯 Launch onboarding event received:', {
        detail: event.detail,
        timestamp: new Date().toISOString(),
        currentState: forceShowOnboarding
      })
      
      setForceShowOnboarding(true)
      
      // Clear any existing URL parameters that might interfere
      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location)
        currentUrl.searchParams.delete('onboarding')
        currentUrl.searchParams.delete('show_onboarding')
        currentUrl.searchParams.delete('force_show')
        window.history.replaceState({}, '', currentUrl.toString())
      }
      
      // Confirm the event was processed successfully
      console.log('✅ Onboarding launch event processed successfully')
    }

    const handleShowOnboarding = (event) => {
      console.log('🎯 Show onboarding event received:', {
        detail: event.detail,
        timestamp: new Date().toISOString(),
        currentState: forceShowOnboarding
      })
      
      setForceShowOnboarding(true)
      
      // Clear any existing URL parameters that might interfere
      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location)
        currentUrl.searchParams.delete('onboarding')
        currentUrl.searchParams.delete('show_onboarding')
        currentUrl.searchParams.delete('force_show')
        window.history.replaceState({}, '', currentUrl.toString())
      }
      
      // Confirm the event was processed successfully
      console.log('✅ Show onboarding event processed successfully')
    }

    // Enhanced error handling for event listener setup
    if (typeof window !== 'undefined') {
      try {
        // Listen for the primary events
        window.addEventListener('launchOnboarding', handleLaunchOnboarding, { 
          passive: false,
          capture: true // Ensure we catch the event during capture phase
        })
        window.addEventListener('showOnboarding', handleShowOnboarding, { 
          passive: false,
          capture: true
        })
        
        // Also listen on document in case window events don't work
        document.addEventListener('launchOnboarding', handleLaunchOnboarding, {
          passive: false,
          capture: true
        })
        document.addEventListener('showOnboarding', handleShowOnboarding, {
          passive: false,
          capture: true
        })
        
        console.log('📡 Enhanced onboarding event listeners registered (launchOnboarding + showOnboarding)')
        
        return () => {
          try {
            window.removeEventListener('launchOnboarding', handleLaunchOnboarding, { capture: true })
            window.removeEventListener('showOnboarding', handleShowOnboarding, { capture: true })
            document.removeEventListener('launchOnboarding', handleLaunchOnboarding, { capture: true })
            document.removeEventListener('showOnboarding', handleShowOnboarding, { capture: true })
            console.log('🧹 Onboarding event listeners cleaned up')
          } catch (error) {
            console.warn('⚠️ Error cleaning up onboarding event listeners:', error)
          }
        }
      } catch (error) {
        console.error('❌ Error setting up onboarding event listeners:', error)
      }
    }
  }, [forceShowOnboarding])
  
  console.log('Dashboard state:', {
    hasUser: !!user,
    userEmail: user?.email,
    userId: user?.id,
    hasProfile: !!profile,
    profileEmail: profile?.email,
    profileOnboarding: profile?.onboarding_completed,
    loading
  })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')
  }, [])

  // Remove timeout logic - let auth provider handle loading state properly
  
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
  if (loading) {
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
  
  // Check if profile needs creation
  const needsProfileCreation = user && !profile

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
      
      {/* Show setup reminder banner if onboarding is incomplete or skipped */}
      {effectiveProfile && !effectiveProfile.onboarding_completed && 
       !forceShowOnboarding && 
       (effectiveProfile.onboarding_status === 'skipped' || effectiveProfile.onboarding_status === 'minimized' || !effectiveProfile.onboarding_status) && (
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
              onClick={async () => {
                console.log('Resume Setup clicked - setting forceShowOnboarding to true')
                setForceShowOnboarding(true)
                
                // Update profile status to active when manually resuming (moved from useEffect)
                if (effectiveProfile?.onboarding_status === 'skipped' || effectiveProfile?.onboarding_status === 'minimized') {
                  try {
                    await updateProfile({ onboarding_status: 'active' })
                    console.log('Profile updated to active status')
                  } catch (error) {
                    console.warn('Profile update failed (non-critical):', error)
                  }
                }
              }}
              className="bg-white dark:bg-dark-bg-elevated-1 text-brand-600 px-4 py-2 rounded-lg font-medium hover:bg-brand-50 transition-colors"
            >
              Resume Setup
            </button>
          </div>
        </div>
      )}
      
      {/* Unified Dashboard Component - Pass only real authenticated user */}
      {effectiveUser && (
        <DashboardErrorBoundary>
          <UnifiedDashboard user={effectiveUser} profile={effectiveProfile} />
        </DashboardErrorBoundary>
      )}
      
      {/* Floating button removed - using top banner instead for cleaner UI */}
      
      {/* Show onboarding overlay if profile exists and onboarding is not complete */}
      {/* Or if user clicked Resume Setup, or if profile needs creation */}
      {(() => {
        // Synchronous auto-clear: only force show if onboarding is NOT completed
        const shouldForceShow = forceShowOnboarding && effectiveProfile?.onboarding_completed !== true
        const isExplicitlyIncomplete = effectiveProfile && effectiveProfile.onboarding_completed === false
        const shouldShowOnboarding = isExplicitlyIncomplete || shouldForceShow || needsProfileCreation;
        
        console.log('Onboarding render check:', {
          shouldShow: shouldShowOnboarding,
          forceShowOnboarding,
          shouldForceShow,
          needsProfileCreation,
          onboarding_completed: effectiveProfile?.onboarding_completed,
          onboarding_status: effectiveProfile?.onboarding_status,
          isExplicitlyIncomplete
        });
        
        return shouldShowOnboarding ? (
          <DashboardOnboarding 
            user={effectiveUser}
            profile={effectiveProfile}
            updateProfile={updateProfile}
            forceShow={shouldForceShow || needsProfileCreation}
            onComplete={() => {
              console.log('Onboarding complete callback triggered')
              setForceShowOnboarding(false)
              // Show success celebration before refreshing
              setShowSuccessCelebration(true)
              
              // Delay the page refresh to show celebration
              setTimeout(() => {
                window.location.reload()
              }, 3000) // Show celebration for 3 seconds
            }}
          />
        ) : null;
      })()}
      
      {/* Success Celebration Overlay */}
      {showSuccessCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl border border-gray-200 dark:border-dark-bg-elevated-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <SparklesIcon className="h-16 w-16 text-green-500 animate-bounce" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-3">
              🎉 Setup Complete!
            </h2>
            
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
              Congratulations! Your account is now fully configured and ready to go.
            </p>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                What you've unlocked:
              </h3>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>✨ Full dashboard access</li>
                <li>📊 Real-time business analytics</li>
                <li>🤖 AI-powered insights</li>
                <li>📅 Advanced booking management</li>
              </ul>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-dark-text-muted">
              Refreshing your dashboard in a moment...
            </div>
            
            <div className="mt-4 w-full bg-gray-200 dark:bg-dark-bg-elevated-6 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full animate-pulse" style={{
                animation: 'loading 3s linear forwards',
                width: '0%'
              }}></div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes loading {
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}