'use client'

import { CheckIcon } from '@heroicons/react/24/solid'

export default function ProgressTracker({ 
  steps = [], 
  currentStep = 0,
  onStepClick = null 
}) {
  const progress = ((currentStep) / steps.length) * 100

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-olive-600 transition-all duration-500 ease-out"
          />
        </div>
        
        {/* Progress Percentage */}
        <div className="absolute -top-8 left-0 text-sm font-medium text-gray-600">
          {Math.round(progress)}% Complete
        </div>
        
        {/* Time Estimate */}
        {currentStep < steps.length && (
          <div className="absolute -top-8 right-0 text-sm text-gray-500">
            {steps.slice(currentStep).reduce((acc, step) => acc + (step.timeEstimate || 1), 0)} min remaining
          </div>
        )}
      </div>

      {/* Step Indicators */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isClickable = onStepClick && (isCompleted || isCurrent)
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  isClickable ? 'cursor-pointer' : ''
                }`}
                onClick={() => isClickable && onStepClick(index)}
              >
                {/* Step Circle */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-olive-600 text-white ring-4 ring-olive-100'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                  
                  {/* Current Step Pulse Animation */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-olive-600 animate-ping opacity-30" />
                  )}
                </div>
                
                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    isCurrent ? 'text-olive-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  {step.sublabel && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {step.sublabel}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile View - Simplified */}
      <div className="md:hidden mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {steps[currentStep]?.label}
          </span>
        </div>
      </div>
    </div>
  )
}