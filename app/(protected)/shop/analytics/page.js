'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  TrophyIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  StarIcon,
  ClockIcon,
  ScissorsIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ShopAnalytics() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month') // week, month, quarter, year
  const [analyticsData, setAnalyticsData] = useState({})

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/shop/analytics?timeRange=${timeRange}`)

      if (!response.ok) {
        throw new Error('Failed to load analytics data')
      }

      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
      // Set empty data structure on error
      setAnalyticsData({
        overview: {
          totalRevenue: 0,
          revenueChange: 0,
          totalBookings: 0,
          bookingsChange: 0,
          totalClients: 0,
          clientsChange: 0,
          averageRating: 0,
          ratingChange: 0
        },
        revenueData: [],
        barberPerformance: [],
        serviceAnalytics: [],
        timeAnalytics: [],
        customerMetrics: {
          newClients: 0,
          returningClients: 0,
          retentionRate: 0,
          averageLifetimeValue: 0,
          averageVisitFrequency: 0,
          topClients: []
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#C5A35B']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  const { overview, revenueData, barberPerformance, serviceAnalytics, timeAnalytics, customerMetrics } = analyticsData

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <ChartBarIcon className="h-8 w-8 text-olive-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground">Shop Analytics</h1>
              <p className="text-gray-600 dark:text-gray-300">Performance insights and business intelligence</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
            </select>
            <button className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-card border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-muted flex items-center">
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <span className={`text-sm font-medium flex items-center ${
              overview.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {overview.revenueChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(overview.revenueChange)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">${overview.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Revenue</p>
        </div>

        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-olive-100 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-olive-600" />
            </div>
            <span className={`text-sm font-medium flex items-center ${
              overview.bookingsChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {overview.bookingsChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(overview.bookingsChange)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">{overview.totalBookings}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Bookings</p>
        </div>

        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gold-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-gold-600" />
            </div>
            <span className={`text-sm font-medium flex items-center ${
              overview.clientsChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {overview.clientsChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(overview.clientsChange)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">{overview.totalClients}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Clients</p>
        </div>

        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <StarIcon className="h-6 w-6 text-amber-800" />
            </div>
            <span className={`text-sm font-medium flex items-center ${
              overview.ratingChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {overview.ratingChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(overview.ratingChange)}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">{overview.averageRating}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Average Rating</p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">Revenue & Bookings Trend</h2>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? `$${value}` : value,
                  name === 'revenue' ? 'Revenue' : 'Bookings'
                ]}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#3B82F6" name="Revenue" />
              <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#10B981" strokeWidth={2} name="Bookings" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barber Performance */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">Barber Performance</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {barberPerformance.map((barber, index) => (
              <div key={barber.id} className="relative">
                {index === 0 && (
                  <div className="absolute -top-2 -right-2">
                    <TrophyIcon className="h-6 w-6 text-amber-800" />
                  </div>
                )}
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full mx-auto mb-4 overflow-hidden">
                    <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-card-foreground">{barber.name}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-300">Revenue</span>
                      <span className="font-medium">${barber.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-300">Bookings</span>
                      <span className="font-medium">{barber.bookings}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-300">Rating</span>
                      <span className="font-medium">{barber.rating}/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-300">Retention</span>
                      <span className="font-medium">{barber.retention}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-300">Commission</span>
                      <span className="font-medium text-green-600">${barber.commission.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Analytics & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Service Breakdown */}
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border">
          <div className="p-6 border-b border-gray-200 dark:border-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">Service Popularity</h2>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviceAnalytics}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="bookings"
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                >
                  {serviceAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} bookings`, 'Bookings']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border">
          <div className="p-6 border-b border-gray-200 dark:border-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">Peak Hours Analysis</h2>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border">
        <div className="p-6 border-b border-gray-200 dark:border-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">Customer Insights</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customer Metrics */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-card-foreground mb-4">Customer Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-300">New Clients</span>
                  <span className="font-medium">{customerMetrics.newClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-300">Returning Clients</span>
                  <span className="font-medium">{customerMetrics.returningClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-300">Retention Rate</span>
                  <span className="font-medium">{customerMetrics.retentionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-300">Avg Lifetime Value</span>
                  <span className="font-medium">${customerMetrics.averageLifetimeValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-300">Avg Visit Frequency</span>
                  <span className="font-medium">{customerMetrics.averageVisitFrequency}/year</span>
                </div>
              </div>
            </div>

            {/* Top Clients */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-card-foreground mb-4">Top Clients</h3>
              <div className="space-y-3">
                {customerMetrics.topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-card-foreground">{client.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">{client.visits} visits • Last: {new Date(client.lastVisit).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">${client.spent}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}