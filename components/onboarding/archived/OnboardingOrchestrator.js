'use client'

/**
 * Onboarding Orchestrator
 * Routes users to appropriate onboarding flow based on subscription tier and role
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import DashboardOnboarding from '../dashboard/DashboardOnboarding'

// Tier detection and flow routing
const determineOnboardingFlow = (profile) => {
  if (!profile) {
    return 'loading'
  }
  
  const { subscription_tier, role } = profile
  
  // Enterprise users (including SUPER_ADMIN) get enterprise features
  if (subscription_tier === 'enterprise' || role === 'ENTERPRISE_OWNER' || role === 'SUPER_ADMIN') {
    return 'enterprise'
  }
  
  // Shop owners get comprehensive flow
  if (subscription_tier === 'shop_owner' || role === 'SHOP_OWNER') {
    return 'shop_owner'
  }
  
  // Individual barbers get simplified flow
  if (subscription_tier === 'individual' || role === 'BARBER') {
    return 'individual'
  }
  
  // Default to shop owner flow for unknown cases
  return 'shop_owner'
}

// Flow configuration for each tier
const getFlowConfig = (flowType) => {
  const configs = {
    individual: {
      title: 'Welcome to BookedBarber',
      subtitle: 'Set up your personal booking system',
      steps: 4,
      features: ['Personal booking page', 'Service management', 'Payment setup', 'Client tracking']
    },
    shop_owner: {
      title: 'Welcome to BookedBarber',
      subtitle: 'Set up your barbershop management system', 
      steps: 8,
      features: ['Business setup', 'Staff management', 'Advanced payments', 'Customer intelligence']
    },
    enterprise: {
      title: 'Welcome to BookedBarber Enterprise',
      subtitle: 'Set up your multi-location business system',
      steps: 5,
      features: ['Organization setup', 'Multi-location management', 'Enterprise payments', 'Advanced analytics']
    }
  }
  
  return configs[flowType] || configs.shop_owner
}

export default function OnboardingOrchestrator({ onComplete, onSkip, isCompleting = false }) {
  const { user, profile, loading: authLoading } = useAuth()
  const [onboardingFlow, setOnboardingFlow] = useState('loading')
  const [flowConfig, setFlowConfig] = useState(null)

  useEffect(() => {
    if (!authLoading && profile) {
      const flow = determineOnboardingFlow(profile)
      const config = getFlowConfig(flow)
      
      setOnboardingFlow(flow)
      setFlowConfig(config)
      
      console.log('🎯 Onboarding Orchestrator: Detected flow', {
        email: user?.email,
        role: profile.role,
        subscriptionTier: profile.subscription_tier,
        selectedFlow: flow,
        config
      })
    }
  }, [authLoading, profile, user])

  // Show loading while determining flow
  if (authLoading || onboardingFlow === 'loading' || !flowConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-olive-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Preparing Your Setup...</h2>
          <p className="text-gray-600">Detecting your business tier and customizing your experience</p>
        </div>
      </div>
    )
  }

  // Enterprise users get enhanced onboarding experience but same flow as shop owners
  // The power comes from post-onboarding features (location selector, enterprise dashboard)
  const enhancedOnComplete = (onboardingData) => {
    console.log(`✅ ${flowConfig.title} onboarding completed:`, onboardingData)
    
    // Call the original completion handler
    if (onComplete) {
      onComplete(onboardingData)
    }
    
    // Log enterprise-specific completion for analytics
    if (onboardingFlow === 'enterprise') {
      console.log('🏢 Enterprise onboarding completed - user will have access to:')
      console.log('   - Multi-location management')
      console.log('   - Global context selector')
      console.log('   - Add Location functionality')
      console.log('   - Enterprise dashboard')
      console.log('   - Advanced analytics')
    }
  }

  // Show completion loading overlay
  if (isCompleting) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Activating Enterprise Features</h2>
          <p className="text-gray-600 mb-4">
            Your onboarding is complete! We're setting up your multi-location management dashboard...
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              Preparing enterprise dashboard
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 to-amber-50">
      {/* Enhanced header for enterprise users */}
      {onboardingFlow === 'enterprise' && (
        <div className="bg-green-600 text-white py-2 px-4 text-center text-sm font-medium">
          🏢 Enterprise Account • Multi-Location Management Available After Setup
        </div>
      )}
      
      {/* Use existing DashboardOnboarding with enhanced completion */}
      <DashboardOnboarding
        user={user}
        profile={{
          ...profile,
          // Pass flow info to onboarding component
          _onboardingFlow: onboardingFlow,
          _flowConfig: flowConfig
        }}
        onComplete={enhancedOnComplete}
        onSkip={onSkip}
        useQuickFlow={onboardingFlow === 'individual'}
      />
    </div>
  )
}

// Export the flow detection logic for use elsewhere
export { determineOnboardingFlow, getFlowConfig }