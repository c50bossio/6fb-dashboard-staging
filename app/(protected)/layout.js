'use client'

import { useState, useEffect } from 'react'
import DashboardHeader from '../../components/dashboard/DashboardHeader'
import DashboardOnboarding from '../../components/dashboard/DashboardOnboarding'
import FloatingAIChat from '../../components/FloatingAIChat'
import Navigation from '../../components/Navigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { NavigationProvider, useNavigation } from '../../contexts/NavigationContext'
import { TenantProvider } from '../../contexts/TenantContext'
import { useAuth } from '../../components/SupabaseAuthProvider'

function ProtectedLayoutContent({ children }) {
  const { isCollapsed } = useNavigation()
  const { user, profile } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  
  // Listen for launch onboarding event from profile dropdown - available on ALL pages
  useEffect(() => {
    const handleLaunchOnboarding = (event) => {
      console.log('🚀 Launching onboarding from profile dropdown (global handler)', {
        detail: event.detail,
        currentStep,
        showOnboarding
      })
      setShowOnboarding(true)
      setCurrentStep(0) // Always start from beginning
    }
    
    // Add listener immediately
    window.addEventListener('launchOnboarding', handleLaunchOnboarding)
    
    // Also check if event was dispatched before component mounted
    // This handles race conditions where the button is clicked very quickly
    const checkPendingEvent = () => {
      if (window.__pendingOnboardingLaunch) {
        console.log('📌 Found pending onboarding launch event')
        handleLaunchOnboarding({ detail: { forced: true } })
        delete window.__pendingOnboardingLaunch
      }
    }
    
    // Check immediately and after a short delay
    checkPendingEvent()
    const timeoutId = setTimeout(checkPendingEvent, 100)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('launchOnboarding', handleLaunchOnboarding)
    }
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Responsive Navigation - handles both mobile and desktop */}
      <Navigation />
      
      {/* Main Content - Adjust margin based on sidebar collapse state */}
      <main className={`${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} transition-all duration-300 ease-in-out`}>
        <DashboardHeader />
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
      {/* Floating AI Chat - Hidden on mobile for better UX */}
      <div className="hidden lg:block">
        <FloatingAIChat />
      </div>
      
      {/* Global Onboarding Modal - Available on all protected pages */}
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

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        <NavigationProvider>
          <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
        </NavigationProvider>
      </ProtectedRoute>
    </TenantProvider>
  )
}