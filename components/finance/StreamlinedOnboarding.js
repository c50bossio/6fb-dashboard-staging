'use client'

import {
  BanknotesIcon,
  ScaleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Card } from '../ui/card'
import Button from '../ui/Button'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export default function StreamlinedOnboarding({ financeContext, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  
  // Onboarding data
  const [onboardingData, setOnboardingData] = useState({
    // Step 1: Quick Connect (prefilled from profile)
    businessInfo: {
      name: '', // Will be prefilled
      type: 'individual',
      phone: '',
      website: ''
    },
    // Step 2: Payment Model
    paymentModel: {
      type: 'commission', // commission | booth_rent | hybrid
      commissionRate: 0.30, // Shop takes 30%, barber gets 70%
      boothRentAmount: 1500,
      hybridBaseRent: 800,
      hybridCommissionRate: 0.15
    },
    // Step 3: Banking
    bankingComplete: false
  })

  // Prefill form data from existing profile/barbershop info
  useEffect(() => {
    if (financeContext?.barbershop || financeContext?.profile) {
      const { barbershop, profile } = financeContext
      
      setOnboardingData(prev => ({
        ...prev,
        businessInfo: {
          ...prev.businessInfo,
          name: barbershop?.name || profile?.business_name || prev.businessInfo.name,
          phone: barbershop?.phone || profile?.phone || prev.businessInfo.phone,
          website: barbershop?.website || profile?.website || prev.businessInfo.website,
          type: barbershop?.business_type || 'individual'
        }
      }))
    }
  }, [financeContext])

  const steps = [
    {
      id: 1,
      title: 'Quick Connect',
      description: 'Connect your Stripe account to accept payments',
      icon: BanknotesIcon,
      timeEstimate: '30 seconds'
    },
    {
      id: 2,
      title: 'Payment Model',
      description: 'Choose how you want to compensate your staff',
      icon: ScaleIcon,
      timeEstimate: '1 minute'
    },
    {
      id: 3,
      title: 'Activate',
      description: 'Review and activate your payment system',
      icon: CheckCircleIcon,
      timeEstimate: '30 seconds'
    }
  ]

  const handleQuickConnect = async () => {
    setProcessing(true)
    console.log('🚀 [STRIPE CONNECT] Starting Stripe Connect process...')
    
    try {
      // Validate required data
      console.log('📊 [STRIPE CONNECT] Validating data:', {
        barbershopId: financeContext?.barbershopId,
        businessName: onboardingData.businessInfo.name,
        businessType: onboardingData.businessInfo.type,
        phone: onboardingData.businessInfo.phone,
        website: onboardingData.businessInfo.website
      })

      if (!financeContext?.barbershopId) {
        throw new Error('Barbershop ID is required. Please refresh the page and try again.')
      }
      
      if (!onboardingData.businessInfo.name?.trim()) {
        throw new Error('Business name is required. Please enter your business name.')
      }

      // Prepare API request payload
      const requestPayload = {
        barbershopId: financeContext.barbershopId,
        businessInfo: {
          name: onboardingData.businessInfo.name.trim(),
          type: onboardingData.businessInfo.type,
          phone: onboardingData.businessInfo.phone?.trim() || null,
          url: onboardingData.businessInfo.website?.trim() || null
        }
      }

      console.log('📤 [STRIPE CONNECT] Making API request:', requestPayload)

      // Development mode bypass - skip authentication
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      let headers = { 'Content-Type': 'application/json' }
      
      if (isDevelopment) {
        console.log('🔧 [STRIPE CONNECT] Development mode - skipping authentication')
      } else {
        // Production authentication flow
        console.log('🔐 [STRIPE CONNECT] Getting authentication user...')
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('❌ [STRIPE CONNECT] User error:', userError)
          throw new Error(`Authentication error: ${userError.message}`)
        }
        
        if (!user) {
          console.error('❌ [STRIPE CONNECT] No user found')
          throw new Error('Authentication required. Please log in again.')
        }

        // Get session for access token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Session required for API access.')
        }

        console.log('✅ [STRIPE CONNECT] Authentication successful for user:', user.email)
        
        // Add authorization header for production
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Call the existing orchestrateSetup API
      const response = await fetch('/api/stripe/unified/orchestrateSetup', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      })

      console.log('📥 [STRIPE CONNECT] API response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
          console.error('❌ [STRIPE CONNECT] API error response:', errorData)
        } catch (parseError) {
          console.error('❌ [STRIPE CONNECT] Failed to parse error response:', parseError)
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(errorData.error || errorData.message || `API request failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ [STRIPE CONNECT] API response data:', result)

      // Check if setup_url is available (API returns it directly, not in a nested object)
      if (result.setup_url) {
        // Handle different status types
        if (result.status === 'completed') {
          // Account already onboarded, open dashboard
          toast.success('Account already set up! Opening dashboard...')
          window.open(result.setup_url, '_blank', 'width=1200,height=800')
          
          // Mark as complete and move to next step
          setCompletedSteps(prev => new Set([...prev, 1]))
          setCurrentStep(2)
        } else if (result.status === 'onboarding_required') {
          // New onboarding flow
          toast.success('Opening Stripe setup...')
          const stripeWindow = window.open(result.setup_url, '_blank', 'width=800,height=600')
          
          // Monitor for completion
          const checkCompletion = setInterval(() => {
            if (stripeWindow.closed) {
              clearInterval(checkCompletion)
              // Verify completion after user closes window
              setTimeout(() => {
                verifyStripeConnection()
              }, 2000)
            }
          }, 1000)
        } else {
          // Unknown status, but we have a setup_url
          toast.success('Opening Stripe setup...')
          window.open(result.setup_url, '_blank', 'width=800,height=600')
        }
      } else {
        throw new Error(result.error || 'No setup URL received from Stripe')
      }
    } catch (error) {
      console.error('❌ [STRIPE CONNECT] Quick connect error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error: error
      })
      
      // ENHANCED ERROR LOGGING - Log all possible error information
      console.error('🚨 [STRIPE CONNECT] COMPLETE ERROR BREAKDOWN:')
      console.error('  → Error Message:', error.message)
      console.error('  → Error Name:', error.name)
      console.error('  → Error Stack:', error.stack)
      console.error('  → Full Error Object:', error)
      console.error('  → Error String Representation:', String(error))
      console.error('  → Error JSON (if possible):', (() => {
        try { return JSON.stringify(error, Object.getOwnPropertyNames(error), 2) }
        catch { return 'Cannot stringify error' }
      })())
      
      // Show user-friendly error message with actual error details
      const userMessage = error.message || 'Failed to connect Stripe account. Please try again.'
      toast.error(`Payment Setup Error: ${userMessage}`)
      
      // Also show in console for debugging
      console.error('🚨 [STRIPE CONNECT] Full error details for debugging:', error)
    } finally {
      console.log('🏁 [STRIPE CONNECT] Process completed, setting processing to false')
      setProcessing(false)
    }
  }

  const verifyStripeConnection = async () => {
    try {
      // Validate barbershopId exists
      if (!financeContext?.barbershopId) {
        throw new Error('Barbershop ID is required for verification')
      }

      const response = await fetch(`/api/stripe/unified/status?barbershop_id=${financeContext.barbershopId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify Stripe connection')
      }
      
      const result = await response.json()
      
      // Handle API response structure
      if (!result.success) {
        throw new Error(result.error || 'Invalid response from status API')
      }
      
      const status = result.status // API returns status nested in result

      // Check for successful onboarding
      if (status?.connect_account?.onboarding_completed && status.connect_account?.charges_enabled) {
        setCompletedSteps(prev => new Set([...prev, 1]))
        setCurrentStep(2)
        toast.success('Bank account connected successfully!')
      } else if (status?.connect_account?.onboarding_completed) {
        toast('Onboarding complete but charges not yet enabled. This may take a few minutes.', {
          icon: '⚠️',
          duration: 5000
        })
        // Still proceed to next step as onboarding is done
        setCompletedSteps(prev => new Set([...prev, 1]))
        setCurrentStep(2)
      } else if (status?.connect_account?.exists) {
        toast.error('Setup not yet complete. Please finish the Stripe onboarding process or try again.')
      } else {
        toast.error('No Stripe account found. Please start the setup process.')
      }
    } catch (error) {
      console.error('Verification error:', error)
      toast.error(error.message || 'Could not verify connection. Please try again or contact support.')
    }
  }

  const handlePaymentModelSave = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/v1/compensation/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId: financeContext.barbershopId,
          compensationModel: onboardingData.paymentModel
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save payment model')
      }

      setCompletedSteps(prev => new Set([...prev, 2]))
      setCurrentStep(3)
      toast.success('Payment model configured!')
    } catch (error) {
      console.error('Payment model error:', error)
      toast.error(error.message || 'Failed to save payment model')
    } finally {
      setProcessing(false)
    }
  }

  const handleActivate = async () => {
    setProcessing(true)
    try {
      // Final activation call
      const response = await fetch('/api/v1/finance/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId: financeContext.barbershopId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to activate payment system')
      }

      setCompletedSteps(prev => new Set([...prev, 3]))
      toast.success('🎉 Payment system activated! You can now accept payments.')
      
      // Refresh parent component
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (error) {
      console.error('Activation error:', error)
      toast.error(error.message || 'Failed to activate payment system')
    } finally {
      setProcessing(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="p-8">
            <div className="text-center mb-8">
              <BanknotesIcon className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-foreground">Connect Your Bank Account</h2>
              <p className="text-muted-foreground mt-2">
                We'll use Stripe to securely connect your bank account and enable payments
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="Your barbershop name"
                  value={onboardingData.businessInfo.name}
                  onChange={(e) => setOnboardingData(prev => ({
                    ...prev,
                    businessInfo: { ...prev.businessInfo, name: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Business Type
                </label>
                <select
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  value={onboardingData.businessInfo.type}
                  onChange={(e) => setOnboardingData(prev => ({
                    ...prev,
                    businessInfo: { ...prev.businessInfo, type: e.target.value }
                  }))}
                >
                  <option value="individual">Individual (sole proprietor)</option>
                  <option value="company">Company/LLC</option>
                  <option value="partnership">Partnership</option>
                  <option value="corporation">Corporation</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose "Individual" for faster setup if you're a sole proprietor
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="(555) 123-4567"
                  value={onboardingData.businessInfo.phone}
                  onChange={(e) => setOnboardingData(prev => ({
                    ...prev,
                    businessInfo: { ...prev.businessInfo, phone: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-4">
                {/* Trust indicators */}
                <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <span>Bank-level security</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <span>Powered by Stripe</span>
                  </div>
                </div>

                <Button
                  onClick={handleQuickConnect}
                  disabled={processing || !onboardingData.businessInfo.name}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex items-center justify-center space-x-2 shadow-lg"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <BanknotesIcon className="h-5 w-5" />
                      <span>Connect Bank Account</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  This opens Stripe's secure setup in a new window. Takes 30 seconds.
                </p>
              </div>
            </div>
          </Card>
        )

      case 2:
        return (
          <Card className="p-8">
            <div className="text-center mb-8">
              <ScaleIcon className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold text-foreground">Choose Your Payment Model</h2>
              <p className="text-muted-foreground mt-2">
                How do you want to structure compensation with your staff?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Commission Model */}
              <Card
                className={`p-6 cursor-pointer border-2 transition-colors ${
                  onboardingData.paymentModel.type === 'commission'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => setOnboardingData(prev => ({
                  ...prev,
                  paymentModel: { ...prev.paymentModel, type: 'commission' }
                }))}
              >
                <h3 className="font-semibold text-foreground mb-2">Commission Split</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Split revenue from each service (recommended for new shops)
                </p>
                <div className="text-lg font-bold text-blue-600">
                  70% Barber / 30% Shop
                </div>
              </Card>

              {/* Booth Rent Model */}
              <Card
                className={`p-6 cursor-pointer border-2 transition-colors ${
                  onboardingData.paymentModel.type === 'booth_rent'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => setOnboardingData(prev => ({
                  ...prev,
                  paymentModel: { ...prev.paymentModel, type: 'booth_rent' }
                }))}
              >
                <h3 className="font-semibold text-foreground mb-2">Booth Rent</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fixed monthly rent per chair (good for established barbers)
                </p>
                <div className="text-lg font-bold text-green-600">
                  ${onboardingData.paymentModel.boothRentAmount}/month
                </div>
              </Card>

              {/* Hybrid Model */}
              <Card
                className={`p-6 cursor-pointer border-2 transition-colors ${
                  onboardingData.paymentModel.type === 'hybrid'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => setOnboardingData(prev => ({
                  ...prev,
                  paymentModel: { ...prev.paymentModel, type: 'hybrid' }
                }))}
              >
                <h3 className="font-semibold text-foreground mb-2">Hybrid</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Base rent + lower commission (best of both worlds)
                </p>
                <div className="text-lg font-bold text-purple-600">
                  ${onboardingData.paymentModel.hybridBaseRent} + 15%
                </div>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Button
                onClick={handlePaymentModelSave}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
                size="lg"
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Continue to Activation</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )

      case 3:
        return (
          <Card className="p-8">
            <div className="text-center mb-8">
              <CheckCircleIcon className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-foreground">Ready to Launch!</h2>
              <p className="text-muted-foreground mt-2">
                Review your setup and activate your payment system
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Setup Summary */}
              <Card className="p-6 bg-green-50 border-green-200">
                <h3 className="font-semibold text-green-800 mb-4">Setup Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700">Bank Account</span>
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 dark:text-green-400">Payment Model</span>
                    <span className="font-medium text-green-800 dark:text-green-300 capitalize">
                      {onboardingData.paymentModel.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 dark:text-green-400">Ready to Accept Payments</span>
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </Card>

              <Button
                onClick={handleActivate}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center space-x-2"
                size="lg"
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Activate Payment System</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                  completedSteps.has(step.id)
                    ? 'bg-green-500 border-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-muted border-border text-muted-foreground'
                }`}>
                  {completedSteps.has(step.id) ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-sm font-medium ${
                    currentStep === step.id ? 'text-blue-600' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {step.timeEstimate}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRightIcon className="h-5 w-5 text-muted-foreground mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      {renderStep()}
    </div>
  )
}