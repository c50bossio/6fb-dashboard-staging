'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { CheckIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'

const PLANS = [
  {
    id: 'barber',
    name: 'Barber',
    price: 35,
    period: 'month',
    description: 'Perfect for individual barbers',
    features: [
      'Personal booking calendar',
      'Customer management',
      'Basic analytics',
      'Mobile app access',
      'Email notifications'
    ]
  },
  {
    id: 'shop',
    name: 'Shop Owner',
    price: 99,
    period: 'month',
    description: 'Ideal for barbershop owners',
    features: [
      'Multi-barber management',
      'Advanced analytics',
      'Revenue tracking',
      'Staff scheduling',
      'Inventory management',
      'Customer insights'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 249,
    period: 'month',
    description: 'For multi-location businesses',
    features: [
      'Unlimited locations',
      'Advanced reporting',
      'API access',
      'Custom integrations',
      'Priority support',
      'White-label options'
    ]
  }
]

export default function PricingPage() {
  const { signInWithGoogle, user, profile } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState('shop')
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Protect against existing customers accessing pricing page
  useEffect(() => {
    if (user && profile) {
      console.log('🔍 Checking existing user on pricing page:', {
        email: user.email,
        role: profile.role,
        subscription_status: profile.subscription_status
      })
      
      // If user has active subscription, redirect them away from pricing
      if (profile.subscription_status === 'active') {
        console.log('✅ User already has active subscription, redirecting to welcome')
        router.push('/welcome?from=existing_customer')
        return
      }
      
      // If user has a role (individual_barber, shop_owner, etc.) they likely already paid
      if (profile.role && profile.role !== 'CLIENT') {
        console.log('✅ User has business role, redirecting to welcome')
        router.push('/welcome?from=existing_customer')
        return
      }
    }
  }, [user, profile, router])

  const handleEmailSignup = async (planId) => {
    try {
      setLoading(true)
      console.log('📧 Starting email signup for plan:', planId)
      
      // Redirect to email registration page with plan data
      const registrationUrl = `/register?plan=${planId}&billing=${billingPeriod}`
      console.log('🔄 Redirecting to registration:', registrationUrl)
      window.location.href = registrationUrl
      
    } catch (error) {
      console.error('Email signup error:', error)
      alert('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignup = async (planId) => {
    try {
      setLoading(true)
      console.log('🔐 Starting Google OAuth for plan:', planId)
      
      // Pass plan data via URL parameters to the OAuth callback
      const callbackUrl = `${window.location.origin}/auth/callback?plan=${planId}&billing=${billingPeriod}`
      console.log('🔄 OAuth callback URL:', callbackUrl)
      
      const { error } = await signInWithGoogle(callbackUrl)
      
      if (error) {
        console.error('OAuth error:', error)
        alert('Sign up failed. Please try again.')
        return
      }
      
      console.log('✅ OAuth initiated successfully')
      
    } catch (error) {
      console.error('Google signup error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start managing your barbershop with our powerful tools. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Yearly (2 months free)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const yearlyPrice = Math.round(plan.price * 10) // 2 months free
            const displayPrice = billingPeriod === 'yearly' ? yearlyPrice : plan.price
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-sm border-2 p-8 ${
                  plan.popular
                    ? 'border-blue-500 scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                } transition-all duration-200`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      ${displayPrice}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{billingPeriod === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-green-600 mt-1">
                      Save ${plan.price * 2} per year
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <button
                    onClick={() => handleEmailSignup(plan.id)}
                    disabled={loading}
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Starting...' : 'Get Started'}
                  </button>
                  
                  <button
                    onClick={() => handleGoogleSignup(plan.id)}
                    disabled={loading}
                    className={`w-full py-2 px-6 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-gray-600">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}