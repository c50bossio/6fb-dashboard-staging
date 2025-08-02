'use client'

import { useState, useEffect } from 'react'
import { useFeatureFlags } from '@/hooks/useFeatureFlag'
import { FLAGS } from '@/lib/feature-flags'
import { 
  BeakerIcon, 
  BoltIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

const flagCategories = {
  'UI/UX Features': {
    icon: SparklesIcon,
    flags: [FLAGS.NEW_BOOKING_FLOW, FLAGS.ENHANCED_CALENDAR, FLAGS.DARK_MODE],
  },
  'Payment Features': {
    icon: CurrencyDollarIcon,
    flags: [FLAGS.STRIPE_PAYMENT_ELEMENT, FLAGS.CRYPTO_PAYMENTS, FLAGS.INSTALLMENT_PAYMENTS],
  },
  'AI Features': {
    icon: BoltIcon,
    flags: [FLAGS.CLAUDE_CHAT, FLAGS.AI_RECOMMENDATIONS, FLAGS.SMART_SCHEDULING],
  },
  'Experimental': {
    icon: BeakerIcon,
    flags: [FLAGS.BETA_FEATURES, FLAGS.ADVANCED_ANALYTICS, FLAGS.VIDEO_CONSULTATIONS],
  },
  'Performance': {
    icon: CogIcon,
    flags: [FLAGS.IMAGE_OPTIMIZATION, FLAGS.LAZY_LOADING, FLAGS.PWA_FEATURES],
  },
}

const flagDescriptions = {
  [FLAGS.NEW_BOOKING_FLOW]: 'New streamlined booking interface with better UX',
  [FLAGS.ENHANCED_CALENDAR]: 'Advanced calendar with resource management',
  [FLAGS.DARK_MODE]: 'Dark theme support across the application',
  [FLAGS.STRIPE_PAYMENT_ELEMENT]: 'New Stripe Payment Element for checkout',
  [FLAGS.CRYPTO_PAYMENTS]: 'Accept cryptocurrency payments',
  [FLAGS.INSTALLMENT_PAYMENTS]: 'Allow customers to pay in installments',
  [FLAGS.CLAUDE_CHAT]: 'Enable Claude AI in chat interface',
  [FLAGS.AI_RECOMMENDATIONS]: 'AI-powered service recommendations',
  [FLAGS.SMART_SCHEDULING]: 'AI-optimized appointment scheduling',
  [FLAGS.BETA_FEATURES]: 'Access to beta features and experiments',
  [FLAGS.ADVANCED_ANALYTICS]: 'Enhanced analytics and reporting',
  [FLAGS.VIDEO_CONSULTATIONS]: 'Video call integration for consultations',
  [FLAGS.IMAGE_OPTIMIZATION]: 'Automatic image optimization and lazy loading',
  [FLAGS.LAZY_LOADING]: 'Lazy load components for better performance',
  [FLAGS.PWA_FEATURES]: 'Progressive Web App capabilities',
}

export default function FeatureFlagsPage() {
  const { flags, loading } = useFeatureFlags()
  const [copiedFlag, setCopiedFlag] = useState(null)

  const copyFlagName = (flagName) => {
    navigator.clipboard.writeText(flagName)
    setCopiedFlag(flagName)
    setTimeout(() => setCopiedFlag(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Feature Flags</h1>
          <p className="text-gray-600">
            Manage feature rollouts and experiments with Vercel Edge Config
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <BeakerIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
            <div>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Vercel Edge Config Integration:</span> Feature flags are 
                globally distributed and update instantly without redeployment. Changes propagate to all 
                edge locations within seconds.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                To modify flags in production, use the Vercel Dashboard → Edge Config → Update your configuration.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading feature flags...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(flagCategories).map(([category, { icon: Icon, flags: categoryFlags }]) => (
              <div key={category} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex items-center">
                  <Icon className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {categoryFlags.map((flagName) => (
                    <div key={flagName} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <code 
                              className="text-sm font-mono bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                              onClick={() => copyFlagName(flagName)}
                            >
                              {flagName}
                            </code>
                            {copiedFlag === flagName && (
                              <span className="ml-2 text-xs text-green-600">Copied!</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {flagDescriptions[flagName]}
                          </p>
                        </div>
                        <div className="ml-4">
                          {flags[flagName] ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-5 w-5 mr-1" />
                              <span className="text-sm font-medium">Enabled</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400">
                              <XCircleIcon className="h-5 w-5 mr-1" />
                              <span className="text-sm font-medium">Disabled</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usage Examples */}
        <div className="mt-8 bg-gray-900 text-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Usage Examples</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">React Hook:</p>
              <pre className="text-sm bg-gray-800 p-3 rounded overflow-x-auto">
{`import { useFeatureFlag } from '@/hooks/useFeatureFlag'

function MyComponent() {
  const { isEnabled } = useFeatureFlag('new_booking_flow')
  
  return isEnabled ? <NewBookingFlow /> : <LegacyBookingFlow />
}`}
              </pre>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-2">Component Wrapper:</p>
              <pre className="text-sm bg-gray-800 p-3 rounded overflow-x-auto">
{`import FeatureFlag from '@/components/FeatureFlag'

<FeatureFlag flag="claude_chat">
  <ClaudeChat />
</FeatureFlag>`}
              </pre>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-2">Server-side:</p>
              <pre className="text-sm bg-gray-800 p-3 rounded overflow-x-auto">
{`import { getFeatureFlag } from '@/lib/feature-flags'

export async function GET(req) {
  const isEnabled = await getFeatureFlag('advanced_analytics')
  
  if (isEnabled) {
    // Return advanced analytics data
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}