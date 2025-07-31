'use client'

import Link from 'next/link'
import { 
  ChartBarIcon,
  ChatIcon,
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
  LightningBoltIcon
} from '@heroicons/react/outline'

export default function LandingPage() {
  const features = [
    {
      name: 'AI Marketing Automation',
      description: 'Automated SMS & email campaigns that learn from customer behavior and optimize engagement.',
      icon: MailIcon,
    },
    {
      name: 'Smart Booking Management',
      description: 'AI-powered calendar management with automated reminders and customer follow-ups.',
      icon: CalendarIcon,
    },
    {
      name: 'Customer Intelligence',
      description: 'Advanced customer segmentation and personalized marketing based on preferences and history.',
      icon: UserGroupIcon,
    },
    {
      name: 'Content Generation',
      description: 'AI creates compelling social media posts, email content, and marketing materials automatically.',
      icon: ChatIcon,
    },
    {
      name: 'Performance Analytics',
      description: 'Real-time insights into campaign performance, customer retention, and business growth.',
      icon: ChartBarIcon,
    },
    {
      name: 'Social Media Automation',
      description: 'Automated posting, engagement tracking, and reputation management across all platforms.',
      icon: SparklesIcon,
    }
  ]

  const pricing = [
    {
      name: 'Starter',
      price: '$49',
      period: '/month',
      description: 'Perfect for single barbershop locations',
      features: [
        'Up to 500 customers',
        '2,000 SMS/month',
        '5,000 emails/month',
        'Basic analytics',
        'Email support'
      ],
    },
    {
      name: 'Professional',
      price: '$99',
      period: '/month',
      description: 'Ideal for growing barbershop businesses',
      features: [
        'Up to 2,000 customers',
        '10,000 SMS/month',
        '25,000 emails/month',
        'Advanced analytics',
        'Priority support',
        'Custom integrations'
      ],
      featured: true,
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For multiple locations and franchises',
      features: [
        'Unlimited customers',
        'Unlimited SMS/emails',
        'Multi-location management',
        'White-label options',
        'Dedicated account manager',
        'Custom AI training'
      ],
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">6FB</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">AI Agent System</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/demo" className="text-gray-600 hover:text-gray-900">Demo</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link href="/register" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              AI-Powered Marketing for
              <span className="block text-yellow-300">Modern Barbershops</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Transform your barbershop with 6 AI agents that automate marketing, manage customers, and grow your business 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-300 transition-colors flex items-center justify-center">
                Start Free Trial
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/demo" className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                Watch Demo
              </Link>
            </div>
            <p className="mt-4 text-blue-200">No credit card required • 14-day free trial</p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">500+</div>
              <div className="text-gray-600">Barbershops Using AI</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">2.5M+</div>
              <div className="text-gray-600">Messages Sent</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">85%</div>
              <div className="text-gray-600">Customer Retention</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">3x</div>
              <div className="text-gray-600">Revenue Growth</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              6 AI Agents Working for Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Each AI agent specializes in a different aspect of your barbershop, working together to maximize growth and customer satisfaction.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.name} className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.name}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your barbershop's needs. Upgrade or downgrade anytime.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricing.map((plan) => (
              <div key={plan.name} className={`bg-white rounded-xl border-2 p-8 relative ${
                plan.featured ? 'border-blue-500 shadow-xl scale-105' : 'border-gray-200'
              }`}>
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/register" className={`w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.featured 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Barbershop?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of barbershops already using AI to automate marketing, increase bookings, and grow their business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-300 transition-colors flex items-center justify-center">
              <LightningBoltIcon className="mr-2 h-5 w-5" />
              Start Your Free Trial
            </Link>
            <Link href="/demo" className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Schedule Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">6FB</span>
                </div>
                <span className="ml-3 text-xl font-bold">AI Agent System</span>
              </div>
              <p className="text-gray-400">
                Empowering barbershops with AI-driven marketing and customer management solutions.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/support" className="hover:text-white">Support</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 6FB AI Agent System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}