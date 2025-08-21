'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import DashboardErrorBoundary from '../../../components/dashboard/DashboardErrorBoundary'
import DashboardOnboarding from '../../../components/dashboard/DashboardOnboarding'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import { useOnboarding } from '../../../hooks/useOnboarding'

export default function BarbershopDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const {
    showOnboarding,
    needsOnboarding,
    isOnboardingComplete,
    startOnboarding,
    hideOnboarding,
    completeOnboarding,
    updateStep,
    currentStep
  } = useOnboarding()
  
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false)
  
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
      {/* Show setup reminder only if onboarding is incomplete and not currently showing */}
      {needsOnboarding && !showOnboarding && !isOnboardingComplete && (
        <div className="max-w-7xl mx-auto px-4 mb-6 pt-4">
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg p-4 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Complete Your Setup</h3>
                <p className="text-sm text-brand-100">Finish setting up your account to unlock all features</p>
              </div>
            </div>
            <button
              onClick={startOnboarding}
              className="bg-white dark:bg-dark-bg-elevated-1 text-brand-600 px-4 py-2 rounded-lg font-medium hover:bg-brand-50 transition-colors"
            >
              Resume Setup
            </button>
          </div>
        </div>
      )}
      
      {/* Main Dashboard */}
      {user && (
        <DashboardErrorBoundary>
          <UnifiedDashboard user={user} profile={profile} />
        </DashboardErrorBoundary>
      )}
      
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <DashboardOnboarding 
          user={user}
          profile={profile}
          currentStep={currentStep}
          onStepChange={updateStep}
          onComplete={() => {
            setShowSuccessCelebration(true)
            completeOnboarding()
          }}
          onSkip={() => hideOnboarding('skipped')}
          onMinimize={() => hideOnboarding('minimized')}
        />
      )}
      
      {/* Success Celebration */}
      {showSuccessCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="flex justify-center mb-6">
              <SparklesIcon className="h-16 w-16 text-green-500 animate-bounce" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-3">
              🎉 Setup Complete!
            </h2>
            
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
              Your account is now fully configured. Refreshing dashboard...
            </p>
            
            <div className="mt-4 w-full bg-gray-200 dark:bg-dark-bg-elevated-6 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full animate-[loading_1s_linear_forwards]"></div>
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