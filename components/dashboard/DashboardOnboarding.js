'use client'

import { 
  XMarkIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  UserIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PaintBrushIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'

// Import existing onboarding components
import internalAnalytics from '@/lib/internal-analytics'
import BookingRulesSetup from '../onboarding/BookingRulesSetup'
import BusinessInfoSetup from '../onboarding/BusinessInfoSetup'
import DomainSelector from '../onboarding/DomainSelector'
import FinancialSetup from '../onboarding/FinancialSetup'
import FinancialSetupEnhanced from '../onboarding/FinancialSetupEnhanced'
import GoalsSelector from '../onboarding/GoalsSelector'
import LivePreview from '../onboarding/LivePreview'

// Import new onboarding components

// Import professional illustrations
import { WelcomeIllustration, ProgressRing } from '../onboarding/OnboardingIllustrations'
import RoleSelector from '../onboarding/RoleSelector'
import ScheduleSetup from '../onboarding/ScheduleSetup'
import ServiceSetup from '../onboarding/ServiceSetup'
import StaffSetup from '../onboarding/StaffSetup'

// Import analytics

export default function DashboardOnboarding({ 
  user, 
  profile, 
  currentStep: initialStep = 0,
  onStepChange,
  onComplete, 
  onSkip,
  onMinimize 
}) {
  // Use controlled step from parent
  const currentStep = initialStep
  const setCurrentStep = (step) => {
    if (onStepChange) {
      onStepChange(step)
    }
  }
  const [isMinimized, setIsMinimized] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const autoSaveInterval = useRef(null)
  const completedSteps = useRef(new Set())
  const skippedSteps = useRef(new Set())
  
  const [onboardingData, setOnboardingData] = useState({
    role: profile?.role || 'SHOP_OWNER',
    businessName: profile?.shop_name || '',
    businessAddress: '',
    businessPhone: '',
    businessType: 'barbershop',
    businessHours: null,
    services: [],
    staff: [],
    paymentMethods: [],
    bookingRules: {},
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      logoUrl: '',
      bio: ''
    },
    completedSteps: []
  })

  // Component is only rendered when it should be shown,
  // so we can simplify initialization
  useEffect(() => {
    // Track onboarding start
    if (typeof window !== 'undefined') {
      internalAnalytics.track('onboarding_started', {
        userId: user?.id,
        step: currentStep,
        role: profile?.role || 'SHOP_OWNER'
      })
    }

    // Cleanup on unmount
    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current)
      }
    }
  }, [])

  // Define steps based on user role
  const getStepsForRole = (role) => {
    const baseSteps = {
      BARBER: [
        { id: 'profile', title: 'Personal Profile', icon: UserIcon, description: 'Set up your professional profile' },
        { id: 'services', title: 'Services & Pricing', icon: CurrencyDollarIcon, description: 'Define your services and rates' },
        { id: 'schedule', title: 'Availability', icon: CalendarDaysIcon, description: 'Set your working hours' },
        { id: 'financial', title: 'Payment Setup', icon: CurrencyDollarIcon, description: 'Configure payment options' },
        { id: 'booking', title: 'Booking Rules', icon: DocumentCheckIcon, description: 'Set booking policies' },
        { id: 'branding', title: 'Booking Page', icon: PaintBrushIcon, description: 'Customize your booking page' }
      ],
      SHOP_OWNER: [
        { id: 'business', title: 'Business Info', icon: BuildingOfficeIcon, description: 'Basic business details' },
        { id: 'schedule', title: 'Business Hours', icon: CalendarDaysIcon, description: 'Set operating hours' },
        { id: 'services', title: 'Services Catalog', icon: CurrencyDollarIcon, description: 'Define services and pricing' },
        { id: 'staff', title: 'Staff Setup', icon: UserGroupIcon, description: 'Add your barbers' },
        { id: 'financial', title: 'Payment Processing', icon: CurrencyDollarIcon, description: 'Configure payments' },
        { id: 'booking', title: 'Booking Rules', icon: DocumentCheckIcon, description: 'Set booking policies' },
        { id: 'branding', title: 'Branding', icon: PaintBrushIcon, description: 'Customize appearance' }
      ],
      ENTERPRISE_OWNER: [
        { id: 'business', title: 'Organization Setup', icon: BuildingOfficeIcon, description: 'Configure your enterprise' },
        { id: 'schedule', title: 'Operating Hours', icon: CalendarDaysIcon, description: 'Set default hours for locations' },
        { id: 'services', title: 'Master Services', icon: CurrencyDollarIcon, description: 'Define service catalog' },
        { id: 'staff', title: 'Staff Hierarchy', icon: UserGroupIcon, description: 'Set up management structure' },
        { id: 'financial', title: 'Financial Config', icon: CurrencyDollarIcon, description: 'Payment & commission settings' },
        { id: 'booking', title: 'Booking Policies', icon: DocumentCheckIcon, description: 'Set enterprise policies' },
        { id: 'branding', title: 'Brand Guidelines', icon: PaintBrushIcon, description: 'Set brand standards' }
      ]
    }

    return baseSteps[role] || baseSteps.SHOP_OWNER
  }

  const steps = getStepsForRole(profile?.role || 'SHOP_OWNER')
  const progress = Math.round((currentStep / steps.length) * 100)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Track step completion
      const currentStepData = steps[currentStep]
      completedSteps.current.add(currentStepData.id)
      
      internalAnalytics.onboarding.stepCompleted(
        currentStepData.id,
        onboardingData,
        currentStep,
        steps.length
      )
      
      // Move to next step
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      
      // Track next step view
      const nextStepData = steps[nextStep]
      internalAnalytics.onboarding.stepViewed(
        nextStepData.id,
        nextStep,
        steps.length
      )
      
      saveProgress()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      
      // Track navigation back
      const prevStepData = steps[prevStep]
      internalAnalytics.onboarding.stepViewed(
        prevStepData.id,
        prevStep,
        steps.length
      )
    }
  }

  const handleSkip = () => {
    // Track skip
    if (typeof window !== 'undefined') {
      internalAnalytics.track('onboarding_skipped', {
        userId: user?.id,
        step: currentStep
      })
    }
    
    // Call parent's skip handler
    if (onSkip) {
      onSkip()
    }
  }

  const handleComplete = async () => {
    try {
      setIsSaving(true)
      
      // Mark last step as completed
      const lastStepData = steps[steps.length - 1]
      completedSteps.current.add(lastStepData.id)
      
      // Track completion
      internalAnalytics.onboarding.completed(
        steps.length,
        completedSteps.current.size,
        skippedSteps.current.size
      )
      
      // Update profile to mark onboarding as complete
      await updateProfile({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_data: JSON.stringify(onboardingData),
        onboarding_progress_percentage: 100,
        onboarding_status: 'completed'
      })
      
      // Save to API
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedSteps: Array.from(completedSteps.current),
          skippedSteps: Array.from(skippedSteps.current),
          data: onboardingData
        })
      })
      
      setShowOnboarding(false)
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      internalAnalytics.feature.error('onboarding_complete', error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveProgress = async (isAutoSave = false) => {
    try {
      setIsSaving(true)
      
      const currentStepData = steps[currentStep]
      const progressPercentage = Math.round(((currentStep + 1) / steps.length) * 100)
      
      // Save to profile - handle missing columns gracefully
      try {
        // Only update columns that exist - start with minimal and add if successful
        const updateData = {
          onboarding_step: currentStep
        }
        
        // Try to add additional fields if they exist
        try {
          await updateProfile({
            ...updateData,
            onboarding_last_step: currentStepData?.id,
            onboarding_data: JSON.stringify(onboardingData),
            onboarding_progress_percentage: progressPercentage
          })
        } catch (fullUpdateError) {
          // If full update fails, try with just the basic field
          await updateProfile(updateData)
        }
      } catch (profileError) {
        // Log but don't throw - allow onboarding to continue
        console.warn('Profile update failed, continuing anyway:', profileError)
      }
      
      // Save to API (optional - don't break if it fails)
      try {
        const response = await fetch('/api/onboarding/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: currentStepData?.id,
            stepData: onboardingData
          })
        })
        
        if (response.ok) {
          setLastSaved(new Date())
          internalAnalytics.onboarding.dataSaved(currentStepData?.id, true, null)
        } else if (response.status === 401) {
          // API auth failed - that's okay, profile update is more important
          console.log('API save skipped (auth), but profile updated successfully')
        }
      } catch (apiError) {
        // API call failed - that's okay, we still have profile update
        console.log('API save failed, but profile updated successfully')
      }
    } catch (error) {
      console.error('Error saving progress:', error)
      internalAnalytics.onboarding.dataSaved(
        steps[currentStep]?.id,
        false,
        error.message
      )
    } finally {
      setIsSaving(false)
    }
  }

  const updateOnboardingData = (newData) => {
    setOnboardingData(prev => ({
      ...prev,
      ...newData
    }))
  }

  // Auto-save temporarily disabled to prevent render loops - manual save only
  // TODO: Re-implement auto-save with proper debouncing once core functionality is stable
  useEffect(() => {
    // Auto-save disabled for stability
    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current)
      }
    }
  }, [])

  // Load saved progress from profile only (simplified)
  useEffect(() => {
    if (profile?.onboarding_step !== undefined) {
      setCurrentStep(profile.onboarding_step)
    }
    if (profile?.onboarding_data) {
      try {
        // Check if it's already an object or needs parsing
        const savedData = typeof profile.onboarding_data === 'string' 
          ? JSON.parse(profile.onboarding_data)
          : profile.onboarding_data
        
        // Only set if it's a valid object
        if (savedData && typeof savedData === 'object' && !Array.isArray(savedData)) {
          setOnboardingData(prev => ({ ...prev, ...savedData }))
        }
      } catch (error) {
        console.warn('Could not parse onboarding data, using defaults')
      }
    }
  }, [profile?.onboarding_step, profile?.onboarding_data])

  // Simplified visibility logic - single source of truth
  const shouldShowModal = showOnboarding && !isMinimized
  
  if (!shouldShowModal) {
    return null
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        {/* Modal */}
        <div 
          data-onboarding-modal="true" 
          className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                  <h2 className="text-2xl font-bold">Welcome to Your Dashboard</h2>
                </div>
                <p className="text-brand-100 mt-1">Let's set up your {profile?.role?.toLowerCase().replace('_', ' ')} account</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Track minimize
                    if (typeof window !== 'undefined') {
                      internalAnalytics.track('onboarding_minimized', {
                        userId: user?.id,
                        step: currentStep
                      })
                    }
                    
                    // Call parent's minimize handler
                    if (onMinimize) {
                      onMinimize()
                    }
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                  title="Minimize"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  onClick={handleSkip}
                  className="text-white/80 hover:text-white transition-colors"
                  title="Skip for now"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-brand-100 mt-2">
              Step {currentStep + 1} of {steps.length}: {currentStepData.title}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                >
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full transition-colors
                    ${isActive ? 'bg-brand-600 text-white' : ''}
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-2 transition-colors
                      ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[50vh] overflow-y-auto">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-100 to-brand-200 rounded-xl flex items-center justify-center">
                  {currentStepData.icon && <currentStepData.icon className="h-6 w-6 text-brand-600" />}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {currentStepData.title}
                </h3>
                <p className="text-gray-600">{currentStepData.description}</p>
              </div>
            </div>

            {/* Render appropriate component based on step */}
            {renderStepContent(currentStepData.id, onboardingData, updateOnboardingData)}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`
                px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                ${currentStep === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
              `}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip for now
              </button>
              
              {currentStep === steps.length - 1 ? (
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  Complete Setup
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
                >
                  Next
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to render content based on step
function renderStepContent(stepId, data, updateData) {
  // Handle step completion callbacks
  const handleStepComplete = (stepData) => {
    updateData(stepData)
  }

  switch (stepId) {
    case 'business':
    case 'organization':
      return (
        <BusinessInfoSetup 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    case 'services':
      return (
        <ServiceSetup 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
          businessType={data.businessType || 'barbershop'}
        />
      )
    
    case 'staff':
    case 'hierarchy':
      return (
        <StaffSetup 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    case 'schedule':
    case 'hours':
      return (
        <ScheduleSetup 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    case 'financial':
    case 'payment':
      // Use enhanced version with Stripe Connect integration
      return (
        <FinancialSetupEnhanced 
          onComplete={handleStepComplete}
          initialData={data}
          subscriptionTier={data.role === 'ENTERPRISE_OWNER' ? 'enterprise' : 'shop'}
        />
      )
    
    case 'booking':
      return (
        <BookingRulesSetup 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    case 'branding':
      return (
        <LivePreview 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    case 'profile':
      return (
        <RoleSelector 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    case 'goals':
      return (
        <GoalsSelector 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    case 'domain':
      return (
        <DomainSelector 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
        />
      )
    
    default:
      // Fallback for any steps not yet implemented
      return (
        <div className="bg-yellow-50 rounded-lg p-8 text-center">
          <p className="text-yellow-800 font-medium">
            Step "{stepId}" is coming soon!
          </p>
          <p className="text-sm text-yellow-600 mt-2">
            This feature is under development.
          </p>
          <button
            onClick={() => handleStepComplete({})}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Skip for now
          </button>
        </div>
      )
  }
}