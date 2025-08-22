'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import DashboardErrorBoundary from '../../../components/dashboard/DashboardErrorBoundary'
import DashboardOnboarding from '../../../components/dashboard/DashboardOnboarding'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  
  // Listen for launch onboarding event from profile dropdown ONLY
  useEffect(() => {
    const handleLaunchOnboarding = (event) => {
      console.log('🚀 Launching onboarding from profile dropdown')
      setShowOnboarding(true)
      setCurrentStep(0) // Always start from beginning
    }
    
    window.addEventListener('launchOnboarding', handleLaunchOnboarding)
    
    return () => {
      window.removeEventListener('launchOnboarding', handleLaunchOnboarding)
    }
  }, [])
  
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
      {/* Main Dashboard - No onboarding buttons or reminders */}
      {user && (
        <DashboardErrorBoundary>
          <UnifiedDashboard user={user} profile={profile} />
        </DashboardErrorBoundary>
      )}
      
      {/* Onboarding Modal - Only shows when triggered from dropdown */}
      {showOnboarding && (
        <DashboardOnboarding 
          user={user}
          profile={profile}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onComplete={() => {
            console.log('✅ Onboarding completed')
            setShowOnboarding(false)
            setCurrentStep(0)
          }}
          onSkip={() => {
            console.log('⏭️ Onboarding skipped')
            setShowOnboarding(false)
            setCurrentStep(0)
          }}
          onMinimize={() => {
            console.log('➖ Onboarding minimized')
            setShowOnboarding(false)
            setCurrentStep(0)
          }}
        />
      )}
    </div>
  )
}