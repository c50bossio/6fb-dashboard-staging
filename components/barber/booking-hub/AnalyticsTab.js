'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  LinkIcon,
  QrCodeIcon,
  CodeBracketIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

export default function AnalyticsTab() {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    // Simulate loading analytics data
    const timer = setTimeout(() => {
      const mockAnalyticsData = {
        overview: {
          totalViews: 2847,
          totalClicks: 186,
          totalBookings: 34,
          totalRevenue: 1785,
          conversionRate: 18.3,
          avgBookingValue: 52.5
        },
        trends: {
          views: { value: 2847, change: 12.5, direction: 'up' },
          clicks: { value: 186, change: -3.2, direction: 'down' },
          bookings: { value: 34, change: 8.7, direction: 'up' },
          revenue: { value: 1785, change: 15.4, direction: 'up' }
        },
        sources: [
          { name: 'Public Page', views: 1247, clicks: 89, bookings: 15, revenue: 675, type: 'public' },
          { name: 'Marketing Links', views: 856, clicks: 63, bookings: 12, revenue: 720, type: 'marketing' },
          { name: 'QR Codes', views: 432, clicks: 23, bookings: 5, revenue: 275, type: 'qr' },
          { name: 'Embed Widgets', views: 312, clicks: 11, bookings: 2, revenue: 115, type: 'embed' }
        ],
        topPerformers: [
          { name: 'Quick Haircut Booking', type: 'marketing-link', clicks: 45, bookings: 8, revenue: 360 },
          { name: 'Business Card QR', type: 'qr-code', clicks: 23, bookings: 5, revenue: 275 },
          { name: 'Website Homepage Widget', type: 'embed', clicks: 11, bookings: 2, revenue: 115 },
          { name: 'Social Media Link', type: 'public-page', clicks: 34, bookings: 6, revenue: 285 }
        ]
      }
      setAnalyticsData(mockAnalyticsData)
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [timeRange])

  const getSourceIcon = (type) => {
    switch (type) {
      case 'public':
        return GlobeAltIcon
      case 'marketing':
        return LinkIcon
      case 'qr':
        return QrCodeIcon
      case 'embed':
        return CodeBracketIcon
      default:
        return ChartBarIcon
    }
  }

  const getSourceColor = (type) => {
    switch (type) {
      case 'public':
        return 'text-blue-600 bg-blue-100'
      case 'marketing':
        return 'text-green-600 bg-green-100'
      case 'qr':
        return 'text-purple-600 bg-purple-100'
      case 'embed':
        return 'text-indigo-600 bg-indigo-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <p className="ml-4 text-gray-600">Loading analytics data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Unified Analytics</h2>
          <p className="text-sm text-gray-600">Track performance across all your booking sources</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalViews.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analyticsData.trends.views.direction === 'up' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
              )}
              <span className={analyticsData.trends.views.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {analyticsData.trends.views.change}%
              </span>
            </div>
          </div>
          <div className="mt-2">
            <EyeIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalClicks}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analyticsData.trends.clicks.direction === 'up' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
              )}
              <span className={analyticsData.trends.clicks.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(analyticsData.trends.clicks.change)}%
              </span>
            </div>
          </div>
          <div className="mt-2">
            <CursorArrowRaysIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalBookings}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analyticsData.trends.bookings.direction === 'up' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
              )}
              <span className={analyticsData.trends.bookings.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {analyticsData.trends.bookings.change}%
              </span>
            </div>
          </div>
          <div className="mt-2">
            <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.overview.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analyticsData.trends.revenue.direction === 'up' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
              )}
              <span className={analyticsData.trends.revenue.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {analyticsData.trends.revenue.change}%
              </span>
            </div>
          </div>
          <div className="mt-2">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.conversionRate}%</p>
          </div>
          <div className="mt-2">
            <ChartBarIcon className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Booking Value</p>
            <p className="text-2xl font-bold text-gray-900">${analyticsData.overview.avgBookingValue}</p>
          </div>
          <div className="mt-2">
            <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Performance by Source */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Source</h3>
        
        <div className="space-y-4">
          {analyticsData.sources.map((source, index) => {
            const Icon = getSourceIcon(source.type)
            const conversionRate = source.clicks > 0 ? ((source.bookings / source.clicks) * 100).toFixed(1) : 0
            
            return (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getSourceColor(source.type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{source.name}</h4>
                    <p className="text-sm text-gray-600">{conversionRate}% conversion rate</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{source.views}</div>
                    <div className="text-xs text-gray-500">Views</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{source.clicks}</div>
                    <div className="text-xs text-gray-500">Clicks</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{source.bookings}</div>
                    <div className="text-xs text-gray-500">Bookings</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">${source.revenue}</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        
        <div className="space-y-3">
          {analyticsData.topPerformers.map((performer, index) => {
            const conversionRate = performer.clicks > 0 ? ((performer.bookings / performer.clicks) * 100).toFixed(1) : 0
            
            return (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{performer.name}</h4>
                    <span className="text-xs text-gray-500 capitalize">{performer.type.replace('-', ' ')}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-green-600">{performer.clicks}</div>
                    <div className="text-gray-500">Clicks</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{performer.bookings}</div>
                    <div className="text-gray-500">Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600">{conversionRate}%</div>
                    <div className="text-gray-500">Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">${performer.revenue}</div>
                    <div className="text-gray-500">Revenue</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <ChartBarIcon className="h-6 w-6 text-orange-600" />
          <h3 className="font-semibold text-orange-900">Analytics Insights</h3>
        </div>
        <div className="space-y-2 text-sm text-orange-800">
          <p>• Your marketing links have the highest conversion rate at 20.2%</p>
          <p>• QR codes generate 15.2% of your total bookings despite lower overall views</p>
          <p>• Your public page receives the most traffic but has room for conversion improvement</p>
          <p>• Revenue is up 15.4% compared to the previous period</p>
        </div>
      </div>
    </div>
  )
}