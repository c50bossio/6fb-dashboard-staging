'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function SubscriptionDashboard() {
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchSubscriptionData()
    }
  }, [user])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      
      // This would fetch from your subscription API
      const response = await fetch('/api/billing/subscription')
      if (!response.ok) throw new Error('Failed to fetch subscription')
      
      const data = await response.json()
      setSubscription(data.subscription)
      setUsage(data.usage)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-moss-100 text-moss-900'
      case 'trialing': return 'bg-olive-100 text-olive-800'  
      case 'past_due': return 'bg-amber-100 text-amber-900'
      case 'cancelled': return 'bg-softred-100 text-softred-900'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatUsage = (current, limit) => {
    if (limit === -1) return `${current} / Unlimited`
    const percentage = Math.min((current / limit) * 100, 100)
    return { current, limit, percentage }
  }

  const UsageBar = ({ label, current, limit, warningThreshold = 80 }) => {
    const usage = formatUsage(current, limit)
    if (typeof usage === 'string') {
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium">{usage}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full w-1/4"></div>
          </div>
        </div>
      )
    }

    const isWarning = usage.percentage >= warningThreshold
    const barColor = isWarning ? 'bg-red-500' : usage.percentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className={`font-medium ${isWarning ? 'text-red-600' : ''}`}>
            {usage.current} / {usage.limit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${barColor} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(usage.percentage, 100)}%` }}
          ></div>
        </div>
        {isWarning && (
          <p className="text-xs text-red-600">
            Approaching limit - consider upgrading your plan
          </p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </Card>
    )
  }

  // NO MOCK DATA - Use actual subscription or empty state
  const displaySubscription = subscription || {
    status: 'inactive',
    plan: {
      name: 'No Plan',
      price: 0,
      interval: 'month'
    },
    current_period_end: null,
    trial_end: null
  }

  const displayUsage = usage.bookings_per_month !== undefined ? usage : {
    bookings_per_month: { current: 0, limit: 0 },
    ai_chats_per_month: { current: 0, limit: 0 },
    staff_accounts: { current: 0, limit: 0 },
    locations: { current: 0, limit: 0 }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
          <Badge className={getStatusColor(displaySubscription.status)}>
            {displaySubscription.status?.toUpperCase() || 'FREE'}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {displaySubscription.plan?.name || 'Free Plan'}
            </h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              ${(displaySubscription.plan?.price || 0) / 100}/month
            </p>
            <p className="text-sm text-gray-600">
              {displaySubscription.trial_end 
                ? `Trial ends ${new Date(displaySubscription.trial_end).toLocaleDateString()}`
                : `Next billing: ${new Date(displaySubscription.current_period_end).toLocaleDateString()}`
              }
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500">
              Upgrade Plan
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-olive-500">
              Manage Billing
            </button>
          </div>
        </div>
      </Card>

      {/* Usage Overview */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Usage This Month</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <UsageBar 
              label="Bookings" 
              current={displayUsage.bookings_per_month.current} 
              limit={displayUsage.bookings_per_month.limit}
            />
            <UsageBar 
              label="AI Interactions" 
              current={displayUsage.ai_chats_per_month.current} 
              limit={displayUsage.ai_chats_per_month.limit}
            />
          </div>
          
          <div className="space-y-6">
            <UsageBar 
              label="Staff Accounts" 
              current={displayUsage.staff_accounts.current} 
              limit={displayUsage.staff_accounts.limit}
            />
            <UsageBar 
              label="Locations" 
              current={displayUsage.locations.current} 
              limit={displayUsage.locations.limit}
            />
          </div>
        </div>
      </Card>

      {/* Plan Features */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan Features</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Current Plan</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                2,000 bookings/month
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                5,000 AI interactions
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                15 staff accounts
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                3 locations
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Available Upgrades</h3>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg hover:border-olive-300 cursor-pointer transition-colors">
                <p className="font-medium text-gray-900">Enterprise</p>
                <p className="text-sm text-gray-600">Unlimited everything</p>
                <p className="text-sm font-medium text-olive-600">$99/month</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Add-ons</h3>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg hover:border-olive-300 cursor-pointer transition-colors">
                <p className="font-medium text-gray-900">Extra AI Credits</p>
                <p className="text-sm text-gray-600">+2,000 interactions</p>
                <p className="text-sm font-medium text-olive-600">$10/month</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:border-olive-300 cursor-pointer transition-colors">
                <p className="font-medium text-gray-900">Priority Support</p>
                <p className="text-sm text-gray-600">24/7 dedicated support</p>
                <p className="text-sm font-medium text-olive-600">$25/month</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Billing History Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Billing</h2>
          <button className="text-sm text-olive-600 hover:text-olive-500 font-medium">
            View All Invoices
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 text-gray-600 font-medium">Date</th>
                <th className="text-left py-2 text-gray-600 font-medium">Description</th>
                <th className="text-left py-2 text-gray-600 font-medium">Amount</th>
                <th className="text-left py-2 text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 text-gray-900">Dec 1, 2024</td>
                <td className="py-3 text-gray-600">Professional Plan</td>
                <td className="py-3 font-medium">$49.00</td>
                <td className="py-3">
                  <Badge className="bg-moss-100 text-moss-900">Paid</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 text-gray-900">Nov 1, 2024</td>
                <td className="py-3 text-gray-600">Professional Plan</td>
                <td className="py-3 font-medium">$49.00</td>
                <td className="py-3">
                  <Badge className="bg-moss-100 text-moss-900">Paid</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}