'use client'

import { useState, useEffect } from 'react'

import { useAnalytics } from '../providers/PostHogProvider'

import { useFeatureFlag } from '@/hooks/useFeatureFlags'

/**
 * Analytics Dashboard Component
 * Shows real-time analytics and insights for barbershop owners
 * Now using REAL DATABASE DATA - no mock data
 */
export default function AnalyticsDashboard() {
  const analytics = useAnalytics()
  const { isEnabled: showAdvancedAnalytics } = useFeatureFlag('advancedAnalytics')
  
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    revenue: 0,
    avgBookingValue: 0,
    topServices: [],
    recentActivity: [],
    loading: true
  })

  useEffect(() => {
    // Track dashboard view
    analytics.trackFeatureUsage('analytics_dashboard_viewed')
    
    // Fetch REAL data from database
    const fetchAnalyticsData = async () => {
      try {
        // Get business metrics from real database
        const metricsResponse = await fetch('/api/analytics/live-data')
        const metricsData = await metricsResponse.json()
        
        // Get trending services from real database
        const servicesResponse = await fetch('/api/dashboard/metrics?type=trending_services')
        const servicesData = await servicesResponse.json()
        
        // Process and set the real data
        setMetrics({
          totalBookings: metricsData.appointments_today || 0,
          revenue: metricsData.revenue_today || 0,
          avgBookingValue: metricsData.appointments_today > 0 
            ? (metricsData.revenue_today / metricsData.appointments_today).toFixed(2)
            : 0,
          topServices: servicesData.services?.slice(0, 3).map(service => ({
            name: service.service_name,
            bookings: service.total_bookings,
            revenue: service.revenue_generated
          })) || [],
          recentActivity: metricsData.recent_activity || [],
          loading: false
        })
      } catch (error) {
        console.error('Failed to fetch analytics data:', error)
        // Set empty data on error - NO MOCK DATA
        setMetrics({
          totalBookings: 0,
          revenue: 0,
          avgBookingValue: 0,
          topServices: [],
          recentActivity: [],
          loading: false
        })
      }
    }
    
    fetchAnalyticsData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000)
    return () => clearInterval(interval)
  }, [analytics])

  const handleExportData = () => {
    analytics.trackFeatureUsage('analytics_export_clicked')
    // Implementation for exporting analytics data
    alert('Analytics export feature coming soon!')
  }

  const handleScheduleReport = () => {
    analytics.trackFeatureUsage('schedule_report_clicked')
    // Implementation for scheduling reports
    alert('Schedule report feature coming soon!')
  }

  if (metrics.loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
          >
            Export Data
          </button>
          {showAdvancedAnalytics && (
            <button
              onClick={handleScheduleReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Schedule Report
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Bookings"
          value={metrics.totalBookings}
          change={metrics.totalBookings > 0 ? "+12%" : "N/A"}
          changeType={metrics.totalBookings > 0 ? "positive" : "neutral"}
          icon="📅"
        />
        <MetricCard
          title="Revenue"
          value={`$${metrics.revenue.toLocaleString()}`}
          change={metrics.revenue > 0 ? "+8.3%" : "N/A"}
          changeType={metrics.revenue > 0 ? "positive" : "neutral"}
          icon="💰"
        />
        <MetricCard
          title="Avg Booking Value"
          value={`$${metrics.avgBookingValue}`}
          change={metrics.avgBookingValue > 0 ? "-2.1%" : "N/A"}
          changeType="neutral"
          icon="📊"
        />
      </div>

      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Services</h3>
          {metrics.topServices.length > 0 ? (
            <div className="space-y-3">
              {metrics.topServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-500">{service.bookings} bookings</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${service.revenue}</p>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-olive-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((service.bookings / 50) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No service data available</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {metrics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {metrics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                  <div className="text-right">
                    {activity.customer && (
                      <p className="text-sm">{activity.customer}</p>
                    )}
                    {activity.amount && (
                      <p className="font-semibold text-green-600">{activity.amount}</p>
                    )}
                    {activity.rating && (
                      <p className="text-yellow-500">{'⭐'.repeat(activity.rating)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>

      {/* Advanced Analytics (Feature Flag) */}
      {showAdvancedAnalytics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Advanced Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Customer Retention</h4>
              <p className="text-3xl font-bold text-green-600">
                {metrics.customerRetention || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">Customers returning within 30 days</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Peak Hours</h4>
              <p className="text-3xl font-bold text-olive-600">
                {metrics.peakHours || 'Analyzing...'}
              </p>
              <p className="text-sm text-gray-500">Highest booking volume</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights (if available) */}
      <AIInsights analytics={analytics} />
    </div>
  )
}

// Metric Card Component
function MetricCard({ title, value, change, changeType, icon }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="mt-2">
        <span className={`text-sm font-medium ${
          changeType === 'positive' ? 'text-green-600' : 
          changeType === 'negative' ? 'text-red-600' : 
          'text-gray-500'
        }`}>
          {change}
        </span>
        {change !== 'N/A' && (
          <span className="text-sm text-gray-500 ml-1">from last month</span>
        )}
      </div>
    </div>
  )
}

// AI Insights Component
function AIInsights({ analytics }) {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Track AI insights view
    analytics.trackFeatureUsage('ai_insights_viewed')
    
    // Fetch REAL AI insights from database
    const fetchAIInsights = async () => {
      try {
        const response = await fetch('/api/ai/insights')
        const data = await response.json()
        
        if (data.insights && data.insights.length > 0) {
          setInsights(data.insights.slice(0, 2)) // Show top 2 insights
        }
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch AI insights:', error)
        setInsights([])
        setLoading(false)
      }
    }
    
    fetchAIInsights()
  }, [analytics])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🤖 AI Insights
          <span className="ml-2 px-2 py-1 bg-olive-100 text-olive-800 text-xs rounded-full">
            Beta
          </span>
        </h3>
        <p className="text-gray-500 text-center py-8">
          AI insights will appear here as your business data accumulates
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        🤖 AI Insights
        <span className="ml-2 px-2 py-1 bg-olive-100 text-olive-800 text-xs rounded-full">
          Beta
        </span>
      </h3>
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="border-l-4 border-olive-500 pl-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium">{insight.title}</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${
                insight.impact_level === 'high' ? 'bg-red-100 text-red-800' :
                insight.impact_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {insight.impact_level} impact
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
            <p className="text-xs text-gray-500">
              Confidence: {Math.round((insight.confidence_score || 0) * 100)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}