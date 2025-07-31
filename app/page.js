'use client'

import Link from 'next/link'
import { useScrollAnimation, useStaggeredAnimation, scrollAnimations } from '../hooks/useScrollAnimation'
import MobileMenu from '../components/MobileMenu'
import { 
  ChartBarIcon,
  ChatBubbleLeftRightIcon as ChatIcon,
  EnvelopeIcon as MailIcon,
  PhoneIcon,
  CalendarDaysIcon as CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
  BoltIcon as LightningBoltIcon
} from '@heroicons/react/24/outline'

export default function LandingPage() {
  // Animation hooks
  const [statsRef, statsVisible] = useScrollAnimation({ threshold: 0.3 })
  const [featuresRef, featuresVisible] = useScrollAnimation({ threshold: 0.2 })
  const [pricingRef, pricingVisible] = useScrollAnimation({ threshold: 0.2 })
  const [setFeatureRef, visibleFeatures] = useStaggeredAnimation(6, { staggerDelay: 150 })
  const [setPricingRef, visiblePricing] = useStaggeredAnimation(3, { staggerDelay: 200 })

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
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">6FB</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">AI Agent System</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Pricing</Link>
              <Link href="/demo" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Demo</Link>
              <Link href="/login" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Login</Link>
              <Link href="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                Get Started
              </Link>
            </div>
            
            {/* Mobile menu */}
            <MobileMenu />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative hero-gradient text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <div className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                <SparklesIcon className="w-4 h-4 mr-2" />
                Powered by Advanced AI Technology
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              AI-Powered Marketing for
              <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Modern Barbershops
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-4xl mx-auto leading-relaxed">
              Transform your barbershop with 6 intelligent AI agents that automate marketing, manage customers, and grow your business 24/7 while you focus on cutting hair.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
              <Link href="/register" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-10 py-5 rounded-xl text-lg font-bold hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-yellow-400/25 flex items-center justify-center min-w-[200px]">
                Start Free Trial
                <ArrowRightIcon className="ml-3 h-5 w-5" />
              </Link>
              <Link href="/demo" className="border-2 border-white/30 text-white px-10 py-5 rounded-xl text-lg font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-300 backdrop-blur-sm min-w-[180px]">
                Watch Demo
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-200">
              <span className="flex items-center">
                <CheckIcon className="w-5 h-5 mr-2 text-green-400" />
                No credit card required
              </span>
              <span className="flex items-center">
                <CheckIcon className="w-5 h-5 mr-2 text-green-400" />
                14-day free trial
              </span>
              <span className="flex items-center">
                <CheckIcon className="w-5 h-5 mr-2 text-green-400" />
                Setup in 5 minutes
              </span>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-purple-400/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl"></div>
      </div>

      {/* Stats Section */}
      <div ref={statsRef} className="bg-gradient-to-r from-gray-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 ${statsVisible ? scrollAnimations.fadeInUpVisible : scrollAnimations.fadeInUp}`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trusted by Barbershops Worldwide</h2>
            <p className="text-gray-600">Real results from real businesses</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Barbershops Using AI', gradient: 'from-blue-600 to-purple-600' },
              { value: '2.5M+', label: 'Messages Sent', gradient: 'from-green-600 to-blue-600' },
              { value: '85%', label: 'Customer Retention', gradient: 'from-purple-600 to-pink-600' },
              { value: '3x', label: 'Revenue Growth', gradient: 'from-orange-600 to-red-600' }
            ].map((stat, index) => (
              <div key={index} className={`text-center group ${
                statsVisible ? scrollAnimations.scaleInVisible : scrollAnimations.scaleIn
              }`} style={{ transitionDelay: `${index * 100}ms` }}>
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className={`text-4xl lg:text-5xl font-bold gradient-text bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="mb-4">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200">
                <SparklesIcon className="w-4 h-4 mr-2" />
                AI-Powered Automation
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              <span className="gradient-text">6 AI Agents</span> Working for Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Each AI agent specializes in a different aspect of your barbershop, working together 24/7 to maximize growth, customer satisfaction, and revenue while you focus on what you do best.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.name} 
                ref={setFeatureRef(index)}
                className={`feature-card group ${
                  visibleFeatures.has(index) ? scrollAnimations.slideInUpVisible : scrollAnimations.slideInUp
                }`}
              >
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:from-blue-100 group-hover:to-purple-100 transition-all duration-300">
                  <feature.icon className="h-8 w-8 text-blue-600 group-hover:text-purple-600 transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">{feature.name}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                
                {/* Hover effect indicator */}
                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-blue-600 font-medium text-sm flex items-center">
                    Learn more 
                    <ArrowRightIcon className="ml-1 h-4 w-4" />
                  </span>
                </div>
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