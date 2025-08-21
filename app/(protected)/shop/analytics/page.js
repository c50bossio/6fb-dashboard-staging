'use client'

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
import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function ShopAnalytics() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month') // week, month, quarter, year
  const [analyticsData, setAnalyticsData] = useState({})
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Determine period days based on time range
      const periodDaysMap = {
        'week': 7,
        'month': 30,
        'quarter': 90,
        'year': 365
      }
      const periodDays = periodDaysMap[timeRange] || 30

      // Load comprehensive analytics from FastAPI
      const [dashboardResponse, liveMetricsResponse, businessMetricsResponse] = await Promise.all([
        fetch(`/api/shop/analytics/dashboard?period_days=${periodDays}`),
        fetch('/api/shop/analytics/live-metrics'),
        fetch('/api/shop/analytics/business-metrics')
      ])

      const [dashboardData, liveMetrics, businessMetrics] = await Promise.all([
        dashboardResponse.json(),
        liveMetricsResponse.json(),
        businessMetricsResponse.json()
      ])

      // Transform real data to match UI expectations
      const transformedData = {
        overview: {
          totalRevenue: dashboardData.summary?.total_revenue || 0,
          revenueChange: businessMetrics.growth_rate || 0,
          totalBookings: dashboardData.summary?.total_appointments || 0,
          bookingsChange: businessMetrics.trends?.customer_growth || 0,
          totalClients: dashboardData.summary?.total_customers || 0,
          clientsChange: businessMetrics.trends?.customer_growth || 0,
          averageRating: businessMetrics.customer_satisfaction || 4.5,
          ratingChange: 0.1
        },
        
        revenueData: Object.entries(dashboardData.daily_revenue || {}).map(([date, revenue]) => ({
          date,
          revenue: revenue || 0,
          bookings: Math.floor((revenue || 0) / (dashboardData.summary?.average_appointment_value || 40)) // Estimate bookings
        })).slice(-10), // Show last 10 days

        barberPerformance: [], // This would need a separate endpoint or data structure

        serviceAnalytics: (dashboardData.popular_services || []).map(service => ({
          name: service.service || 'Unknown Service',
          bookings: service.count || 0,
          revenue: service.count * 35, // Estimate revenue per service
          percentage: service.percentage || 0
        })),

        timeAnalytics: [], // This would need hourly breakdown data

        customerMetrics: {
          newClients: Math.floor((dashboardData.summary?.total_customers || 0) * 0.3), // Estimate 30% new
          returningClients: Math.floor((dashboardData.summary?.total_customers || 0) * 0.7), // Estimate 70% returning
          retentionRate: dashboardData.summary?.customer_retention_rate || 0,
          averageLifetimeValue: (dashboardData.summary?.total_revenue || 0) / Math.max(dashboardData.summary?.total_customers || 1, 1),
          averageVisitFrequency: 6.2, // Default until we have this metric
          topClients: [] // This would need a separate endpoint
        },

        // Store raw data for debugging
        _rawData: {
          dashboard: dashboardData,
          liveMetrics,
          businessMetrics
        }
      }

      setAnalyticsData(transformedData)
    } catch (error) {
      console.error('Error loading analytics:', error)
      
      // Fallback to empty data structure
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

  const handleExport = async (format) => {
    try {
      setShowExportMenu(false)
      
      const periodDaysMap = {
        'week': 7,
        'month': 30,
        'quarter': 90,
        'year': 365
      }
      const periodDays = periodDaysMap[timeRange] || 30
      
      const response = await fetch(`/api/shop/analytics/export?format=${format}&period_days=${periodDays}&include_details=true`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `shop-analytics-${timestamp}.${format}`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export analytics data. Please try again.')
    }
  }

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.relative')) {
        setShowExportMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

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
              <h1 className="text-3xl font-bold text-gray-900">Shop Analytics</h1>
              <p className="text-gray-600">Performance insights and business intelligence</p>
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
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export Report
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('json')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Export as JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Export as CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          <p className="text-2xl font-bold text-gray-900">${overview.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          <p className="text-2xl font-bold text-gray-900">{overview.totalBookings}</p>
          <p className="text-sm text-gray-600 mt-1">Total Bookings</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          <p className="text-2xl font-bold text-gray-900">{overview.totalClients}</p>
          <p className="text-sm text-gray-600 mt-1">Total Clients</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          <p className="text-2xl font-bold text-gray-900">{overview.averageRating}</p>
          <p className="text-sm text-gray-600 mt-1">Average Rating</p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Revenue & Bookings Trend</h2>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Barber Performance</h2>
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
                  <h3 className="font-semibold text-gray-900">{barber.name}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Revenue</span>
                      <span className="font-medium">${barber.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Bookings</span>
                      <span className="font-medium">{barber.bookings}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rating</span>
                      <span className="font-medium">{barber.rating}/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Retention</span>
                      <span className="font-medium">{barber.retention}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Commission</span>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Service Popularity</h2>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Peak Hours Analysis</h2>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Customer Insights</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customer Metrics */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Customer Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">New Clients</span>
                  <span className="font-medium">{customerMetrics.newClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Returning Clients</span>
                  <span className="font-medium">{customerMetrics.returningClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Retention Rate</span>
                  <span className="font-medium">{customerMetrics.retentionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Lifetime Value</span>
                  <span className="font-medium">${customerMetrics.averageLifetimeValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Visit Frequency</span>
                  <span className="font-medium">{customerMetrics.averageVisitFrequency}/year</span>
                </div>
              </div>
            </div>

            {/* Top Clients */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Top Clients</h3>
              <div className="space-y-3">
                {customerMetrics.topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.visits} visits • Last: {new Date(client.lastVisit).toLocaleDateString()}</p>
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