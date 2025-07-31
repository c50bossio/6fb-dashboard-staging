'use client'

import Link from 'next/link'
import { ArrowLeftIcon, SparklesIcon, UsersIcon, LightBulbIcon } from '@heroicons/react/24/outline'

export default function AboutPage() {
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
            About
            <span className="block gradient-text bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              6FB AI Agent System
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
            We're revolutionizing the barbershop industry with AI-powered automation that helps 
            business owners focus on what they do best while AI handles the rest.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              To empower barbershop owners with intelligent AI agents that automate marketing, 
              optimize customer relationships, and drive business growth—allowing them to focus 
              on delivering exceptional haircuts and building community.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <SparklesIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Innovation</h3>
              <p className="text-gray-600">Leading the industry with cutting-edge AI technology tailored specifically for barbershops.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <UsersIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Community</h3>
              <p className="text-gray-600">Building a network of successful barbershop owners who support and learn from each other.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <LightBulbIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Excellence</h3>
              <p className="text-gray-600">Delivering exceptional results through intelligent automation and data-driven insights.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="section-padding bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
          </div>
          
          <div className="prose prose-lg mx-auto text-gray-600">
            <p className="mb-6">
              6FB AI Agent System was born from a simple observation: barbershop owners are incredibly 
              skilled at cutting hair and building relationships with their customers, but they often 
              struggle with the marketing and administrative tasks that are crucial for business growth.
            </p>
            
            <p className="mb-6">
              After working with hundreds of barbershop owners, we realized that traditional marketing 
              tools weren't designed for their unique needs. They needed something more intelligent, 
              more personal, and more automated.
            </p>
            
            <p className="mb-6">
              So we built 6 specialized AI agents that understand the barbershop business inside and out. 
              Each agent handles a different aspect of the business—from customer segmentation to social 
              media management—working together to create a seamless, automated marketing system.
            </p>
            
            <p>
              Today, over 500 barbershops use our AI agents to automate their marketing, increase customer 
              retention, and grow their revenue—while spending more time doing what they love.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Join Our Community?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Discover how AI can transform your barbershop business and connect with other successful owners.
          </p>
          <Link href="/register" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-10 py-5 rounded-xl text-lg font-bold hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 transform hover:scale-105 shadow-2xl">
            Start Your Journey
          </Link>
        </div>
      </div>
    </div>
  )
}