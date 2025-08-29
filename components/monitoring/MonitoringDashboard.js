'use client'

import { ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function MonitoringDashboard() {
  const [healthData, setHealthData] = useState(null)
  const [metricsData, setMetricsData] = useState(null)
  const [errorsData, setErrorsData] = useState(null)
  const [aiUsageData, setAIUsageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(null)

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      
      const [healthRes, metricsRes, errorsRes, aiUsageRes] = await Promise.all([
        fetch('/api/monitoring?type=health'),
        fetch('/api/monitoring?type=metrics&hours=24'),
        fetch('/api/monitoring?type=errors&hours=24'),
        fetch('/api/monitoring?type=ai-usage&hours=24')
      ])

      const [health, metrics, errors, aiUsage] = await Promise.all([
        healthRes.json(),
        metricsRes.json(),
        errorsRes.json(),
        aiUsageRes.json()
      ])

      setHealthData(health)
      setMetricsData(metrics)
      setErrorsData(errors)
      setAIUsageData(aiUsage)
      setLastRefresh(new Date())
      
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Set up auto-refresh
  useEffect(() => {
    fetchMonitoringData()
    
    const interval = setInterval(fetchMonitoringData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircleIcon }
      case 'degraded':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: ExclamationTriangleIcon }
      case 'critical':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircleIcon }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: XCircleIcon }
    }
  }

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  const statusDisplay = getStatusDisplay(healthData?.status)
  const StatusIcon = statusDisplay.icon

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
            <p className="text-gray-600 mt-1">Real-time production system health and metrics</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
            </div>
            
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
            
            <button
              onClick={fetchMonitoringData}
              disabled={loading}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* System Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${statusDisplay.bg}`}>
              <StatusIcon className={`h-8 w-8 ${statusDisplay.color}`} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {healthData?.status || 'Unknown'}
              </h2>
              <p className="text-gray-600">
                System Status - {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Response Time"
            value={healthData?.metrics?.response_time_avg || 0}
            unit="ms"
            status={healthData?.metrics?.response_time_avg > 3000 ? 'critical' : 'healthy'}
          />
          
          <MetricCard
            title="Error Rate"
            value={(healthData?.metrics?.error_rate * 100) || 0}
            unit="%"
            status={healthData?.metrics?.error_rate > 0.05 ? 'critical' : 'healthy'}
            decimals={2}
          />
          
          <MetricCard
            title="Active Users"
            value={healthData?.metrics?.active_users || 0}
            unit="users"
            status="healthy"
          />
          
          <MetricCard
            title="AI Cost (24h)"
            value={aiUsageData?.totalCost || 0}
            unit="$"
            status={aiUsageData?.totalCost > 50 ? 'degraded' : 'healthy'}
            decimals={4}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Chart */}
          {metricsData?.hourlyData && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time (24h)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsData.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(time) => new Date(time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  />
                  <YAxis unit="ms" />
                  <Tooltip 
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                    formatter={(value) => [`${value}ms`, 'Response Time']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    stroke="#3C4A3E" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Usage Chart */}
          {aiUsageData?.hourlyUsage && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Usage Cost (24h)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={aiUsageData.hourlyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(time) => new Date(time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  />
                  <YAxis unit="$" />
                  <Tooltip 
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                    formatter={(value) => [`$${value.toFixed(4)}`, 'Cost']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Errors and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Errors */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Errors ({errorsData?.summary?.totalErrors || 0})
            </h3>
            
            <div className="space-y-3">
              {errorsData?.recentErrors?.slice(0, 5).map((error, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{error.message}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      error.level === 'critical' ? 'bg-red-100 text-red-800' :
                      error.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {error.level}
                    </span>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No recent errors</p>
              )}
            </div>
          </div>

          {/* AI Model Usage */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Usage</h3>
            
            <div className="space-y-3">
              {aiUsageData?.modelStats?.map((model, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium text-gray-900">{model.model_name}</p>
                    <p className="text-sm text-gray-600">{model.provider}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${model.total_cost.toFixed(4)}</p>
                    <p className="text-sm text-gray-600">{model.total_requests} requests</p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No AI usage data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ title, value, unit, status, decimals = 0 }) {
  const statusDisplay = {
    healthy: { color: 'text-green-600', bg: 'bg-green-50' },
    degraded: { color: 'text-yellow-600', bg: 'bg-yellow-50' },
    critical: { color: 'text-red-600', bg: 'bg-red-50' }
  }[status] || { color: 'text-gray-600', bg: 'bg-gray-50' }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
      status === 'healthy' ? 'border-green-500' :
      status === 'degraded' ? 'border-yellow-500' :
      'border-red-500'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toFixed(decimals) : value}
            <span className="text-lg font-normal text-gray-600 ml-1">{unit}</span>
          </p>
        </div>
        <div className={`p-2 rounded-full ${statusDisplay.bg}`}>
          <div className={`w-3 h-3 rounded-full ${
            status === 'healthy' ? 'bg-green-500' :
            status === 'degraded' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
        </div>
      </div>
    </div>
  )
}