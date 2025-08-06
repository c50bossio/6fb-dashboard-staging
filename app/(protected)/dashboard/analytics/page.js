'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7days')
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState(null)

  // Mock data for charts
  const revenueData = [
    { date: 'Mon', revenue: 1200, bookings: 12 },
    { date: 'Tue', revenue: 1500, bookings: 15 },
    { date: 'Wed', revenue: 1300, bookings: 13 },
    { date: 'Thu', revenue: 1800, bookings: 18 },
    { date: 'Fri', revenue: 2200, bookings: 22 },
    { date: 'Sat', revenue: 2500, bookings: 25 },
    { date: 'Sun', revenue: 1900, bookings: 19 }
  ]

  const serviceBreakdown = [
    { name: 'Haircut', value: 45, color: '#3B82F6' },
    { name: 'Beard Trim', value: 25, color: '#8B5CF6' },
    { name: 'Hair & Beard', value: 20, color: '#10B981' },
    { name: 'Special Treatment', value: 10, color: '#F59E0B' }
  ]

  const peakHours = [
    { hour: '9 AM', bookings: 5 },
    { hour: '10 AM', bookings: 8 },
    { hour: '11 AM', bookings: 12 },
    { hour: '12 PM', bookings: 10 },
    { hour: '1 PM', bookings: 7 },
    { hour: '2 PM', bookings: 15 },
    { hour: '3 PM', bookings: 18 },
    { hour: '4 PM', bookings: 14 },
    { hour: '5 PM', bookings: 11 },
    { hour: '6 PM', bookings: 8 }
  ]

  const customerRetention = [
    { month: 'Jan', newCustomers: 45, returning: 120 },
    { month: 'Feb', newCustomers: 52, returning: 135 },
    { month: 'Mar', newCustomers: 48, returning: 142 },
    { month: 'Apr', newCustomers: 58, returning: 155 },
    { month: 'May', newCustomers: 62, returning: 168 },
    { month: 'Jun', newCustomers: 55, returning: 175 }
  ]

  useEffect(() => {
    // Simulate loading analytics data
    setTimeout(() => {
      setAnalyticsData({
        totalRevenue: 12400,
        revenueGrowth: 15.3,
        totalBookings: 124,
        bookingsGrowth: 8.7,
        avgTicketSize: 100,
        ticketGrowth: 5.2,
        customerRetentionRate: 68,
        retentionGrowth: 3.1
      })
      setLoading(false)
    }, 1000)
  }, [timeRange])

  const StatCard = ({ title, value, growth, icon: Icon, prefix = '' }) => {
    const isPositive = growth > 0
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {prefix}{value}
            </p>
            <div className="flex items-center mt-2">
              {isPositive ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(growth)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          </div>
          <div className={`p-3 rounded-full bg-blue-50`}>
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-900" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                  <p className="mt-1 text-gray-600">Track your barbershop performance</p>
                </div>
              </div>
              
              {/* Time Range Selector */}
              <div className="flex space-x-2">
                {['7days', '30days', '90days'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : '90 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Revenue"
              value={analyticsData.totalRevenue.toLocaleString()}
              growth={analyticsData.revenueGrowth}
              icon={CurrencyDollarIcon}
              prefix="$"
            />
            <StatCard
              title="Total Bookings"
              value={analyticsData.totalBookings}
              growth={analyticsData.bookingsGrowth}
              icon={CalendarDaysIcon}
            />
            <StatCard
              title="Avg Ticket Size"
              value={analyticsData.avgTicketSize}
              growth={analyticsData.ticketGrowth}
              icon={ChartBarIcon}
              prefix="$"
            />
            <StatCard
              title="Retention Rate"
              value={analyticsData.customerRetentionRate}
              growth={analyticsData.retentionGrowth}
              icon={UserGroupIcon}
              prefix=""
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue & Bookings Trend */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue & Bookings Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Revenue ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bookings"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Bookings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Service Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Service Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Peak Hours */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Peak Hours Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-600 mt-2">
                Busiest hours: 2-4 PM. Consider staffing adjustments.
              </p>
            </div>

            {/* Customer Retention */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Acquisition & Retention</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={customerRetention}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="returning"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    name="Returning Customers"
                  />
                  <Area
                    type="monotone"
                    dataKey="newCustomers"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    name="New Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI-Powered Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📈 Growth Opportunity</h4>
                <p className="text-sm text-gray-700">
                  Your Friday and Saturday revenue is 40% higher than weekdays. Consider extending hours or adding staff on these days to capture more business.
                </p>
              </div>
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">💡 Service Optimization</h4>
                <p className="text-sm text-gray-700">
                  "Hair & Beard" combo services have the highest profit margin. Promote package deals to increase average ticket size.
                </p>
              </div>
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">🎯 Customer Focus</h4>
                <p className="text-sm text-gray-700">
                  68% retention rate is good, but implementing a loyalty program could push this to 75%+ based on industry benchmarks.
                </p>
              </div>
              <div className="bg-white bg-opacity-70 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">⏰ Efficiency Tip</h4>
                <p className="text-sm text-gray-700">
                  You have low bookings 9-10 AM. Consider offering early-bird discounts to smooth out demand throughout the day.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}