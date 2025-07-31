'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
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

      <div className="hero-gradient text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Blog</h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
            Insights, tips, and success stories from the barbershop AI revolution.
          </p>
        </div>
      </div>

      <div className="section-padding bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Blog Coming Soon</h2>
          <p className="text-xl text-gray-600 mb-8">
            We're preparing valuable content about AI, barbershop marketing, and business growth. 
            Stay tuned for expert insights!
          </p>
          <Link href="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg">
            Get Started Today
          </Link>
        </div>
      </div>
    </div>
  )
}