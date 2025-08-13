'use client'

import { useState } from 'react'
import { 
  CalculatorIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function PricingCalculator() {
  const [monthlyBookings, setMonthlyBookings] = useState(200)
  const [averageTicket, setAverageTicket] = useState(50)

  const marketplaceFee = 0.15 // 15% typical marketplace fee
  const sixFBMonthly = 99 // Fixed monthly fee

  const monthlyRevenue = monthlyBookings * averageTicket
  const marketplaceCost = monthlyRevenue * marketplaceFee
  const savings = marketplaceCost - sixFBMonthly
  const yearlyRevenue = monthlyRevenue * 12
  const yearlySavings = savings * 12

  const plans = [
    {
      name: "Individual Barber",
      price: "$49",
      period: "per month",
      description: "Perfect for independent barbers building their brand",
      features: [
        "Personal landing page",
        "All 5 AI agents included",
        "Unlimited bookings",
        "SMS & email automation",
        "Real-time analytics",
        "Client management",
        "Payment processing",
        "24/7 support"
      ],
      highlight: false
    },
    {
      name: "Shop Owner",
      price: "$99",
      period: "per month",
      description: "Everything you need to run a successful barbershop",
      features: [
        "Everything in Individual",
        "Up to 10 barber seats",
        "Shop-wide analytics",
        "Commission tracking",
        "Inventory management",
        "Staff scheduling",
        "Multi-barber calendar",
        "Priority support"
      ],
      highlight: true,
      badge: "MOST POPULAR"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For multi-location operations and franchises",
      features: [
        "Everything in Shop Owner",
        "Unlimited locations",
        "Cross-location analytics",
        "Franchise management",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "White-label options"
      ],
      highlight: false
    }
  ]

  const comparisonPoints = [
    { feature: "Monthly platform fees", marketplace: "15-20% of revenue", sixfb: "Fixed $49-99" },
    { feature: "Your brand visibility", marketplace: "Compete with ads", sixfb: "100% yours" },
    { feature: "Customer data", marketplace: "Platform owns it", sixfb: "You own it" },
    { feature: "Pricing control", marketplace: "Platform rules", sixfb: "Your rules" },
    { feature: "AI automation", marketplace: "Not included", sixfb: "All included" },
    { feature: "Analytics access", marketplace: "Basic only", sixfb: "Full access" },
    { feature: "Marketing tools", marketplace: "Pay extra", sixfb: "All included" }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gold-100 text-gold-800 rounded-full text-sm font-semibold mb-4">
            <CalculatorIcon className="h-4 w-4 mr-2" />
            TRANSPARENT PRICING
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Stop Paying Percentage Fees Forever
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            One flat monthly fee. No percentages. No surprises. 
            Keep 100% of your hard-earned revenue.
          </p>
        </div>

        <div className="bg-gradient-to-br from-olive-50 to-gold-50 rounded-2xl p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Calculate Your Savings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Bookings
              </label>
              <input
                type="range"
                min="50"
                max="500"
                value={monthlyBookings}
                onChange={(e) => setMonthlyBookings(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>50</span>
                <span className="font-bold text-lg text-olive-600">{monthlyBookings}</span>
                <span>500</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Average Ticket Price
              </label>
              <input
                type="range"
                min="20"
                max="150"
                value={averageTicket}
                onChange={(e) => setAverageTicket(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>$20</span>
                <span className="font-bold text-lg text-olive-600">${averageTicket}</span>
                <span>$150</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-sm text-gray-600 mb-1">Your Monthly Revenue</div>
              <div className="text-3xl font-bold text-gray-900">
                ${monthlyRevenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center border-2 border-red-200">
              <div className="text-sm text-red-600 mb-1">Marketplace Fees (15%)</div>
              <div className="text-3xl font-bold text-red-600">
                -${marketplaceCost.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-200">
              <div className="text-sm text-green-600 mb-1">You Save with 6FB</div>
              <div className="text-3xl font-bold text-green-600">
                +${savings > 0 ? savings.toLocaleString() : '0'}
              </div>
            </div>
          </div>

          {savings > 0 && (
            <div className="mt-6 text-center p-4 bg-gradient-to-r from-green-100 to-olive-100 rounded-xl">
              <p className="text-lg font-semibold text-gray-900">
                That's <span className="text-green-600 text-2xl">${yearlySavings.toLocaleString()}</span> saved per year!
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Money that stays in YOUR pocket, not a marketplace's
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative rounded-2xl border-2 ${
                plan.highlight 
                  ? 'border-olive-500 shadow-2xl' 
                  : 'border-gray-200'
              } bg-white p-8`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-olive-600 to-gold-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 ml-2">/{plan.period}</span>
                </div>
                <p className="text-gray-600 mt-3">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="ml-3 text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-r from-olive-600 to-gold-600 text-white hover:shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                {plan.name === "Enterprise" ? "Contact Sales" : "Sign Up"}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            6FB vs. Traditional Marketplaces
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-red-600">Marketplaces</th>
                  <th className="text-center py-3 px-4 font-semibold text-green-600">6FB Platform</th>
                </tr>
              </thead>
              <tbody>
                {comparisonPoints.map((point, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700 font-medium">{point.feature}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center text-red-600">
                        <XMarkIcon className="h-5 w-5 mr-2" />
                        {point.marketplace}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center text-green-600">
                        <CheckIcon className="h-5 w-5 mr-2" />
                        {point.sixfb}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-full mb-6">
            <SparklesIcon className="h-5 w-5 mr-2" />
            <span className="font-medium">No credit card required • Cancel anytime</span>
          </div>
          <button className="bg-gradient-to-r from-olive-600 to-gold-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all duration-300 inline-flex items-center">
            Start Building Your Brand
            <ArrowRightIcon className="h-5 w-5 ml-2" />
          </button>
        </div>
      </div>
    </section>
  )
}