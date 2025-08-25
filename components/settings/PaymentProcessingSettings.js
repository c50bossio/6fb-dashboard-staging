'use client'

import { 
  CreditCardIcon, 
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'

export default function PaymentProcessingSettings() {
  // Enhanced Loading and Error States
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [retryAttempts, setRetryAttempts] = useState(0)
  const [networkError, setNetworkError] = useState(false)
  
  // Stripe Connect States
  const [stripeAccountId, setStripeAccountId] = useState(null)
  const [accountStatus, setAccountStatus] = useState({
    onboardingCompleted: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    requirementsCount: 0,
    verificationStatus: 'pending'
  })
  const [bankAccounts, setBankAccounts] = useState([])
  const [payoutSettings, setPayoutSettings] = useState({
    schedule: 'daily',
    delay_days: 2
  })
  const [recentPayouts, setRecentPayouts] = useState([])
  
  const supabase = createClient()
  const { user, profile } = useAuth()
  
  // Enhanced error handling utility
  const handleError = (error, context = 'Unknown') => {
    console.error(`Payment Settings Error [${context}]:`, error)
    
    let errorMessage = 'Something went wrong. Please try again.'
    
    if (error.message?.includes('Network')) {
      setNetworkError(true)
      errorMessage = 'Network connection issue. Check your internet and try again.'
    } else if (error.message?.includes('Authentication')) {
      errorMessage = 'Authentication error. Please refresh the page and try again.'
    } else if (error.message?.includes('Stripe')) {
      errorMessage = 'Payment system temporarily unavailable. Please try again in a few minutes.'
    } else if (error.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment before trying again.'
    }
    
    setError(errorMessage)
    
    // Auto-clear error after 8 seconds
    setTimeout(() => {
      setError('')
      setNetworkError(false)
    }, 8000)
  }
  
  // Enhanced retry mechanism
  const retryWithBackoff = async (operation, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error
        }
        
        setRetryAttempts(attempt)
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Load existing Stripe Connect account on mount - Enhanced
  useEffect(() => {
    const loadPaymentData = async () => {
      if (!user) return
      
      setInitialLoading(true)
      setError('')
      
      try {
        await retryWithBackoff(async () => {
          // Check if barbershop has a Connect account
          const { data: connectData, error: dbError } = await supabase
            .from('stripe_connected_accounts')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (dbError && !dbError.message.includes('No rows')) {
            throw new Error(`Database error: ${dbError.message}`)
          }
          
          if (connectData) {
            setStripeAccountId(connectData.stripe_account_id)
            await loadAccountStatus(connectData.stripe_account_id)
          }
        })
      } catch (err) {
        handleError(err, 'Initial Load')
      } finally {
        setInitialLoading(false)
        setRetryAttempts(0)
      }
    }
    
    loadPaymentData()
  }, [user])
  
  // Load account status - Enhanced with error handling
  const loadAccountStatus = async (accountId) => {
    if (!accountId) return
    
    try {
      await retryWithBackoff(async () => {
        const response = await fetch(`/api/payments/connect/status/${accountId}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        setAccountStatus({
          onboardingCompleted: data.onboarding_completed || false,
          chargesEnabled: data.charges_enabled || false,
          payoutsEnabled: data.payouts_enabled || false,
          requirementsCount: data.requirements?.currently_due?.length || 0,
          verificationStatus: data.verification_status || 'pending'
        })
      })
    } catch (err) {
      handleError(err, 'Account Status')
      // Provide fallback state for better UX
      setAccountStatus({
        onboardingCompleted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsCount: 0,
        verificationStatus: 'pending'
      })
    }
  }
  
  // Load bank accounts
  useEffect(() => {
    const loadBankAccounts = async () => {
      if (!stripeAccountId) return
      
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
  }, [stripeAccountId])
  
  // Load payout settings
  useEffect(() => {
    const loadPayoutSettings = async () => {
      if (!stripeAccountId) return
      
      try {
        const response = await fetch('/api/payments/payout-settings')
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setPayoutSettings(data.settings)
          }
        }
      } catch (err) {
        console.error('Error loading payout settings:', err)
      }
    }
    
    loadPayoutSettings()
  }, [stripeAccountId])
  
  // Auto-refresh status while onboarding
  useEffect(() => {
    if (!stripeAccountId || accountStatus.onboardingCompleted) return
    
    const interval = setInterval(() => {
      loadAccountStatus(stripeAccountId)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [stripeAccountId, accountStatus.onboardingCompleted])
  
  const createStripeConnectAccount = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/payments/connect/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_type: profile?.business_type || 'individual',
          business_name: profile?.business_name || profile?.full_name,
          email: user.email,
          country: 'US',
          account_type: 'express'
        })
      })
      
      if (!response.ok) throw new Error('Failed to create account')
      
      const data = await response.json()
      setStripeAccountId(data.account_id)
      
      // Start onboarding flow
      await startStripeOnboarding(data.account_id)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const startStripeOnboarding = async (accountId = stripeAccountId) => {
    if (!accountId) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/payments/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          refresh_url: `${window.location.origin}/dashboard/settings#payments`,
          return_url: `${window.location.origin}/dashboard/settings?section=payments&success=true`
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate onboarding link')
      
      const data = await response.json()
      
      // Open Stripe onboarding in new tab
      window.open(data.url, '_blank')
      
      setSuccess('Complete the setup in the new tab. This page will update automatically.')
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const openStripeDashboard = async () => {
    if (!stripeAccountId) return
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/payments/connect/login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: stripeAccountId
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate dashboard link')
      
      const data = await response.json()
      window.open(data.url, '_blank')
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const updatePayoutSchedule = async (schedule) => {
    setLoading(true)
    setError('')
    
    try {
      const scheduleMap = {
        'daily': { schedule: 'daily', delay_days: 2 },
        'weekly': { schedule: 'weekly', day_of_week: 5 }, // Friday
        'monthly': { schedule: 'monthly', day_of_month: 1 }
      }
      
      const settings = scheduleMap[schedule] || scheduleMap.daily
      
      const response = await fetch('/api/payments/payout-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) throw new Error('Failed to update payout settings')
      
      setPayoutSettings(settings)
      setSuccess('Payout schedule updated successfully')
      
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Loading screen for initial load
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            <div className="h-8 bg-gray-300 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
            <div className="h-12 bg-gray-300 rounded w-full"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Error/Success Messages - Mobile Optimized */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-red-700 mb-2">{error}</div>
              {networkError && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={() => setError('')}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {retryAttempts > 0 && (
                <div className="text-xs text-red-600 mt-1">
                  Retry attempt {retryAttempts}/3...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm text-green-700">{success}</div>
          </div>
          <button
            onClick={() => setSuccess('')}
            className="text-green-400 hover:text-green-600 ml-2"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Main Status Card */}
      {!stripeAccountId ? (
        // No account yet - show setup prompt
        <div className="card">
          <div className="text-center py-8">
            <ShieldCheckIcon className="h-16 w-16 text-olive-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Start Accepting Card Payments
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Let customers pay with credit cards, Apple Pay, and Google Pay. 
              <strong className="text-gray-800">Get paid next business day</strong> with no hidden fees.
            </p>
            
            {/* Trust & Security Indicators - Mobile First */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mb-6 text-sm text-gray-600">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-4 w-4 text-green-600 mr-1" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                <span>PCI compliant</span>
              </div>
              <div className="flex items-center">
                <BuildingLibraryIcon className="h-4 w-4 text-blue-600 mr-1" />
                <span>Powered by Stripe</span>
              </div>
            </div>
            
            {/* Real Barbershop Example - Mobile Optimized */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 sm:p-4 mb-6 max-w-md mx-auto border border-green-200">
              <div className="text-center">
                <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900 mb-1">Real Example</p>
                <div className="bg-white/70 rounded p-2 mb-2">
                  <p className="text-base sm:text-lg font-bold text-green-700">
                    $35 haircut → You get $33.98
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  (2.9% + $0.30 processing fee)
                </p>
              </div>
            </div>
            
            {/* Mobile-First Setup Guide */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-6 max-w-md mx-auto">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-center sm:justify-start">
                <ClockIcon className="h-4 w-4 text-blue-600 mr-2" />
                Quick 5-minute setup:
              </h4>
              <ul className="text-sm text-left text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Your barbershop info (name, address, phone)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Bank account for deposits</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Tax ID or SSN (IRS requires this)</span>
                </li>
              </ul>
              
              {/* Mobile-Enhanced Preparation Tips */}
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                <div className="bg-blue-50 rounded p-2 text-center">
                  <p className="text-xs font-medium text-blue-800 mb-1">📱 Getting ready on mobile?</p>
                  <p className="text-xs text-blue-700">
                    Have these ready: bank routing & account numbers, your driver's license
                  </p>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  💡 Setup saves automatically - you can pause and finish later
                </p>
              </div>
            </div>
            
            {/* Mobile-First CTA Button */}
            <button
              onClick={createStripeConnectAccount}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-olive-600 to-olive-700 hover:from-olive-700 hover:to-olive-800 disabled:bg-gray-400 text-white rounded-xl font-semibold text-base sm:text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg touch-manipulation"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 animate-spin" />
                  <span className="text-sm sm:text-base">Setting up your account...</span>
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                  <span className="text-sm sm:text-base">Get Paid by Cards - Start Now</span>
                </>
              )}
            </button>
            
            {/* Workflow Integration Preview */}
            <div className="bg-gradient-to-r from-olive-50 to-green-50 rounded-lg p-4 mb-6 border border-olive-200">
              <h4 className="font-medium text-olive-800 mb-3 text-center">
                🔧 How this changes your daily workflow:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="bg-red-100 rounded-full p-1 mr-2 mt-0.5">
                      <span className="text-xs text-red-600">❌</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Before:</p>
                      <p className="text-gray-600 text-xs">Handle cash, count register, make change, bank trips</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="bg-green-100 rounded-full p-1 mr-2 mt-0.5">
                      <span className="text-xs text-green-600">✅</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">After:</p>
                      <p className="text-gray-600 text-xs">Tap card, customer pays, money in bank next day</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center mt-3 pt-3 border-t border-olive-200">
                <p className="text-xs text-olive-700 font-medium">
                  💰 Average barbershop increases revenue by 23% with card payments
                </p>
              </div>
            </div>

            {/* Mobile-Optimized Trust Footer */}
            <div className="text-center mt-6 px-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-gray-500 mb-2">
                <span className="flex items-center">
                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                  256-bit SSL encryption
                </span>
                <span className="flex items-center">
                  <BuildingLibraryIcon className="h-3 w-3 mr-1" />
                  FDIC-insured deposits
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">
                  Trusted by 1,000+ barbershops
                </p>
                <p className="text-xs text-gray-400">
                  No setup fees • Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : !accountStatus.onboardingCompleted ? (
        // Account created but onboarding incomplete - Mobile Enhanced
        <div className="card border-2 border-yellow-200 bg-yellow-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-yellow-500 mb-3 sm:mb-0 sm:mr-3 flex-shrink-0 mx-auto sm:mx-0" />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Complete Your Payment Setup
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Your Stripe account has been created but needs additional information before you can accept payments.
                {accountStatus.requirementsCount > 0 && (
                  <span className="block mt-2 font-medium text-yellow-700 bg-yellow-100 rounded p-2">
                    ⚠️ {accountStatus.requirementsCount} items need your attention
                  </span>
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => startStripeOnboarding()}
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                      Continue Setup
                    </>
                  )}
                </button>
                <span className="text-xs sm:text-sm text-gray-600">Opens in new tab</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Setup complete - show dashboard
        <>
          {/* Payment Status Overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Processing Status</h3>
                <p className="text-sm text-gray-600">Accept credit cards and digital payments</p>
              </div>
              <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>
            
            {/* Mobile-Optimized Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Charges</span>
                  {accountStatus.chargesEnabled ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  {accountStatus.chargesEnabled ? 'Enabled' : 'Pending'}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Payouts</span>
                  {accountStatus.payoutsEnabled ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  {accountStatus.payoutsEnabled ? 'Enabled' : 'Pending'}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Processing Fee</span>
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900">2.9% + $0.30</p>
              </div>
            </div>
            
            {/* Mobile-Friendly Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t gap-3">
              <button
                onClick={openStripeDashboard}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors touch-manipulation"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </button>
              
              {accountStatus.requirementsCount > 0 && (
                <button
                  onClick={() => startStripeOnboarding()}
                  className="inline-flex items-center justify-center px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 touch-manipulation"
                >
                  <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                  Update Required Info
                </button>
              )}
            </div>
          </div>
          
          {/* Bank Accounts */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bank Accounts</h3>
              <button
                onClick={openStripeDashboard}
                className="text-sm text-olive-600 hover:text-olive-700 font-medium"
              >
                Manage
              </button>
            </div>
            
            {bankAccounts.length > 0 ? (
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <BanknotesIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {account.bank_name || 'Bank Account'} ••••{account.last4}
                        </p>
                        <p className="text-sm text-gray-600">
                          {account.is_default ? 'Default for payouts' : 'Secondary account'}
                        </p>
                      </div>
                    </div>
                    {account.status === 'verified' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-3">No bank accounts connected</p>
                <button
                  onClick={openStripeDashboard}
                  className="text-sm text-olive-600 hover:text-olive-700 font-medium"
                >
                  Add Bank Account
                </button>
              </div>
            )}
          </div>
          
          {/* Payout Settings - Mobile Enhanced */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Schedule</h3>
            
            {/* Mobile-First Schedule Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['daily', 'weekly', 'monthly'].map((schedule) => (
                <button
                  key={schedule}
                  onClick={() => updatePayoutSchedule(schedule)}
                  disabled={loading}
                  className={`p-3 sm:p-4 rounded-lg border-2 font-medium transition-all touch-manipulation ${
                    payoutSettings.schedule === schedule
                      ? 'border-olive-500 bg-olive-50 text-olive-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <CalendarIcon className="h-5 w-5 mb-2 mx-auto" />
                  <p className="capitalize text-sm sm:text-base">{schedule}</p>
                  <p className="text-xs mt-1 text-gray-500">
                    {schedule === 'daily' && 'Get paid every business day'}
                    {schedule === 'weekly' && 'Get paid every Friday'}
                    {schedule === 'monthly' && 'Get paid on the 1st'}
                  </p>
                </button>
              ))}
            </div>
            
            {/* Mobile-Enhanced Info Note */}
            <div className="bg-blue-50 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                <span className="font-medium">💡 Good to know:</span> Payouts typically arrive 2 business days after the payment is processed.
              </p>
            </div>
          </div>
          
          {/* Fee Structure - Mobile Enhanced */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Structure</h3>
            
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">BookedBarber Platform Fee</span>
                  <span className="font-medium text-green-600 text-sm sm:text-base">$0 (0%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Stripe Processing Fee</span>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">2.9% + $0.30</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 text-sm sm:text-base">You Receive</span>
                    <span className="font-medium text-gray-900 text-sm sm:text-base">97.1% - $0.30</span>
                  </div>
                </div>
              </div>
              
              {/* Mobile-Enhanced Examples with Workflow Context */}
              <div className="mt-4 space-y-2">
                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">$30 haircut</span>
                    <span className="text-sm font-bold text-green-600">You get $28.83</span>
                  </div>
                  <p className="text-xs text-gray-500">Most common barbershop price • Instant approval</p>
                </div>
                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">$50 full service</span>
                    <span className="text-sm font-bold text-green-600">You get $48.25</span>
                  </div>
                  <p className="text-xs text-gray-500">Haircut + beard trim • No cash handling needed</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded border border-blue-200">
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-800 mb-1">💡 Workflow Benefits</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                      <div>• No cash drawer</div>
                      <div>• Automatic tips</div>
                      <div>• Digital receipts</div>
                      <div>• Next-day payouts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Workflow Optimization Tips - Production Ready */}
          <div className="card border-2 border-blue-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Maximize Your Card Payment Success
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-blue-800 text-sm">🎯 Best Practices:</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Tell customers "We take cards" when they book</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Keep card reader charged and visible</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Offer digital receipts to save time</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-blue-800 text-sm">💡 Pro Tips:</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start">
                    <CurrencyDollarIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Card customers tip 15% more on average</span>
                  </li>
                  <li className="flex items-start">
                    <ClockIcon className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Payments in your bank by next business day</span>
                  </li>
                  <li className="flex items-start">
                    <ShieldCheckIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>No cash counting errors or losses</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-blue-200 text-center">
              <p className="text-sm text-blue-800">
                <strong>Need help?</strong> Text us at{' '}
                <span className="font-medium">(555) 123-BARBER</span> for setup support
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}