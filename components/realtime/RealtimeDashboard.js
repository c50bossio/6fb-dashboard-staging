'use client'

import { 
  BoltIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  BellAlertIcon,
  SignalIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

import { useRealtimeMetrics } from '../../hooks/useRealtimeDatabase'

export default function RealtimeDashboard({ barbershopId }) {
  // Validate required barbershopId
  if (!barbershopId) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Barbershop ID Required</h3>
        <p className="text-gray-600">
          A valid barbershop ID is required to display real-time metrics.
        </p>
      </div>
    )
  }

  const {
    data: realtimeMetrics,
    isConnected,
    error: connectionError,
    lastUpdate
  } = useRealtimeMetrics(barbershopId)

  const [notifications, setNotifications] = useState([])
  const connectionStatus = isConnected ? 'connected' : connectionError ? 'error' : 'connecting'
  const hasRealtimeData = Boolean(realtimeMetrics)
  const unreadNotifications = notifications.filter(n => !n.read).length

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const [showNotifications, setShowNotifications] = useState(false)
  const [metricsHistory, setMetricsHistory] = useState([])
  const [activities, setActivities] = useState([])

  useEffect(() => {
    if (realtimeMetrics) {
      setMetricsHistory(prev => [
        { ...realtimeMetrics, timestamp: Date.now() },
        ...prev.slice(0, 19) // Keep last 20 data points
      ])
    }
  }, [realtimeMetrics])

  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0]
      if (latestNotification && !activities.find(a => a.id === latestNotification.id)) {
        setActivities(prev => [{
          id: latestNotification.id,
          type: latestNotification.type,
          message: latestNotification.message,
          timestamp: new Date(latestNotification.timestamp),
          priority: latestNotification.priority
        }, ...prev].slice(0, 10))
      }
    }
  }, [notifications])

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'error': return 'text-red-500'
      default: return 'text-amber-800'
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircleIcon className="h-4 w-4" />
      case 'error': return <ExclamationTriangleIcon className="h-4 w-4" />
      default: return <ClockIcon className="h-4 w-4 animate-spin" />
    }
  }

  const calculateTrend = (metric) => {
    if (metricsHistory.length < 2) return null
    
    const current = metricsHistory[0][metric]
    const previous = metricsHistory[1][metric]
    
    if (typeof current !== 'number' || typeof previous !== 'number') return null
    
    const change = ((current - previous) / previous) * 100
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      percentage: Math.abs(change).toFixed(1)
    }
  }

  const TrendIndicator = ({ metric, value, format = 'number' }) => {
    const trend = calculateTrend(metric)
    
    const formatValue = (val) => {
      switch (format) {
        case 'currency': return `$${val.toFixed(2)}`
        case 'percentage': return `${(val * 100).toFixed(1)}%`
        case 'rating': return `${val.toFixed(1)}/5`
        default: return val.toString()
      }
    }

    return (
      <div className="flex items-center space-x-2">
        <span className="text-lg font-semibold text-gray-900">
          {formatValue(value)}
        </span>
        {trend && trend.direction !== 'stable' && (
          <div className={`flex items-center space-x-1 text-sm ${
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.direction === 'up' ? (
              <ArrowTrendingUpIcon className="h-3 w-3" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3" />
            )}
            <span>{trend.percentage}%</span>
          </div>
        )}
      </div>
    )
  }

  const NotificationPanel = () => (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Live Notifications</h3>
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No new notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                !notification.read ? 'bg-olive-50' : ''
              }`}
              onClick={() => markNotificationRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    notification.priority === 'success' ? 'text-green-800' :
                    notification.priority === 'warning' ? 'text-yellow-800' :
                    notification.priority === 'error' ? 'text-red-800' :
                    'text-olive-800'
                  }`}>
                    {notification.title}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-olive-500 rounded-full ml-2 mt-1"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with connection status and notifications */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <SignalIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Live Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center space-x-1 ${getConnectionStatusColor()}`}>
              {getConnectionStatusIcon()}
              <span className="text-sm font-medium capitalize">
                {connectionStatus}
              </span>
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <BellAlertIcon className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
              {showNotifications && <NotificationPanel />}
            </div>
          </div>
        </div>
        
        {connectionError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            Connection Error: {connectionError}
          </div>
        )}
      </div>

      {/* Real-time Metrics */}
      {!hasRealtimeData ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <div className="animate-pulse">
            <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Loading real-time data...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-olive-50 to-olive-100 p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-olive-800 mb-1">Revenue Today</div>
              <TrendIndicator 
                metric="total_revenue" 
                value={realtimeMetrics.total_revenue} 
                format="currency"
              />
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-green-800 mb-1">Bookings</div>
              <TrendIndicator 
                metric="daily_bookings" 
                value={realtimeMetrics.daily_bookings}
              />
            </div>
            
            <div className="bg-gradient-to-r from-gold-50 to-gold-100 p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gold-800 mb-1">Satisfaction</div>
              <TrendIndicator 
                metric="satisfaction_rating" 
                value={realtimeMetrics.satisfaction_rating}
                format="rating"
              />
            </div>
            
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-yellow-800 mb-1">Utilization</div>
              <TrendIndicator 
                metric="utilization_rate" 
                value={realtimeMetrics.utilization_rate}
                format="percentage" 
              />
            </div>
          </div>

          {/* Live Activity Indicators */}
          <div className="bg-gray-50 rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Live Activity</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Active Customers:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {realtimeMetrics.active_customers}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Avg Wait:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {realtimeMetrics.average_wait_time}m
                </span>
              </div>
              <div>
                <span className="text-gray-600">Current Hour:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {realtimeMetrics.current_hour}:00
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  realtimeMetrics.peak_hour_indicator 
                    ? 'bg-softred-100 text-softred-900' 
                    : 'bg-moss-100 text-moss-900'
                }`}>
                  {realtimeMetrics.peak_hour_indicator ? 'Peak Hour' : 'Normal'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Live Activity Feed</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No recent activity
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    activity.priority === 'success' ? 'bg-green-400' :
                    activity.priority === 'warning' ? 'bg-yellow-400' :
                    activity.priority === 'error' ? 'bg-red-400' :
                    'bg-olive-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Update Timestamp */}
      <div className="text-xs text-gray-400 text-right">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}