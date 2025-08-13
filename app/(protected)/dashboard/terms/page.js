'use client'

import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function TermsPage() {
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
            Terms of
            <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Service
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-olive-100 max-w-4xl mx-auto leading-relaxed">
            Please read these terms carefully before using our AI agent services.
          </p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="section-padding bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg mx-auto">
            <div className="bg-olive-50 border border-olive-200 rounded-lg p-6 mb-8">
              <p className="text-sm text-olive-800 mb-0">
                <strong>Last Updated:</strong> January 2025
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceptance of Terms</h2>
            <p className="text-gray-600 mb-6">
              By accessing and using the 6FB AI Agent System, you accept and agree to be bound by 
              the terms and provision of this agreement. If you do not agree to abide by the above, 
              please do not use this service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Description</h2>
            <p className="text-gray-600 mb-6">
              6FB AI Agent System provides AI-powered marketing automation tools specifically designed 
              for barbershops and similar businesses. Our services include customer segmentation, 
              social media management, review automation, and business analytics.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">User Responsibilities</h2>
            <p className="text-gray-600 mb-4">As a user of our service, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Provide accurate and complete information when creating your account</li>
              <li>Maintain the security of your login credentials</li>
              <li>Use the service in compliance with all applicable laws and regulations</li>
              <li>Not use the service for any unlawful or prohibited activities</li>
              <li>Respect the intellectual property rights of others</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Subscription and Billing</h2>
            <p className="text-gray-600 mb-6">
              Our services are provided on a subscription basis. You will be billed according to 
              your chosen plan. Subscriptions automatically renew unless cancelled. You may cancel 
              your subscription at any time through your account settings.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
            <p className="text-gray-600 mb-6">
              To the fullest extent permitted by law, 6FB AI Agent System shall not be liable for 
              any indirect, incidental, special, consequential, or punitive damages, or any loss of 
              profits or revenues, whether incurred directly or indirectly.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Availability</h2>
            <p className="text-gray-600 mb-6">
              While we strive to maintain 99.9% uptime, we do not guarantee that our service will 
              be available at all times. We may need to perform maintenance or updates that could 
              temporarily affect service availability.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
            <p className="text-gray-600 mb-6">
              We reserve the right to terminate or suspend your account if you violate these terms 
              or engage in activities that harm our service or other users. You may also terminate 
              your account at any time.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
            <p className="text-gray-600 mb-6">
              We reserve the right to modify these terms at any time. We will notify users of any 
              significant changes. Your continued use of the service after changes constitutes 
              acceptance of the new terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-600 mb-6">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-800 font-semibold mb-2">6FB AI Agent System</p>
              <p className="text-gray-600">Email: legal@6fb.ai</p>
              <p className="text-gray-600">Phone: +1 (555) 6FB-AI</p>
              <p className="text-gray-600">Address: San Francisco, CA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}