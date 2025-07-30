'use client'

import { useRouter } from 'next/navigation'

// Simple icon components
const RocketLaunchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.58-5.84a14.617 14.617 0 012.96 0c-.307 5.39-1.23 10.69-2.96 15.36a7.746 7.746 0 01-4.78 0C9.79 22.94 8.87 17.64 8.56 12.25a14.617 14.617 0 012.96 0z" />
  </svg>
)

const ChartBarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const CurrencyDollarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const SpeakerphoneIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 7h14l-2-7M7 4v11a3 3 0 106 0V4M7 4H5a1 1 0 00-1 1v1a1 1 0 001 1h2" />
  </svg>
)

const BrainIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

export default function HomePage() {
  const router = useRouter()
  
  const handleGetStarted = () => {
    router.push('/auth')
  }

  const handleViewDashboard = () => {
    router.push('/dashboard')
  }

  const handleDevBypass = () => {
    // Development bypass - skip authentication
    router.push('/dashboard?dev=true')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">6FB AI Agent System</span>
          <span className="block text-blue-600">Business Management Dashboard</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Manage your barbershop with AI-powered agents. Marketing automation, business insights, and growth strategies all in one place.
        </p>
        
        {/* Key Features for Business Owners */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <BrainIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">7 AI Business Agents</h3>
            <p className="text-sm text-gray-500">Master Coach, Financial, Marketing, Operations, Brand, Growth & Strategic agents</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <SpeakerphoneIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Marketing Automation</h3>
            <p className="text-sm text-gray-500">SMS, Email, Social Media, Website generation, and review management</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cost-Effective Solutions</h3>
            <p className="text-sm text-gray-500">10% cheaper than Textedly, 50-80% cheaper than Mailchimp with high margins</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">ROI Tracking</h3>
            <p className="text-sm text-gray-500">Real-time analytics showing cost savings and revenue generation</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={handleGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RocketLaunchIcon className="h-5 w-5 inline mr-2" />
            Get Started
          </button>
          
          <button 
            onClick={handleViewDashboard}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            View Dashboard
          </button>
        </div>

        {/* Authentication Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">
            Barbershop owner or staff member? Sign in to access your AI agents and business management tools.
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Sign In / Create Account
          </button>
        </div>
        
        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Transform Your Barbershop Business</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="text-blue-800">
              <strong>🤖 AI-Powered Growth:</strong> Let intelligent agents handle marketing, operations, and strategy
            </div>
            <div className="text-blue-800">
              <strong>💰 Maximize Profits:</strong> Cost-effective solutions with transparent ROI tracking
            </div>
            <div className="text-blue-800">
              <strong>⚡ Automated Success:</strong> Focus on cutting while AI handles the business growth
            </div>
          </div>
        </div>
        
        {/* Marketing Automation Features */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Complete Marketing Automation Suite</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">SMS Marketing</h3>
              <p className="text-sm text-gray-600">Automated campaigns, 10% cheaper than Textedly</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Marketing</h3>
              <p className="text-sm text-gray-600">Personalized campaigns, 50-80% cheaper than Mailchimp</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🌐</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Website Generation</h3>
              <p className="text-sm text-gray-600">AI-generated websites with booking integration</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">📍</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Google My Business</h3>
              <p className="text-sm text-gray-600">Automated posts, reviews, and local SEO</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Social Media</h3>
              <p className="text-sm text-gray-600">Instagram/Facebook content and scheduling</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Review Management</h3>
              <p className="text-sm text-gray-600">Automated responses and reputation monitoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}