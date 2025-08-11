'use client'

import { useState, useEffect, useCallback } from 'react'

import { useAnalytics } from '../providers/PostHogProvider'

/**
 * System Monitoring Dashboard
 * Real-time monitoring of system health and performance
 */
export default function SystemMonitoringDashboard() {
  const analytics = useAnalytics()
  const [systemHealth, setSystemHealth] = useState({
    status: 'loading',
    services: {},
    system: {},
    loading: true,
    lastUpdated: null,
  })

  const [metrics, setMetrics] = useState({
    uptime: 0,
    responseTime: 0,
    errorRate: 0,
    activeUsers: 0,
    totalRequests: 0,
    loading: true,
  })

  const [alerts, setAlerts] = useState([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health?detailed=true&connections=true')
      const data = await response.json()
      
      setSystemHealth({
        ...data,
        loading: false,
        lastUpdated: new Date(),
      })

      // Check for critical issues
      if (data.critical_issues?.length > 0) {
        setAlerts(prev => [
          ...prev.filter(alert => alert.type !== 'critical'),
          {
            id: Date.now(),
            type: 'critical',
            title: 'Critical System Issues Detected',
            message: data.critical_issues.join(', '),
            timestamp: new Date(),
          }
        ])
      }

    } catch (error) {
      console.error('Failed to fetch system health:', error)
      setSystemHealth(prev => ({
        ...prev,
        loading: false,
        status: 'error',
        error: error.message,
      }))
    }
  }, [])

  // Fetch performance metrics
  const fetchMetrics = useCallback(async () => {
    try {
      // In a real implementation, this would fetch from your analytics API
      // For now, we'll simulate the data
      const Metrics = {
        uptime: Math.floor(Math.random() * 99.9 + 99.1),
        responseTime: Math.floor(Math.random() * 200 + 100),
        errorRate: Math.random() * 2,
        activeUsers: Math.floor(Math.random() * 100 + 50),
        totalRequests: Math.floor(Math.random() * 10000 + 5000),
        loading: false,
      }

      setMetrics(mockMetrics)

      // Track monitoring usage
      analytics.trackFeatureUsage('system_monitoring_viewed')

      // Check for performance issues
      if (mockMetrics.responseTime > 1000) {
        setAlerts(prev => [
          ...prev.filter(alert => alert.type !== 'performance'),
          {
            id: Date.now(),
            type: 'performance',
            title: 'High Response Time',
            message: `Average response time is ${mockMetrics.responseTime}ms`,
            timestamp: new Date(),
          }
        ])
      }

    } catch (error) {
      console.error('Failed to fetch metrics:', error)
      setMetrics(prev => ({ ...prev, loading: false }))
    }
  }, [analytics])

  // Auto-refresh data
  useEffect(() => {
    fetchSystemHealth()
    fetchMetrics()

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth()
        fetchMetrics()
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchSystemHealth, fetchMetrics])

  // Handle manual refresh
  const handleRefresh = () => {
    fetchSystemHealth()
    fetchMetrics()
  }

  // Handle alert dismissal
  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  if (systemHealth.loading && metrics.loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-sm text-gray-500">
            Last updated: {systemHealth.lastUpdated?.toLocaleTimeString() || 'Never'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
          ))}
        </div>
      )}

      {/* System Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <StatusIndicator status={systemHealth.status} />
          <span className="ml-2">Overall System Status</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Uptime"
            value={`${metrics.uptime.toFixed(2)}%`}
            status={metrics.uptime >= 99.5 ? 'healthy' : metrics.uptime >= 99 ? 'warning' : 'error'}
            icon="⏰"
          />
          <MetricCard
            title="Response Time"
            value={`${metrics.responseTime}ms`}
            status={metrics.responseTime <= 500 ? 'healthy' : metrics.responseTime <= 1000 ? 'warning' : 'error'}
            icon="⚡"
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics.errorRate.toFixed(2)}%`}
            status={metrics.errorRate <= 1 ? 'healthy' : metrics.errorRate <= 5 ? 'warning' : 'error'}
            icon="🚨"
          />
          <MetricCard
            title="Active Users"
            value={metrics.activeUsers}
            status="healthy"
            icon="👥"
          />
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Service Health</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(systemHealth.services || {}).map(([serviceName, service]) => (
            <ServiceCard key={serviceName} name={serviceName} service={service} />
          ))}
        </div>
      </div>

      {/* System Resources */}
      {systemHealth.system && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">System Resources</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResourceCard
              title="Memory Usage"
              used={systemHealth.system.memory?.used || 0}
              total={systemHealth.system.memory?.total || 0}
              unit="MB"
              threshold={80}
            />
            <ResourceCard
              title="Uptime"
              value={`${Math.floor((systemHealth.system.uptime || 0) / 3600)}h ${Math.floor(((systemHealth.system.uptime || 0) % 3600) / 60)}m`}
            />
            <ResourceCard
              title="Node Version"
              value={systemHealth.system.node_version || 'Unknown'}
            />
          </div>
        </div>
      )}

      {/* Performance Charts */}
      <PerformanceCharts metrics={metrics} />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}

