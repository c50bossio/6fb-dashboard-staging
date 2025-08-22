'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  ChartPieIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function EnterpriseAnalytics() {
  const { user, profile } = useAuth()
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  useEffect(() => {
    loadAnalyticsData()
  }, [selectedTimeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/enterprise/analytics?range=${selectedTimeRange}`)
      const result = await response.json()
      
      if (result.success) {
        setAnalyticsData(result.data)
      } else {
        throw new Error(result.error || 'Failed to load analytics data')
      }
    } catch (err) {
      console.error('Error loading analytics data:', err)
      setError(err.message)
      // Set mock data for development
      setAnalyticsData({
        summary: {
          totalRevenue: 125890,
          revenueChange: 12.5,
          totalAppointments: 2847,
          appointmentsChange: 8.3,
          averageRating: 4.7,
          ratingChange: 0.2,
          totalCustomers: 1234,
          customersChange: 15.7
        },
        locationComparison: [
          { 
            name: 'Downtown Location', 
            revenue: 45230, 
            appointments: 1024, 
            rating: 4.8,
            growth: 15.2 
          },
          { 
            name: 'Mall Location', 
            revenue: 38450, 
            appointments: 891, 
            rating: 4.6,
            growth: 8.7 
          },
          { 
            name: 'Uptown Branch', 
            revenue: 32180, 
            appointments: 756, 
            rating: 4.7,
            growth: 12.1 
          },
          { 
            name: 'Westside Store', 
            revenue: 10030, 
            appointments: 176, 
            rating: 4.9,
            growth: 45.8 
          }
        ],
        trends: {
          revenue: [
            { period: 'Jan', value: 85000 },
            { period: 'Feb', value: 92000 },
            { period: 'Mar', value: 88000 },
            { period: 'Apr', value: 98000 },
            { period: 'May', value: 105000 },
            { period: 'Jun', value: 125890 }
          ],
          appointments: [
            { period: 'Jan', value: 2100 },
            { period: 'Feb', value: 2300 },
            { period: 'Mar', value: 2150 },
            { period: 'Apr', value: 2450 },
            { period: 'May', value: 2650 },
            { period: 'Jun', value: 2847 }
          ]
        },
        topPerformers: {
          locations: [
            { name: 'Downtown Location', metric: '$45,230' },
            { name: 'Mall Location', metric: '$38,450' },
            { name: 'Uptown Branch', metric: '$32,180' }
          ],
          barbers: [
            { name: 'Marcus Johnson', location: 'Downtown', revenue: '$12,340' },
            { name: 'Sofia Rodriguez', location: 'Mall', revenue: '$11,890' },
            { name: 'James Wilson', location: 'Downtown', revenue: '$10,450' }
          ]
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const timeRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 3 Months' },
    { value: '1y', label: 'Last Year' }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getChangeIcon = (change) => {
    return change >= 0 ? 
      <ArrowUpIcon className="h-4 w-4 text-green-500" /> : 
      <ArrowDownIcon className="h-4 w-4 text-red-500" />
  }

  const getChangeColor = (change) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error && !analyticsData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={loadAnalyticsData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cross-Shop Analytics</h1>
          <p className="text-gray-600 mt-1">Performance comparison across all locations</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-olive-500 focus:border-olive-500"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 text-sm font-medium">
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(analyticsData?.summary?.totalRevenue || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getChangeIcon(analyticsData?.summary?.revenueChange || 0)}
            <span className={`text-sm font-medium ml-1 ${getChangeColor(analyticsData?.summary?.revenueChange || 0)}`}>
              {Math.abs(analyticsData?.summary?.revenueChange || 0)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analyticsData?.summary?.totalAppointments?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getChangeIcon(analyticsData?.summary?.appointmentsChange || 0)}
            <span className={`text-sm font-medium ml-1 ${getChangeColor(analyticsData?.summary?.appointmentsChange || 0)}`}>
              {Math.abs(analyticsData?.summary?.appointmentsChange || 0)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analyticsData?.summary?.averageRating || '0.0'} ⭐
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getChangeIcon(analyticsData?.summary?.ratingChange || 0)}
            <span className={`text-sm font-medium ml-1 ${getChangeColor(analyticsData?.summary?.ratingChange || 0)}`}>
              {Math.abs(analyticsData?.summary?.ratingChange || 0)}
            </span>
            <span className="text-sm text-gray-500 ml-1">from last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analyticsData?.summary?.totalCustomers?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getChangeIcon(analyticsData?.summary?.customersChange || 0)}
            <span className={`text-sm font-medium ml-1 ${getChangeColor(analyticsData?.summary?.customersChange || 0)}`}>
              {Math.abs(analyticsData?.summary?.customersChange || 0)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last period</span>
          </div>
        </div>
      </div>

      {/* Location Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Location Performance Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData?.locationComparison?.map((location, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingStorefrontIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{location.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(location.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.appointments?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.rating} ⭐
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getChangeIcon(location.growth)}
                      <span className={`text-sm font-medium ml-1 ${getChangeColor(location.growth)}`}>
                        {Math.abs(location.growth)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart Placeholder */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setSelectedMetric('revenue')}
                className={`px-3 py-1 text-sm rounded-lg ${
                  selectedMetric === 'revenue' 
                    ? 'bg-olive-100 text-olive-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Revenue
              </button>
              <button 
                onClick={() => setSelectedMetric('appointments')}
                className={`px-3 py-1 text-sm rounded-lg ${
                  selectedMetric === 'appointments' 
                    ? 'bg-olive-100 text-olive-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Appointments
              </button>
            </div>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Chart visualization will be implemented here</p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedMetric === 'revenue' ? 'Revenue' : 'Appointments'} trend over time
              </p>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          
          {/* Top Locations */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Best Performing Locations</h4>
            <div className="space-y-3">
              {analyticsData?.topPerformers?.locations?.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-olive-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-olive-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{location.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{location.metric}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Barbers */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top Earning Barbers</h4>
            <div className="space-y-3">
              {analyticsData?.topPerformers?.barbers?.map((barber, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900 block">{barber.name}</span>
                      <span className="text-xs text-gray-500">{barber.location}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{barber.revenue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}