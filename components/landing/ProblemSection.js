'use client'

import {
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserMinusIcon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline'

export default function ProblemSection() {
  const problems = [
    {
      icon: CurrencyDollarIcon,
      title: "Marketplace Fees Eating Your Profits",
      description: "Pay 15-30% commission on every booking. That $100 haircut? You only see $70-85. Your hard work, their profit.",
      impact: "Lost Revenue"
    },
    {
      icon: UserMinusIcon,
      title: "Competing for Your Own Clients",
      description: "Clients book through apps that show 10 other barbers nearby. You're just another listing fighting for attention with paid ads.",
      impact: "No Brand Control"
    },
    {
      icon: ChartBarSquareIcon,
      title: "Zero Business Intelligence",
      description: "No data on your best clients, peak times, or growth trends. You're flying blind while platforms keep all the insights.",
      impact: "Missed Opportunities"
    },
    {
      icon: ExclamationTriangleIcon,
      title: "Platform Dependency Risk",
      description: "Algorithm changes, policy updates, or account suspensions can kill your business overnight. You don't own the relationship.",
      impact: "Business Vulnerability"
    }
  ]

  return (
    <section className="py-24 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-red-900/30 backdrop-blur-sm rounded-full text-sm font-semibold mb-8 text-red-200">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            THE MARKETPLACE TRAP
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Stop Building Someone Else's Empire
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Every booking app, marketplace, and platform is designed to extract value from your work. 
            Here's what they don't want you to know.
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {problems.map((problem, index) => {
            const Icon = problem.icon
            return (
              <div 
                key={index}
                className="relative p-8 bg-gray-800 rounded-xl border border-gray-700 hover:border-red-500/50 transition-all duration-300"
              >
                <div className="absolute -top-3 -right-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {problem.impact}
                  </span>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-600 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {problem.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Impact Stats */}
        <div className="bg-gradient-to-r from-red-900/20 to-red-800/20 rounded-2xl p-8 border border-red-500/20">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-4 text-white">
              The True Cost of Marketplace Dependency
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-red-400">$18K+</div>
              <div className="text-gray-300 text-sm">Average annual fees paid by barbers to booking platforms</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-red-400">73%</div>
              <div className="text-gray-300 text-sm">Of barbers report feeling "trapped" by their booking platform</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-red-400">0%</div>
              <div className="text-gray-300 text-sm">Client data ownership on traditional platforms</div>
            </div>
          </div>
        </div>

        {/* Transition to Solution */}
        <div className="text-center mt-16">
          <p className="text-xl text-gray-300 mb-8">
            What if there was a better way? What if you could own your brand, your data, and your profits?
          </p>
          <div className="inline-flex items-center text-green-400 font-semibold">
            <span className="mr-2">There is.</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}