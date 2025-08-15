'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CreditCardIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BoltIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  UsersIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus()
    }
  }, [user])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscription/status')
      if (!response.ok) throw new Error('Failed to fetch subscription')
      
      const data = await response.json()
      setSubscriptionData(data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: subscriptionData.billing.stripeCustomerId 
        })
      })
      
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error creating portal session:', error)
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    router.push('/subscribe?upgrade=true')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'past_due': return 'text-amber-800 bg-yellow-100'
      case 'canceled': return 'text-red-600 bg-red-100'
      case 'canceling': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Subscription Found</h2>
          <p className="text-gray-600 mb-8">You need an active subscription to access this page.</p>
          <button
            onClick={() => router.push('/subscribe')}
            className="px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
          >
            Choose a Plan
          </button>
        </div>
      </div>
    )
  }

  const { subscription, usage, features, billing, user: userData } = subscriptionData

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">Manage your subscription and track usage</p>
        </div>

        {/* Subscription Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {features.name} Plan
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </div>
                {subscription.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <span>Cancels at end of billing period</span>
                  </div>
                )}
                <div className="text-gray-600">
                  <span>Current Period: </span>
                  <span className="font-medium">
                    {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
                <div className="text-gray-600">
                  <span>Days Remaining: </span>
                  <span className="font-medium">{subscription.daysRemaining} days</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={handleManageSubscription}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <CreditCardIcon className="h-5 w-5" />
                Manage Subscription
              </button>
              {subscription.tier !== 'enterprise' && (
                <button
                  onClick={handleUpgrade}
                  className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center gap-2"
                >
                  <ArrowUpIcon className="h-5 w-5" />
                  Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* SMS Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <DevicePhoneMobileIcon className="h-8 w-8 text-olive-600" />
              <span className="text-2xl font-bold text-gray-900">
                {usage.sms.percentage}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">SMS Credits</h3>
            <div className="text-sm text-gray-600 mb-3">
              {usage.sms.used.toLocaleString()} / {usage.sms.included.toLocaleString()} used
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getUsageColor(usage.sms.percentage)}`}
                style={{ width: `${Math.min(100, usage.sms.percentage)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {usage.sms.remaining.toLocaleString()} remaining
            </div>
          </div>

          {/* Email Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <EnvelopeIcon className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">
                {usage.email.percentage}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Email Credits</h3>
            <div className="text-sm text-gray-600 mb-3">
              {usage.email.used.toLocaleString()} / {usage.email.included.toLocaleString()} used
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getUsageColor(usage.email.percentage)}`}
                style={{ width: `${Math.min(100, usage.email.percentage)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {usage.email.remaining.toLocaleString()} remaining
            </div>
          </div>

          {/* AI Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <BoltIcon className="h-8 w-8 text-gold-600" />
              <span className="text-2xl font-bold text-gray-900">
                {usage.ai.percentage}%
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Tokens</h3>
            <div className="text-sm text-gray-600 mb-3">
              {usage.ai.used.toLocaleString()} / {usage.ai.included.toLocaleString()} used
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getUsageColor(usage.ai.percentage)}`}
                style={{ width: `${Math.min(100, usage.ai.percentage)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {usage.ai.remaining.toLocaleString()} remaining
            </div>
          </div>

          {/* Staff Limit */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <UsersIcon className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">
                {usage.staff.limit === 999999 ? '∞' : usage.staff.limit}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Staff Limit</h3>
            <div className="text-sm text-gray-600">
              {usage.staff.limit === 999999 ? 'Unlimited' : `Up to ${usage.staff.limit}`} barbers
            </div>
          </div>
        </div>

        {/* Features & Billing History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Features */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan Features</h2>
            <ul className="space-y-3">
              {features.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions</h2>
            {billing.history && billing.history.length > 0 ? (
              <div className="space-y-3">
                {billing.history.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">
                        {transaction.status === 'active' ? 'Subscription Payment' : transaction.status}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </div>
                      <div className={`text-sm ${transaction.status === 'paid' || transaction.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                        {transaction.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No transaction history available</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() => window.open('/api/stripe/download-invoice', '_blank')}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Download Invoices
          </button>
          <button
            onClick={() => router.push('/billing/usage')}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            View Detailed Usage
          </button>
          <button
            onClick={() => router.push('/billing/payment-methods')}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Payment Methods
          </button>
        </div>
      </div>
    </div>
  )
}
