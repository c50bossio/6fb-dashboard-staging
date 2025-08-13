'use client'

import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

const TUTORIALS = {
  dashboard: [
    {
      target: '[data-tutorial="metrics"]',
      title: 'Key Metrics',
      content: 'Monitor your barbershop performance with real-time metrics. Track bookings, revenue, and customer satisfaction at a glance.',
      position: 'bottom'
    },
    {
      target: '[data-tutorial="ai-chat"]',
      title: 'AI Assistant',
      content: 'Ask questions, get insights, and receive recommendations from your AI business assistant.',
      position: 'left'
    },
    {
      target: '[data-tutorial="quick-actions"]',
      title: 'Quick Actions',
      content: 'Access frequently used features like creating bookings, viewing schedule, and managing staff.',
      position: 'top'
    }
  ],
  booking: [
    {
      target: '[data-tutorial="calendar"]',
      title: 'Booking Calendar',
      content: 'View and manage all appointments. Click any time slot to create a new booking.',
      position: 'right'
    },
    {
      target: '[data-tutorial="services"]',
      title: 'Service Selection',
      content: 'Choose from your service menu. Prices and duration are automatically calculated.',
      position: 'left'
    },
    {
      target: '[data-tutorial="barber-select"]',
      title: 'Barber Assignment',
      content: 'Assign bookings to specific barbers or let the system auto-assign based on availability.',
      position: 'bottom'
    }
  ],
  analytics: [
    {
      target: '[data-tutorial="date-range"]',
      title: 'Date Range Selection',
      content: 'Filter analytics by custom date ranges to analyze trends over time.',
      position: 'bottom'
    },
    {
      target: '[data-tutorial="charts"]',
      title: 'Performance Charts',
      content: 'Visual representations of your business metrics. Hover for detailed information.',
      position: 'top'
    },
    {
      target: '[data-tutorial="export"]',
      title: 'Export Reports',
      content: 'Download detailed reports in PDF or CSV format for offline analysis.',
      position: 'left'
    }
  ]
}

export default function TutorialSystem({ tutorial = 'dashboard', onComplete }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [highlightBox, setHighlightBox] = useState(null)
  const overlayRef = useRef(null)

  const steps = TUTORIALS[tutorial] || []
  const currentTutorial = steps[currentStep]

  useEffect(() => {
    // Check if tutorial has been completed
    const completedTutorials = JSON.parse(localStorage.getItem('completed-tutorials') || '[]')
    if (!completedTutorials.includes(tutorial)) {
      // Auto-start tutorial for new users
      const timer = setTimeout(() => {
        startTutorial()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [tutorial])

  useEffect(() => {
    if (isActive && currentTutorial) {
      positionTooltip()
    }
  }, [isActive, currentStep])

  const startTutorial = () => {
    setIsActive(true)
    setCurrentStep(0)
    document.body.style.overflow = 'hidden'
  }

  const endTutorial = (completed = false) => {
    setIsActive(false)
    document.body.style.overflow = ''
    
    if (completed) {
      // Mark tutorial as completed
      const completedTutorials = JSON.parse(localStorage.getItem('completed-tutorials') || '[]')
      if (!completedTutorials.includes(tutorial)) {
        completedTutorials.push(tutorial)
        localStorage.setItem('completed-tutorials', JSON.stringify(completedTutorials))
      }
      
      if (onComplete) onComplete()
    }
  }

  const positionTooltip = () => {
    if (!currentTutorial) return

    const targetElement = document.querySelector(currentTutorial.target)
    if (!targetElement) {
      console.warn(`Tutorial target not found: ${currentTutorial.target}`)
      return
    }

    const rect = targetElement.getBoundingClientRect()
    const tooltipWidth = 320
    const tooltipHeight = 200
    const padding = 20

    // Create highlight box
    setHighlightBox({
      top: rect.top - 10,
      left: rect.left - 10,
      width: rect.width + 20,
      height: rect.height + 20
    })

    // Calculate tooltip position
    let top = 0
    let left = 0

    switch (currentTutorial.position) {
      case 'top':
        top = rect.top - tooltipHeight - padding
        left = rect.left + (rect.width - tooltipWidth) / 2
        break
      case 'bottom':
        top = rect.bottom + padding
        left = rect.left + (rect.width - tooltipWidth) / 2
        break
      case 'left':
        top = rect.top + (rect.height - tooltipHeight) / 2
        left = rect.left - tooltipWidth - padding
        break
      case 'right':
        top = rect.top + (rect.height - tooltipHeight) / 2
        left = rect.right + padding
        break
      default:
        top = rect.bottom + padding
        left = rect.left
    }

    // Ensure tooltip stays within viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))

    setPosition({ top, left })

    // Scroll element into view
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      endTutorial(true)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isActive) {
    return (
      <button
        onClick={startTutorial}
        className="fixed bottom-4 left-4 z-40 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
      >
        <span className="text-lg">💡</span>
        <span>Start Tutorial</span>
      </button>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-60 z-[9998]"
        onClick={() => endTutorial(false)}
      />

      {/* Highlight Box */}
      {highlightBox && (
        <div
          className="fixed border-4 border-purple-500 rounded-lg z-[9999] pointer-events-none animate-pulse"
          style={{
            top: `${highlightBox.top}px`,
            left: `${highlightBox.left}px`,
            width: `${highlightBox.width}px`,
            height: `${highlightBox.height}px`
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[10000] bg-white rounded-lg shadow-2xl p-6 w-80 animate-in fade-in slide-in-from-bottom-2"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
      >
        {/* Close button */}
        <button
          onClick={() => endTutorial(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Close tutorial"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {currentTutorial?.title}
          </h3>
          <p className="text-sm text-gray-600">
            {currentTutorial?.content}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center space-x-1 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-purple-600'
                  : index < currentStep
                  ? 'bg-purple-300'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-colors ${
              currentStep === 0
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <span className="text-sm text-gray-500">
            {currentStep + 1} of {steps.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
          >
            <span>{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}