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
import { Button } from '@/components/ui/Button'

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
  
  // Celebration system states
  const [isCompleting, setIsCompleting] = useState(false)
  const [completionData, setCompletionData] = useState(null)

  // Load status from simplified API
  useEffect(() => {
    loadOnboardingStatus()
  }, [])

  // Refresh status when returning from settings pages (with debouncing and smart detection)
  useEffect(() => {
    let refreshTimeout = null
    
    const isInOnboardingFlow = () => {
      const currentPath = window.location.pathname
      const searchParams = new URLSearchParams(window.location.search)
      const isOnboardingParam = searchParams.get('onboarding') === 'true'
      const hasOnboardingStep = searchParams.has('step')
      
      // Skip refresh if user is actively in an onboarding step
      return isOnboardingParam && hasOnboardingStep && (
        currentPath.startsWith('/shop/') || 
        currentPath === '/dashboard'
      )
    }
    
    const debouncedRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }
      
      refreshTimeout = setTimeout(() => {
        // Only refresh if not in active onboarding flow
        if (!isInOnboardingFlow()) {
          console.log('OnboardingProgress: Refreshing status after tab switch')
          loadOnboardingStatus()
        } else {
          console.log('OnboardingProgress: Skipping refresh - user is in active onboarding flow')
        }
      }, 500) // 500ms debounce to prevent excessive calls
    }
    
    const handleFocus = () => {
      debouncedRefresh()
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        debouncedRefresh()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }
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

  // Handle completion confirmation
  const handleCompleteOnboarding = async () => {
    setIsCompleting(true)
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompletionData(data)
        console.log('Onboarding completion successful:', data)
        
        // Optional: Show success notification or redirect after delay
        setTimeout(() => {
          if (data.bookingUrl) {
            window.open(data.bookingUrl, '_blank')
          }
        }, 2000)
      } else {
        console.error('Error completing onboarding:', response.status)
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  // Don't show if dismissed
  if (isDismissed) {
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
    // Add onboarding context to URL for banner detection
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
      // Store onboarding context in session storage as backup
      const onboardingContext = {
        step: step.id,
        route,
        timestamp: Date.now(),
        from: 'dashboard',
        stepTitle: step.title
      }
      
      try {
        sessionStorage.setItem('onboarding_context', JSON.stringify(onboardingContext))
        console.log('OnboardingProgress: Saved context to session storage', onboardingContext)
      } catch (error) {
        console.warn('OnboardingProgress: Failed to save context to session storage', error)
      }
      
      // Add onboarding context parameters
      const url = `${route}?onboarding=true&step=${step.id}&from=dashboard`
      router.push(url)
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

  // Celebration UI when onboarding is complete
  if (isComplete) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
        {/* Celebration Header */}
        <div className="p-6 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <SparklesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
                  🎉 Congratulations! Your Barbershop is Ready
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  All {totalSteps} onboarding steps completed successfully
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              aria-label="Dismiss celebration"
            >
              <XMarkIcon className="h-5 w-5 text-green-600" />
            </button>
          </div>

          {/* Completion Stats */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg">
              <CheckCircleIconSolid className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Setup Complete
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg">
              <SparklesIcon className="h-5 w-5 text-green-600 animate-pulse" />
              <span className="text-sm font-medium text-green-800">
                Ready for Bookings
              </span>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-gray-700 font-medium">
                Ready to launch your barbershop?
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Complete the final setup to activate your booking system and get your custom link.
              </p>
              {completionData && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ {completionData.message}
                  </p>
                  {completionData.bookingUrl && (
                    <p className="text-xs text-green-600 mt-1">
                      📱 Booking URL: {completionData.bookingUrl}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleCompleteOnboarding}
                variant="success"
                size="large"
                loading={isCompleting}
                disabled={isCompleting}
                className="animate-pulse"
              >
                {isCompleting ? 'Launching...' : '🚀 Launch My Barbershop'}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            {ONBOARDING_STEPS.slice(0, 3).map((step, index) => (
              <div key={step.id} className="text-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircleIconSolid className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">{step.title}</p>
              </div>
            ))}
          </div>
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
              const isRecommendedNext = !isStepCompleted && step.id === nextStep?.id
              const StepIcon = step.icon

              return (
                <div
                  key={step.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer
                    ${isStepCompleted 
                      ? 'bg-green-50 hover:bg-green-100' 
                      : isRecommendedNext
                        ? 'bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => handleStepClick(step)}
                >
                  {/* Step Icon/Number */}
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0
                    ${isStepCompleted 
                      ? 'bg-green-500 text-white' 
                      : isRecommendedNext
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }
                  `}>
                    {isStepCompleted ? (
                      <CheckCircleIconSolid className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`
                        font-medium
                        ${isStepCompleted 
                          ? 'text-green-900' 
                          : isRecommendedNext
                            ? 'text-blue-900'
                            : 'text-gray-900'
                        }
                      `}>
                        {step.title}
                      </h4>
                      {isStepCompleted && (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Complete • Click to Edit
                        </span>
                      )}
                      {isRecommendedNext && (
                        <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
                          Recommended Next
                        </span>
                      )}
                    </div>
                    <p className={`
                      text-sm mt-0.5
                      ${isStepCompleted 
                        ? 'text-green-700' 
                        : isRecommendedNext
                          ? 'text-blue-700'
                          : 'text-gray-600'
                      }
                    `}>
                      {step.description}
                    </p>
                  </div>

                  {/* Action Button - Now shows for ALL incomplete tasks */}
                  {isStepCompleted && (
                    <button
                      className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStepClick(step)
                      }}
                    >
                      Edit
                      <ArrowRightIcon className="h-3 w-3" />
                    </button>
                  )}
                  {!isStepCompleted && (
                    <button
                      className={`
                        px-3 py-1 text-sm font-medium rounded-lg transition-colors flex items-center gap-1
                        ${isRecommendedNext
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                        }
                      `}
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

          {/* Call to Action - Updated for flexible ordering */}
          {nextStep && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Complete setup in any order you prefer
                  </p>
                  <p className="text-sm text-blue-700 mt-0.5">
                    We recommend starting with "{nextStep.title}" but you can tackle any step that works for you
                  </p>
                </div>
                <button
                  onClick={() => handleStepClick(nextStep)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  Start Recommended
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