/**
 * Live Dashboard Component
 * Real-time business metrics and analytics display
 */

import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  Clock
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useDashboardMetrics, useEnhancedWebSocket } from '@/hooks/useEnhancedWebSocket'

const MetricCard = ({ title, value, change, icon: Icon, trend = 'neutral', isLive = false, lastUpdate }) => {
  const trendColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  }

  const trendBgColors = {
    positive: 'bg-green-50',
    negative: 'bg-red-50',
    neutral: 'bg-gray-50'
  }

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return ''
    const now = new Date()
    const updateTime = new Date(timestamp)
    const diffMs = now - updateTime
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    return updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`p-6 rounded-lg border transition-all duration-200 ${trendBgColors[trend]} hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${trend === 'positive' ? 'bg-green-100' : trend === 'negative' ? 'bg-red-100' : 'bg-gray-100'}`}>
            <Icon size={20} className={trendColors[trend]} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        </div>

        <div className="text-right">
          {isLive && (
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">LIVE</span>
            </div>
          )}
          
          {change && (
            <div className={`text-sm font-medium ${trendColors[trend]}`}>
              {change}
            </div>
          )}
          
          {lastUpdate && (
            <div className="text-xs text-gray-500 mt-1">
              {formatLastUpdate(lastUpdate)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ConnectionStatus = ({ isConnected, connectionError, onRetry }) => {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
      isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
      <span>
        {isConnected ? 'Live Updates Active' : connectionError || 'Connection Lost'}
      </span>
      
      {!isConnected && (
        <button
          onClick={onRetry}
          className="ml-2 p-1 hover:bg-red-200 rounded transition-colors"
          title="Retry connection"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  )
}

export function LiveDashboard({ className = '', refreshInterval = 10000 }) {
  const [metricsType, setMetricsType] = useState('overview')
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'compact'
  
  const { isConnected, connectionError, reconnect } = useEnhancedWebSocket()
  const {
    metrics,
    isLoading,
    error,
    lastUpdate,
    refresh
  } = useDashboardMetrics(metricsType, { refreshInterval })

  const handleRetryConnection = async () => {
    try {
      await reconnect()
    } catch (error) {
      console.error('Failed to reconnect:', error)
    }
  }

  const handleRefresh = () => {
    refresh()
  }

  // Mock data structure - replace with actual metrics structure
  const mockMetrics = {
    overview: {
      totalBookings: { value: '247', change: '+12%', trend: 'positive' },
      revenue: { value: '$12,450', change: '+8%', trend: 'positive' },
      activeUsers: { value: '89', change: '+5%', trend: 'positive' },
      avgSessionTime: { value: '24m', change: '-2%', trend: 'negative' }
    },
    bookings: {
      todayBookings: { value: '23', change: '+3', trend: 'positive' },
      weekBookings: { value: '156', change: '+12%', trend: 'positive' },
      cancellationRate: { value: '8%', change: '-1%', trend: 'positive' },
      noShowRate: { value: '5%', change: '+0.5%', trend: 'negative' }
    },
    revenue: {
      todayRevenue: { value: '$1,450', change: '+5%', trend: 'positive' },
      weekRevenue: { value: '$9,820', change: '+15%', trend: 'positive' },
      avgBookingValue: { value: '$65', change: '+2%', trend: 'positive' },
      tips: { value: '$890', change: '+8%', trend: 'positive' }
    },
    staff: {
      activeStaff: { value: '12', change: '0', trend: 'neutral' },
      avgUtilization: { value: '78%', change: '+3%', trend: 'positive' },
      customerSatisfaction: { value: '4.8', change: '+0.1', trend: 'positive' },
      responseTime: { value: '2.3m', change: '-15s', trend: 'positive' }
    }
  }

  // Use mock data if metrics is empty (for demonstration)
  const displayMetrics = Object.keys(metrics).length > 0 ? metrics : mockMetrics[metricsType] || {}

  const metricsTabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'bookings', name: 'Bookings', icon: Calendar },
    { id: 'revenue', name: 'Revenue', icon: DollarSign },
    { id: 'staff', name: 'Staff', icon: Users }
  ]

  const getMetricIcon = (key) => {
    const iconMap = {
      totalBookings: Calendar,
      revenue: DollarSign,
      activeUsers: Users,
      avgSessionTime: Clock,
      todayBookings: Calendar,
      weekBookings: Calendar,
      cancellationRate: TrendingUp,
      noShowRate: TrendingUp,
      todayRevenue: DollarSign,
      weekRevenue: DollarSign,
      avgBookingValue: DollarSign,
      tips: DollarSign,
      activeStaff: Users,
      avgUtilization: TrendingUp,
      customerSatisfaction: TrendingUp,
      responseTime: Clock
    }
    return iconMap[key] || Activity
  }

  if (error && !displayMetrics) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-500 mb-4">
          <Activity size={48} className="mx-auto mb-2 opacity-50" />
          <p>Failed to load dashboard metrics</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Dashboard</h2>
          <p className="text-gray-600">Real-time business metrics and analytics</p>
        </div>

        <div className="flex items-center space-x-4">
          <ConnectionStatus 
            isConnected={isConnected}
            connectionError={connectionError}
            onRetry={handleRetryConnection}
          />
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'compact' : 'cards')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title={viewMode === 'cards' ? 'Switch to compact view' : 'Switch to card view'}
            >
              <Eye size={16} />
            </button>
            
            <button
              onClick={handleRefresh}
              className={`p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ${
                isLoading ? 'animate-spin' : ''
              }`}
              title="Refresh metrics"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {metricsTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMetricsType(tab.id)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${metricsType === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon size={16} />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Metrics Display */}
      {isLoading && Object.keys(displayMetrics).length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-6 bg-gray-100 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className={
          viewMode === 'cards' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            : "space-y-2"
        }>
          {Object.entries(displayMetrics).map(([key, data]) => {
            const IconComponent = getMetricIcon(key)
            const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
            
            if (viewMode === 'compact') {
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <IconComponent size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">{title}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-gray-900">{data.value}</span>
                    {data.change && (
                      <span className={`text-sm font-medium ${
                        data.trend === 'positive' ? 'text-green-600' :
                        data.trend === 'negative' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {data.change}
                      </span>
                    )}
                    {isConnected && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              )
            }
            
            return (
              <MetricCard
                key={key}
                title={title}
                value={data.value}
                change={data.change}
                icon={IconComponent}
                trend={data.trend}
                isLive={isConnected}
                lastUpdate={lastUpdate}
              />
            )
          })}
        </div>
      )}

      {/* Status Footer */}
      <div className="text-center text-sm text-gray-500">
        {lastUpdate && (
          <p>
            Last updated: {new Date(lastUpdate).toLocaleString()}
            {isConnected && <span className="text-green-600 ml-2">• Live updates enabled</span>}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Compact metrics widget for sidebars
 */
export function LiveMetricsWidget({ metricsType = 'overview', className = '' }) {
  const { metrics, isLoading, lastUpdate } = useDashboardMetrics(metricsType)
  const { isConnected } = useEnhancedWebSocket()

  if (isLoading) {
    return (
      <div className={`p-4 bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const mockData = { value: '247', change: '+12%', trend: 'positive' }
  const displayData = Object.keys(metrics).length > 0 ? Object.values(metrics)[0] : mockData

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-700 capitalize">
            {metricsType} Metrics
          </h4>
          <p className="text-xl font-bold text-gray-900">{displayData.value}</p>
        </div>
        
        <div className="text-right">
          {isConnected && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mb-1" />
          )}
          <span className={`text-sm font-medium ${
            displayData.trend === 'positive' ? 'text-green-600' :
            displayData.trend === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {displayData.change}
          </span>
        </div>
      </div>
    </div>
  )
}

export default LiveDashboard