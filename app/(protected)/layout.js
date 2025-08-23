'use client'

import { useState, useEffect } from 'react'
import DashboardHeader from '../../components/dashboard/DashboardHeader'
import DashboardOnboarding from '../../components/dashboard/DashboardOnboarding'
import TestOnboardingModal from '../../components/TestOnboardingModal'
import FloatingAIChat from '../../components/FloatingAIChat'
import Navigation from '../../components/Navigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { NavigationProvider, useNavigation } from '../../contexts/NavigationContext'
import { TenantProvider } from '../../contexts/TenantContext'
import { GlobalDashboardProvider } from '../../contexts/GlobalDashboardContext'
import { useAuth } from '../../components/SupabaseAuthProvider'
// import { Toaster } from 'react-hot-toast'

function ProtectedLayoutContent({ children }) {
  const { isCollapsed } = useNavigation()
  const { user, profile } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Debug logging
  useEffect(() => {
    console.log('🔧 DEBUG: ProtectedLayoutContent mounted', {
      showOnboarding,
      hasUser: !!user,
      hasProfile: !!profile,
      userEmail: user?.email,
      profileRole: profile?.role
    })
  }, [showOnboarding, user, profile])
  
  // Listen for launch onboarding event from profile dropdown - available on ALL pages
  useEffect(() => {
    const handleLaunchOnboarding = (event) => {
      console.log('🚀 Launching onboarding from profile dropdown (global handler)', {
        detail: event.detail,
        showOnboarding
      })
      setShowOnboarding(true)
      // Let DashboardOnboarding handle its own progress loading
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
      
      
      {/* Onboarding Modal - Shows when triggered */}
      {showOnboarding && (
        <DashboardOnboarding 
          user={user}
          profile={profile}
          useQuickFlow={true}
          onComplete={() => {
            console.log('✅ Onboarding completed')
            setShowOnboarding(false)
            // Refresh to update profile state
            window.location.reload()
          }}
          onSkip={() => {
            console.log('⏭️ Onboarding skipped')
            setShowOnboarding(false)
          }}
        />
      )}
      
      {/* <TestOnboardingModal /> */}
      
      {/* Toast notifications for the entire app */}
      {/* <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      /> */}
    </div>
  )
}

export default function ProtectedLayout({ children }) {
  return (
    <TenantProvider>
      <ProtectedRoute>
        <NavigationProvider>
          <GlobalDashboardProvider>
            <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
          </GlobalDashboardProvider>
        </NavigationProvider>
      </ProtectedRoute>
    </TenantProvider>
  )
}