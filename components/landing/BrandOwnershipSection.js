'use client'

import { 
  GlobeAltIcon,
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function BrandOwnershipSection() {
  const features = [
    {
      icon: GlobeAltIcon,
      title: "Your Own Digital Storefront",
      description: "Get a professional landing page at yourdomain.com/your-name. No competing listings, no paid placements - just YOUR brand.",
      highlight: "100% Your Brand"
    },
    {
      icon: UserGroupIcon,
      title: "Your Customers, Your Data",
      description: "Build direct relationships with YOUR clients. Own your customer list, booking history, and preferences - not trapped in someone else's platform.",
      highlight: "Full Data Ownership"
    },
    {
      icon: CurrencyDollarIcon,
      title: "Your Pricing, Your Rules",
      description: "Set your own prices, create custom packages, run your own promotions. No marketplace fees eating into your profits.",
      highlight: "Keep 100% Revenue"
    },
    {
      icon: ChartBarIcon,
      title: "Your Growth, Your Way",
      description: "Track YOUR metrics, understand YOUR peak times, optimize YOUR services. Make decisions based on real data you control.",
      highlight: "Data-Driven Decisions"
    },
    {
      icon: ShieldCheckIcon,
      title: "Your Reputation, Protected",
      description: "No competing with fake reviews or paid competitors. Build authentic relationships and let your work speak for itself.",
      highlight: "Authentic Growth"
    },
    {
      icon: SparklesIcon,
      title: "Your Brand, Amplified",
      description: "Professional tools to showcase your work, highlight specialties, and tell your story. Stand out as the expert you are.",
      highlight: "Professional Presence"
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Own Your Brand, Not Be a Listing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stop paying marketplaces for visibility. Stop competing with paid ads. 
            Start building a business that's truly yours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div 
                key={index}
                className="relative p-6 bg-gray-50 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 border border-gray-100"
              >
                <div className="absolute -top-3 -right-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {feature.highlight}
                  </span>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">
              The Marketplace Model is Broken for Barbers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">$0</div>
                <div className="text-blue-100">Marketplace fees with 6FB</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">100%</div>
                <div className="text-blue-100">Your brand, your control</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">24/7</div>
                <div className="text-blue-100">AI working for your business</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}