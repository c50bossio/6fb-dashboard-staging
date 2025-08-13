'use client'

import { useState } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

const PricingSection = () => {
  const [billingPeriod, setBillingPeriod] = useState('monthly')

  const plans = [
    {
      name: 'Individual',
      description: 'Perfect for independent barbers',
      monthlyPrice: 49,
      yearlyPrice: 470,
      features: [
        { name: 'Personal booking page', included: true },
        { name: 'Up to 100 bookings/month', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'SMS reminders', included: true },
        { name: 'Payment processing', included: true },
        { name: 'Customer management', included: true },
        { name: 'AI business insights', included: false },
        { name: 'Multi-location support', included: false },
        { name: 'Team management', included: false },
        { name: 'Advanced marketing tools', included: false }
      ],
      cta: 'Sign Up',
      highlighted: false
    },
    {
      name: 'Shop Owner',
      description: 'For barbershop owners with teams',
      monthlyPrice: 99,
      yearlyPrice: 950,
      features: [
        { name: 'Unlimited bookings', included: true },
        { name: 'Up to 5 barber accounts', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'SMS & email marketing', included: true },
        { name: 'Payment & tips management', included: true },
        { name: 'Inventory tracking', included: true },
        { name: 'AI business insights', included: true },
        { name: 'Commission tracking', included: true },
        { name: 'Team scheduling', included: true },
        { name: 'Multi-location support', included: false }
      ],
      cta: 'Sign Up',
      highlighted: true,
      badge: 'Most Popular'
    },
    {
      name: 'Enterprise',
      description: 'Multi-location barbershop chains',
      monthlyPrice: 249,
      yearlyPrice: 2390,
      features: [
        { name: 'Everything in Shop Owner', included: true },
        { name: 'Unlimited barber accounts', included: true },
        { name: 'Unlimited locations', included: true },
        { name: 'Enterprise analytics', included: true },
        { name: 'API access', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'Dedicated support', included: true },
        { name: 'Custom branding', included: true },
        { name: 'Priority features', included: true },
        { name: 'SLA guarantee', included: true }
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ]

  const calculateSavings = (monthly, yearly) => {
    const yearlyCost = monthly * 12
    const savings = yearlyCost - yearly
    return Math.round((savings / yearlyCost) * 100)
  }

  return (
    <section className="py-24 bg-gray-50" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            No hidden fees. No marketplace commissions. Just honest pricing that grows with your business.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly
              <span className="ml-2 text-sm text-green-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all hover:shadow-2xl ${
                plan.highlighted
                  ? 'ring-2 ring-brand-600 transform scale-105'
                  : ''
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-brand-600 to-brand-700 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  {plan.badge}
                </div>
              )}

              {/* Card Content */}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900">
                      ${billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="ml-2 text-gray-600">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-green-600 mt-2">
                      Save {calculateSavings(plan.monthlyPrice, plan.yearlyPrice)}% compared to monthly
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-start">
                      {feature.included ? (
                        <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  href={plan.cta === 'Contact Sales' ? '/contact' : '/register'}
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Get Started Today</h4>
              <p className="text-gray-600">
                Join BookedBarber now. No credit card required to start.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h4>
              <p className="text-gray-600">
                No long-term contracts. Cancel your subscription anytime.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Free Migration</h4>
              <p className="text-gray-600">
                We'll help you migrate from your current system for free.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Have questions about pricing?{' '}
            <Link href="/pricing-faq" className="text-brand-600 font-semibold hover:underline">
              View our pricing FAQ
            </Link>
            {' or '}
            <Link href="/contact" className="text-brand-600 font-semibold hover:underline">
              contact our sales team
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default PricingSection