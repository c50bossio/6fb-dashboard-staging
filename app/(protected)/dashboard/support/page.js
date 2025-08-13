'use client'

import { ArrowLeftIcon, DocumentTextIcon, ChatBubbleLeftRightIcon, AcademicCapIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-br from-olive-600 to-gold-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">6FB</span>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">AI Agent System</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center text-gray-600 hover:text-olive-600 font-medium transition-colors">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
              <Link href="/register" className="bg-gradient-to-r from-olive-600 to-gold-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-olive-700 hover:to-gold-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
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
            Support
            <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Center
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-olive-100 max-w-4xl mx-auto leading-relaxed">
            Get the help you need to maximize your AI agent performance and grow your barbershop business.
          </p>
        </div>
      </div>

      {/* Support Options */}
      <div className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How Can We Help?</h2>
            <p className="text-xl text-gray-600">Choose the support option that works best for you</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center hover:shadow-lg transition-shadow p-6 rounded-xl">
              <div className="bg-olive-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <DocumentTextIcon className="h-8 w-8 text-olive-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Documentation</h3>
              <p className="text-gray-600 mb-6">Comprehensive guides and tutorials for all features</p>
              <Link href="/contact" className="text-olive-600 hover:text-olive-700 font-semibold">
                Browse Docs →
              </Link>
            </div>
            
            <div className="text-center hover:shadow-lg transition-shadow p-6 rounded-xl">
              <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Live Chat</h3>
              <p className="text-gray-600 mb-6">Get instant help from our support team</p>
              <button className="text-olive-600 hover:text-olive-700 font-semibold">
                Start Chat →
              </button>
            </div>
            
            <div className="text-center hover:shadow-lg transition-shadow p-6 rounded-xl">
              <div className="bg-gold-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <AcademicCapIcon className="h-8 w-8 text-gold-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Training</h3>
              <p className="text-gray-600 mb-6">Video tutorials and webinars</p>
              <Link href="/contact" className="text-olive-600 hover:text-olive-700 font-semibold">
                Watch Videos →
              </Link>
            </div>
            
            <div className="text-center hover:shadow-lg transition-shadow p-6 rounded-xl">
              <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <QuestionMarkCircleIcon className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">FAQ</h3>
              <p className="text-gray-600 mb-6">Quick answers to common questions</p>
              <Link href="#faq" className="text-olive-600 hover:text-olive-700 font-semibold">
                View FAQ →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="section-padding bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How do I set up my first AI agent?</h3>
              <p className="text-gray-600">After registering, you'll be guided through a simple 5-minute setup process. Our onboarding wizard will help you configure your first agent based on your business needs.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What if I need to change my plan?</h3>
              <p className="text-gray-600">You can upgrade or downgrade your plan anytime from your account dashboard. Changes take effect immediately and we'll prorate your billing accordingly.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How do I integrate with my existing booking system?</h3>
              <p className="text-gray-600">We support integrations with most popular booking platforms. Check our integrations page or contact support for help with your specific system.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What kind of support do you provide?</h3>
              <p className="text-gray-600">We offer email and chat support for all plans, with phone support available for Professional and Enterprise customers. Enterprise customers also get a dedicated account manager.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="bg-gradient-to-r from-olive-600 to-gold-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Still Need Help?
          </h2>
          <p className="text-xl text-olive-100 mb-8 max-w-2xl mx-auto">
            Our support team is here to help you succeed with your AI agents.
          </p>
          <Link href="/contact" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-10 py-5 rounded-xl text-lg font-bold hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 transform hover:scale-105 shadow-2xl">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}