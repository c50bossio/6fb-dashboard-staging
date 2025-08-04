'use client'

import { StatCard, Card, Badge, Alert, StatusBadge } from '../ui'
import { 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ChartBarIcon,
  PhoneIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export default function MetricsOverview({ dashboardStats, systemHealth, loading = false }) {
  if (loading) {
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

  const metrics = [
    {
      title: "Today's Conversations",
      value: dashboardStats?.totalConversations || 0,
      change: "+12%",
      changeType: "positive",
      icon: ChatBubbleLeftRightIcon,
      color: "blue",
      description: "from yesterday"
    },
    {
      title: "Active AI Agents",
      value: dashboardStats?.activeAgents || 1,
      change: "All systems operational",
      changeType: "neutral",
      icon: SparklesIcon,
      color: "purple",
      description: "responding instantly"
    },
    {
      title: "System Uptime",
      value: dashboardStats?.systemUptime || '99.9%',
      change: "+0.1%",
      changeType: "positive",
      icon: ChartBarIcon,
      color: "green",
      description: "this month"
    },
    {
      title: "Avg Response Time",
      value: dashboardStats?.responseTime || '< 200ms',
      change: "-15ms",
      changeType: "positive",
      icon: PhoneIcon,
      color: "orange",
      description: "improved"
    }
  ]

  const getTrendIcon = (changeType) => {
    switch (changeType) {
      case 'positive':
        return <TrendingUpIcon className="h-3 w-3" />
      case 'negative':
        return <TrendingDownIcon className="h-3 w-3" />
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

  return (
    <div className="space-y-6">
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

      {/* Primary Metrics - Mobile optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map((metric, index) => (
          <StatCard
            key={index}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
            color={metric.color}
            className="relative overflow-hidden"
            change={
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 mt-2 space-y-1 sm:space-y-0">
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(metric.changeType)} w-fit`}>
                  {getTrendIcon(metric.changeType)}
                  <span className="ml-1">{metric.change}</span>
                </div>
                <span className="text-xs text-gray-500 sm:block">{metric.description}</span>
              </div>
            }
          />
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
              <span className="text-sm text-gray-600">New Conversations</span>
              <span className="text-sm font-semibold text-gray-900">
                {dashboardStats?.weeklyConversations || 47}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">AI Responses</span>
              <span className="text-sm font-semibold text-gray-900">
                {dashboardStats?.weeklyResponses || 156}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Learning Events</span>
              <span className="text-sm font-semibold text-gray-900">
                {dashboardStats?.weeklyLearning || 23}
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
              <span className="text-sm text-gray-600">Active Users</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900">
                  {dashboardStats?.activeUsers || 12}
                </span>
                <Badge variant="success" size="sm">+3</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Session</span>
              <span className="text-sm font-semibold text-gray-900">
                {dashboardStats?.avgSession || '8m 34s'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Satisfaction</span>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-semibold text-gray-900">4.8/5</span>
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
              <span className="text-sm text-gray-600">Cost Savings</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-green-600">
                  ${dashboardStats?.costSavings || '2,340'}
                </span>
                <Badge variant="success" size="sm">↑ 18%</Badge>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Time Saved</span>
              <span className="text-sm font-semibold text-gray-900">
                {dashboardStats?.timeSaved || '47 hours'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Efficiency Gain</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-blue-600">
                  {dashboardStats?.efficiency || '+34%'}
                </span>
                <Badge variant="info" size="sm">vs last month</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}