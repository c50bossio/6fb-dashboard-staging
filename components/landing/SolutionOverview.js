'use client'

import { 
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  SparklesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function SolutionOverview() {
  const solutions = [
    {
      icon: GlobeAltIcon,
      title: "Your Brand, Your Domain",
      description: "Get yourbusiness.com with full branding control. No competing listings, no paid placements - just YOUR professional presence.",
      highlight: "100% Brand Ownership",
      features: ["Custom domain included", "Professional booking pages", "Complete brand control", "No competitor ads"]
    },
    {
      icon: CurrencyDollarIcon,
      title: "Keep Every Dollar You Earn",
      description: "Zero marketplace fees. Set your prices, run promotions, process payments - and keep 100% of your revenue.",
      highlight: "$0 Commission Fees",
      features: ["No booking fees", "Direct payment processing", "Your pricing, your rules", "Instant payouts"]
    },
    {
      icon: ChartBarIcon,
      title: "AI-Powered Business Intelligence", 
      description: "Smart analytics that help you optimize pricing, identify peak times, and grow revenue using real data you own.",
      highlight: "Data-Driven Growth",
      features: ["Revenue optimization", "Client insights", "Peak time analysis", "Growth recommendations"]
    },
    {
      icon: SparklesIcon,
      title: "Complete Business Automation",
      description: "From booking to payments to client communication - automate everything while maintaining the personal touch.",
      highlight: "Save 10+ Hours/Week",
      features: ["Automated scheduling", "Smart reminders", "Payment processing", "Client management"]
    },
    {
      icon: ShieldCheckIcon,
      title: "Enterprise Security & Reliability",
      description: "Bank-level security, 99.9% uptime, and full data ownership. Your business data stays yours, forever.",
      highlight: "Your Data, Protected",
      features: ["Enterprise security", "99.9% uptime SLA", "Data ownership", "GDPR compliant"]
    }
  ]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 backdrop-blur-sm rounded-full text-sm font-semibold mb-8 text-green-800">
            <SparklesIcon className="h-4 w-4 mr-2" />
            THE 6FB SOLUTION
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Own Your Business, Not Rent Space in Someone Else's
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Everything you need to run and grow your barbershop business - 
            without the marketplace fees, competition, or platform dependency.
          </p>
        </div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {solutions.map((solution, index) => {
            const Icon = solution.icon
            return (
              <div 
                key={index}
                className="relative p-8 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="absolute -top-3 -right-3">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-brand-600 to-brand-500 text-white">
                    {solution.highlight}
                  </span>
                </div>
                
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white">
                      <Icon className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {solution.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {solution.description}
                    </p>
                  </div>
                </div>

                {/* Feature List */}
                <div className="grid grid-cols-2 gap-2">
                  {solution.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison */}
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 text-white">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4">
              The Choice Is Clear
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Marketplace Column */}
            <div className="text-center p-6 bg-red-900/20 rounded-xl border border-red-500/30">
              <h4 className="text-xl font-bold mb-4 text-red-300">Traditional Marketplaces</h4>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  15-30% commission fees
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Compete with other barbers
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  No client data ownership
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Platform dependency risk
                </div>
              </div>
            </div>

            {/* 6FB Column */}
            <div className="text-center p-6 bg-green-900/20 rounded-xl border border-green-500/30">
              <h4 className="text-xl font-bold mb-4 text-green-300">6FB Platform</h4>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  $0 commission fees
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Your brand, your domain
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete data ownership
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full business independence
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 rounded-lg text-white font-semibold">
              Ready to Own Your Success? →
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}