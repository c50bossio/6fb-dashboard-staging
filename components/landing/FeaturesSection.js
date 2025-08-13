'use client'

import {
  CalendarDaysIcon,
  CreditCardIcon,
  ChartBarIcon,
  BellAlertIcon,
  UserGroupIcon,
  CogIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

const FeaturesSection = () => {
  const features = [
    {
      icon: CalendarDaysIcon,
      title: 'Smart Booking System',
      description: 'Automated scheduling with intelligent time slot management and conflict prevention.'
    },
    {
      icon: CreditCardIcon,
      title: 'Integrated Payments',
      description: 'Accept payments, tips, and deposits seamlessly with Stripe integration.'
    },
    {
      icon: ChartBarIcon,
      title: 'Real-Time Analytics',
      description: 'Track revenue, bookings, and customer trends with powerful dashboards.'
    },
    {
      icon: BellAlertIcon,
      title: 'Automated Reminders',
      description: 'Reduce no-shows with SMS and email reminders sent automatically.'
    },
    {
      icon: UserGroupIcon,
      title: 'Team Management',
      description: 'Manage multiple barbers, track commissions, and handle scheduling.'
    },
    {
      icon: CogIcon,
      title: 'AI Business Coach',
      description: 'Get personalized recommendations to grow your barbershop business.'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Mobile Optimized',
      description: 'Works perfectly on any device - manage your business on the go.'
    },
    {
      icon: GlobeAltIcon,
      title: 'Custom Domain',
      description: 'Get your own professional website at yourbarbershop.com.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Reliable',
      description: '99.9% uptime guarantee with enterprise-grade security.'
    }
  ]

  return (
    <section className="py-24 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to Run Your Barbershop
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From bookings to payments to analytics - we've got you covered with a complete business platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-gray-50 rounded-xl p-8 hover:bg-white hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-600 text-white group-hover:bg-brand-700 transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="#pricing"
            className="inline-flex items-center text-brand-600 font-semibold hover:text-brand-700"
          >
            See all features in our pricing plans
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection