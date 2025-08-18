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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
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
  
  // Load existing Stripe Connect account on mount
  useEffect(() => {
    const loadPaymentData = async () => {
      if (!user) return
      
      try {
        // Check if barbershop has a Connect account
        const { data: connectData } = await supabase
          .from('stripe_connected_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (connectData) {
          setStripeAccountId(connectData.stripe_account_id)
          loadAccountStatus(connectData.stripe_account_id)
        }
      } catch (err) {
        console.error('Error loading payment data:', err)
      }
    }
    
    loadPaymentData()
  }, [user])
  
  // Load account status
  const loadAccountStatus = async (accountId) => {
    if (!accountId) return
    
    try {
      const response = await fetch(`/api/payments/connect/status/${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setAccountStatus({
          onboardingCompleted: data.onboarding_completed,
          chargesEnabled: data.charges_enabled,
          payoutsEnabled: data.payouts_enabled,
          requirementsCount: data.requirements?.currently_due?.length || 0,
          verificationStatus: data.verification_status
        })
      }
    } catch (err) {
      console.error('Error loading account status:', err)
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
  
  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}
      
      {/* Main Status Card */}
      {!stripeAccountId ? (
        // No account yet - show setup prompt
        <div className="card">
          <div className="text-center py-8">
            <ShieldCheckIcon className="h-16 w-16 text-olive-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Accept Customer Payments
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Set up payment processing to accept credit cards and digital payments from your customers. 
              Get paid automatically with zero markup - you only pay Stripe's standard 2.9% + $0.30 per transaction.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <h4 className="font-medium text-gray-900 mb-3">What you'll need:</h4>
              <ul className="text-sm text-left text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Business information (name, address, phone)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Bank account for deposits</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Tax ID or SSN for verification</span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={createStripeConnectAccount}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 bg-olive-600 hover:bg-olive-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Start Payment Setup
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              Powered by Stripe • Bank-level security • PCI compliant
            </p>
          </div>
        </div>
      ) : !accountStatus.onboardingCompleted ? (
        // Account created but onboarding incomplete
        <div className="card border-2 border-yellow-200 bg-yellow-50">
          <div className="flex items-start">
            <ExclamationCircleIcon className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                Complete Your Payment Setup
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Your Stripe account has been created but needs additional information before you can accept payments.
                {accountStatus.requirementsCount > 0 && (
                  <span className="block mt-2 font-medium text-yellow-700">
                    ⚠️ {accountStatus.requirementsCount} items need your attention
                  </span>
                )}
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => startStripeOnboarding()}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
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
                <span className="text-sm text-gray-600">Opens in new tab</span>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
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
              
              <div className="bg-gray-50 rounded-lg p-4">
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
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Processing Fee</span>
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900">2.9% + $0.30</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <button
                onClick={openStripeDashboard}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </button>
              
              {accountStatus.requirementsCount > 0 && (
                <button
                  onClick={() => startStripeOnboarding()}
                  className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200"
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
          
          {/* Payout Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Schedule</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['daily', 'weekly', 'monthly'].map((schedule) => (
                <button
                  key={schedule}
                  onClick={() => updatePayoutSchedule(schedule)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 font-medium transition-all ${
                    payoutSettings.schedule === schedule
                      ? 'border-olive-500 bg-olive-50 text-olive-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <CalendarIcon className="h-5 w-5 mb-2 mx-auto" />
                  <p className="capitalize">{schedule}</p>
                  <p className="text-xs mt-1 text-gray-500">
                    {schedule === 'daily' && 'Get paid every business day'}
                    {schedule === 'weekly' && 'Get paid every Friday'}
                    {schedule === 'monthly' && 'Get paid on the 1st'}
                  </p>
                </button>
              ))}
            </div>
            
            <p className="text-sm text-gray-600 mt-4">
              <span className="font-medium">Note:</span> Payouts typically arrive 2 business days after the payment is processed.
            </p>
          </div>
          
          {/* Fee Structure */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Structure</h3>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">BookedBarber Platform Fee</span>
                  <span className="font-medium text-green-600">$0 (0%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stripe Processing Fee</span>
                  <span className="font-medium text-gray-900">2.9% + $0.30</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">You Receive</span>
                    <span className="font-medium text-gray-900">97.1% - $0.30</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Example:</span> On a $50 haircut, you receive $48.25
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}