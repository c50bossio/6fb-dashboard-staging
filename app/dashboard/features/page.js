'use client'

import Link from 'next/link'
import { 
  ChartBarIcon,
  ChatBubbleLeftRightIcon as ChatIcon,
  EnvelopeIcon as MailIcon,
  CalendarDaysIcon as CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export default function FeaturesPage() {
  const features = [
    {
      name: 'AI Marketing Automation',
      description: 'Automated SMS & email campaigns that learn from customer behavior and optimize engagement automatically.',
      icon: MailIcon,
      benefits: [
        'Smart campaign targeting',
        'Behavioral trigger automation',
        'A/B testing optimization',
        'ROI tracking and analytics'
      ]
    },
    {
      name: 'Smart Booking Management',
      description: 'AI-powered calendar management with automated reminders and intelligent customer follow-ups.',
      icon: CalendarIcon,
      benefits: [
        'Intelligent scheduling conflicts resolution',
        'Automated appointment reminders',
        'Customer preference learning',
        'Multi-location coordination'
      ]
    },
    {
      name: 'Customer Intelligence',
      description: 'Advanced customer segmentation and personalized marketing based on preferences and history.',
      icon: UserGroupIcon,
      benefits: [
        'Behavioral pattern analysis',
        'Predictive lifetime value',
        'Churn risk identification',
        'Personalized service recommendations'
      ]
    },
    {
      name: 'Content Generation',
      description: 'AI creates compelling social media posts, email content, and marketing materials automatically.',
      icon: ChatIcon,
      benefits: [
        'Brand-consistent content creation',
        'Trending hashtag optimization',
        'Multi-platform adaptation',
        'Performance-driven iterations'
      ]
    },
    {
      name: 'Performance Analytics',
      description: 'Real-time insights into campaign performance, customer retention, and business growth metrics.',
      icon: ChartBarIcon,
      benefits: [
        'Real-time dashboard monitoring',
        'Predictive growth modeling',
        'Competitive benchmarking',
        'Custom reporting tools'
      ]
    },
    {
      name: 'Social Media Automation',
      description: 'Automated posting, engagement tracking, and reputation management across all platforms.',
      icon: SparklesIcon,
      benefits: [
        'Multi-platform scheduling',
        'Engagement rate optimization',
        'Review response automation',
        'Competitor analysis'
      ]
    }
  ]

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
            Powerful AI Features for
            <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Modern Barbershops
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
            Discover how our 6 specialized AI agents work together to automate your marketing, 
            optimize customer relationships, and grow your business 24/7.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {features.map((feature, index) => (
              <div key={feature.name} className="feature-card group">
                <div className="flex">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:from-blue-100 group-hover:to-purple-100 transition-all duration-300 flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-blue-600 group-hover:text-purple-600 transition-colors duration-300" />
                  </div>
                  <div className="ml-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                      {feature.name}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Experience These Features?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Start your free trial today and see how AI can transform your barbershop business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-10 py-5 rounded-xl text-lg font-bold hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 transform hover:scale-105 shadow-2xl">
              Start Free Trial
            </Link>
            <Link href="/demo" className="border-2 border-white/30 text-white px-10 py-5 rounded-xl text-lg font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-300 backdrop-blur-sm">
              Watch Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}