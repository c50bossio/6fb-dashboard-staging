'use client'

/**
 * OnboardingWrapper
 * 
 * Example wrapper component showing how to integrate the enhanced 
 * onboarding system with progress indicators and conflict resolution
 */

import { useState } from 'react'
import { OnboardingProvider } from '@/contexts/OnboardingContext'
import BookingRulesSetup from './BookingRulesSetup'
import OnboardingProgressIndicator from './OnboardingProgressIndicator'
import StaffSetup from './StaffSetup'
import CompensationSetup from './CompensationSetup'

const ONBOARDING_STEPS = [
  { key: 'compensation_setup', label: 'Compensation Setup', component: CompensationSetup },
  { key: 'staff_setup', label: 'Staff Setup', component: StaffSetup },
  { key: 'booking_rules', label: 'Booking Rules', component: BookingRulesSetup },
  // Add more steps as needed
  { key: 'financial_setup', label: 'Financial Setup', component: () => <div>Financial Setup - Coming Soon</div> },
  { key: 'business_setup', label: 'Business Setup', component: () => <div>Business Setup - Coming Soon</div> }
]

export default function OnboardingWrapper() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(new Set())

  const currentStep = ONBOARDING_STEPS[currentStepIndex]
  const CurrentStepComponent = currentStep?.component

  const handleStepComplete = (data) => {

    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep.key]))
    
    // Move to next step
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      
      // Handle onboarding completion
    }
  }

  const handleStepChange = (stepIndex) => {
    setCurrentStepIndex(stepIndex)
  }

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Progress Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Progress Indicator */}
                <OnboardingProgressIndicator 
                  currentSession={currentStep.key}
                  className="shadow-sm"
                />

                {/* Step Navigation */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Steps
                  </h3>
                  <nav className="space-y-2">
                    {ONBOARDING_STEPS.map((step, index) => {
                      const isCompleted = completedSteps.has(step.key)
                      const isCurrent = index === currentStepIndex
                      const isAccessible = index <= currentStepIndex || isCompleted
                      
                      return (
                        <button
                          key={step.key}
                          onClick={() => isAccessible && handleStepChange(index)}
                          disabled={!isAccessible}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isCurrent
                              ? 'bg-brand-100 text-brand-800 border border-brand-200'
                              : isCompleted
                              ? 'bg-green-50 text-green-800 hover:bg-green-100'
                              : isAccessible
                              ? 'text-gray-600 hover:bg-gray-50'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              isCompleted
                                ? 'bg-green-400'
                                : isCurrent
                                ? 'bg-brand-400'
                                : 'bg-gray-300'
                            }`} />
                            <span>{step.label}</span>
                          </div>
                        </button>
                      )
                    })}
                  </nav>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">
                        {currentStep.label}
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round(((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100)}% Complete
                    </div>
                  </div>
                </div>

                {/* Step Content */}
                <div className="px-6 py-8">
                  {CurrentStepComponent && (
                    <CurrentStepComponent
                      onComplete={handleStepComplete}
                      updateData={(data) => {
                        // Handle data updates if needed
                        
                      }}
                    />
                  )}
                </div>

                {/* Footer Navigation */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                  <button
                    onClick={() => currentStepIndex > 0 && handleStepChange(currentStepIndex - 1)}
                    disabled={currentStepIndex === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleStepComplete({})}
                      className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                    >
                      {currentStepIndex === ONBOARDING_STEPS.length - 1 ? 'Complete Onboarding' : 'Continue'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnboardingProvider>
  )
}