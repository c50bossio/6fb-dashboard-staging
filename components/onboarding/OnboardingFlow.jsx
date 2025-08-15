'use client'

import { CheckCircleIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import confetti from 'canvas-confetti'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to 6FB AI Agent System',
    description: 'Let\'s get you started with a quick tour of the platform',
    content: (
      <div className="text-center">
        <div className="mb-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-olive-500 to-gold-600 rounded-full flex items-center justify-center">
            <span className="text-4xl text-white">👋</span>
          </div>
        </div>
        <p className="text-gray-600">
          We're excited to have you here! This quick setup will help you get the most out of our AI-powered barbershop management system.
        </p>
      </div>
    )
  },
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Tell us about your barbershop',
    content: (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barbershop Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
            placeholder="Elite Cuts Barbershop"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Barbers
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500">
            <option>1-3</option>
            <option>4-7</option>
            <option>8-15</option>
            <option>16+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Goal
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500">
            <option>Increase bookings</option>
            <option>Improve customer retention</option>
            <option>Streamline operations</option>
            <option>Grow revenue</option>
          </select>
        </div>
      </div>
    )
  },
  {
    id: 'features',
    title: 'Key Features',
    description: 'Discover what you can do',
    content: (
      <div className="space-y-4">
        {[
          { icon: '📅', title: 'Smart Booking', desc: 'AI-powered scheduling that maximizes your time' },
          { icon: '🤖', title: 'AI Assistant', desc: 'Get instant insights and recommendations' },
          { icon: '📊', title: 'Analytics', desc: 'Track performance and identify growth opportunities' },
          { icon: '💰', title: 'Financial Management', desc: 'Handle payments, commissions, and payouts' }
        ].map((feature) => (
          <div key={feature.title} className="flex items-start space-x-3">
            <span className="text-2xl">{feature.icon}</span>
            <div>
              <h4 className="font-medium text-gray-900">{feature.title}</h4>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'integration',
    title: 'Connect Your Tools',
    description: 'Integrate with services you already use',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Connect your existing tools to unlock the full potential of the platform.
        </p>
        <div className="space-y-3">
          {[
            { name: 'Google Calendar', connected: false },
            { name: 'Stripe Payments', connected: false },
            { name: 'Instagram', connected: false },
            { name: 'SMS Notifications', connected: false }
          ].map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <span className="font-medium">{integration.name}</span>
              <button className="px-3 py-1 text-sm bg-olive-600 text-white rounded-md hover:bg-olive-700">
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start managing your barbershop like a pro',
    content: (
      <div className="text-center">
        <div className="mb-6">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
        </div>
        <p className="text-gray-600 mb-6">
          Congratulations! Your account is set up and ready to go. You can always adjust these settings later.
        </p>
        <div className="space-y-2">
          <button className="w-full px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700">
            Go to Dashboard
          </button>
          <button className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Take a Tour
          </button>
        </div>
      </div>
    )
  }
]

export default function OnboardingFlow({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [userData, setUserData] = useState({})
  const router = useRouter()

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed')
    if (hasCompletedOnboarding) {
      setIsVisible(false)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setIsVisible(false)
    if (onSkip) onSkip()
  }

  const completeOnboarding = async () => {
    // Trigger celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })

    // Save completion status
    localStorage.setItem('onboarding-completed', 'true')
    localStorage.setItem('onboarding-data', JSON.stringify(userData))

    // Save to backend
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
    } catch (error) {
      console.error('Failed to save onboarding data:', error)
    }

    // Callback or redirect
    if (onComplete) {
      onComplete(userData)
    } else {
      setTimeout(() => {
        setIsVisible(false)
        router.push('/dashboard')
      }, 2000)
    }
  }

  if (!isVisible) return null

  const step = ONBOARDING_STEPS[currentStep]
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Skip onboarding"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-olive-500 to-gold-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step.content}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                currentStep === 0
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Previous
            </button>

            <div className="flex items-center space-x-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-olive-600'
                      : index < currentStep
                      ? 'bg-olive-300'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-olive-600 text-white text-sm font-medium rounded-md hover:bg-olive-700 transition-colors flex items-center space-x-2"
            >
              <span>{currentStep === ONBOARDING_STEPS.length - 1 ? 'Complete' : 'Next'}</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}