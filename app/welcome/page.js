'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/SupabaseAuthProvider'
import Link from 'next/link'
import {
  CheckCircleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowRightIcon,
  ClockIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

// Import new onboarding components
import RoleSelector from '../../components/onboarding/RoleSelector'
import GoalsSelector from '../../components/onboarding/GoalsSelector'
import ProgressTracker from '../../components/onboarding/ProgressTracker'
import ServiceSetup from '../../components/onboarding/ServiceSetup'
import FinancialSetup from '../../components/onboarding/FinancialSetup'
import LivePreview from '../../components/onboarding/LivePreview'
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist'

export default function WelcomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, updateProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorType, setErrorType] = useState(null)
  const [showOAuthError, setShowOAuthError] = useState(false)
  const [stripeSessionId, setStripeSessionId] = useState(null)
  
  // Onboarding data state - Pre-populate role based on subscription plan
  const planFromUrl = searchParams.get('plan')
  const getRoleFromPlan = (plan) => {
    switch(plan) {
      case 'barber':
        return 'individual_barber'
      case 'shop':
        return 'shop_owner'
      case 'enterprise':
        return 'enterprise_owner'
      default:
        return null
    }
  }
  
  const [onboardingData, setOnboardingData] = useState({
    // Step 1: Role & Goals - Pre-select based on subscription
    role: getRoleFromPlan(planFromUrl),
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

  // Define onboarding steps based on role and subscription
  const getSteps = () => {
    // Skip role selection if we have a pre-selected role from subscription
    const hasPreselectedRole = getRoleFromPlan(planFromUrl) !== null
    
    const baseSteps = hasPreselectedRole ? [
      { id: 'goals', label: 'Your Goals', sublabel: 'What matters most', timeEstimate: 1 },
      { id: 'business', label: 'Business Info', sublabel: 'Basic details', timeEstimate: 2 },
      { id: 'services', label: 'Services', sublabel: 'What you offer', timeEstimate: 3 },
      { id: 'preview', label: 'Preview', sublabel: 'See your page', timeEstimate: 1 }
    ] : [
      { id: 'role', label: 'Role & Goals', sublabel: 'Tell us about you', timeEstimate: 1 },
      { id: 'business', label: 'Business Info', sublabel: 'Basic details', timeEstimate: 2 },
      { id: 'services', label: 'Services', sublabel: 'What you offer', timeEstimate: 3 },
      { id: 'preview', label: 'Preview', sublabel: 'See your page', timeEstimate: 1 }
    ]
    
    // Add financial step for shop owners and enterprise owners
    // Check both the current role and plan from URL to ensure financial step is included
    const currentRole = onboardingData.role
    const planRole = getRoleFromPlan(planFromUrl)
    const needsFinancialStep = currentRole === 'shop_owner' || 
                               currentRole === 'enterprise_owner' ||
                               planRole === 'shop_owner' || 
                               planRole === 'enterprise_owner' ||
                               planFromUrl === 'shop' ||
                               planFromUrl === 'enterprise'
    
    if (needsFinancialStep) {
      baseSteps.splice(-1, 0, {
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
    // Check for OAuth error parameters and Stripe session
    const error = searchParams.get('error')
    const from = searchParams.get('from')
    const stripeSession = searchParams.get('stripe_session')
    const setup = searchParams.get('setup')
    
    console.log('👋 Welcome page loaded, error:', error, 'from:', from, 'stripe_session:', stripeSession)
    
    // Handle Stripe session recovery
    if (stripeSession && setup === 'initial') {
      console.log('💳 Stripe session detected, user paid but needs account setup')
      setStripeSessionId(stripeSession)
      // Allow user to continue with onboarding even without auth session
      return
    }
    
    if (error === 'session_timeout' && from === 'oauth_success') {
      console.log('🚨 OAuth session timeout detected')
      setErrorType(error)
      setShowOAuthError(true)
      return
    }
    
    // Handle successful payment redirect without session
    if (from === 'payment_success') {
      console.log('✅ User completed payment, allowing onboarding')
      // Continue with normal onboarding flow
      return
    }
    
    // Don't redirect immediately - give auth time to load
    const timer = setTimeout(() => {
      // If coming from payment success, don't require auth
      if ((from === 'payment_success' || stripeSession) && !user) {
        console.log('💳 Payment successful but no auth - allowing onboarding anyway')
        return
      }
      
      if (!user && !profile && !showOAuthError && !stripeSession && from !== 'payment_success') {
        console.log('⚠️ No user found after waiting, redirecting to login')
        router.push('/login')
      }
    }, 2000) // Wait 2 seconds for auth to load
    
    return () => clearTimeout(timer)
  }, [user, profile, router, searchParams, showOAuthError])

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

  const handleRetryOAuth = () => {
    console.log('🔄 Retrying OAuth flow...')
    setShowOAuthError(false)
    router.push('/pricing')
  }

  const handleManualLogin = () => {
    console.log('🔐 Going to manual login...')
    setShowOAuthError(false)
    router.push('/login')
  }

  // Show OAuth error state
  if (showOAuthError && errorType === 'session_timeout') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              OAuth Session Issue
            </h1>
            <p className="text-gray-600 mb-6">
              Your Google sign-in was successful, but we had trouble loading your session in the browser. 
              This can happen due to browser security settings or network issues.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRetryOAuth}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Try Google Sign-In Again
              </button>
              <button
                onClick={handleManualLogin}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Use Email & Password Instead
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Need help? Contact support at{' '}
                <a href="mailto:support@bookedbarber.com" className="text-blue-600 hover:text-blue-700">
                  support@bookedbarber.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 to-white py-8">
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
            <div className="flex items-center justify-between mb-4">
              {currentStep > 0 ? (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-1" />
                  Back
                </button>
              ) : (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-1" />
                  Back to Dashboard
                </button>
              )}
              
              {/* Skip Setup button - available on all steps except the last */}
              {currentStep < steps.length - 1 && (
                <button
                  onClick={handleSkipSetup}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Skip Setup for Now
                </button>
              )}
            </div>

            {/* Step Content */}
            {steps[currentStep]?.id === 'role' && (
              <RoleSelector
                onComplete={(data) => handleStepComplete(data)}
                initialData={onboardingData}
              />
            )}

            {steps[currentStep]?.id === 'goals' && (
              <GoalsSelector
                onComplete={(data) => handleStepComplete(data)}
                initialData={onboardingData}
                subscriptionTier={planFromUrl || 'shop'}
              />
            )}

            {steps[currentStep]?.id === 'business' && (
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-olive-500 focus:border-olive-500"
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-olive-500 focus:border-olive-500"
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-olive-500 focus:border-olive-500"
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-olive-500 focus:border-olive-500"
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
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-olive-500 focus:border-olive-500"
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
                            ? 'border-olive-500 bg-olive-50 text-olive-700'
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
                        ? 'bg-olive-600 text-white hover:bg-olive-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {steps[currentStep]?.id === 'services' && (
              <ServiceSetup
                onComplete={(data) => handleStepComplete(data)}
                initialData={onboardingData}
                businessType={onboardingData.businessType}
                location={onboardingData.businessAddress}
              />
            )}

            {steps[currentStep]?.id === 'financial' && (
              <FinancialSetup
                onComplete={(data) => handleStepComplete(data)}
                initialData={onboardingData}
                subscriptionTier={planFromUrl || 'shop'}
              />
            )}

            {steps[currentStep]?.id === 'preview' && (
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
                      className="px-6 py-3 bg-olive-600 text-white rounded-lg font-medium hover:bg-olive-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
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
            <Link href="/help" className="text-olive-600 hover:text-olive-500 font-medium">
              Visit our Help Center
            </Link>
            {' '}or{' '}
            <Link href="/contact" className="text-olive-600 hover:text-olive-500 font-medium">
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