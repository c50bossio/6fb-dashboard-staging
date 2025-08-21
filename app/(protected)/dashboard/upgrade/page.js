'use client'

import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

const plans = {
  individual: {
    name: 'Individual Barber',
    price: { monthly: 49, yearly: 470 },
    description: 'Perfect for independent barbers',
    features: [
      'Personal booking page',
      'Up to 100 bookings/month',
      'Basic analytics',
      'SMS reminders',
      'Payment processing',
      'Customer management',
      { name: 'AI business insights', included: false },
      { name: 'Multi-location support', included: false },
      { name: 'Team management', included: false },
      { name: 'Advanced marketing tools', included: false }
    ]
  },
  shop_owner: {
    name: 'Shop Owner',
    price: { monthly: 99, yearly: 950 },
    description: 'For barbershop owners with teams',
    features: [
      'Everything in Individual',
      'Unlimited bookings',
      'Up to 5 barber accounts',
      'Advanced analytics',
      'SMS & email marketing',
      'Inventory tracking',
      'AI business insights',
      'Commission tracking',
      'Team scheduling',
      { name: 'Multi-location support', included: false }
    ],
    popular: true
  },
  enterprise: {
    name: 'Enterprise',
    price: { monthly: 'Custom', yearly: 'Custom' },
    description: 'Multi-location barbershop chains',
    features: [
      'Everything in Shop Owner',
      'Unlimited locations',
      'Unlimited barber accounts',
      'Custom integrations',
      'API access',
      'Dedicated support',
      'Custom training',
      'SLA guarantee',
      'White-label options',
      'Priority features'
    ]
  }
}

export default function UpgradePage() {
  const { profile, subscriptionTier } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  
  const requiredTier = searchParams.get('required')
  const featureName = searchParams.get('feature')
  
  const handleUpgrade = async (tier) => {
    // TODO: Integrate with Stripe for payment processing
    console.log('Upgrading to:', tier)
    // For now, just redirect to contact for enterprise
    if (tier === 'enterprise') {
      router.push('/contact?subject=enterprise')
    } else {
      // Would integrate with Stripe here
      alert(`Stripe integration coming soon for ${tier} upgrade`)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade Your Plan
          </h1>
          
          {requiredTier && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <p className="text-yellow-800">
                {featureName ? (
                  <>The <strong>{featureName}</strong> feature requires a <strong>{requiredTier.replace('_', ' ')}</strong> subscription.</>
                ) : (
                  <>This area requires a <strong>{requiredTier.replace('_', ' ')}</strong> subscription to access.</>
                )}
              </p>
            </div>
          )}
          
          <p className="text-xl text-gray-600">
            Choose the perfect plan for your barbershop business
          </p>
          
          {/* Billing toggle */}
          <div className="mt-6 flex items-center justify-center space-x-4">
            <span className={billingPeriod === 'monthly' ? 'text-gray-900 font-semibold' : 'text-gray-500'}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-brand-600"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className={billingPeriod === 'yearly' ? 'text-gray-900 font-semibold' : 'text-gray-500'}>
              Yearly
              <span className="ml-1 text-green-600 text-sm font-medium">(Save 20%)</span>
            </span>
          </div>
        </div>
        
        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.entries(plans).map(([key, plan]) => {
            const isCurrentPlan = subscriptionTier === key
            const tierLevel = { individual: 1, shop_owner: 2, enterprise: 3 }
            const canUpgrade = tierLevel[key] > tierLevel[subscriptionTier]
            
            return (
              <div
                key={key}
                className={`relative rounded-2xl bg-white p-8 shadow-lg ${
                  plan.popular ? 'ring-2 ring-brand-600' : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-brand-600 px-4 py-1 text-sm font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-gray-600">{plan.description}</p>
                  
                  <div className="mt-6">
                    {typeof plan.price[billingPeriod] === 'number' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">
                          ${plan.price[billingPeriod]}
                        </span>
                        <span className="text-gray-600">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-gray-900">Custom Pricing</span>
                    )}
                  </div>
                </div>
                
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, idx) => {
                    const isString = typeof feature === 'string'
                    const included = isString || feature.included
                    
                    return (
                      <li key={idx} className="flex items-start">
                        {included ? (
                          <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        ) : (
                          <XMarkIcon className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                        )}
                        <span className={included ? 'text-gray-700' : 'text-gray-400'}>
                          {isString ? feature : feature.name}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full rounded-lg bg-gray-100 px-4 py-3 text-center text-sm font-semibold text-gray-500"
                  >
                    Current Plan
                  </button>
                ) : canUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(key)}
                    className={`w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {key === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full rounded-lg bg-gray-100 px-4 py-3 text-center text-sm font-semibold text-gray-400"
                  >
                    Not Available
                  </button>
                )}
              </div>
            )
          })}
        </div>
        
        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Questions about upgrading?{' '}
            <a href="/contact" className="text-brand-600 hover:text-brand-700 font-medium">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}