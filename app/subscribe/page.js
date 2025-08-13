'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

const PRICING_TIERS = [
  {
    id: 'barber',
    name: 'Individual Barber',
    description: 'Perfect for independent barbers and solo practitioners',
    monthlyPrice: 35,
    yearlyPrice: 336, // 20% discount
    features: [
      'Unlimited bookings',
      '1 staff member',
      '500 SMS credits/month',
      '1,000 email credits/month',
      'Custom domain included',
      'Full analytics dashboard',
      'AI-powered insights',
      'Mobile app access',
      'Email support'
    ],
    limitations: [
      'Single barber only',
      'No team management'
    ],
    cta: 'Start as Individual',
    recommended: false
  },
  {
    id: 'shop',
    name: 'Barbershop',
    description: 'Ideal for barbershop owners with multiple barbers',
    monthlyPrice: 99,
    yearlyPrice: 950, // 20% discount
    features: [
      'Unlimited bookings',
      'Up to 15 barbers',
      '2,000 SMS credits/month',
      '5,000 email credits/month',
      'Custom domain included',
      'Advanced analytics',
      'AI-powered insights',
      'Team management tools',
      'Commission tracking',
      'Priority support',
      'API access'
    ],
    limitations: [
      'Single location only'
    ],
    cta: 'Start as Shop Owner',
    recommended: true
  },
  {
    id: 'enterprise',
    name: 'Multi-Location',
    description: 'For barbershop chains and franchise operations',
    monthlyPrice: 249,
    yearlyPrice: 2390, // 20% discount
    features: [
      'Unlimited bookings',
      'Unlimited barbers',
      'Unlimited locations',
      '10,000 SMS credits/month',
      '25,000 email credits/month',
      'Multiple custom domains',
      'Enterprise analytics',
      'AI-powered insights',
      'Advanced team management',
      'Multi-location dashboard',
      'White-label options',
      'Dedicated account manager',
      'Phone & priority support',
      'Custom integrations',
      'SLA guarantee'
    ],
    limitations: [],
    cta: 'Start as Enterprise',
    recommended: false
  }
]

export default function SubscribePage() {
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [selectedTier, setSelectedTier] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    // Only check subscription after auth has loaded
    if (!authLoading && user) {
      checkExistingSubscription()
    }
  }, [user, authLoading])

  // Clean up loading state on unmount
  useEffect(() => {
    return () => {
      setLoading(false)
      setSelectedTier(null)
    }
  }, [])

  const checkExistingSubscription = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/subscription/status')
      if (response.ok) {
        const data = await response.json()
        if (data.hasActiveSubscription) {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const handleSelectPlan = async (tierId) => {
    // Don't do anything while auth is still loading
    if (authLoading) {
      console.log('Auth still loading, please wait...')
      return
    }

    // Show loading state immediately for better UX
    setLoading(true)
    setSelectedTier(tierId)
    setError('')

    // If auth has loaded and no user, redirect to login after brief delay
    if (!user) {
      // Show "Redirecting to login..." for better UX
      setTimeout(() => {
        router.push('/login?redirect=/subscribe')
      }, 500)
      return
    }

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId,
          billingPeriod,
          userId: user.id,
          userEmail: user.email
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
      setSelectedTier(null)
    }
  }

  const getPrice = (tier) => {
    return billingPeriod === 'monthly' 
      ? tier.monthlyPrice 
      : Math.round(tier.yearlyPrice / 12)
  }

  const getSavings = (tier) => {
    if (billingPeriod === 'monthly') return 0
    const yearlyTotal = tier.monthlyPrice * 12
    return yearlyTotal - tier.yearlyPrice
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Auth Loading Message */}
        {authLoading && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-blue-700">Verifying your account status...</p>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            No free trial needed. Start growing your barbershop business today.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-lg ${billingPeriod === 'monthly' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-lg ${billingPeriod === 'yearly' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 mx-auto max-w-md">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border ${
                tier.recommended
                  ? 'border-green-500 shadow-xl scale-105'
                  : 'border-gray-200 shadow-lg'
              } bg-white p-8`}
            >
              {tier.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {tier.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900">
                    ${getPrice(tier)}
                  </span>
                  <span className="ml-2 text-gray-600">/month</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className="mt-2 text-sm text-green-600">
                    Save ${getSavings(tier)} per year
                  </p>
                )}
                {billingPeriod === 'yearly' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Billed ${tier.yearlyPrice} annually
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSelectPlan(tier.id)}
                disabled={authLoading || loading}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                  (authLoading || (loading && selectedTier === tier.id))
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : tier.recommended
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {authLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : loading && selectedTier === tier.id ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {!user ? 'Redirecting to login...' : 'Processing...'}
                  </span>
                ) : (
                  tier.cta
                )}
              </button>

              <div className="mt-8 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  What's included
                </h4>
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                {tier.limitations.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide pt-4">
                      Limitations
                    </h4>
                    <ul className="space-y-3">
                      {tier.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start">
                          <XMarkIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                          <span className="text-sm text-gray-500">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto text-left space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, debit cards, and ACH transfers through our secure payment processor, Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I exceed my credits?
              </h3>
              <p className="text-gray-600">
                You can purchase additional credits as needed, or upgrade to a higher plan for more included credits. Overage charges apply at competitive rates.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee. If you're not satisfied, contact our support team for a full refund.
              </p>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            🔒 Secure payment processing by Stripe. Your payment information is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  )
}