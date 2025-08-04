'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCardIcon,
  ChartBarIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function BillingDashboard() {
  const router = useRouter()
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Mock tenant ID - in production, get from auth context
  const tenantId = 'tenant_demo_123'

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      // Fetch subscription info
      const subResponse = await fetch(`/api/billing?action=subscription&tenant_id=${tenantId}`)
      const subData = await subResponse.json()
      
      // Fetch usage analytics
      const usageResponse = await fetch(`/api/billing?action=usage&tenant_id=${tenantId}`)
      const usageData = await usageResponse.json()

      if (subData.success) setSubscription(subData.subscription)
      if (usageData.success) setUsage(usageData.usage)
    } catch (error) {
      console.error('Error fetching billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planName) => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_checkout',
          tenant_id: tenantId,
          plan: planName,
          customer_email: 'demo@barbershop.com'
        })
      })

      const data = await response.json()
      if (data.success) {
        window.location.href = data.checkout_url
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_portal',
          tenant_id: tenantId
        })
      })

      const data = await response.json()
      if (data.success) {
        window.location.href = data.portal_url
      }
    } catch (error) {
      console.error('Error accessing billing portal:', error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="mt-2 text-gray-600">
            Manage your subscription and monitor AI token usage
          </p>
        </div>

        {/* Trial Banner */}
        {subscription?.status === 'trial' && (
          <div className="mb-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SparklesIcon className="h-8 w-8" />
                <div>
                  <h3 className="text-xl font-semibold">Free Trial Active!</h3>
                  <p className="text-green-100">
                    Your 14-day trial ends on {new Date(subscription.trial_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUpgrade(subscription.tier)}
                disabled={actionLoading}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <CreditCardIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Current Subscription
                </h2>
                {subscription?.status === 'active' && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={actionLoading}
                    className="text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center mb-3">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      subscription?.status === 'trial' ? 'bg-green-400' :
                      subscription?.status === 'active' ? 'bg-blue-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-2xl font-bold text-gray-900 capitalize">
                      {subscription?.tier || 'Starter'} Plan
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {subscription?.status === 'trial' ? 'Free Trial' : 
                     `$${subscription?.monthly_base || '9.99'}/month`}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-medium capitalize ${
                        subscription?.status === 'trial' ? 'text-green-600' :
                        subscription?.status === 'active' ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {subscription?.status || 'Trial'}
                      </span>
                    </div>
                    {subscription?.status === 'active' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Next billing</span>
                        <span className="text-gray-900">
                          {subscription?.next_billing_date || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">This Month's Bill</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base subscription</span>
                      <span className="text-gray-900">
                        ${subscription?.status === 'trial' ? '0.00' : subscription?.monthly_base || '9.99'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Token overages</span>
                      <span className="text-gray-900">
                        ${subscription?.overage_charges || '0.00'}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-lg">
                        ${subscription?.total_bill || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Usage */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <BoltIcon className="h-6 w-6 mr-2 text-yellow-500" />
                AI Token Usage
              </h2>

              {/* Usage Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {subscription?.tokens_used || 0} / {subscription?.tokens_included || 10000} tokens used
                  </span>
                  <span className="text-gray-900 font-medium">
                    {subscription?.usage_percentage || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      (subscription?.usage_percentage || 0) > 90 ? 'bg-red-500' :
                      (subscription?.usage_percentage || 0) > 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(subscription?.usage_percentage || 0, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>0 tokens</span>
                  <span>{subscription?.tokens_included || 10000} tokens included</span>
                </div>
              </div>

              {/* Usage Warnings */}
              {subscription?.usage_percentage > 80 && (
                <div className={`p-4 rounded-lg mb-4 ${
                  subscription.usage_percentage > 90 ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
                }`}>
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {subscription.usage_percentage > 90 ? 'Usage Critical' : 'Usage Warning'}
                      </p>
                      <p className="text-sm mt-1">
                        You've used {subscription.usage_percentage}% of your monthly tokens. 
                        {subscription.usage_percentage > 90 ? 
                          ' Additional usage will incur overage charges.' :
                          ' Consider upgrading to avoid overage charges.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Requests</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {usage?.summary?.total_requests || 0}
                      </p>
                    </div>
                    <ChartBarIcon className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg per Request</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {Math.round(usage?.summary?.avg_tokens_per_request || 0)}
                      </p>
                    </div>
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Est. Cost</p>
                      <p className="text-xl font-semibold text-gray-900">
                        ${usage?.summary?.total_cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <CreditCardIcon className="h-8 w-8 text-indigo-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Usage Breakdown */}
            {usage?.top_features && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Top AI Features Used
                </h3>
                <div className="space-y-3">
                  {usage.top_features.map((feature, index) => (
                    <div key={feature.feature} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-gray-900 capitalize font-medium">
                          {feature.feature.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-900 font-medium">
                          {feature.tokens.toLocaleString()} tokens
                        </div>
                        <div className="text-xs text-gray-500">
                          {feature.percentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing Plans Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Available Plans
              </h3>
              
              <div className="space-y-4">
                {/* Starter Plan */}
                <div className={`border-2 rounded-lg p-4 ${
                  subscription?.tier === 'starter' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">Starter</h4>
                    {subscription?.tier === 'starter' && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">$19.99<span className="text-sm text-gray-500">/mo</span></p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• 15K AI tokens included</li>
                    <li>• Basic analytics</li>
                    <li>• Email support</li>
                    <li>• 1 barbershop location</li>
                    <li>• $0.008/1K additional tokens</li>
                  </ul>
                  {subscription?.tier !== 'starter' && (
                    <button
                      onClick={() => handleUpgrade('starter')}
                      disabled={actionLoading}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Select Plan
                    </button>
                  )}
                </div>

                {/* Professional Plan */}
                <div className={`border-2 rounded-lg p-4 ${
                  subscription?.tier === 'professional' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">Professional</h4>
                    {subscription?.tier === 'professional' && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">$49.99<span className="text-sm text-gray-500">/mo</span></p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• 75K AI tokens included</li>
                    <li>• Advanced analytics</li>
                    <li>• Priority support</li>
                    <li>• Custom branding</li>
                    <li>• 5 barbershop locations</li>
                    <li>• $0.006/1K additional tokens</li>
                  </ul>
                  {subscription?.tier !== 'professional' && (
                    <button
                      onClick={() => handleUpgrade('professional')}
                      disabled={actionLoading}
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Upgrade
                    </button>
                  )}
                </div>

                {/* Enterprise Plan */}
                <div className={`border-2 rounded-lg p-4 ${
                  subscription?.tier === 'enterprise' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">Enterprise</h4>
                    {subscription?.tier === 'enterprise' && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">$99.99<span className="text-sm text-gray-500">/mo</span></p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• 300K AI tokens included</li>
                    <li>• Full AI suite</li>
                    <li>• Dedicated support</li>
                    <li>• White-label options</li>
                    <li>• Unlimited locations</li>
                    <li>• $0.004/1K additional tokens</li>
                  </ul>
                  {subscription?.tier !== 'enterprise' && (
                    <button
                      onClick={() => handleUpgrade('enterprise')}
                      disabled={actionLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Go Enterprise
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center text-green-800">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">14-Day Free Trial</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  All plans include a 14-day free trial. No credit card required to start.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleManageSubscription}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <CogIcon className="h-4 w-4 mr-2" />
                  Manage Subscription
                </button>
                
                <button
                  onClick={() => router.push('/billing/invoices')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ClockIcon className="h-4 w-4 mr-2" />
                  View Invoices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}