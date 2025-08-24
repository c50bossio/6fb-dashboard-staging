'use client'

import { CheckCircleIcon, ArrowRightIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'
import confetti from 'canvas-confetti'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { extractUserData, formatForForm, getOnboardingStatus } from '@/lib/user-data-extractor'

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
    content: 'DYNAMIC_PROFILE_FORM' // Will be replaced with dynamic content
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
  const [formData, setFormData] = useState({})
  const [prePopulatedData, setPrePopulatedData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed')
    if (hasCompletedOnboarding) {
      setIsVisible(false)
      return
    }

    // Load user data and pre-populate forms
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error fetching user:', userError)
        setLoading(false)
        return
      }
      
      if (!currentUser) {
        console.log('No authenticated user found')
        setLoading(false)
        return
      }
      
      setUser(currentUser)
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()
      
      if (profileError) {
        console.error('Error fetching profile:', profileError)
      }
      
      // Extract and format user data
      const extractedData = extractUserData(currentUser)
      const formattedData = formatForForm(extractedData)
      const onboardingStatus = getOnboardingStatus(currentUser, profile)
      
      console.log('Pre-populated data:', formattedData)
      
      setPrePopulatedData(formattedData)
      setFormData({
        barbershopName: formattedData.barbershopName,
        numberOfBarbers: '1-3',
        primaryGoal: 'Increase bookings',
        ...formattedData
      })
      
      // Skip to appropriate step if partially completed
      if (onboardingStatus.nextStep === 'shop_creation') {
        setCurrentStep(2) // Skip to features step since profile is done
      } else if (onboardingStatus.nextStep === 'shop_association') {
        setCurrentStep(3) // Skip to integration step
      }
      
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSuggestionSelect = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      barbershopName: suggestion
    }))
  }

  const renderProfileForm = () => {
    if (!prePopulatedData) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-500"></div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Pre-population indicator */}
        {prePopulatedData.hasName && (
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <SparklesIcon className="h-5 w-5 text-olive-600 mr-2" />
              <span className="text-sm font-medium text-olive-800">
                We've pre-filled some information from your {prePopulatedData.provider === 'google' ? 'Google' : prePopulatedData.provider} account
              </span>
            </div>
          </div>
        )}

        {/* Barbershop Name with Suggestions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barbershop Name
          </label>
          <input
            type="text"
            value={formData.barbershopName || ''}
            onChange={(e) => handleFormChange('barbershopName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
            placeholder="Enter your barbershop name"
          />
          
          {/* Smart Suggestions */}
          {prePopulatedData.barbershopAlternatives?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">Suggestions based on your profile:</p>
              <div className="flex flex-wrap gap-2">
                {[prePopulatedData.barbershopName, ...prePopulatedData.barbershopAlternatives].filter(Boolean).slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-olive-100 border border-gray-200 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Number of Barbers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Barbers
          </label>
          <select 
            value={formData.numberOfBarbers || '1-3'}
            onChange={(e) => handleFormChange('numberOfBarbers', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            <option>1-3</option>
            <option>4-7</option>
            <option>8-15</option>
            <option>16+</option>
          </select>
        </div>

        {/* Primary Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Goal
          </label>
          <select 
            value={formData.primaryGoal || 'Increase bookings'}
            onChange={(e) => handleFormChange('primaryGoal', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            <option>Increase bookings</option>
            <option>Improve customer retention</option>
            <option>Streamline operations</option>
            <option>Grow revenue</option>
          </select>
        </div>

        {/* User Info Preview (for debugging/transparency) */}
        {prePopulatedData.hasName && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Profile information from {prePopulatedData.provider === 'google' ? 'Google' : prePopulatedData.provider}:
            </p>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              {prePopulatedData.avatar && (
                <img src={prePopulatedData.avatar} alt="Profile" className="w-8 h-8 rounded-full" />
              )}
              <div>
                <p className="font-medium">{prePopulatedData.displayName}</p>
                <p className="text-xs">{prePopulatedData.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

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
    localStorage.setItem('onboarding-data', JSON.stringify({
      ...userData,
      ...formData
    }))

    // Save to backend with form data
    try {
      const dataToSave = {
        ...userData,
        ...formData,
        prePopulatedData
      }
      
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })
    } catch (error) {
      console.error('Failed to save onboarding data:', error)
    }

    // Callback or redirect
    if (onComplete) {
      onComplete({ ...userData, ...formData })
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-500"></div>
              <span className="ml-3 text-gray-600">Loading your information...</span>
            </div>
          ) : step.content === 'DYNAMIC_PROFILE_FORM' ? (
            renderProfileForm()
          ) : (
            step.content
          )}
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