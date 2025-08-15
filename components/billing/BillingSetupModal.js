'use client'

import { useState } from 'react'
import { 
  CreditCardIcon, 
  SparklesIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function BillingSetupModal({ isOpen, onClose, feature, estimatedCost, onSetupComplete }) {
  const [step, setStep] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [billingPreferences, setBillingPreferences] = useState({
    spendingLimit: 100,
    autoTopUp: true,
    monthlyReports: true,
    lowBalanceAlert: 25
  })

  if (!isOpen) return null

  const featureConfig = {
    'ai-agent': {
      title: 'AI Agent Usage',
      description: 'Launch AI agents to automate tasks and optimize your business',
      icon: SparklesIcon,
      rate: '$0.04 per 1K tokens',
      example: `This ${feature?.agentType || 'marketing'} agent will use approximately ${estimatedCost?.tokens || '2'}K tokens (${estimatedCost?.cost || '$0.08'})`
    },
    'sms-campaign': {
      title: 'SMS Marketing Campaigns', 
      description: 'Send targeted SMS campaigns to your customers',
      icon: CreditCardIcon,
      rate: '$0.01 per message',
      example: `This campaign to ${estimatedCost?.recipients || '250'} customers will cost ${estimatedCost?.cost || '$2.50'}`
    },
    'email-campaign': {
      title: 'Email Marketing Campaigns',
      description: 'Send professional email newsletters and promotions', 
      icon: CreditCardIcon,
      rate: '$0.001 per email',
      example: `This campaign to ${estimatedCost?.recipients || '500'} customers will cost ${estimatedCost?.cost || '$0.50'}`
    }
  }

  const currentFeature = featureConfig[feature?.type] || featureConfig['ai-agent']
  const FeatureIcon = currentFeature.icon

  const handleSetupBilling = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: feature?.type,
          preferences: billingPreferences
        })
      })

      if (response.ok) {
        setStep('success')
        setTimeout(() => {
          onSetupComplete?.()
          onClose()
        }, 2000)
      } else {
        throw new Error('Setup failed')
      }
    } catch (error) {
      console.error('Billing setup error:', error)
      alert('Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {step === 'overview' && (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FeatureIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{currentFeature.title}</h3>
                    <p className="text-sm text-gray-600">Set up usage-based billing</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Competitive Pricing */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Industry-Leading Rates</h4>
                <div className="text-sm text-green-800">
                  <p className="font-medium">{currentFeature.rate}</p>
                  <p className="mt-1">{currentFeature.example}</p>
                </div>
              </div>

              {/* Competitive Comparison */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">How We Compare</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {feature?.type === 'sms-campaign' && (
                    <>
                      <div className="text-gray-600">
                        <span className="font-medium">Textedly:</span> $0.01+/SMS
                      </div>
                      <div className="text-green-600 font-medium">
                        <span className="font-medium">BookedBarber:</span> $0.01/SMS ✓
                      </div>
                    </>
                  )}
                  {feature?.type === 'email-campaign' && (
                    <>
                      <div className="text-gray-600">
                        <span className="font-medium">Mailchimp:</span> $0.003/email
                      </div>
                      <div className="text-green-600 font-medium">
                        <span className="font-medium">BookedBarber:</span> $0.001/email ✓
                      </div>
                    </>
                  )}
                  {feature?.type === 'ai-agent' && (
                    <>
                      <div className="text-gray-600">
                        <span className="font-medium">Competitors:</span> No AI agents
                      </div>
                      <div className="text-blue-600 font-medium">
                        <span className="font-medium">BookedBarber:</span> Exclusive feature ✓
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Smart Caching Notice */}
              {feature?.type === 'ai-agent' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Smart Caching™ Technology</span>
                  </div>
                  <p className="text-sm text-blue-800 mt-1">
                    Our intelligent caching reduces your AI costs by 60-70% automatically. 
                    Get more AI power for your money!
                  </p>
                </div>
              )}

              {/* Billing Preferences */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Billing Preferences</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Spending Limit
                  </label>
                  <select 
                    value={billingPreferences.spendingLimit}
                    onChange={(e) => setBillingPreferences({...billingPreferences, spendingLimit: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={50}>$50/month</option>
                    <option value={100}>$100/month</option>
                    <option value={250}>$250/month</option>
                    <option value={500}>$500/month</option>
                    <option value={-1}>No limit</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={billingPreferences.autoTopUp}
                      onChange={(e) => setBillingPreferences({...billingPreferences, autoTopUp: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-charge when usage occurs</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={billingPreferences.monthlyReports}
                      onChange={(e) => setBillingPreferences({...billingPreferences, monthlyReports: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Send monthly usage reports</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Pay only for what you use • No monthly minimums</p>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetupBilling}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <span>Enable {currentFeature.title}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Billing Setup Complete!</h3>
            <p className="text-gray-600 mb-4">
              You can now use {currentFeature.title.toLowerCase()} with our competitive rates.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✓ Billing enabled • ✓ Competitive rates • ✓ Smart optimization active
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}