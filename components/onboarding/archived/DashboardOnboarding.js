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
import { useRouter } from 'next/navigation'
import { useAuth } from '../SupabaseAuthProvider'

// Import existing onboarding components
import internalAnalytics from '@/lib/internal-analytics'
import BookingRulesSetup from '../onboarding/BookingRulesSetup'
import BusinessInfoSetup from '../onboarding/BusinessInfoSetup'
import DomainSelector from '../onboarding/DomainSelector'
import FinancialSetupEnhanced from '../onboarding/FinancialSetupEnhanced'
import GoalsSelector from '../onboarding/GoalsSelector'
import LivePreview from '../onboarding/LivePreview'

// Import new onboarding components
import WelcomeSegmentation from '../onboarding/WelcomeSegmentation'
import AdaptiveFlowEngine from '../onboarding/AdaptiveFlowEngine'
import ContextualGuidanceProvider from '../onboarding/ContextualGuidanceProvider'

// Import new data migration and planning components
import PlatformTailoredImport from '../onboarding/PlatformTailoredImport'
import DataVerificationSetup from '../onboarding/DataVerificationSetup'
import BusinessPlanningSetup from '../onboarding/BusinessPlanningSetup'
import LocationManagementSetup from '../onboarding/LocationManagementSetup'

// Import professional illustrations
import { WelcomeIllustration, ProgressRing } from '../onboarding/OnboardingIllustrations'
import RoleSelector from '../onboarding/RoleSelector'
import ScheduleSetup from '../onboarding/ScheduleSetup'
import ServiceSetup from '../onboarding/ServiceSetup'
import StaffSetup from '../onboarding/StaffSetup'

// QuickOnboardingFlow component not available - using standard flow

// Import analytics