// Status Indicator Component
function StatusIndicator({ status }) {
  const colors = {
    healthy: 'text-green-500',
    ok: 'text-green-500',
    degraded: 'text-yellow-500',
    partial: 'text-yellow-500',
    unhealthy: 'text-red-500',
    error: 'text-red-500',
    loading: 'text-gray-500',
  }

  const icons = {
    healthy: '🟢',
    ok: '🟢',
    degraded: '🟡',
    partial: '🟡',
    unhealthy: '🔴',
    error: '🔴',
    loading: '⚪',
  }

  return (
    <span className={`text-lg ${colors[status] || colors.loading}`}>
      {icons[status] || icons.loading}
    </span>
  )
}

// Metric Card Component
function MetricCard({ title, value, status = 'healthy', icon }) {
  const statusColors = {
    healthy: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-xl font-bold ${statusColors[status]}`}>{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  )
}

// Service Card Component
function ServiceCard({ name, service }) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    configured: 'bg-blue-100 text-blue-800',
    not_configured: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
  }

  const statusIcons = {
    healthy: '✅',
    configured: '🔧',
    not_configured: '⚪',
    error: '❌',
  }

  const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{displayName}</h4>
        <span className="text-lg">{statusIcons[service.status] || '❓'}</span>
      </div>
      
      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[service.status] || statusColors.error}`}>
        {service.status?.replace(/_/g, ' ') || 'Unknown'}
      </div>
      
      {service.message && (
        <p className="text-sm text-gray-600 mt-2">{service.message}</p>
      )}
      
      {service.test_mode && (
        <p className="text-xs text-blue-600 mt-1">Test Mode</p>
      )}
    </div>
  )
}

// Resource Card Component
function ResourceCard({ title, used, total, unit, threshold, value }) {
  if (value) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    )
  }

  const percentage = total > 0 ? (used / total) * 100 : 0
  const isHigh = percentage > (threshold || 80)

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-sm text-gray-500">{used}/{total} {unit}</p>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${isHigh ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      
      <p className={`text-xs mt-1 ${isHigh ? 'text-red-600' : 'text-gray-500'}`}>
        {percentage.toFixed(1)}% used
      </p>
    </div>
  )
}

// Alert Card Component
function AlertCard({ alert, onDismiss }) {
  const alertColors = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    performance: 'bg-orange-50 border-orange-200 text-orange-800',
  }

  const alertIcons = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
    performance: '⚡',
  }

  return (
    <div className={`border rounded-lg p-4 ${alertColors[alert.type] || alertColors.info}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-lg">{alertIcons[alert.type] || 'ℹ️'}</span>
          <div>
            <h4 className="font-medium">{alert.title}</h4>
            <p className="text-sm">{alert.message}</p>
            <p className="text-xs opacity-75 mt-1">
              {alert.timestamp.toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// Performance Charts Component (simplified)
function PerformanceCharts({ metrics }) {
  // This would integrate with a charting library like Chart.js or Recharts
  // For now, showing placeholder
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Performance charts will be displayed here</p>
        <p className="text-sm text-gray-400 ml-2">(Chart.js integration pending)</p>
      </div>
    </div>
  )
}

// Recent Activity Component
function RecentActivity() {
  const [activities] = useState([
    { time: '2 mins ago', event: 'User signup', details: 'New user registered' },
    { time: '5 mins ago', event: 'Payment processed', details: '$99 subscription payment' },
    { time: '12 mins ago', event: 'AI insight generated', details: 'Peak hours analysis completed' },
    { time: '18 mins ago', event: 'Notification sent', details: 'Booking reminder to 5 users' },
  ])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div>
              <p className="font-medium">{activity.event}</p>
              <p className="text-sm text-gray-600">{activity.details}</p>
            </div>
            <p className="text-sm text-gray-500">{activity.time}</p>
          </div>
        ))}
      </div>
    </div>
  )
}