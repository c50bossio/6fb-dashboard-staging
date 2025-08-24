'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function OnboardingReturnBanner({ currentStep, onComplete }) {
  const router = useRouter()
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [returnPath, setReturnPath] = useState('/dashboard')

  useEffect(() => {
    // Check if user is in onboarding flow
    const onboardingActive = sessionStorage.getItem('onboarding_active') === 'true'
    const onboardingStep = sessionStorage.getItem('onboarding_current_step')
    const returnUrl = sessionStorage.getItem('onboarding_return_path') || '/dashboard'
    
    setIsOnboarding(onboardingActive && onboardingStep === currentStep)
    setReturnPath(returnUrl)
  }, [currentStep])

  const handleReturn = () => {
    // Keep onboarding active but clear the current step
    sessionStorage.removeItem('onboarding_current_step')
    router.push(returnPath)
  }

  const handleComplete = () => {
    // Mark this step as complete and return to dashboard
    if (onComplete) {
      onComplete()
    }
    sessionStorage.removeItem('onboarding_current_step')
    
    // Dispatch custom event to trigger progress refresh
    window.dispatchEvent(new CustomEvent('onboarding-step-completed', {
      detail: { step: currentStep }
    }))
    
    router.push(returnPath)
  }

  if (!isOnboarding) {
    return null
  }

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <CheckCircleIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              Onboarding in Progress
            </h3>
            <p className="text-sm text-blue-700">
              Complete this step to continue your setup
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReturn}
            className="px-3 py-1 text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Return to Checklist
          </button>
          <button
            onClick={handleComplete}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mark Complete & Continue
          </button>
        </div>
      </div>
    </div>
  )
}