export default function DashboardOnboarding({ 
  user, 
  profile, 
  onComplete, 
  onSkip,
  useQuickFlow = true // New prop to enable streamlined onboarding
}) {
  // Log component mount for debugging
  useEffect(() => {
    console.log('🔧 DashboardOnboarding: Component mounted', {
      hasUser: !!user,
      userEmail: user?.email,
      hasProfile: !!profile,
      profileRole: profile?.role,
      useQuickFlow
    })
  }, [])
  
  const router = useRouter()
  const { updateProfile } = useAuth()
  
  // Manage step internally - will be loaded from saved progress
  const [currentStep, setCurrentStep] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)
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

  // State for completion modal and imported data
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionData, setCompletionData] = useState(null)
  const [importedData, setImportedData] = useState(null)

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

  // Define steps based on user role with adaptive flow intelligence
  const getStepsForRole = (role) => {
    // Initialize adaptive flow engine
    const flowEngine = new AdaptiveFlowEngine(onboardingData, profile)
    
    // Common segmentation step for all roles
    const segmentationStep = { 
      id: 'segmentation', 
      title: 'Welcome', 
      icon: SparklesIcon, 
      description: 'Choose your personalized setup path' 
    }

    const baseSteps = {
      BARBER: [
        segmentationStep,
        { id: 'profile', title: 'Personal Profile', icon: UserIcon, description: 'Set up your professional profile' },
        { id: 'services', title: 'Services & Pricing', icon: CurrencyDollarIcon, description: 'Define your services and rates' },
        { id: 'schedule', title: 'Availability', icon: CalendarDaysIcon, description: 'Set your working hours' },
        { id: 'financial', title: 'Payment Setup', icon: CurrencyDollarIcon, description: 'Configure payment options' },
        { id: 'booking', title: 'Booking Rules', icon: DocumentCheckIcon, description: 'Set booking policies' },
        { id: 'branding', title: 'Booking Page', icon: PaintBrushIcon, description: 'Customize your booking page' }
      ],
      SHOP_OWNER: [
        segmentationStep,
        { id: 'business', title: 'Business Info', icon: BuildingOfficeIcon, description: 'Basic business details' },
        { id: 'schedule', title: 'Business Hours', icon: CalendarDaysIcon, description: 'Set operating hours' },
        { id: 'services', title: 'Services Catalog', icon: CurrencyDollarIcon, description: 'Define services and pricing' },
        { id: 'staff', title: 'Staff Setup', icon: UserGroupIcon, description: 'Add your barbers' },
        { id: 'financial', title: 'Payment Processing', icon: CurrencyDollarIcon, description: 'Configure payments' },
        { id: 'booking', title: 'Booking Rules', icon: DocumentCheckIcon, description: 'Set booking policies' },
        { id: 'branding', title: 'Branding', icon: PaintBrushIcon, description: 'Customize appearance' }
      ],
      ENTERPRISE_OWNER: [
        segmentationStep,
        { id: 'business', title: 'Organization Setup', icon: BuildingOfficeIcon, description: 'Configure your enterprise' },
        { id: 'schedule', title: 'Operating Hours', icon: CalendarDaysIcon, description: 'Set default hours for locations' },
        { id: 'services', title: 'Master Services', icon: CurrencyDollarIcon, description: 'Define service catalog' },
        { id: 'staff', title: 'Staff Hierarchy', icon: UserGroupIcon, description: 'Set up management structure' },
        { id: 'financial', title: 'Financial Config', icon: CurrencyDollarIcon, description: 'Payment & commission settings' },
        { id: 'booking', title: 'Booking Policies', icon: DocumentCheckIcon, description: 'Set enterprise policies' },
        { id: 'branding', title: 'Brand Guidelines', icon: PaintBrushIcon, description: 'Set brand standards' }
      ]
    }

    const selectedSteps = baseSteps[role] || baseSteps.SHOP_OWNER
    
    // Apply adaptive flow intelligence if segmentation path is available
    if (onboardingData.segmentationPath) {
      const adaptedSteps = flowEngine.adaptStepSequence(selectedSteps)
      return adaptedSteps
    }
    
    return selectedSteps
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
      
      // Track completion with segmentation context
      internalAnalytics.onboarding.completed(
        steps.length,
        completedSteps.current.size,
        skippedSteps.current.size,
        onboardingData.segmentationPath
      )
      
      // Show adaptive completion message
      if (onboardingData.segmentationPath) {
        const flowEngine = new AdaptiveFlowEngine(onboardingData, profile)
        const completionMessage = flowEngine.getCompletionMessage()
        
        // Store completion data for modal display
        setCompletionData(completionMessage)
        setShowCompletionModal(true)
        console.log('🎉 Adaptive Completion:', completionMessage)
      } else {
        // Fallback completion for users without segmentation
        const flowEngine = new AdaptiveFlowEngine({}, profile)
        const completionMessage = flowEngine.getCompletionMessage()
        setCompletionData(completionMessage)
        setShowCompletionModal(true)
      }
      
      // Update profile to mark onboarding as complete
      await updateProfile({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_data: JSON.stringify(onboardingData),
        onboarding_progress_percentage: 100,
        onboarding_status: 'completed'
      })
      
      // Save to API with imported data
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedSteps: Array.from(completedSteps.current),
          skippedSteps: Array.from(skippedSteps.current),
          data: onboardingData,
          importedData: onboardingData.importedData || null
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
    setOnboardingData(prev => {
      const updatedData = { ...prev, ...newData }
      
      // Apply smart defaults when segmentation path is first selected
      if (newData.segmentationPath && !prev.segmentationPath) {
        const flowEngine = new AdaptiveFlowEngine(updatedData, profile)
        
        // Asynchronously apply smart defaults
        flowEngine.generateSmartDefaults(
          updatedData.businessType || 'barbershop',
          updatedData.businessCity && updatedData.businessState 
            ? `${updatedData.businessCity}, ${updatedData.businessState}` 
            : null
        ).then(smartDefaults => {
          // Apply defaults in a separate state update to avoid blocking
          setOnboardingData(currentData => {
            const enhancedData = { ...currentData }
            
            // Merge smart defaults with existing data (don't override user input)
            Object.keys(smartDefaults).forEach(key => {
              if (key.startsWith('_')) return // Skip metadata keys like _aiInsights
              if (enhancedData[key] === undefined || enhancedData[key] === '' || enhancedData[key] === null) {
                enhancedData[key] = smartDefaults[key]
              }
            })

            // Store AI insights for contextual help
            if (smartDefaults._aiInsights) {
              enhancedData.aiInsights = smartDefaults._aiInsights
            }
            
            return enhancedData
          })
        }).catch(error => {
          console.warn('Failed to apply smart defaults:', error)
        })
      }
      
      return updatedData
    })
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


  // Load saved progress from API
  const loadProgress = async () => {
    try {
      // First check if user has Stripe account set up
      const stripeResponse = await fetch('/api/payments/connect/create', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (stripeResponse.ok) {
        const stripeData = await stripeResponse.json()
        
        // If Stripe is fully set up, mark financial step as complete
        if (stripeData.account_id && stripeData.onboarding_completed) {
          console.log('💳 Stripe account already connected - marking financial step complete')
          completedSteps.current.add('financial')
          
          // Update onboarding data with Stripe info
          setOnboardingData(prev => ({
            ...prev,
            stripeConnected: true,
            stripeAccountId: stripeData.account_id
          }))
        }
      }
      
      // Then load regular progress
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Restore step position
        if (data.currentStep !== undefined && data.currentStep !== currentStep) {
          setCurrentStep(data.currentStep)
        }
        
        // Restore form data from completed steps
        if (data.steps && data.steps.length > 0) {
          const combinedData = data.steps.reduce((acc, step) => {
            if (step.step_data) {
              return { ...acc, ...step.step_data }
            }
            return acc
          }, {})
          
          setOnboardingData(prev => ({ ...prev, ...combinedData }))
        }
        
        console.log('✅ Onboarding progress restored')
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  // Load saved progress on mount and check for Stripe completion
  useEffect(() => {
    // Check URL parameters for payment completion FIRST
    const urlParams = new URLSearchParams(window.location.search)
    const paymentComplete = urlParams.get('payment_setup_complete') === 'true'
    
    if (paymentComplete) {
      console.log('💳 Payment setup completed - advancing onboarding')
      
      // Mark financial step as complete
      const financialStepIndex = steps.findIndex(s => s.id === 'financial')
      if (financialStepIndex !== -1) {
        completedSteps.current.add('financial')
        
        // Set to next step after financial
        const nextStepIndex = financialStepIndex + 1
        if (nextStepIndex < steps.length) {
          setCurrentStep(nextStepIndex)
          console.log(`📍 Advanced to step ${nextStepIndex}: ${steps[nextStepIndex].id}`)
          
          // Show success message
          setShowPaymentSuccess(true)
          setTimeout(() => setShowPaymentSuccess(false), 5000)
          
          // Clean up URL params
          const newUrl = new URL(window.location)
          newUrl.searchParams.delete('payment_setup_complete')
          newUrl.searchParams.delete('resume_onboarding')
          window.history.replaceState({}, document.title, newUrl.pathname)
          
          // Save the progress
          saveProgress()
        }
      }
    } else {
      // Normal progress loading if not returning from payment
      loadProgress()
      
      // Also load from profile as fallback
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
    }
  }, []) // Only run once on mount


  // Simplified visibility logic - single source of truth
  const shouldShowModal = showOnboarding
  
  if (!shouldShowModal) {
    return null
  }

  // QuickOnboardingFlow not available - falling back to standard flow
  if (useQuickFlow) {
    console.log('🚀 DashboardOnboarding: QuickOnboardingFlow not available, using standard flow')
    // Continue with standard flow below
  }

  const currentStepData = steps[currentStep]

  // Payment Success Notification
  const PaymentSuccessNotification = () => {
    if (!showPaymentSuccess) return null
    
    return (
      <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2 duration-300">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl shadow-xl p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900">
                Payment Setup Complete!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your Stripe account is connected. You can now accept online payments.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 bg-green-200 rounded-full h-1.5">
                  <div className="bg-green-600 rounded-full h-1.5 animate-pulse" style={{ width: '100%' }} />
                </div>
                <span className="text-xs text-green-600 font-medium">Ready</span>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentSuccess(false)}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render minimized view when minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 animate-in slide-in-from-bottom-5">
          {/* Minimized Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Setup Paused</p>
                <p className="text-xs text-gray-500">Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log('⏹️ Closing minimized onboarding')
                setShowOnboarding(false)
                if (onSkip) onSkip()
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
            <div 
              className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-full h-1.5 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Current Step Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStepData.icon && <currentStepData.icon className="h-4 w-4 text-gray-500" />}
              <span className="text-sm text-gray-700">{currentStepData.title}</span>
            </div>
            <button
              onClick={() => {
                console.log('➕ Expanding onboarding from minimized state')
                setIsMinimized(false)
                // Track the expansion
                if (typeof window !== 'undefined') {
                  internalAnalytics.track('onboarding_expanded', {
                    userId: user?.id,
                    step: currentStep
                  })
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 transition-colors flex items-center gap-1"
            >
              <ArrowRightIcon className="h-3 w-3" />
              Resume
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ContextualGuidanceProvider>
      <div className="fixed inset-0 z-40 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          {/* Payment Success Notification */}
          <PaymentSuccessNotification />
          
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
                    
                    // Set minimized state to true
                    console.log('➖ Minimizing onboarding modal')
                    setIsMinimized(true)
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
                
                {/* Adaptive contextual help */}
                {onboardingData.segmentationPath && (() => {
                  const flowEngine = new AdaptiveFlowEngine(onboardingData, profile)
                  const contextualHelp = flowEngine.getContextualHelp(currentStepData.id)
                  
                  return contextualHelp ? (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <SparklesIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800 font-medium">
                          {contextualHelp}
                        </p>
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            </div>

            {/* Render appropriate component based on step */}
            {renderStepContent(currentStepData.id, onboardingData, updateOnboardingData, profile, handleNext)}
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

      {/* Completion Success Modal */}
      {showCompletionModal && completionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">{completionData.emphasis === 'data_import' ? '📊' : '🎉'}</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {completionData.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {completionData.message}
                </p>
              </div>

              {/* Next Steps List */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">What's next:</h3>
                <ul className="space-y-2">
                  {completionData.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    if (completionData.primaryAction === 'Import Customer Data') {
                      router.push('/dashboard/import')
                    } else {
                      setShowCompletionModal(false)
                      setShowOnboarding(false)
                      if (onComplete) onComplete()
                    }
                  }}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    completionData.emphasis === 'data_import'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  {completionData.primaryAction}
                  {completionData.primaryAction === 'Import Customer Data' && (
                    <ArrowRightIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (completionData.secondaryAction === 'Import Customer Data') {
                      router.push('/dashboard/import')
                    } else {
                      setShowCompletionModal(false)
                      setShowOnboarding(false)
                      if (onComplete) onComplete()
                    }
                  }}
                  className="flex-1 px-6 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  {completionData.secondaryAction}
                </button>
              </div>

              {/* Data Import Emphasis for Switching Systems */}
              {completionData.emphasis === 'data_import' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium">Ready to import your data?</p>
                      <p className="text-blue-700">
                        Our CSV import tool will help you seamlessly transfer your existing customers, appointments, and services.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ContextualGuidanceProvider>
  )
}

// Helper function to render content based on step
function renderStepContent(stepId, data, updateData, profile, onNavigateNext) {
  // Handle step completion callbacks with auto-advance support
  const handleStepComplete = (stepData, options = {}) => {
    updateData(stepData)
    
    // If auto-advance is requested, trigger navigation after data update
    if (options.autoAdvance) {
      // Small delay to ensure data update is processed
      setTimeout(() => {
        if (onNavigateNext) {
          console.log('🚀 Auto-advancing to next step after data update')
          onNavigateNext()
        }
      }, 100)
    }
  }

  switch (stepId) {
    case 'segmentation':
      return (
        <WelcomeSegmentation 
          data={data} 
          updateData={updateData}
          onComplete={handleStepComplete}
          profile={profile}
        />
      )

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
      // Use enhanced financial setup with optional payment configuration
      return (
        <FinancialSetupEnhanced 
          initialData={data}
          onComplete={handleStepComplete}
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
    
    // Data migration steps (for switching_systems path)
    case 'data_import':
      return (
        <PlatformTailoredImport
          onComplete={handleStepComplete}
          initialData={data}
          profile={profile}
        />
      )
    
    case 'data_verification':
      return (
        <DataVerificationSetup
          onComplete={handleStepComplete}
          initialData={data}
          importedData={data.importedData} // Pass data from previous import step
        />
      )
    
    // Business planning step (for first_barbershop path)
    case 'business_planning':
      return (
        <BusinessPlanningSetup
          onComplete={handleStepComplete}
          initialData={data}
          businessType={data.businessType || 'barbershop'}
          location={data.location}
        />
      )
    
    // Location management step (for adding_locations path)
    case 'location_management':
      return (
        <LocationManagementSetup
          onComplete={handleStepComplete}
          initialData={data}
        />
      )
    
    // Analytics and AI training steps (placeholder for now, but properly named)
    case 'analytics_setup':
      return (
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <ChartBarIcon className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <p className="text-blue-900 font-semibold text-lg">
            Analytics Dashboard Setup
          </p>
          <p className="text-sm text-blue-700 mt-2">
            Configure your analytics and reporting preferences.
          </p>
          <button
            onClick={() => handleStepComplete({ analyticsEnabled: true })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Enable Analytics
          </button>
        </div>
      )
    
    case 'ai_training':
      return (
        <div className="bg-purple-50 rounded-lg p-8 text-center">
          <SparklesIcon className="w-12 h-12 mx-auto text-purple-600 mb-4" />
          <p className="text-purple-900 font-semibold text-lg">
            AI Assistant Training
          </p>
          <p className="text-sm text-purple-700 mt-2">
            Train your AI assistant with your business preferences.
          </p>
          <button
            onClick={() => handleStepComplete({ aiTrainingCompleted: true })}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Start Training
          </button>
        </div>
      )
    
    default:
      // Fallback for any steps not yet implemented
      // This should rarely be hit now that we've covered all known step IDs
      console.warn(`Unknown onboarding step: ${stepId}`)
      return (
        <div className="bg-yellow-50 rounded-lg p-8 text-center">
          <p className="text-yellow-800 font-medium">
            Unknown step: "{stepId}"
          </p>
          <p className="text-sm text-yellow-600 mt-2">
            This step ID is not recognized. Please contact support.
          </p>
          <button
            onClick={() => handleStepComplete({})}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Skip and Continue
          </button>
        </div>
      )
  }
}