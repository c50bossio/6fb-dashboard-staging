'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCardIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export default function PaymentSetupPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  
  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState([])
  const [methodsFormData, setMethodsFormData] = useState({
    accept_cash: true,
    accept_card: true,
    accept_digital: false,
    accept_checks: false,
    require_deposit: false,
    deposit_percentage: 25,
    cancellation_fee: 0,
    no_show_fee: 50
  })
  
  // Stripe Processing State
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

  useEffect(() => {
    loadAllPaymentData()
  }, [user])

  const loadAllPaymentData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Load payment methods
      await loadPaymentMethods()
      
      // Load Stripe Connect data
      await loadStripeConnectData()
      
    } catch (error) {
      console.error('Error loading payment data:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load payment data'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPaymentMethods = async () => {
    const { data: methods, error } = await supabase
      .from('business_payment_methods')
      .select('*')
      .eq('user_id', user.id)
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    if (methods && methods.length > 0) {
      setPaymentMethods(methods)
      
      const methodTypes = methods.map(m => m.method_type)
      setMethodsFormData({
        accept_cash: methodTypes.includes('cash'),
        accept_card: methodTypes.includes('card'),
        accept_digital: methodTypes.includes('digital'),
        accept_checks: methodTypes.includes('check'),
        require_deposit: methods.some(m => m.require_deposit),
        deposit_percentage: methods.find(m => m.deposit_percentage)?.deposit_percentage || 25,
        cancellation_fee: methods.find(m => m.cancellation_fee)?.cancellation_fee || 0,
        no_show_fee: methods.find(m => m.no_show_fee)?.no_show_fee || 50
      })
    }
  }

  const loadStripeConnectData = async () => {
    const { data: connectData } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (connectData) {
      setStripeAccountId(connectData.stripe_account_id)
      setAccountStatus({
        onboardingCompleted: connectData.onboarding_completed,
        chargesEnabled: connectData.charges_enabled,
        payoutsEnabled: connectData.payouts_enabled,
        requirementsCount: connectData.requirements?.currently_due?.length || 0,
        verificationStatus: connectData.verification_status
      })
    }
  }

  const handleSavePaymentMethods = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Clear existing methods
      await supabase
        .from('business_payment_methods')
        .delete()
        .eq('user_id', user.id)
      
      // Insert new methods
      const methodsToInsert = []
      
      if (methodsFormData.accept_cash) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'cash',
          enabled: true,
          require_deposit: methodsFormData.require_deposit,
          deposit_percentage: methodsFormData.deposit_percentage,
          cancellation_fee: methodsFormData.cancellation_fee,
          no_show_fee: methodsFormData.no_show_fee
        })
      }
      
      if (methodsFormData.accept_card) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'card',
          enabled: true,
          require_deposit: methodsFormData.require_deposit,
          deposit_percentage: methodsFormData.deposit_percentage
        })
      }
      
      if (methodsFormData.accept_digital) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'digital',
          enabled: true,
          require_deposit: methodsFormData.require_deposit
        })
      }
      
      if (methodsFormData.accept_checks) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'check',
          enabled: true
        })
      }
      
      if (methodsToInsert.length > 0) {
        const { error } = await supabase
          .from('business_payment_methods')
          .insert(methodsToInsert)
        
        if (error) throw error
      }
      
      setNotification({
        type: 'success',
        message: 'Payment methods updated successfully'
      })
      
      await loadPaymentMethods()
    } catch (error) {
      console.error('Error saving payment methods:', error)
      setNotification({
        type: 'error',
        message: 'Failed to save payment methods'
      })
    } finally {
      setSaving(false)
    }
  }

  const createStripeConnectAccount = async () => {
    setSaving(true)
    
    try {
      const response = await fetch('/api/payments/connect/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_type: 'individual',
          email: user.email,
          country: 'US',
          account_type: 'express'
        })
      })
      
      if (!response.ok) throw new Error('Failed to create account')
      
      const data = await response.json()
      setStripeAccountId(data.account_id)
      
      await startStripeOnboarding(data.account_id)
      
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message
      })
    } finally {
      setSaving(false)
    }
  }

  const startStripeOnboarding = async (accountId = stripeAccountId) => {
    if (!accountId) return
    
    try {
      const response = await fetch('/api/payments/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          refresh_url: `${window.location.origin}/shop/settings/payment-setup`,
          return_url: `${window.location.origin}/shop/settings/payment-setup?success=true`
        })
      })
      
      if (!response.ok) throw new Error('Failed to generate onboarding link')
      
      const data = await response.json()
      window.open(data.url, '_blank')
      
      setNotification({
        type: 'success',
        message: 'Complete the setup in the new tab. This page will update automatically.'
      })
      
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Setup</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure how customers can pay and set up your payment processing
        </p>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          )}
          <span className={`text-sm ${
            notification.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {notification.message}
          </span>
        </div>
      )}

      <div className="space-y-8">
        {/* Section 1: Payment Methods */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <CreditCardIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Customer Payment Methods</h2>
            </div>
            
            <form onSubmit={handleSavePaymentMethods} className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Select which payment methods you accept from customers
                </p>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={methodsFormData.accept_cash}
                    onChange={(e) => setMethodsFormData({...methodsFormData, accept_cash: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <BanknotesIcon className="h-5 w-5 text-gray-500 ml-3 mr-2" />
                  <span className="text-sm text-gray-700">Cash payments</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={methodsFormData.accept_card}
                    onChange={(e) => setMethodsFormData({...methodsFormData, accept_card: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <CreditCardIcon className="h-5 w-5 text-gray-500 ml-3 mr-2" />
                  <span className="text-sm text-gray-700">Credit/Debit cards (requires Stripe setup below)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={methodsFormData.accept_digital}
                    onChange={(e) => setMethodsFormData({...methodsFormData, accept_digital: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-8 text-sm text-gray-700">Digital payments (Venmo, PayPal, etc.)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={methodsFormData.accept_checks}
                    onChange={(e) => setMethodsFormData({...methodsFormData, accept_checks: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-8 text-sm text-gray-700">Personal checks</span>
                </label>
              </div>

              {/* Deposit & Fees */}
              <div className="border-t pt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">Deposit & Fees</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={methodsFormData.require_deposit}
                      onChange={(e) => setMethodsFormData({...methodsFormData, require_deposit: e.target.checked})}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require deposit for bookings</span>
                  </label>

                  {methodsFormData.require_deposit && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700">
                        Deposit Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={methodsFormData.deposit_percentage}
                        onChange={(e) => setMethodsFormData({...methodsFormData, deposit_percentage: parseInt(e.target.value)})}
                        className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cancellation Fee (%)
                      </label>
                      <input
                        type="number"
                        value={methodsFormData.cancellation_fee}
                        onChange={(e) => setMethodsFormData({...methodsFormData, cancellation_fee: parseInt(e.target.value)})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        min="0"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        No-Show Fee (%)
                      </label>
                      <input
                        type="number"
                        value={methodsFormData.no_show_fee}
                        onChange={(e) => setMethodsFormData({...methodsFormData, no_show_fee: parseInt(e.target.value)})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    saving
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-olive-600 hover:bg-olive-700'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Payment Methods'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Section 2: Stripe Processing */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Card Payment Processing</h2>
            </div>
            
            {!stripeAccountId ? (
              <div className="text-center py-8">
                <ShieldCheckIcon className="h-16 w-16 text-olive-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Accept Credit Card Payments
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Set up Stripe to accept credit card payments online. 
                  You only pay Stripe's standard 2.9% + $0.30 per transaction.
                </p>
                
                <button
                  onClick={createStripeConnectAccount}
                  disabled={saving}
                  className="inline-flex items-center px-6 py-3 bg-olive-600 hover:bg-olive-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="h-5 w-5 mr-2" />
                      Set Up Card Processing
                    </>
                  )}
                </button>
              </div>
            ) : !accountStatus.onboardingCompleted ? (
              <div className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-6">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Complete Your Payment Setup
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Your Stripe account needs additional information before you can accept payments.
                    </p>
                    <button
                      onClick={() => startStripeOnboarding()}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium"
                    >
                      Continue Setup
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Processing Status */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                    <div>
                      <h3 className="font-medium text-green-900">Card Processing Active</h3>
                      <p className="text-sm text-green-700">Ready to accept credit card payments</p>
                    </div>
                  </div>
                  <div className="text-sm text-green-800">
                    Processing Fee: 2.9% + $0.30
                  </div>
                </div>

                {/* Processing Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Charges</span>
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="font-medium text-gray-900">Enabled</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Payouts</span>
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="font-medium text-gray-900">Enabled</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Platform Fee</span>
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-900">$0 (0%)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-olive-50 border border-olive-200 rounded-lg p-6">
          <div className="flex items-start">
            <CheckCircleIcon className="h-6 w-6 text-olive-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-olive-900 mb-2">Integrated Payment System</h3>
              <p className="text-sm text-olive-800">
                Your payment methods and processing are now connected. Customer payments will:
              </p>
              <ul className="mt-2 text-sm text-olive-800 space-y-1">
                <li>• Respect your accepted payment method settings</li>
                <li>• Automatically calculate barber commissions</li>
                <li>• Process through Stripe with your configured settings</li>
                <li>• Update financial balances in real-time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}