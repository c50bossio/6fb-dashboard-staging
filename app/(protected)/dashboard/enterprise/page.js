'use client'

import { 
  RocketLaunchIcon,
  SparklesIcon,
  ChartBarIcon,
  BoltIcon,
  CreditCardIcon,
  BellIcon,
  FlagIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

import AnalyticsExample from '@/components/analytics/AnalyticsExample'
import FeatureFlagExamples from '@/components/examples/FeatureFlagExamples'
import { useFeatureFlags } from '@/hooks/useFeatureFlag'

export default function EnterpriseFeaturesPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const { flags } = useFeatureFlags()

  const features = [
    {
      name: 'Supabase',
      icon: '🗄️',
      description: 'PostgreSQL database with real-time subscriptions, authentication, and storage',
      status: 'active',
    },
    {
      name: 'Sentry',
      icon: '🛡️',
      description: 'Error tracking and performance monitoring across frontend and backend',
      status: 'active',
    },
    {
      name: 'Vercel AI SDK',
      icon: '🤖',
      description: 'Streaming AI responses with OpenAI and Claude integration',
      status: 'active',
    },
    {
      name: 'Stripe',
      icon: '💳',
      description: 'Payment processing with subscriptions and webhooks',
      status: 'active',
    },
    {
      name: 'FullCalendar',
      icon: '📅',
      description: 'Enterprise calendar with resource scheduling and recurring events',
      status: 'active',
    },
    {
      name: 'Novu',
      icon: '📨',
      description: 'Unified notifications across email, SMS, push, and in-app',
      status: 'active',
    },
    {
      name: 'Pusher',
      icon: '⚡',
      description: 'Real-time WebSocket connections for live updates',
      status: 'active',
    },
    {
      name: 'PostHog',
      icon: '📊',
      description: 'Product analytics with session recording and heatmaps',
      status: 'active',
    },
    {
      name: 'Vercel Edge Config',
      icon: '🚀',
      description: 'Feature flags with instant global propagation',
      status: 'active',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <RocketLaunchIcon className="h-12 w-12 text-olive-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enterprise Features</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your 6FB AI Agent System is now powered by enterprise-grade SDKs for stability, 
            scalability, and exceptional user experiences.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex justify-center space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('feature-flags')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'feature-flags'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Feature Flags
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.name} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-3xl mr-3">{feature.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Integration Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database & Authentication</span>
                  <div className="flex items-center text-green-600">
                    <span className="w-32 bg-green-100 rounded-full h-2 mr-2">
                      <span className="block w-full h-full bg-green-600 rounded-full"></span>
                    </span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Processing</span>
                  <div className="flex items-center text-green-600">
                    <span className="w-32 bg-green-100 rounded-full h-2 mr-2">
                      <span className="block w-full h-full bg-green-600 rounded-full"></span>
                    </span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI & Chat</span>
                  <div className="flex items-center text-green-600">
                    <span className="w-32 bg-green-100 rounded-full h-2 mr-2">
                      <span className="block w-full h-full bg-green-600 rounded-full"></span>
                    </span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Real-time Features</span>
                  <div className="flex items-center text-green-600">
                    <span className="w-32 bg-green-100 rounded-full h-2 mr-2">
                      <span className="block w-full h-full bg-green-600 rounded-full"></span>
                    </span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Analytics & Monitoring</span>
                  <div className="flex items-center text-green-600">
                    <span className="w-32 bg-green-100 rounded-full h-2 mr-2">
                      <span className="block w-full h-full bg-green-600 rounded-full"></span>
                    </span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Cost Estimate */}
            <div className="bg-gradient-to-r from-olive-600 to-gold-600 rounded-lg shadow p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">Estimated Monthly Costs</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Startup (0-1K users)</h3>
                  <p className="text-3xl font-bold">$45</p>
                  <p className="text-sm opacity-80 mt-1">All features included</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Growing (1K-10K users)</h3>
                  <p className="text-3xl font-bold">$174-224</p>
                  <p className="text-sm opacity-80 mt-1">Scales with usage</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Scale-up (10K+ users)</h3>
                  <p className="text-3xl font-bold">$1,299+</p>
                  <p className="text-sm opacity-80 mt-1">Enterprise pricing</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Integration</h2>
              <p className="text-gray-600 mb-6">
                PostHog is tracking user behavior, sessions, and custom events. 
                All interactions below are being tracked in real-time.
              </p>
              <AnalyticsExample />
            </div>
          </div>
        )}

        {activeTab === 'feature-flags' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Flag Examples</h2>
              <p className="text-gray-600 mb-6">
                These components demonstrate how feature flags control functionality. 
                Flags are managed through Vercel Edge Config and update instantly.
              </p>
              <FeatureFlagExamples />
            </div>
            
            <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Currently Active Flags</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(flags).map(([flag, enabled]) => (
                  <div key={flag} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${enabled ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <span className="text-sm font-mono">{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}