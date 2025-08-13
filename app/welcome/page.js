'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/SupabaseAuthProvider'
import Link from 'next/link'
import {
  CheckCircleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowRightIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

// Import new onboarding components
import RoleSelector from '../../components/onboarding/RoleSelector'
import ProgressTracker from '../../components/onboarding/ProgressTracker'
import ServiceSetup from '../../components/onboarding/ServiceSetup'
import LivePreview from '../../components/onboarding/LivePreview'
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist'

export default function WelcomePage() {
  const router = useRouter()
  const { user, profile, updateProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Onboarding data state
  const [onboardingData, setOnboardingData] = useState({
    // Step 1: Role & Goals
    role: null,
    goals: [],
    businessSize: '',
    
    // Step 2: Business Info
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessType: 'barbershop',
    businessHours: null,
    customDomain: '',
    
    // Step 3: Services
    services: [],
    
    // Step 4: Branding (optional)
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    logoUrl: '',
    bio: '',
    
    // Progress tracking
    completedSteps: []
  })

  // Define onboarding steps based on role
  const getSteps = () => {
    const baseSteps = [
      { id: 'role', label: 'Role & Goals', sublabel: 'Tell us about you', timeEstimate: 1 },
      { id: 'business', label: 'Business Info', sublabel: 'Basic details', timeEstimate: 2 },
      { id: 'services', label: 'Services', sublabel: 'What you offer', timeEstimate: 3 },
      { id: 'preview', label: 'Preview', sublabel: 'See your page', timeEstimate: 1 }
    ]
    
    // Add extra steps for shop owners
    if (onboardingData.role === 'shop_owner' || onboardingData.role === 'enterprise') {
      baseSteps.splice(3, 0, {
        id: 'financial',
        label: 'Financials',
        sublabel: 'Payment setup',
        timeEstimate: 2
      })
    }
    
    return baseSteps
  }

  const steps = getSteps()

  useEffect(() => {
    // Don't redirect immediately - give auth time to load
    const timer = setTimeout(() => {
      if (!user && !profile) {
        console.log('⚠️ No user found after waiting, redirecting to login')
        router.push('/login')
      }
    }, 2000) // Wait 2 seconds for auth to load
    
    return () => clearTimeout(timer)
  }, [user, profile, router])

  // Load saved progress from backend
  useEffect(() => {
    if (user?.id) {
      loadSavedProgress()
    }
  }, [user])

  const loadSavedProgress = async () => {
    try {
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.steps && data.steps.length > 0) {
          // Merge all step data into onboardingData
          let mergedData = { ...onboardingData }
          data.steps.forEach(step => {
            if (step.step_data) {
              mergedData = { ...mergedData, ...step.step_data }
            }
          })
          setOnboardingData(mergedData)
          
          // Set current step based on progress
          if (data.currentStep) {
            setCurrentStep(data.currentStep)
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved progress:', error)
      // Fall back to localStorage if API fails
      const savedData = localStorage.getItem(`onboarding_${user.id}`)
      if (savedData) {
        setOnboardingData(JSON.parse(savedData))
      }
    }
  }

  const saveProgress = async (data, stepName = null) => {
    if (user?.id) {
      // Save to localStorage as backup
      localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(data))
      
      // Save to backend if step name provided
      if (stepName && !isSaving) {
        setIsSaving(true)
        try {
          const response = await fetch('/api/onboarding/save-progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              step: stepName,
              stepData: data
            })
          })
          
          if (!response.ok) {
            console.error('Failed to save progress to backend')
          }
        } catch (error) {
          console.error('Error saving progress:', error)
        } finally {
          setIsSaving(false)
        }
      }
    }
  }

  const handleStepComplete = (stepData) => {
    const updatedData = { ...onboardingData, ...stepData }
    setOnboardingData(updatedData)
    
    // Save progress with step name
    const stepName = steps[currentStep]?.id
    saveProgress(updatedData, stepName)
    
    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBusinessUpdate = (e) => {
    const { name, value } = e.target
    const updatedData = { ...onboardingData, [name]: value }
    setOnboardingData(updatedData)
    saveProgress(updatedData, 'business')
  }

  const handleCompleteSetup = async () => {
    setIsLoading(true)
    try {
      // Call the complete onboarding API endpoint
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          onboardingData
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        // Clear onboarding data from localStorage
        if (user?.id) {
          localStorage.removeItem(`onboarding_${user.id}`)
        }
        
        // Show checklist on dashboard
        localStorage.setItem('show_onboarding_checklist', 'true')
        
        // Store barbershop ID for future use
        if (result.barbershopId) {
          localStorage.setItem('barbershop_id', result.barbershopId)
        }
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        // Handle partial success or errors
        if (result.results?.errors && result.results.errors.length > 0) {
          const errorMessages = result.results.errors.map(e => e.error).join(', ')
          alert(`Some steps completed with errors: ${errorMessages}`)
        } else {
          alert(result.message || 'Failed to complete onboarding. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('Failed to complete setup. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipSetup = () => {
    // Allow users to skip and complete later
    localStorage.setItem('show_onboarding_checklist', 'true')
    router.push('/dashboard')
  }

  const handleStepClick = (stepIndex) => {
    // Allow going back to previous steps
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex)
    }
  }

  // Generate business slug from name
  const generateSlug = (name) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const businessSlug = generateSlug(onboardingData.businessName || 'your-business')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to BookedBarber! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Let's get your business set up in just a few minutes
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="mb-8">
          <ProgressTracker
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Main Content Area - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form Steps */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Back Button */}
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Back
              </button>
            )}

            {/* Step Content */}
            {currentStep === 0 && (
              <RoleSelector
                onComplete={(data) => handleStepComplete(data)}
                initialData={onboardingData}
              />
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Tell us about your business
                </h2>
                
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      value={onboardingData.businessName}
                      onChange={handleBusinessUpdate}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Elite Cuts Barbershop"
                    />
                  </div>
                  {onboardingData.businessName && (
                    <p className="mt-1 text-xs text-gray-500">
                      Your booking URL: bookedbarber.com/{businessSlug}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Domain (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <input
                      id="customDomain"
                      name="customDomain"
                      type="text"
                      value={onboardingData.customDomain || ''}
                      onChange={handleBusinessUpdate}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="www.yourshop.com"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Connect your own domain for a professional look. You can set this up later.
                  </p>
                </div>

                <div>
                  <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="businessAddress"
                      name="businessAddress"
                      type="text"
                      value={onboardingData.businessAddress}
                      onChange={handleBusinessUpdate}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="businessPhone"
                      name="businessPhone"
                      type="tel"
                      value={onboardingData.businessPhone}
                      onChange={handleBusinessUpdate}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={onboardingData.businessType}
                    onChange={handleBusinessUpdate}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="barbershop">Barbershop</option>
                    <option value="salon">Hair Salon</option>
                    <option value="premium">Premium Grooming Lounge</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Business Hours Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Hours Template
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['9-5', '10-7', 'Custom'].map((template) => (
                      <button
                        key={template}
                        onClick={() => setOnboardingData({
                          ...onboardingData,
                          businessHours: template
                        })}
                        className={`py-2 px-3 rounded-md border text-sm font-medium transition-all ${
                          onboardingData.businessHours === template
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleStepComplete({
                      businessName: onboardingData.businessName,
                      businessAddress: onboardingData.businessAddress,
                      businessPhone: onboardingData.businessPhone,
                      businessType: onboardingData.businessType,
                      businessHours: onboardingData.businessHours
                    })}
                    disabled={!onboardingData.businessName}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      onboardingData.businessName
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <ServiceSetup
                onComplete={(data) => handleStepComplete(data)}
                initialData={onboardingData}
                businessType={onboardingData.businessType}
                location={onboardingData.businessAddress}
              />
            )}

            {currentStep === steps.length - 1 && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Your booking page is ready! 🎊
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Review your setup and start accepting bookings
                  </p>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-medium">
                      Your booking link is live:
                    </p>
                    <p className="text-green-900 font-mono text-lg mt-1">
                      bookedbarber.com/{businessSlug}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleCompleteSetup}
                      disabled={isLoading || isSaving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      {isLoading || isSaving ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>{isSaving ? 'Saving...' : 'Setting up...'}</span>
                        </>
                      ) : 'Go to Dashboard'}
                    </button>
                    <button
                      onClick={handleSkipSetup}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Continue Setup Later
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Live Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Live Preview
            </h3>
            <LivePreview
              businessData={onboardingData}
              services={onboardingData.services}
              brandingData={{
                primaryColor: onboardingData.primaryColor,
                secondaryColor: onboardingData.secondaryColor,
                logoUrl: onboardingData.logoUrl
              }}
              slug={businessSlug}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p>
            Need help getting started?{' '}
            <Link href="/help" className="text-blue-600 hover:text-blue-500 font-medium">
              Visit our Help Center
            </Link>
            {' '}or{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500 font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>

      {/* Onboarding Checklist (shown after basic setup) */}
      {showChecklist && (
        <OnboardingChecklist
          completedItems={onboardingData.completedSteps}
          onItemClick={(item) => {
            if (item.link) {
              router.push(item.link)
            }
          }}
          minimized={false}
          onToggleMinimize={(minimized) => setShowChecklist(!minimized)}
        />
      )}
    </div>
  )
}