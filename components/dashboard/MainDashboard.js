'use client'

import { useState, useEffect } from 'react'
import { 
  SparklesIcon, 
  CubeTransparentIcon, 
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, StatusBadge } from '../ui/Badge'
import { Avatar, AvatarGroup } from '../ui/Avatar'
// ✅ OPTIMIZED: Dynamic chart imports for better performance
import dynamic from 'next/dynamic'

// Dynamically import charts with loading states (Performance Impact: ~400KB bundle reduction)
const AreaChart = dynamic(
  () => import('../ui/OptimizedCharts').then(mod => ({ default: mod.AreaChart })), 
  { 
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-64 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">Loading chart...</span>
      </div>
    ),
    ssr: false // Charts only load on client side when needed
  }
)

const BarChart = dynamic(
  () => import('../ui/OptimizedCharts').then(mod => ({ default: mod.BarChart })), 
  { 
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-64 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">Loading chart...</span>
      </div>
    ),
    ssr: false
  }
)
import { DataTable } from '../ui/Table'
import { PageWrapper } from '../layout/Layout'
import { cn, formatCurrency, formatNumber, formatDate, calculatePercentageChange } from '../../lib/utils'

// Mock data - replace with real API calls
const mockData = {
  stats: {
    totalRevenue: 12450,
    previousRevenue: 11200,
    totalBookings: 156,
    previousBookings: 142,
    activeIntegrations: 4,
    aiInteractions: 89,
    previousAiInteractions: 67
  },
  revenueChart: [
    { name: 'Jan', value: 8400 },
    { name: 'Feb', value: 9200 },
    { name: 'Mar', value: 8800 },
    { name: 'Apr', value: 10200 },
    { name: 'May', value: 11800 },
    { name: 'Jun', value: 12450 }
  ],
  bookingsChart: [
    { name: 'Mon', value: 24 },
    { name: 'Tue', value: 18 },
    { name: 'Wed', value: 32 },
    { name: 'Thu', value: 28 },
    { name: 'Fri', value: 36 },
    { name: 'Sat', value: 42 },
    { name: 'Sun', value: 38 }
  ],
  aiAgentActivity: [
    { name: 'Financial', interactions: 28, success: 96 },
    { name: 'Client Acquisition', interactions: 22, success: 92 },
    { name: 'Operations', interactions: 18, success: 89 },
    { name: 'Brand Development', interactions: 12, success: 94 },
    { name: 'Growth Strategy', interactions: 9, success: 98 }
  ],
  recentBookings: [
    {
      id: 1,
      client: 'John Smith',
      service: 'Premium Cut & Style',
      date: '2024-01-15T10:00:00Z',
      amount: 85,
      status: 'confirmed',
      platform: 'Trafft'
    },
    {
      id: 2,
      client: 'Sarah Johnson',
      service: 'Color Treatment',
      date: '2024-01-15T14:30:00Z',
      amount: 120,
      status: 'pending',
      platform: 'Square'
    },
    {
      id: 3,
      client: 'Mike Wilson',
      service: 'Beard Trim',
      date: '2024-01-15T16:00:00Z',
      amount: 35,
      status: 'completed',
      platform: 'Acuity'
    }
  ],
  integrations: [
    { name: 'Trafft', status: 'connected', lastSync: '2 minutes ago', bookings: 45 },
    { name: 'Square', status: 'connected', lastSync: '5 minutes ago', bookings: 32 },
    { name: 'Acuity Scheduling', status: 'connected', lastSync: '1 hour ago', bookings: 28 },
    { name: 'Google Calendar', status: 'syncing', lastSync: 'Syncing...', bookings: 0 }
  ]
}

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  previousValue, 
  icon: Icon, 
  prefix = '', 
  suffix = '',
  className 
}) => {
  const change = calculatePercentageChange(value, previousValue)
  const isPositive = change > 0
  const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon

  return (
    <Card className={cn('hover:shadow-md transition-all duration-200', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {prefix}{typeof value === 'number' ? formatNumber(value) : value}{suffix}
            </p>
            {previousValue !== undefined && (
              <div className="flex items-center mt-2">
                <TrendIcon className={cn(
                  'w-4 h-4 mr-1',
                  isPositive ? 'text-success-600' : 'text-error-600'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  isPositive ? 'text-success-600' : 'text-error-600'
                )}>
                  {Math.abs(change)}%
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  vs last period
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Recent Activity Component
const RecentActivity = ({ data }) => {
  const columns = [
    {
      accessorKey: 'client',
      header: 'Client',
      cell: ({ value, row }) => (
        <div className="flex items-center space-x-3">
          <Avatar name={value} size="sm" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      accessorKey: 'service',
      header: 'Service'
    },
    {
      accessorKey: 'date',
      header: 'Date',
      type: 'date'
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      type: 'currency',
      align: 'right'
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ value }) => <StatusBadge status={value} />
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ value }) => <Badge variant="outline">{value}</Badge>
    }
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      title="Recent Bookings"
      pagination={false}
      searchable={false}
    />
  )
}

// Integration Status Component
const IntegrationStatus = ({ integrations }) => (
  <Card>
    <CardHeader>
      <CardTitle>Integration Status</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {integrations.map((integration, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
              <CubeTransparentIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {integration.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last sync: {integration.lastSync}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {integration.bookings} bookings
              </p>
              <StatusBadge status={integration.status} size="sm" />
            </div>
            <Button variant="ghost" size="sm">
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)

// AI Agent Performance Component
const AIAgentPerformance = ({ data }) => (
  <Card>
    <CardHeader>
      <CardTitle>AI Agent Performance</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {data.map((agent, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {agent.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {agent.interactions} interactions
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <div className="text-sm font-medium text-success-600">
                  {agent.success}%
                </div>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-success-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${agent.success}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const MainDashboard = () => {
  const [data, setData] = useState(mockData)
  const [loading, setLoading] = useState(false)

  // Simulate data loading
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <PageWrapper
      title="Dashboard"
      description="Overview of your barbershop's performance and AI agent activity"
      action={
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Last 30 days
          </Button>
          <Button size="sm">
            View Reports
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Monthly Revenue"
            value={data.stats.totalRevenue}
            previousValue={data.stats.previousRevenue}
            icon={CurrencyDollarIcon}
            prefix="$"
          />
          <StatCard
            title="Total Bookings"
            value={data.stats.totalBookings}
            previousValue={data.stats.previousBookings}
            icon={CalendarIcon}
          />
          <StatCard
            title="Active Integrations"
            value={data.stats.activeIntegrations}
            icon={CubeTransparentIcon}
          />
          <StatCard
            title="AI Interactions"
            value={data.stats.aiInteractions}
            previousValue={data.stats.previousAiInteractions}
            icon={SparklesIcon}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AreaChart
            data={data.revenueChart}
            title="Revenue Trend"
            height={300}
            areas={[{ dataKey: 'value', fill: '#0ea5e9', stroke: '#0ea5e9', name: 'Revenue' }]}
            formatter={(value) => formatCurrency(value)}
          />
          <BarChart
            data={data.bookingsChart}
            title="Weekly Bookings"
            height={300}
            bars={[{ dataKey: 'value', fill: '#10b981', name: 'Bookings' }]}
          />
        </div>

        {/* Main Content Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivity data={data.recentBookings} />
          </div>
          <div className="space-y-6">
            <IntegrationStatus integrations={data.integrations} />
            <AIAgentPerformance data={data.aiAgentActivity} />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

export default MainDashboard