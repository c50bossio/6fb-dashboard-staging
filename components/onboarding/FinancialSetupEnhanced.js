'use client'

import { 
  CreditCardIcon, 
  BanknotesIcon,
  CalculatorIcon,
  BuildingLibraryIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import unifiedStripeManager from '@/lib/stripe/UnifiedStripeManager'

export default function FinancialSetupEnhanced({ onComplete, initialData = {}, subscriptionTier = 'shop' }) {
  const [currentSection, setCurrentSection] = useState('payment')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Unified Stripe Management States
  const [stripeStatus, setStripeStatus] = useState(null)
  const [stripeAccountId, setStripeAccountId] = useState(initialData.stripeAccountId || null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [payoutSettings, setPayoutSettings] = useState(null)
  const [barbershopId, setBarbershopId] = useState(null)
  
  const supabase = createClient()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    stripeConnected: initialData.stripeConnected || false,
    depositSchedule: initialData.depositSchedule || 'daily',
    acceptedPayments: initialData.acceptedPayments || ['card', 'cash'],
    
    payoutModel: initialData.payoutModel || 'commission',
    commissionRate: initialData.commissionRate || 60,
    weeklyBoothRent: initialData.weeklyBoothRent || 150,
    hybridMinCommission: initialData.hybridMinCommission || 40,
    hybridBoothRent: initialData.hybridBoothRent || 75,
    tipDistribution: initialData.tipDistribution || 'barber_keeps_all',
    
    hairCutPrice: initialData.hairCutPrice || 35,
    beardTrimPrice: initialData.beardTrimPrice || 20,
    washAndStylePrice: initialData.washAndStylePrice || 45,
    premiumServiceRate: initialData.premiumServiceRate || 1.5,
    
    businessTaxId: initialData.businessTaxId || '',
    salesTaxRate: initialData.salesTaxRate || 8.25,
    staffClassification: initialData.staffClassification || 'contractor',
    
    bankingSetup: initialData.bankingSetup || 'now',
    accountingIntegration: initialData.accountingIntegration || 'none',
    
    // New fields for Stripe Connect
    businessType: initialData.businessType || 'individual',
    businessName: initialData.businessName || ''
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayToggle = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }))
  }

  const sections = [
    { id: 'payment', label: 'Payment Setup', icon: CreditCardIcon },
    { id: 'banking', label: 'Bank Account', icon: BuildingLibraryIcon },
    { id: 'payout', label: 'Payout Model', icon: UsersIcon },
    { id: 'pricing', label: 'Service Pricing', icon: CurrencyDollarIcon },
    { id: 'business', label: 'Business Details', icon: BuildingLibraryIcon }
  ]

  // Initialize barbershop ID and load unified Stripe status
  useEffect(() => {
    const initializeStripeStatus = async () => {
      try {
        // Get user profile to determine barbershop ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id, barbershop_id')
          .eq('id', user.id)
          .single()

        const shopId = profile?.shop_id || profile?.barbershop_id
        if (!shopId) return

        setBarbershopId(shopId)

        // Get unified Stripe status
        const status = await unifiedStripeManager.getUnifiedStatus(shopId)
        setStripeStatus(status)
        
        if (status.connect_account?.account_id) {
          setStripeAccountId(status.connect_account.account_id)
        }

        // Handle Stripe redirect completion
        const urlParams = new URLSearchParams(window.location.search)
        const paymentComplete = urlParams.get('payment_setup_complete') === 'true'
        
        if (paymentComplete && status.overall_status === 'completed') {
          setSuccess('Payment setup successfully completed!')
          setTimeout(() => {
            if (onComplete) {
              onComplete({
                ...formData,
                stripeConnected: true,
                stripeAccountId: status.connect_account.account_id
              })
            }
          }, 2000)
        } else if (status.overall_status === 'completed') {
          setFormData(prev => ({ ...prev, stripeConnected: true }))
          setSuccess('Payment account already connected!')
        }

      } catch (err) {
        console.error('Error initializing Stripe status:', err)
      }
    }
    
    initializeStripeStatus()
  }, [])
  
  // Poll for unified Stripe status updates during onboarding
  useEffect(() => {
    if (!barbershopId) return
    
    const pollStripeStatus = async () => {
      try {
        const status = await unifiedStripeManager.getUnifiedStatus(barbershopId, true) // Force refresh
        setStripeStatus(status)
        
        if (status.connect_account?.account_id) {
          setStripeAccountId(status.connect_account.account_id)
        }
      } catch (err) {
        console.error('Error polling Stripe status:', err)
      }
    }
    
    // Poll for status updates every 10 seconds while setup is in progress
    const shouldPoll = stripeStatus?.overall_status === 'in_progress'
    if (shouldPoll) {
      const interval = setInterval(pollStripeStatus, 10000)
      return () => clearInterval(interval)
    }
  }, [barbershopId, stripeStatus?.overall_status])

  // Load bank accounts
  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const response = await fetch('/api/payments/bank-accounts')
        if (response.ok) {
          const data = await response.json()
          setBankAccounts(data.accounts || [])
        }
      } catch (err) {
        console.error('Error loading bank accounts:', err)
      }
    }
    
    loadBankAccounts()
  }, [])

  // Load payout settings
  useEffect(() => {
    const loadPayoutSettings = async () => {
      try {
        const response = await fetch('/api/payments/payout-settings')
        if (response.ok) {
          const data = await response.json()
          setPayoutSettings(data.settings)
        }
      } catch (err) {
        console.error('Error loading payout settings:', err)
      }
    }
    
    loadPayoutSettings()
  }, [])

  const createStripeConnectAccount = async () => {
    if (!barbershopId) {
      setError('Unable to determine barbershop. Please try again.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Use unified setup orchestration
      const result = await unifiedStripeManager.orchestrateSetup(barbershopId, {
        email: user?.email || 'demo@bookedbarber.com',
        businessType: formData.businessType,
        enableTerminal: true,
        enableSplitPayments: true,
        returnUrl: `${window.location.origin}/stripe-redirect?step=banking&success=true`
      })
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      if (result.setup_url) {
        // Store session data for return handling
        sessionStorage.setItem('stripe_onboarding_flow', 'true')
        sessionStorage.setItem('stripe_return_path', window.location.pathname + window.location.search)
        sessionStorage.setItem('onboarding_step', currentSection)
        
        setSuccess('Payment account created! Redirecting to Stripe...')
        
        // Open Stripe onboarding in same window
        setTimeout(() => {
          window.location.href = result.setup_url
        }, 1000)
        
      } else if (result.current_status?.overall_status === 'completed') {
        setSuccess('Payment account already set up!')
        setFormData(prev => ({ ...prev, stripeConnected: true }))
        
        // Refresh status
        const status = await unifiedStripeManager.getUnifiedStatus(barbershopId, true)
        setStripeStatus(status)
        
      } else {
        setSuccess('Payment setup initiated. Please complete the required steps.')
      }
      
    } catch (err) {
      console.error('Unified Stripe setup error:', err)
      
      if (err.message.includes('Authentication required')) {
        setError('Please log in to set up payment processing.')
      } else if (err.message.includes('barbershop_id') && err.message.includes('required')) {
        setError('Unable to identify your business. Please contact support.')
      } else {
        setError(err.message || 'Failed to create payment account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const startStripeOnboarding = async (accountId = stripeStatus?.stripe_account_id) => {
    if (!accountId) return
    
    setLoading(true)
    setError('')
    
    try {
      // Store session data for return handling
      sessionStorage.setItem('stripe_onboarding_flow', 'true')
      sessionStorage.setItem('stripe_return_path', window.location.pathname + window.location.search)
      sessionStorage.setItem('onboarding_step', currentSection)
      
      // Use UnifiedStripeManager for onboarding link
      const result = await unifiedStripeManager.generateOnboardingLink(barbershopId, {
        refresh_url: `${window.location.origin}/stripe-redirect?refresh=true`,
        return_url: `${window.location.origin}/stripe-redirect?step=banking&success=true`
      })
      
      if (result.success) {
        // Redirect in same window for smoother experience
        window.location.href = result.data.url
      } else {
        throw new Error(result.error || 'Failed to generate onboarding link')
      }
      
    } catch (err) {
      console.error('Onboarding link error:', err)
      setError(err.message || 'Failed to start onboarding. Please try again.')
      setLoading(false)
    }
  }

  const addBankAccount = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Use UnifiedStripeManager for dashboard link
      const result = await unifiedStripeManager.generateOnboardingLink(barbershopId, {
        type: 'dashboard' // Generate dashboard link instead of onboarding
      })
      
      if (result.success) {
        window.open(result.data.url, '_blank')
        setSuccess('Manage your bank accounts in the Stripe dashboard')
      } else {
        throw new Error(result.error || 'Failed to access dashboard')
      }
      
    } catch (err) {
      console.error('Dashboard link error:', err)
      setError(err.message || 'Failed to access dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updatePayoutSchedule = async () => {
    setLoading(true)
    setError('')
    
    try {
      const scheduleMap = {
        'daily': { schedule: 'daily', delay_days: 2 },
        'weekly': { schedule: 'weekly', day_of_week: 5 }, // Friday
        'monthly': { schedule: 'monthly', day_of_month: 1 }
      }
      
      const settings = scheduleMap[formData.depositSchedule] || scheduleMap.daily
      
      // Use UnifiedStripeManager for payout settings
      const result = await unifiedStripeManager.updatePayoutSettings(barbershopId, settings)
      
      if (result.success) {
        setSuccess('Payout settings updated successfully')
        // Refresh unified status to reflect changes
        const refreshedStatus = await unifiedStripeManager.getUnifiedStatus(barbershopId, true)
        setStripeStatus(refreshedStatus)
      } else {
        throw new Error(result.error || 'Failed to update payout settings')
      }
      
    } catch (err) {
      console.error('Payout settings error:', err)
      setError(err.message || 'Failed to update payout settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    onComplete({
      ...formData,
      stripeAccountId: stripeStatus?.stripe_account_id,
      paymentSetupCompleted: stripeStatus?.overall_status === 'completed'
    })
  }

  const canProceed = () => {
    switch (currentSection) {
      case 'payment':
        return formData.depositSchedule && formData.acceptedPayments.length > 0
      case 'banking':
        return stripeStatus?.stripe_account_id && stripeStatus?.overall_status === 'completed'
      case 'payout':
        if (formData.payoutModel === 'commission') {
          return formData.commissionRate > 0
        } else if (formData.payoutModel === 'booth_rent') {
          return formData.weeklyBoothRent > 0
        } else if (formData.payoutModel === 'hybrid') {
          return formData.hybridMinCommission > 0 && formData.hybridBoothRent > 0
        }
        return true
      case 'pricing':
        return formData.hairCutPrice > 0
      case 'business':
        return formData.salesTaxRate >= 0
      default:
        return true
    }
  }

  const nextSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection)
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id)
    } else {
      handleComplete()
    }
  }

  const prevSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection)
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Section Navigation */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Financial Setup</h2>
          <div className="text-sm text-gray-500">
            {sections.findIndex(s => s.id === currentSection) + 1} of {sections.length}
          </div>
        </div>
        
        <div className="flex space-x-1 mb-6">
          {sections.map((section, index) => {
            const Icon = section.icon
            const isActive = section.id === currentSection
            const isCompleted = sections.findIndex(s => s.id === currentSection) > index
            const isBankingComplete = section.id === 'banking' && stripeStatus?.overall_status === 'completed'
            
            return (
              <div
                key={section.id}
                className={`flex-1 flex items-center justify-center py-3 px-2 rounded-lg border-2 transition-all ${
                  isActive 
                    ? 'border-olive-500 bg-olive-50 text-olive-700'
                    : isCompleted || isBankingComplete
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                {isBankingComplete && section.id === 'banking' ? (
                  <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                ) : (
                  <Icon className="w-5 h-5 mr-2" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{section.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      {/* Payment Processing Section */}
      {currentSection === 'payment' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Processing Preferences</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'individual', label: 'Individual/Sole Proprietor' },
                    { id: 'company', label: 'Company/LLC' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleInputChange('businessType', type.id)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.businessType === type.id
                          ? 'border-olive-500 bg-olive-50 text-olive-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.businessType === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                    placeholder="Your Business LLC"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Deposit Schedule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['daily', 'weekly'].map((schedule) => (
                    <button
                      key={schedule}
                      onClick={() => handleInputChange('depositSchedule', schedule)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.depositSchedule === schedule
                          ? 'border-olive-500 bg-olive-50 text-olive-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {schedule.charAt(0).toUpperCase() + schedule.slice(1)} Deposits
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Daily deposits arrive 2 business days after payment. Weekly deposits arrive every Friday.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accepted Payment Methods
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'card', label: 'Credit/Debit Cards' },
                    { id: 'cash', label: 'Cash' },
                    { id: 'digital', label: 'Digital Wallets' },
                    { id: 'check', label: 'Checks' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => handleArrayToggle('acceptedPayments', method.id)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.acceptedPayments.includes(method.id)
                          ? 'border-olive-500 bg-olive-50 text-olive-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banking Setup Section - SIMPLIFIED */}
      {currentSection === 'banking' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Online Payments</h3>
            <p className="text-sm text-gray-600 mb-6">
              Connect with Stripe to accept credit cards and get paid automatically. Takes about 2 minutes.
            </p>
            
            {!stripeStatus?.stripe_account_id ? (
              // No account yet - create one
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-olive-100 rounded-full mb-4">
                  <CreditCardIcon className="h-10 w-10 text-olive-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Quick 2-Minute Setup</h4>
                <p className="text-sm text-gray-600 mb-6">
                  Connect your bank account to start accepting payments
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={createStripeConnectAccount}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-olive-600 hover:bg-olive-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {loading ? (
                      <>
                        <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <BanknotesIcon className="h-5 w-5 mr-2" />
                        Connect Bank Account
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      // Skip payment setup for now
                      setCurrentSection('payout')
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    I'll set this up later
                  </button>
                </div>
                
                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Why Stripe?</strong> Industry standard, next-day deposits, fraud protection included
                  </p>
                </div>
              </div>
            ) : stripeStatus?.overall_status !== 'completed' ? (
              // Account created but onboarding not complete
              <div className="bg-white border-2 border-yellow-200 rounded-lg p-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                    <ExclamationCircleIcon className="h-10 w-10 text-yellow-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Almost Done!</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Just a few more details needed to activate payments
                  </p>
                  <button
                    onClick={() => startStripeOnboarding()}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {loading ? (
                      <>
                        <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Continue Setup
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Onboarding complete - show simple success
              <div className="bg-white border-2 border-green-200 rounded-lg p-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Bank Account Connected!</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    You're all set to accept credit card payments and receive automatic deposits
                  </p>
                  
                  <div className="inline-flex items-center gap-6 text-sm text-gray-600 mb-6">
                    <span className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      Instant payments
                    </span>
                    <span className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      Next-day deposits
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setCurrentSection('payout')}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-olive-600 hover:bg-olive-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Continue to Next Step
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </button>
                    
                    <a
                      href="https://dashboard.stripe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                      Manage payment settings in Stripe
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payout Model Section - Keep existing */}
      {currentSection === 'payout' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How do you pay your barbers?</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select your payout model
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { 
                      id: 'commission', 
                      label: 'Commission Only', 
                      description: 'Barbers earn a percentage of each service (e.g., 60% of $35 haircut = $21)',
                      icon: '💰',
                      popular: true
                    },
                    { 
                      id: 'booth_rent', 
                      label: 'Booth Rent Only', 
                      description: 'Barbers pay weekly rent and keep 100% of their earnings',
                      icon: '🏪',
                      popular: false
                    },
                    { 
                      id: 'hybrid', 
                      label: 'Hybrid Model', 
                      description: 'Lower booth rent + reduced commission (best of both worlds)',
                      icon: '⚖️',
                      popular: false
                    }
                  ].map((model) => (
                    <div
                      key={model.id}
                      onClick={() => handleInputChange('payoutModel', model.id)}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.payoutModel === model.id
                          ? 'border-olive-500 bg-olive-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {model.popular && (
                        <span className="absolute -top-2 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          Most Popular
                        </span>
                      )}
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{model.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{model.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.payoutModel === model.id
                            ? 'border-olive-500 bg-olive-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.payoutModel === model.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission Model Details */}
              {formData.payoutModel === 'commission' && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-900">Commission Details</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.commissionRate}
                        onChange={(e) => handleInputChange('commissionRate', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                        placeholder="60"
                      />
                      <span className="absolute right-3 top-3 text-gray-500">%</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Example: 60% commission on $35 haircut = $21 to barber, $14 to shop
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip Distribution
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'barber_keeps_all', label: 'Barber keeps 100% of tips' },
                    { id: 'shop_split', label: 'Split with shop (80/20)' },
                    { id: 'team_pool', label: 'Pool tips among all staff' }
                  ].map((option) => (
                    <label key={option.id} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="tipDistribution"
                        value={option.id}
                        checked={formData.tipDistribution === option.id}
                        onChange={(e) => handleInputChange('tipDistribution', e.target.value)}
                        className="w-4 h-4 text-olive-600 border-gray-300 focus:ring-olive-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Pricing Section - Keep existing */}
      {currentSection === 'pricing' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Haircut ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.hairCutPrice}
                  onChange={(e) => handleInputChange('hairCutPrice', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beard Trim ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.beardTrimPrice}
                  onChange={(e) => handleInputChange('beardTrimPrice', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wash & Style ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.washAndStylePrice}
                  onChange={(e) => handleInputChange('washAndStylePrice', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Premium Service Multiplier
                </label>
                <select
                  value={formData.premiumServiceRate}
                  onChange={(e) => handleInputChange('premiumServiceRate', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                >
                  <option value={1.25}>1.25x (+25%)</option>
                  <option value={1.5}>1.5x (+50%)</option>
                  <option value={1.75}>1.75x (+75%)</option>
                  <option value={2}>2x (+100%)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Details Section - Keep existing */}
      {currentSection === 'business' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Tax ID (EIN) - Optional
                </label>
                <input
                  type="text"
                  value={formData.businessTaxId}
                  onChange={(e) => handleInputChange('businessTaxId', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="12-3456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.01"
                  value={formData.salesTaxRate}
                  onChange={(e) => handleInputChange('salesTaxRate', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="8.25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Classification
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'contractor', label: '1099 Contractor' },
                    { id: 'employee', label: 'W2 Employee' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleInputChange('staffClassification', type.id)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.staffClassification === type.id
                          ? 'border-olive-500 bg-olive-50 text-olive-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accounting Integration
                </label>
                <select
                  value={formData.accountingIntegration}
                  onChange={(e) => handleInputChange('accountingIntegration', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                >
                  <option value="none">Set up later</option>
                  <option value="quickbooks">QuickBooks</option>
                  <option value="xero">Xero</option>
                  <option value="freshbooks">FreshBooks</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-8">
        <button
          onClick={prevSection}
          disabled={currentSection === 'payment'}
          className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <div className="text-center">
          <button
            onClick={() => onComplete(formData)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip for now
          </button>
        </div>

        <button
          onClick={nextSection}
          disabled={!canProceed()}
          className="px-6 py-3 bg-olive-600 hover:bg-olive-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
        >
          {currentSection === 'business' ? 'Complete Setup' : 'Next'}
        </button>
      </div>
    </div>
  )
}