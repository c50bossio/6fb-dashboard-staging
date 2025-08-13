'use client'

import { 
  StarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/solid'
import { ChatBubbleBottomCenterTextIcon as QuoteIcon } from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/outline'

export default function BarberSuccessStories() {
  const stories = [
    {
      name: "Marcus Johnson",
      title: "Master Barber & Shop Owner",
      location: "Atlanta, GA",
      image: "/api/placeholder/150/150",
      quote: "I went from losing track of clients in a marketplace to building my own brand. Now MY customers book directly with ME.",
      results: [
        { metric: "$12K", label: "Monthly revenue increase" },
        { metric: "85%", label: "Client retention rate" },
        { metric: "6 hrs", label: "Saved per week on admin" }
      ],
      highlight: "Doubled revenue in 6 months",
      verified: true
    },
    {
      name: "DeShawn Williams",
      title: "Independent Barber",
      location: "Houston, TX",
      image: "/api/placeholder/150/150",
      quote: "The AI handles all my marketing and reminders. I just cut hair and watch my business grow. It's that simple.",
      results: [
        { metric: "3x", label: "More repeat bookings" },
        { metric: "$450", label: "Daily average revenue" },
        { metric: "Zero", label: "No-shows with AI reminders" }
      ],
      highlight: "Tripled repeat bookings",
      verified: true
    },
    {
      name: "James Rodriguez",
      title: "Multi-Location Owner",
      location: "Miami, FL",
      image: "/api/placeholder/150/150",
      quote: "Managing 3 shops used to be chaos. Now I see everything in one dashboard and the AI tells me exactly what needs attention.",
      results: [
        { metric: "3", label: "Shops managed from one dashboard" },
        { metric: "28%", label: "Overall growth across locations" },
        { metric: "$180K", label: "Annual revenue per location" }
      ],
      highlight: "Scaled to 3 locations",
      verified: true
    }
  ]

  const transformations = [
    {
      title: "From Invisible to Influential",
      before: "Lost in marketplace listings",
      after: "Top Google search result for 'barber near me'",
      icon: ArrowTrendingUpIcon
    },
    {
      title: "From Chaos to Control",
      before: "Juggling paper books and texts",
      after: "Everything automated and organized",
      icon: ClockIcon
    },
    {
      title: "From Guessing to Growing",
      before: "No idea what's working",
      after: "Data-driven decisions daily",
      icon: UserGroupIcon
    },
    {
      title: "From Surviving to Thriving",
      before: "Living appointment to appointment",
      after: "Predictable, growing revenue",
      icon: CurrencyDollarIcon
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-moss-100 text-moss-900 rounded-full text-sm font-semibold mb-4">
            <CheckBadgeIcon className="h-4 w-4 mr-2" />
            SUCCESS STORIES
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Barbers Who Took Control of Their Business
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real barbers, real results. See how switching from marketplace dependency 
            to brand ownership transformed their businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {stories.map((story, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-6">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0">
                    <div className="h-16 w-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-600">
                        {story.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-bold text-gray-900">{story.name}</h3>
                      {story.verified && (
                        <CheckBadgeIcon className="h-5 w-5 text-olive-500 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{story.title}</p>
                    <p className="text-sm text-gray-500">{story.location}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-start">
                    <QuoteIcon className="h-5 w-5 text-gray-300 flex-shrink-0 mt-1" />
                    <p className="ml-2 text-gray-700 italic">
                      {story.quote}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-olive-50 rounded-xl p-3 mb-4">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-green-800 mb-1">
                      KEY ACHIEVEMENT
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {story.highlight}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {story.results.map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{result.label}</span>
                      <span className="text-lg font-bold text-gray-900">{result.metric}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
                    ))}
                  </div>
                  <span className="ml-2">Verified 6FB Success Story</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-8 text-center">
            The Transformation is Real
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {transformations.map((transform, index) => {
              const Icon = transform.icon
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center h-12 w-12 bg-white/10 rounded-full mb-4">
                    <Icon className="h-6 w-6 text-olive-400" />
                  </div>
                  <h4 className="font-semibold mb-3">{transform.title}</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-red-400">Before:</span>
                      <p className="text-gray-400">{transform.before}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-green-400">After:</span>
                      <p className="text-gray-300">{transform.after}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg text-gray-700 font-medium mb-6">
            Join 500+ barbers who've taken control of their business
          </p>
          <button className="bg-gradient-to-r from-olive-600 to-gold-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transition-all duration-300">
            Start Your Success Story Today
          </button>
        </div>
      </div>
    </section>
  )
}