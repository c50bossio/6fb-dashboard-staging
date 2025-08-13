'use client'

import { ArrowLeftIcon, PlayIcon, CheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function DemoPage() {
  const demoFeatures = [
    "Live AI agent interactions",
    "Real-time customer segmentation",
    "Automated campaign creation",
    "Performance analytics dashboard",
    "Mobile-responsive interface",
    "Integration capabilities"
  ]

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
            See the
            <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              AI in Action
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-olive-100 max-w-4xl mx-auto leading-relaxed mb-12">
            Watch how our AI agents transform barbershop operations with intelligent automation, 
            customer insights, and marketing optimization.
          </p>
          
          {/* Demo Video Placeholder */}
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <button className="bg-white/10 hover:bg-white/20 rounded-full p-6 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm border border-white/20">
                  <PlayIcon className="w-16 h-16 text-white ml-2" />
                </button>
              </div>
              
              {/* Demo Features Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-white">
                    {demoFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <CheckIcon className="w-4 h-4 mr-2 text-green-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Benefits */}
      <div className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What You'll See in the Demo
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience firsthand how our AI agents work together to grow your barbershop business.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="bg-olive-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Agent Coordination</h3>
              <p className="text-gray-600">Watch how our 6 AI agents collaborate to handle marketing, bookings, and customer service simultaneously.</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Analytics</h3>
              <p className="text-gray-600">See live performance metrics, customer insights, and ROI calculations updating in real-time.</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="bg-gold-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Automation</h3>
              <p className="text-gray-600">Experience how quickly campaigns launch, appointments get scheduled, and customers get engaged.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Personal Demo */}
      <div className="section-padding bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Want a Personal Demo?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Schedule a one-on-one demo tailored to your barbershop's specific needs and see how 
            our AI can solve your unique challenges.
          </p>
          
          <div className="bg-gradient-to-r from-olive-50 to-gold-50 rounded-2xl p-8 border border-olive-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-olive-600">15 min</div>
                <div className="text-gray-600">Demo Duration</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gold-600">1-on-1</div>
                <div className="text-gray-600">Personal Session</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">Free</div>
                <div className="text-gray-600">No Cost</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-gradient-to-r from-olive-600 to-gold-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-olive-700 hover:to-gold-700 transition-all duration-200 transform hover:scale-105 shadow-lg">
                Book Personal Demo
              </Link>
              <Link href="/" className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200">
                Try Free Trial Instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}