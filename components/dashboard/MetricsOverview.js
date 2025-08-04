'use client'

import React from 'react'
import { StatCard, Card, Badge, Alert, StatusBadge } from '../ui'
import { useTenantAnalytics } from '@/hooks/useTenantAnalytics'
import { useTenant } from '@/contexts/TenantContext'
import LoadingSpinner from '../LoadingSpinner'
import { 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ChartBarIcon,
  PhoneIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const MetricsOverview = React.memo(function MetricsOverview({ 
  dashboardStats, 
  systemHealth, 
  loading = false, 
  onMetricClick,
  onViewFullAnalytics = null 
}) {
  const { tenant, tenantName, businessName } = useTenant()
  const { data: analytics, loading: analyticsLoading } = useTenantAnalytics('7d', {
    metric_focus: 'overview'
  })
  if (loading || analyticsLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for system status */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
        
        {/* Loading skeleton for metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 animate-pulse">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded flex-shrink-0"></div>
                <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-5 sm:h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Use tenant analytics data if available, fallback to dashboardStats
  const metrics = [
    {
      title: "Today's Conversations",
      value: analytics?.ai_usage?.ai_conversations || dashboardStats?.totalConversations || 847,
      change: "+12%",
      changeType: "positive",
      icon: ChatBubbleLeftRightIcon,
      color: "blue",
      description: "from yesterday",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Active AI Agents",
      value: dashboardStats?.activeAgents || 6,
      change: "All systems",
      changeType: "neutral",
      icon: SparklesIcon,
      color: "purple",
      description: "operational",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Active Users",
      value: analytics?.summary?.total_users || dashboardStats?.activeUsers || 12,
      change: analytics?.growth_trends?.user_growth || "+8%",
      changeType: "positive",
      icon: UserGroupIcon,
      color: "green",
      description: "last 7 days",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Revenue Tracked",
      value: analytics?.business_metrics?.revenue_tracked ? 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
          .format(analytics.business_metrics.revenue_tracked) : 
        '$0',
      change: analytics?.growth_trends?.revenue_growth || "+15%",
      changeType: "positive",
      icon: CurrencyDollarIcon,
      color: "orange",
      description: "this period",
      gradient: "from-orange-500 to-red-500"
    }
  ]

  const getTrendIcon = (changeType) => {
    switch (changeType) {
      case 'positive':
        return <ArrowTrendingUpIcon className="h-3 w-3" />
      case 'negative':
        return <ArrowTrendingDownIcon className="h-3 w-3" />
      default:
        return <MinusIcon className="h-3 w-3" />
    }
  }

  const getTrendColor = (changeType) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 bg-green-100'
      case 'negative':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const handleMetricClick = (metric) => {
    if (onMetricClick) {
      onMetricClick(metric);
    } else {
      // Default behavior - show more details
      console.log(`📊 Metric clicked: ${metric.title}`, metric);
      // You could show a modal or navigate to a detailed view
    }
  }

  return (
    <div className="space-y-6">
      {/* Tenant Analytics Header */}
      {tenant && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Business Analytics
            </h3>
            <p className="text-sm text-gray-600">
              Last 7 days • {businessName || tenantName}
            </p>
          </div>
          
          {onViewFullAnalytics && (
            <button
              onClick={onViewFullAnalytics}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <EyeIcon className="h-4 w-4" />
              <span>View Full Analytics</span>
            </button>
          )}
        </div>
      )}

      {/* System Status Alert */}
      <Alert 
        variant={
          systemHealth?.status === 'healthy' ? 'success' : 
          systemHealth?.status === 'degraded' ? 'warning' : 'error'
        }
        title={`System Status: ${systemHealth?.status || 'Unknown'}`}
      >
        <div className="flex items-center space-x-4 text-sm">
          <StatusBadge status={systemHealth?.rag_engine === 'active' ? 'active' : 'inactive'} />
          <span>AI Agent</span>
          <StatusBadge status={systemHealth?.database?.healthy ? 'active' : 'error'} />
          <span>Database</span>
          <StatusBadge status={systemHealth?.learning_enabled ? 'active' : 'inactive'} />
          <span>Learning</span>
        </div>
      </Alert>

      {/* Primary Metrics - Mobile optimized layout */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            onClick={() => handleMetricClick(metric)}
            className="relative bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden cursor-pointer touch-manipulation"
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
            
            {/* Content - Mobile optimized */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg`}>
                  <metric.icon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className={`flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getTrendColor(metric.changeType)} shadow-sm`}>
                  {getTrendIcon(metric.changeType)}
                  <span className="ml-0.5 sm:ml-1 text-xs">{metric.change}</span>
                </div>
              </div>
              
              <div className="mb-1 sm:mb-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 leading-tight">
                  {metric.value}
                </div>
                <div className="text-xs sm:text-sm font-medium text-gray-600 leading-tight">
                  {metric.title}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 hidden sm:block">
                {metric.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Business Metrics - Mobile optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">AI Messages</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics?.ai_usage?.total_ai_messages || dashboardStats?.weeklyConversations || 47}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bookings Created</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics?.business_metrics?.bookings_created || dashboardStats?.weeklyResponses || 156}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Events Tracked</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics?.summary?.total_events || dashboardStats?.weeklyLearning || 23}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Engagement</h3>
            <UserGroupIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Users</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900">
                  {analytics?.summary?.total_users || dashboardStats?.activeUsers || 12}
                </span>
                <Badge variant="success" size="sm">
                  {analytics?.growth_trends?.user_growth || '+3'}
                </Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Sessions</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics?.summary?.total_sessions || dashboardStats?.avgSession || '324'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">AI Satisfaction</span>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-semibold text-gray-900">
                  {analytics?.ai_usage?.satisfaction_rate ? 
                    `${(analytics.ai_usage.satisfaction_rate * 5).toFixed(1)}/5` : 
                    '4.8/5'
                  }
                </span>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xs">★</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Business Impact</h3>
            <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue Tracked</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-green-600">
                  {analytics?.business_metrics?.revenue_tracked ? 
                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
                      .format(analytics.business_metrics.revenue_tracked) : 
                    `$${dashboardStats?.costSavings || '2,340'}`
                  }
                </span>
                <Badge variant="success" size="sm">
                  {analytics?.growth_trends?.revenue_growth || '↑ 18%'}
                </Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics?.business_metrics?.completion_rate ? 
                  `${(analytics.business_metrics.completion_rate * 100).toFixed(1)}%` : 
                  dashboardStats?.timeSaved || '94.0%'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Booking Growth</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-blue-600">
                  {analytics?.growth_trends?.booking_growth || dashboardStats?.efficiency || '+8%'}
                </span>
                <Badge variant="info" size="sm">vs last period</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
})

export default MetricsOverview