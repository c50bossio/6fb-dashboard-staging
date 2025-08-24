'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  ChevronDownIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  ClockIcon,
  SparklesIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  PaintBrushIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'

const ONBOARDING_STEPS = [
  {
    id: 'business',
    title: 'Business Information',
    description: 'Set up your barbershop details',
    icon: BuildingOfficeIcon,
    path: '/shop/settings/general'
  },
  {
    id: 'schedule',
    title: 'Business Hours',
    description: 'Configure your operating hours',
    icon: ClockIcon,
    path: '/shop/settings/hours'
  },
  {
    id: 'services',
    title: 'Services & Pricing',
    description: 'Add your services and set prices',
    icon: SparklesIcon,
    path: '/shop/services'
  },
  {
    id: 'staff',
    title: 'Staff Setup',
    description: 'Add your team members',
    icon: UserGroupIcon,
    path: '/shop/settings/staff'
  },
  {
    id: 'financial',
    title: 'Payment Setup',
    description: 'Connect your bank account',
    icon: CurrencyDollarIcon,
    path: '/shop/settings/payment-setup'
  },
  {
    id: 'booking',
    title: 'Booking Policies',
    description: 'Set cancellation and booking rules',
    icon: CalendarDaysIcon,
    path: '/shop/settings/booking'
  },
  {
    id: 'branding',
    title: 'Branding',
    description: 'Customize your booking page',
    icon: PaintBrushIcon,
    path: '/shop/website'
  }
]

export default function OnboardingProgress({ user, profile }) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // Don't persist dismissal - reset on page refresh so users can always see progress
  const [isDismissed, setIsDismissed] = useState(false)

  // Load status from simplified API
  useEffect(() => {
    loadOnboardingStatus()
  }, [])

  // Refresh status when returning from settings pages
  useEffect(() => {
    const handleFocus = () => {
      loadOnboardingStatus()
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadOnboardingStatus()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/onboarding/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOnboardingStatus(data)
      } else {
        console.error('Error loading onboarding status:', response.status)
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get progress from status data
  const progressPercentage = onboardingStatus?.overall?.progress_percentage || 0
  const completedSteps = onboardingStatus?.overall?.completed_steps || 0
  const totalSteps = onboardingStatus?.overall?.total_steps || 7
  const isComplete = onboardingStatus?.overall?.is_complete || false

  // Handle dismiss action
  const handleDismiss = () => {
    setIsDismissed(true)
  }

  // Don't show if dismissed or complete
  if (isDismissed || isComplete) {
    return null
  }

  // Find next incomplete step using actual data
  const getStepStatus = (stepId) => {
    if (!onboardingStatus?.steps) return false
    
    const stepMapping = {
      'business': 'business',
      'schedule': 'hours', 
      'services': 'services',
      'staff': 'staff',
      'financial': 'financial',
      'booking': 'booking',
      'branding': 'branding'
    }
    
    const statusKey = stepMapping[stepId]
    return onboardingStatus.steps[statusKey]?.complete || false
  }

  const nextStep = ONBOARDING_STEPS.find(step => !getStepStatus(step.id))

  const handleStepClick = (step) => {
    // Simple navigation - no complex session management needed!
    const routes = {
      'business': '/shop/settings/general',
      'schedule': '/shop/settings/hours',
      'services': '/shop/services',
      'staff': '/shop/settings/staff',
      'financial': '/shop/settings/payment-setup',
      'booking': '/shop/settings/booking',
      'branding': '/shop/website'
    }
    
    const route = routes[step.id]
    if (route) {
      router.push(route)
    }
  }

  // No complex flag management needed in simplified approach

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-brand-50 to-amber-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Complete Your Setup
              </h3>
              <p className="text-sm text-gray-600">
                {isComplete 
                  ? 'All set! Your barbershop is ready.' 
                  : `${completedSteps} of ${totalSteps} steps completed`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-white/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-full h-2 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps List - Collapsible */}
      {isExpanded && (
        <div className="p-4">
          <div className="space-y-3">
            {ONBOARDING_STEPS.map((step, index) => {
              const isStepCompleted = getStepStatus(step.id)
              const isCurrent = !isStepCompleted && step.id === nextStep?.id
              const StepIcon = step.icon

              return (
                <div
                  key={step.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer
                    ${isStepCompleted 
                      ? 'bg-green-50 hover:bg-green-100' 
                      : isCurrent
                        ? 'bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => !isStepCompleted && handleStepClick(step)}
                >
                  {/* Step Icon/Number */}
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0
                    ${isStepCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {isStepCompleted ? (
                      <CheckCircleIconSolid className="h-6 w-6" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`
                        font-medium
                        ${isStepCompleted 
                          ? 'text-green-900' 
                          : isCurrent
                            ? 'text-blue-900'
                            : 'text-gray-900'
                        }
                      `}>
                        {step.title}
                      </h4>
                      {isStepCompleted && (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Complete
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs text-blue-600 font-medium animate-pulse">
                          Current Step
                        </span>
                      )}
                    </div>
                    <p className={`
                      text-sm mt-0.5
                      ${isStepCompleted 
                        ? 'text-green-700' 
                        : isCurrent
                          ? 'text-blue-700'
                          : 'text-gray-600'
                      }
                    `}>
                      {step.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  {!isStepCompleted && isCurrent && (
                    <button
                      className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStepClick(step)
                      }}
                    >
                      Start
                      <ArrowRightIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Call to Action */}
          {nextStep && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Ready to continue?
                  </p>
                  <p className="text-sm text-blue-700 mt-0.5">
                    Complete "{nextStep.title}" to move forward
                  </p>
                </div>
                <button
                  onClick={() => handleStepClick(nextStep)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  Continue Setup
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}