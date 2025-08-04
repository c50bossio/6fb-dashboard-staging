'use client'

import { useState } from 'react'
import { useTenantAnalytics } from '@/hooks/useTenantAnalytics'
import { useTenant } from '@/contexts/TenantContext'
import LoadingSpinner from '../LoadingSpinner'
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TrophyIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function TenantAnalyticsDashboard() {
  const { tenant, tenantName, businessName, subscriptionTier } = useTenant()
  const [dateRange, setDateRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('overview')
  
  const { data: analytics, loading, error, refetch } = useTenantAnalytics(dateRange, {
    metric_focus: selectedMetric
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading your business analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Analytics Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analytics data available for {businessName || tenantName}</p>
      </div>
    )
  }

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ]

  const metricOptions = [
    { value: 'overview', label: 'Overview', icon: ChartBarIcon },
    { value: 'ai_usage', label: 'AI Usage', icon: SparklesIcon },
    { value: 'business', label: 'Business Metrics', icon: CurrencyDollarIcon },
    { value: 'engagement', label: 'User Engagement', icon: UsersIcon }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h2>
            <div className="flex items-center text-gray-600">
              <span className="font-medium">{businessName || tenantName}</span>
              <span className="mx-2">•</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {subscriptionTier?.toUpperCase() || 'PROFESSIONAL'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {/* Metric Focus Selector */}
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {metricOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Events */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.summary.total_events.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12% from last period</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.summary.total_users}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UsersIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">{analytics.growth_trends.user_growth}</span>
          </div>
        </div>

        {/* Revenue Tracked */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue Tracked</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(analytics.business_metrics.revenue_tracked)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">{analytics.growth_trends.revenue_growth}</span>
          </div>
        </div>

        {/* AI Conversations */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Conversations</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.ai_usage.ai_conversations}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <SparklesIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600">Avg response: {analytics.ai_usage.avg_response_time}</span>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <SparklesIcon className="h-6 w-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">AI Usage Analytics</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total AI Messages</span>
              <span className="text-lg font-semibold text-gray-900">
                {analytics.ai_usage.total_ai_messages}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Most Used Model</span>
              <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                {analytics.ai_usage.most_used_model}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Satisfaction Rate</span>
              <div className="flex items-center">
                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${analytics.ai_usage.satisfaction_rate * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {formatPercentage(analytics.ai_usage.satisfaction_rate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Business Performance</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Bookings Created</span>
              <span className="text-lg font-semibold text-gray-900">
                {analytics.business_metrics.bookings_created}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Completion Rate</span>
              <div className="flex items-center">
                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${analytics.business_metrics.completion_rate * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {formatPercentage(analytics.business_metrics.completion_rate)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Avg Booking Value</span>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(analytics.business_metrics.avg_booking_value)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmarking Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-6">
          <TrophyIcon className="h-6 w-6 text-yellow-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Industry Benchmarking</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Your Booking Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatPercentage(analytics.benchmarks.tenant_booking_rate)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Industry Average</p>
            <p className="text-2xl font-bold text-gray-400">
              {formatPercentage(analytics.benchmarks.industry_avg_booking_rate)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700 mb-2">Performance vs Industry</p>
            <p className="text-2xl font-bold text-green-600">
              {analytics.benchmarks.tenant_vs_industry}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Usage Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-6">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Feature Usage Breakdown</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(analytics.feature_usage).map(([feature, usage]) => (
            <div key={feature} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2 capitalize">
                {feature.replace('_', ' ')}
              </p>
              <p className="text-xl font-bold text-gray-900">{usage}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Status */}
      {analytics.integrations && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <ClockIcon className="h-6 w-6 text-indigo-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Integration Activity</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">Stripe Events</p>
              <p className="text-xl font-bold text-blue-600">
                {analytics.integrations.stripe_events}
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 mb-2">Calendar Syncs</p>
              <p className="text-xl font-bold text-green-600">
                {analytics.integrations.calendar_syncs}
              </p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 mb-2">Email Campaigns</p>
              <p className="text-xl font-bold text-purple-600">
                {analytics.integrations.email_campaigns}
              </p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700 mb-2">SMS Sent</p>
              <p className="text-xl font-bold text-yellow-600">
                {analytics.integrations.sms_sent}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}