'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { PRICING_PLANS, formatPrice } from '@/lib/stripe'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

export default function PricingPage() {
  const [loading, setLoading] = useState(null)
  const [billingInterval, setBillingInterval] = useState('month')
  const router = useRouter()
  const { user } = useAuth()

  const handleSubscribe = async (planId) => {
    if (!user) {
      router.push('/login')
      return
    }

    setLoading(planId)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      const { sessionId } = await response.json()
      
      const stripe = await stripePromise
      const { error } = await stripe.redirectToCheckout({ sessionId })
      
      if (error) {
        console.error('Stripe error:', error)
        alert(error.message)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription process')
    } finally {
      setLoading(null)
    }
  }

  const plans = Object.values(PRICING_PLANS).filter(plan => plan.id !== 'free')

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">6FB</span>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">AI Agent System</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center text-gray-600 hover:text-blue-600 font-medium transition-colors">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
              <Link href="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-gradient text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Simple, Transparent
            <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
            Choose the perfect plan for your barbershop
          </p>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="mt-8 flex justify-center">
        <div className="bg-white rounded-lg shadow-sm p-1 flex">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'month'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'year'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => {
              const isPopular = plan.id === 'professional'
              const price = billingInterval === 'year' 
                ? Math.floor(plan.price * 0.8) // 20% discount
                : plan.price

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-sm ${
                    isPopular ? 'ring-2 ring-blue-600' : ''
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-5 left-0 right-0 mx-auto w-32">
                      <div className="rounded-full bg-blue-600 px-3 py-1 text-center text-sm font-semibold text-white">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="mt-2 text-gray-600">{plan.description}</p>
                    
                    <div className="mt-6">
                      {plan.price ? (
                        <>
                          <span className="text-4xl font-bold text-gray-900">
                            {formatPrice(price, plan.currency)}
                          </span>
                          <span className="text-gray-600">/{billingInterval}</span>
                        </>
                      ) : (
                        <span className="text-4xl font-bold text-gray-900">Custom</span>
                      )}
                    </div>

                    <ul className="mt-8 space-y-4">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckIcon className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="ml-3 text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => plan.id === 'enterprise' 
                        ? router.push('/contact?subject=enterprise') 
                        : handleSubscribe(plan.id)
                      }
                      disabled={loading === plan.id}
                      className={`mt-8 w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                        isPopular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading === plan.id ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : plan.id === 'enterprise' ? (
                        'Contact Sales'
                      ) : (
                        'Get Started'
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Free plan */}
      <div className="mt-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Start with our free plan
        </h3>
        <p className="mt-2 text-gray-600">
          No credit card required. Upgrade anytime as you grow.
        </p>
        <div className="mt-4">
          <button
            onClick={() => router.push('/register')}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Sign Up Now
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Frequently asked questions
        </h2>
        <dl className="mt-8 max-w-3xl mx-auto space-y-6">
          <div>
            <dt className="font-semibold text-gray-900">
              Can I change plans later?
            </dt>
            <dd className="mt-2 text-gray-600">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">
              What payment methods do you accept?
            </dt>
            <dd className="mt-2 text-gray-600">
              We accept all major credit cards, debit cards, and support payment through Stripe's secure checkout.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">
              Is there a setup fee?
            </dt>
            <dd className="mt-2 text-gray-600">
              No! There are no setup fees or hidden charges. You only pay the monthly subscription price.
            </dd>
          </div>
        </dl>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Barbershop?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Start growing your business today. No commitment, no credit card required.
          </p>
          <Link href="/register" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-10 py-5 rounded-xl text-lg font-bold hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 transform hover:scale-105 shadow-2xl inline-block">
            Sign Up Now
          </Link>
        </div>
      </div>
    </div>
  )
}