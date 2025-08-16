'use client'

import { useState, useEffect } from 'react'
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
  ChartBarIcon
} from '@heroicons/react/24/outline'

// Import existing onboarding components
import RoleSelector from '../onboarding/RoleSelector'
import ServiceSetup from '../onboarding/ServiceSetup'
import FinancialSetup from '../onboarding/FinancialSetup'
import GoalsSelector from '../onboarding/GoalsSelector'
import LivePreview from '../onboarding/LivePreview'
import DomainSelector from '../onboarding/DomainSelector'

export default function DashboardOnboarding({ user, profile, onComplete, updateProfile }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
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

  // Define steps based on user role
  const getStepsForRole = (role) => {
    const baseSteps = {
      BARBER: [
        { id: 'profile', title: 'Personal Profile', icon: UserIcon, description: 'Set up your professional profile' },
        { id: 'services', title: 'Services & Pricing', icon: CurrencyDollarIcon, description: 'Define your services and rates' },
        { id: 'schedule', title: 'Availability', icon: ClockIcon, description: 'Set your working hours' },
        { id: 'payment', title: 'Payment Methods', icon: CurrencyDollarIcon, description: 'Configure payment options' },
        { id: 'branding', title: 'Booking Page', icon: PaintBrushIcon, description: 'Customize your booking page' }
      ],
      SHOP_OWNER: [
        { id: 'business', title: 'Business Info', icon: BuildingOfficeIcon, description: 'Basic business details' },
        { id: 'hours', title: 'Business Hours', icon: ClockIcon, description: 'Set operating hours' },
        { id: 'services', title: 'Services Catalog', icon: CurrencyDollarIcon, description: 'Define services and pricing' },
        { id: 'staff', title: 'Staff Setup', icon: UserGroupIcon, description: 'Add your barbers' },
        { id: 'payment', title: 'Payment Processing', icon: CurrencyDollarIcon, description: 'Configure payments' },
        { id: 'booking', title: 'Booking Rules', icon: CheckCircleIcon, description: 'Set booking policies' },
        { id: 'branding', title: 'Branding', icon: PaintBrushIcon, description: 'Customize appearance' }
      ],
      ENTERPRISE_OWNER: [
        { id: 'organization', title: 'Organization Setup', icon: BuildingOfficeIcon, description: 'Configure your enterprise' },
        { id: 'locations', title: 'Multiple Locations', icon: BuildingOfficeIcon, description: 'Add business locations' },
        { id: 'services', title: 'Master Services', icon: CurrencyDollarIcon, description: 'Define service catalog' },
        { id: 'hierarchy', title: 'Staff Hierarchy', icon: UserGroupIcon, description: 'Set up management structure' },
        { id: 'financial', title: 'Financial Config', icon: CurrencyDollarIcon, description: 'Payment & commission settings' },
        { id: 'branding', title: 'Brand Guidelines', icon: PaintBrushIcon, description: 'Set brand standards' },
        { id: 'analytics', title: 'Analytics Setup', icon: ChartBarIcon, description: 'Configure reporting' }
      ]
    }

    return baseSteps[role] || baseSteps.SHOP_OWNER
  }

  const steps = getStepsForRole(profile?.role || 'SHOP_OWNER')
  const progress = Math.round((currentStep / steps.length) * 100)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      saveProgress()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setShowOnboarding(false)
    // Save that user skipped onboarding
    localStorage.setItem('onboarding_skipped', 'true')
  }

  const handleComplete = async () => {
    try {
      // Update profile to mark onboarding as complete
      await updateProfile({
        onboarding_completed: true,
        onboarding_data: JSON.stringify(onboardingData)
      })
      
      setShowOnboarding(false)
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    }
  }

  const saveProgress = async () => {
    try {
      // Save progress to database
      await updateProfile({
        onboarding_step: currentStep,
        onboarding_data: JSON.stringify(onboardingData)
      })
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  const updateOnboardingData = (field, value) => {
    setOnboardingData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Load saved progress
  useEffect(() => {
    if (profile?.onboarding_step) {
      setCurrentStep(profile.onboarding_step)
    }
    if (profile?.onboarding_data) {
      try {
        const savedData = JSON.parse(profile.onboarding_data)
        setOnboardingData(prev => ({ ...prev, ...savedData }))
      } catch (error) {
        console.error('Error loading saved onboarding data:', error)
      }
    }
  }, [profile])

  if (!showOnboarding || profile?.onboarding_completed) {
    return null
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
        >
          <SparklesIcon className="h-5 w-5" />
          Complete Setup ({progress}%)
        </button>
      </div>
    )
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Welcome to Your Dashboard!</h2>
                <p className="text-brand-100 mt-1">Let's set up your {profile?.role?.toLowerCase().replace('_', ' ')} account</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMinimized(true)}
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
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-gray-600">{currentStepData.description}</p>
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
  // This is a placeholder - in practice, you'd render the appropriate
  // component from the existing onboarding components
  switch (stepId) {
    case 'services':
      return <ServiceSetup data={data} updateData={updateData} />
    
    case 'financial':
    case 'payment':
      return <FinancialSetup data={data} updateData={updateData} />
    
    case 'branding':
      return <LivePreview data={data} updateData={updateData} />
    
    default:
      // For steps without specific components yet, show a placeholder
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            Component for "{stepId}" step will be configured here.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This will use the existing onboarding components.
          </p>
        </div>
      )
  }
}