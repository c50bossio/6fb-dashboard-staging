'use client'

import { useState, useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { 
  ChartBarIcon, 
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts'

// Mock data for demonstration
const mockData = {
  dailyRevenue: [
    { date: 'Mon', revenue: 1200 },
    { date: 'Tue', revenue: 1400 },
    { date: 'Wed', revenue: 1100 },
    { date: 'Thu', revenue: 1600 },
    { date: 'Fri', revenue: 2100 },
    { date: 'Sat', revenue: 2400 },
    { date: 'Sun', revenue: 1800 },
  ],
  userGrowth: [
    { month: 'Jan', users: 100 },
    { month: 'Feb', users: 150 },
    { month: 'Mar', users: 220 },
    { month: 'Apr', users: 310 },
    { month: 'May', users: 420 },
    { month: 'Jun', users: 580 },
  ],
  serviceBreakdown: [
    { name: 'Haircut', value: 45, color: '#3B82F6' },
    { name: 'Beard Trim', value: 25, color: '#10B981' },
    { name: 'Hair Color', value: 15, color: '#F59E0B' },
    { name: 'Shave', value: 10, color: '#EF4444' },
    { name: 'Other', value: 5, color: '#6B7280' },
  ],
  peakHours: [
    { hour: '9AM', bookings: 5 },
    { hour: '10AM', bookings: 12 },
    { hour: '11AM', bookings: 18 },
    { hour: '12PM', bookings: 15 },
    { hour: '1PM', bookings: 10 },
    { hour: '2PM', bookings: 14 },
    { hour: '3PM', bookings: 20 },
    { hour: '4PM', bookings: 22 },
    { hour: '5PM', bookings: 19 },
    { hour: '6PM', bookings: 8 },
  ],
}

export default function AnalyticsPage() {
  const { trackFeature } = useAnalytics()
  const [timeRange, setTimeRange] = useState('week')
  const [metrics, setMetrics] = useState({
    totalRevenue: 12400,
    totalBookings: 186,
    avgBookingValue: 66.67,
    customerRetention: 78,
  })

  useEffect(() => {
    // Track analytics page view
    trackFeature('analytics_dashboard_viewed', { time_range: timeRange })
  }, [timeRange, trackFeature])

  const MetricCard = ({ icon: Icon, label, value, change, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last {timeRange}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your business performance and insights</p>
          </div>
          
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={CurrencyDollarIcon}
            label="Total Revenue"
            value={`$${metrics.totalRevenue.toLocaleString()}`}
            change={12.5}
            color="green"
          />
          <MetricCard
            icon={CalendarIcon}
            label="Total Bookings"
            value={metrics.totalBookings}
            change={8.2}
            color="blue"
          />
          <MetricCard
            icon={ArrowTrendingUpIcon}
            label="Avg Booking Value"
            value={`$${metrics.avgBookingValue.toFixed(2)}`}
            change={-2.3}
            color="yellow"
          />
          <MetricCard
            icon={UserGroupIcon}
            label="Customer Retention"
            value={`${metrics.customerRetention}%`}
            change={5.7}
            color="purple"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockData.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  fill="#93C5FD" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Service Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockData.serviceBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockData.serviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* User Growth */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Booking Hours</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockData.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PostHog Integration Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800">
              <span className="font-semibold">PostHog Analytics Active:</span> Real-time user behavior tracking, 
              session recordings, and feature flags are enabled. View detailed insights in your PostHog dashboard.
            </p>
          </div>
        </div>

        {/* Feature Usage Examples */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => trackFeature('export_analytics', { format: 'pdf' })}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Export as PDF
          </button>
          <button
            onClick={() => trackFeature('share_analytics', { method: 'email' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Share Report
          </button>
          <button
            onClick={() => trackFeature('schedule_report', { frequency: 'weekly' })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Schedule Reports
          </button>
        </div>
      </div>
    </div>
  )
}