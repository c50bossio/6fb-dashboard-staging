'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  CreditCardIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

export default function PaymentSetupPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeAccountId, setStripeAccountId] = useState(null)
  const [customerPaysProcessingFee, setCustomerPaysProcessingFee] = useState(true) // Default ON
  const [barbershopId, setBarbershopId] = useState(null)
  const [setupComplete, setSetupComplete] = useState(false)

  useEffect(() => {
    // Only check setup once we have user data
    if (user) {
      checkExistingSetup()
    } else {
      // If no user yet, keep loading
      setLoading(true)
    }
    
    // Fallback: clear loading after 5 seconds even if auth is problematic
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 5000)
    
    return () => clearTimeout(timeoutId)
  }, [user])

  const checkExistingSetup = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      
      // Check if barbershop exists and get fee settings
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('id, customer_pays_processing_fee')
        .eq('owner_id', user.id)
        .single()
      
      if (barbershopError && barbershopError.code !== 'PGRST116') {
        // PGRST116 is "no rows found" which is okay
        console.warn('Barbershop query error:', barbershopError)
      }
      
      if (barbershopData) {
        setBarbershopId(barbershopData.id)
        setCustomerPaysProcessingFee(barbershopData.customer_pays_processing_fee ?? true)
      }
      
      // Check if Stripe is already connected
      const { data: connectData, error: connectError } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id, onboarding_completed')
        .eq('user_id', user.id)
        .single()
      
      if (connectError && connectError.code !== 'PGRST116') {
        console.warn('Stripe account query error:', connectError)
      }
      
      if (connectData?.onboarding_completed) {
        setStripeConnected(true)
        setStripeAccountId(connectData.stripe_account_id)
        setSetupComplete(true)
      }
      
    } catch (error) {
      console.error('Error checking setup:', error)
    } finally {
      // Always clear loading state
      setLoading(false)
    }
  }

  const handleStripeConnect = async () => {
    setSaving(true)
    
    try {
      // Create or get existing Stripe Connect account
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
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create Stripe account')
      }
      
      const data = await response.json()
      
      // Generate onboarding link
      const onboardingResponse = await fetch('/api/payments/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: data.account_id,
          refresh_url: `${window.location.origin}/shop/settings/payment-setup`,
          return_url: `${window.location.origin}/shop/settings/payment-setup?stripe_connected=true`
        })
      })
      
      if (!onboardingResponse.ok) {
        throw new Error('Failed to generate onboarding link')
      }
      
      const onboardingData = await onboardingResponse.json()
      
      // Redirect to Stripe onboarding
      window.location.href = onboardingData.url
      
    } catch (err) {
      console.error('Stripe connect error:', err)
      alert('Failed to connect Stripe. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFees = async (newValue) => {
    if (!barbershopId) return
    
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ customer_pays_processing_fee: newValue })
        .eq('id', barbershopId)
      
      if (error) throw error
      
      setCustomerPaysProcessingFee(newValue)
    } catch (error) {
      console.error('Error updating fee setting:', error)
      alert('Failed to update fee setting')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    // Check if we came from onboarding
    const fromOnboarding = new URLSearchParams(window.location.search).get('from_onboarding') === 'true'
    
    if (fromOnboarding) {
      // Clear onboarding session storage
      sessionStorage.removeItem('onboarding_payment_flow')
      sessionStorage.removeItem('onboarding_return_step')
      
      // Update profile to mark payment setup complete
      try {
        await supabase
          .from('profiles')
          .update({
            payment_setup_completed: true,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      } catch (error) {
        console.warn('Failed to update profile:', error)
      }
    }
    
    // Mark payment setup as complete and redirect to dashboard
    router.push('/dashboard?payment_setup_complete=true')
  }

  // Check for Stripe connection success from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('stripe_connected') === 'true') {
      setStripeConnected(true)
      setSetupComplete(true)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment setup...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-olive-100 rounded-full mb-4">
            <CreditCardIcon className="w-10 h-10 text-olive-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {setupComplete ? 'Payment Setup Complete!' : 'Quick Payment Setup'}
          </h1>
          <p className="text-gray-600">
            {setupComplete 
              ? 'You can now accept online payments from customers'
              : 'Get ready to accept payments in just 2 minutes'
            }
          </p>
        </div>

        {!setupComplete ? (
          <div className="space-y-6">
            {/* Step 1: Connect Stripe */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    stripeConnected ? 'bg-green-100' : 'bg-olive-100'
                  }`}>
                    {stripeConnected ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    ) : (
                      <span className="text-olive-600 font-semibold">1</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Connect Your Bank Account
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Securely connect with Stripe to accept credit cards and get paid next day.
                    </p>
                    
                    {!stripeConnected && (
                      <button
                        onClick={handleStripeConnect}
                        disabled={saving}
                        className="inline-flex items-center px-6 py-3 bg-[#635BFF] hover:bg-[#5147E5] disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                      >
                        {saving ? (
                          <>
                            <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                            </svg>
                            Connect with Stripe
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Processing Fee (Only show after Stripe is connected) */}
            {stripeConnected && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-olive-100 flex items-center justify-center">
                      <span className="text-olive-600 font-semibold">2</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Who Pays Processing Fees?
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Toggle Option */}
                        <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={customerPaysProcessingFee}
                            onChange={(e) => handleToggleFees(e.target.checked)}
                            className="mt-1 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              Pass processing fee to customers
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Customers pay an additional 2.9% + $0.30 per transaction
                            </div>
                          </div>
                        </label>

                        {/* Visual Example */}
                        <div className={`p-4 rounded-lg ${
                          customerPaysProcessingFee ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <div className="text-sm space-y-1">
                            <div className="font-medium text-gray-900">
                              Example: $50 haircut
                            </div>
                            {customerPaysProcessingFee ? (
                              <>
                                <div className="text-gray-600">Customer pays: $51.75</div>
                                <div className="text-green-600 font-medium">You receive: $50.00</div>
                              </>
                            ) : (
                              <>
                                <div className="text-gray-600">Customer pays: $50.00</div>
                                <div className="text-gray-600">You receive: $48.25</div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Industry Insight */}
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                          <BoltIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-800">
                            <strong>68% of barbershops</strong> pass processing fees to customers successfully
                          </p>
                        </div>
                      </div>

                      {/* Complete Setup Button */}
                      <button
                        onClick={handleComplete}
                        className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Complete Setup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Success State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You're All Set!
              </h2>
              <p className="text-gray-600 mb-6">
                Your payment system is ready. You can now accept online payments from customers.
              </p>
              
              <div className="space-y-3 max-w-sm mx-auto text-left mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Accept credit & debit cards</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Get paid next business day</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Automatic commission tracking</span>
                </div>
              </div>

              {/* Bonus Credits Message */}
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <SparklesIcon className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-gray-900">You've earned marketing credits!</span>
                </div>
                <p className="text-sm text-gray-700">
                  50 free SMS messages and 100 email campaigns to grow your business
                </p>
              </div>

              <button
                onClick={handleComplete}
                className="inline-flex items-center px-8 py-3 bg-olive-600 hover:bg-olive-700 text-white rounded-lg font-medium transition-colors"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Footer Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact support at support@bookedbarber.com
          </p>
        </div>
      </div>
    </div>
  )
}