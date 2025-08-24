'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'

const ONBOARDING_STEPS = {
  'business': { title: 'Business Information', path: '/shop/settings/general' },
  'schedule': { title: 'Business Hours', path: '/shop/settings/hours' },
  'services': { title: 'Services & Pricing', path: '/shop/services' },
  'staff': { title: 'Staff Setup', path: '/shop/settings/staff' },
  'financial': { title: 'Payment Setup', path: '/shop/settings/payment-setup' },
  'booking': { title: 'Booking Policies', path: '/shop/settings/booking' },
  'branding': { title: 'Branding', path: '/customize' }
}

export default function OnboardingStepBanner({ 
  stepId, 
  onComplete, 
  validateCompletion, 
  completionMessage 
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [canComplete, setCanComplete] = useState(false)
  const [validationError, setValidationError] = useState(null)

  useEffect(() => {
    // Check if we're in onboarding mode via URL params
    const fromOnboarding = searchParams.get('onboarding') === 'true'
    const currentStep = searchParams.get('step')
    
    let isOnboardingFlow = fromOnboarding && currentStep === stepId
    
    // Fallback: Check session storage if URL params are missing
    if (!isOnboardingFlow) {
      try {
        const savedContext = sessionStorage.getItem('onboarding_context')
        if (savedContext) {
          const context = JSON.parse(savedContext)
          // Check if context is recent (within 10 minutes) and matches current step
          const isRecent = Date.now() - context.timestamp < 10 * 60 * 1000
          const matchesStep = context.step === stepId
          const matchesRoute = window.location.pathname === context.route || 
                              window.location.pathname.startsWith(context.route)
          
          if (isRecent && matchesStep && matchesRoute) {
            console.log('OnboardingStepBanner: Restored context from session storage', context)
            isOnboardingFlow = true
          } else if (!isRecent) {
            // Clean up old context
            sessionStorage.removeItem('onboarding_context')
          }
        }
      } catch (error) {
        console.warn('OnboardingStepBanner: Failed to restore context from session storage', error)
      }
    }
    
    setIsOnboarding(isOnboardingFlow)
    
    // Initial validation check
    if (isOnboardingFlow && validateCompletion) {
      checkCompletion()
    } else if (isOnboardingFlow) {
      // If no validation function provided, assume it's completable
      setCanComplete(true)
    }
  }, [stepId, searchParams, validateCompletion])

  const checkCompletion = async () => {
    if (!validateCompletion) return
    
    try {
      setIsValidating(true)
      setValidationError(null)
      const result = await validateCompletion()
      setCanComplete(result.valid)
      if (!result.valid) {
        setValidationError(result.message || 'Please complete all required fields')
      }
    } catch (error) {
      setCanComplete(false)
      setValidationError('Unable to validate completion. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleReturn = () => {
    // Clear session storage context when user manually returns
    try {
      sessionStorage.removeItem('onboarding_context')
      console.log('OnboardingStepBanner: Cleared context - user manually returned to dashboard')
    } catch (error) {
      console.warn('OnboardingStepBanner: Failed to clear session storage', error)
    }
    
    router.push('/dashboard?tab=onboarding')
  }

  const handleComplete = async () => {
    // Run validation one more time before completing
    if (validateCompletion) {
      await checkCompletion()
      if (!canComplete) {
        return
      }
    }

    // Call the onComplete handler if provided
    if (onComplete) {
      try {
        await onComplete()
      } catch (error) {
        setValidationError('Failed to mark step as complete. Please try again.')
        return
      }
    }

    // Clear session storage context when step is completed
    try {
      sessionStorage.removeItem('onboarding_context')
      console.log('OnboardingStepBanner: Cleared context - step completed')
    } catch (error) {
      console.warn('OnboardingStepBanner: Failed to clear session storage', error)
    }

    // Trigger progress refresh event
    window.dispatchEvent(new CustomEvent('onboarding-step-completed', {
      detail: { step: stepId }
    }))

    // Return to onboarding dashboard with a small delay to ensure state cleanup
    setTimeout(() => {
      router.push('/dashboard?tab=onboarding&refresh=true')
    }, 100)
  }

  if (!isOnboarding) {
    return null
  }

  const step = ONBOARDING_STEPS[stepId]
  if (!step) return null

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            {canComplete ? (
              <CheckCircleIconSolid className="h-5 w-5 text-blue-600" />
            ) : (
              <ClockIcon className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              Onboarding: {step.title}
            </h3>
            <p className="text-sm text-blue-700">
              {validationError || (canComplete 
                ? completionMessage || 'Ready to continue to next step'
                : 'Complete this step to continue your setup'
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleReturn}
            className="px-3 py-1 text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Return to Checklist
          </button>
          
          <button
            onClick={handleComplete}
            disabled={!canComplete || isValidating}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              canComplete && !isValidating
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                Checking...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                Mark Complete & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}