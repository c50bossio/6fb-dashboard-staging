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
      // Mock comprehensive analytics data
      const mockData = {
        overview: {
          totalRevenue: 18750,
          revenueChange: 12.5,
          totalBookings: 156,
          bookingsChange: 8.3,
          totalClients: 247,
          clientsChange: 15.2,
          averageRating: 4.8,
          ratingChange: 0.2
        },
        
        revenueData: [
          { date: '2024-11-01', revenue: 580, bookings: 12 },
          { date: '2024-11-02', revenue: 720, bookings: 15 },
          { date: '2024-11-03', revenue: 650, bookings: 13 },
          { date: '2024-11-04', revenue: 890, bookings: 18 },
          { date: '2024-11-05', revenue: 620, bookings: 14 },
          { date: '2024-11-06', revenue: 750, bookings: 16 },
          { date: '2024-11-07', revenue: 680, bookings: 15 },
          { date: '2024-11-08', revenue: 820, bookings: 17 },
          { date: '2024-11-09', revenue: 590, bookings: 12 },
          { date: '2024-11-10', revenue: 910, bookings: 19 }
        ],

        barberPerformance: [
          {
            id: 'barber-alex-123',
            name: 'Alex Rodriguez',
            revenue: 6250,
            bookings: 52,
            rating: 4.9,
            retention: 85,
            commission: 4062.50,
            clients: 87,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
          },
          {
            id: 'barber-jamie-123',
            name: 'Jamie Chen',
            revenue: 5890,
            bookings: 47,
            rating: 4.8,
            retention: 78,
            commission: 4005.20,
            clients: 64,
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332-111?w=150'
          },
          {
            id: 'barber-mike-123',
            name: 'Mike Thompson',
            revenue: 6610,
            bookings: 57,
            rating: 4.9,
            retention: 92,
            commission: 4627.00,
            clients: 102,
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
          }
        ],

        serviceAnalytics: [
          { name: 'Classic Haircut', bookings: 89, revenue: 3115, percentage: 35.2 },
          { name: 'Fade Cut', bookings: 67, revenue: 2680, percentage: 30.3 },
          { name: 'Full Package', bookings: 23, revenue: 1725, percentage: 19.5 },
          { name: 'Beard Trim', bookings: 45, revenue: 1125, percentage: 12.7 },
          { name: 'Hot Shave', bookings: 5, revenue: 225, percentage: 2.3 }
        ],

        timeAnalytics: [
          { hour: '9:00', bookings: 8, revenue: 320 },
          { hour: '10:00', bookings: 12, revenue: 480 },
          { hour: '11:00', bookings: 15, revenue: 600 },
          { hour: '12:00', bookings: 10, revenue: 400 },
          { hour: '13:00', bookings: 8, revenue: 320 },
          { hour: '14:00', bookings: 18, revenue: 720 },
          { hour: '15:00', bookings: 20, revenue: 800 },
          { hour: '16:00', bookings: 22, revenue: 880 },
          { hour: '17:00', bookings: 15, revenue: 600 },
          { hour: '18:00', bookings: 12, revenue: 480 }
        ],

        customerMetrics: {
          newClients: 23,
          returningClients: 134,
          retentionRate: 78.5,
          averageLifetimeValue: 420,
          averageVisitFrequency: 6.2,
          topClients: [
            { name: 'Robert Brown', visits: 18, spent: 1350, lastVisit: '2024-11-15' },
            { name: 'John Smith', visits: 12, spent: 420, lastVisit: '2024-12-08' },
            { name: 'Michael Johnson', visits: 8, spent: 320, lastVisit: '2024-12-07' }
          ]
        }
      }

      setAnalyticsData(mockData)
    } catch (error) {
      console.error('Error loading analytics:', error)
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
            <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export Report
            </button>
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
              <StarIcon className="h-6 w-6 text-yellow-600" />
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
                    <TrophyIcon className="h-6 w-6 text-yellow-500" />
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