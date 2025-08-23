'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../SupabaseAuthProvider'
import EverboardingSystem, { useEverboardingTracking } from './EverboardingSystem'

const EverboardingContext = createContext({})

export function useEverboarding() {
  return useContext(EverboardingContext)
}

export default function EverboardingProvider({ children }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [currentPage, setCurrentPage] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)
  const userBehavior = useEverboardingTracking()

  // Track current page for contextual feature discovery
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPage(window.location.pathname)
      
      // Listen for route changes
      const handleRouteChange = () => {
        setCurrentPage(window.location.pathname)
      }
      
      window.addEventListener('popstate', handleRouteChange)
      return () => window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // Check if user should see everboarding
  const shouldShowEverboarding = () => {
    // Don't show during initial onboarding
    if (!profile?.onboarding_completed) return false
    
    // Don't show if user has explicitly disabled it
    if (!isEnabled) return false
    
    // Don't show on certain pages
    const excludedPages = ['/dashboard/onboarding', '/profile', '/auth']
    if (excludedPages.some(page => currentPage.includes(page))) return false
    
    return true
  }

  // Feature discovery handler
  const handleFeatureDiscovered = (featureId) => {
    console.log('🎯 Feature discovered:', featureId)
    
    // Track feature discovery analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'feature_discovered', {
        feature_id: featureId,
        user_level: profile?.subscription_tier || 'free'
      })
    }
  }

  // Feature completion handler
  const handleFeatureCompleted = (featureId) => {
    console.log('✅ Feature completed:', featureId)
    
    // Track feature completion analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'feature_completed', {
        feature_id: featureId,
        user_level: profile?.subscription_tier || 'free'
      })
    }
  }

  // Toggle everboarding
  const toggleEverboarding = () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    localStorage.setItem('everboarding_enabled', newState.toString())
  }

  // Load everboarding preference
  useEffect(() => {
    const saved = localStorage.getItem('everboarding_enabled')
    if (saved !== null) {
      setIsEnabled(saved === 'true')
    }
  }, [])

  const contextValue = {
    isEnabled,
    toggleEverboarding,
    currentPage,
    userBehavior
  }

  return (
    <EverboardingContext.Provider value={contextValue}>
      {children}
      
      {/* Render everboarding system */}
      {shouldShowEverboarding() && (
        <EverboardingSystem
          user={user}
          profile={profile}
          currentPage={currentPage}
          userBehavior={userBehavior}
          onFeatureDiscovered={handleFeatureDiscovered}
          onFeatureCompleted={handleFeatureCompleted}
        />
      )}
    </EverboardingContext.Provider>
  )
}

// Simple wrapper component for pages that want to customize everboarding behavior
export function EverboardingWrapper({ 
  children, 
  pageContext = {},
  customBehavior = {},
  disabled = false 
}) {
  const { isEnabled } = useEverboarding()
  
  return (
    <div className="relative">
      {children}
      {!disabled && isEnabled && (
        <EverboardingSystem
          currentPage={window?.location?.pathname}
          userBehavior={customBehavior}
          pageContext={pageContext}
        />
      )}
    </div>
  )
}

// Utility hook for manually triggering everboarding prompts
export function useEverboardingTrigger() {
  const triggerFeatureDiscovery = (featureId, customPrompt) => {
    // Manually show a specific feature discovery prompt
    const event = new CustomEvent('everboarding:trigger', {
      detail: { featureId, customPrompt }
    })
    window.dispatchEvent(event)
  }

  const triggerMilestone = (milestoneId, customCelebration) => {
    // Manually trigger a milestone celebration
    const event = new CustomEvent('everboarding:milestone', {
      detail: { milestoneId, customCelebration }
    })
    window.dispatchEvent(event)
  }

  return { triggerFeatureDiscovery, triggerMilestone }
}

// Settings component for everboarding preferences
export function EverboardingSettings() {
  const { isEnabled, toggleEverboarding } = useEverboarding()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Feature Discovery
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Get contextual suggestions for new features and celebrate your progress as you use the platform.
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleEverboarding}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
        
        <div className="ml-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
            <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>
      </div>
      
      {isEnabled && (
        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800">
            💡 <strong>Smart Discovery:</strong> We'll show you helpful features at the perfect moment based on how you use the platform.
          </p>
        </div>
      )}
    </div>
  )
}