'use client'

import {
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ServerIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'

/**
 * System Health Monitor Component
 * Monitors infrastructure health, performance metrics, and alerts
 */
export default function SystemHealthMonitor({
  className = '',
  refreshInterval = 10000, // 10 seconds
  showCharts = true
}) {
  const [healthData, setHealthData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  const refreshTimer = useRef(null)
  const healthHistory = useRef([])

  useEffect(() => {
    loadHealthData()
    startPeriodicRefresh()
    
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [refreshInterval])

  const loadHealthData = async () => {
    try {
      const healthResponse = await fetch('/api/health')
      const healthData = healthResponse.ok 
        ? await healthResponse.json()
        : getEmptyHealthState()

      const processedData = processHealthData(healthData)
      setHealthData(processedData)
      
      healthHistory.current.push({
        timestamp: Date.now(),
        ...processedData
      })
      
      if (healthHistory.current.length > 100) {
        healthHistory.current.shift()
      }
      
      const newAlerts = generateAlerts(processedData)
      setAlerts(newAlerts)
      
      setLastUpdate(Date.now())
      setIsLoading(false)
      
    } catch (error) {
      console.error('Failed to load health data:', error)
      const errorData = getEmptyHealthState()
      errorData.status = 'error'
      errorData.error = 'Health data unavailable'
      setHealthData(errorData)
      setIsLoading(false)
    }
  }

  const getEmptyHealthState = () => {
    const baseTime = Date.now()
    return {
      status: 'unknown',
      timestamp: baseTime,
      services: {
        frontend: {
          status: 'unknown',
          responseTime: 0,
          uptime: 0,
          lastCheck: baseTime
        },
        backend: {
          status: 'unknown',
          responseTime: 0,
          uptime: 0,
          lastCheck: baseTime
        },
        database: {
          status: 'unknown',
          responseTime: 0,
          uptime: 0,
          lastCheck: baseTime,
          connections: 0,
          poolSize: 0
        },
        cache: {
          status: 'unknown',
          responseTime: 0,
          uptime: 0,
          hitRate: 0,
          memoryUsage: 0
        },
        websocket: {
          status: 'unknown',
          connections: 0,
          messageRate: 0,
          latency: 0
        }
      },
      resources: {
        cpu: {
          usage: 0,
          cores: 0,
          loadAverage: [0, 0, 0]
        },
        memory: {
          usage: 0,
          total: 0,
          free: 0
        },
        disk: {
          usage: 0,
          total: 0,
          free: 0
        },
        network: {
          bytesIn: 0,
          bytesOut: 0,
          connectionsActive: 0
        }
      },
      performance: {
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0
      }
    }
  }

  const processHealthData = (data) => {
    const processed = { ...data }
    
    const services = Object.values(data.services || {})
    const hasUnhealthyServices = services.some(service => service.status !== 'healthy')
    const hasHighResourceUsage = 
      data.resources?.cpu?.usage > 80 ||
      data.resources?.memory?.usage > 85 ||
      data.resources?.disk?.usage > 90
    
    if (hasUnhealthyServices || hasHighResourceUsage) {
      processed.status = 'degraded'
    }
    
    if (healthHistory.current.length > 1) {
      const previous = healthHistory.current[healthHistory.current.length - 1]
      processed.trends = {
        responseTime: data.performance?.averageResponseTime > previous.performance?.averageResponseTime ? 'up' : 'down',
        errorRate: data.performance?.errorRate > previous.performance?.errorRate ? 'up' : 'down',
        cpuUsage: data.resources?.cpu?.usage > previous.resources?.cpu?.usage ? 'up' : 'down'
      }
    }
    
    return processed
  }

  const generateAlerts = (data) => {
    const alerts = []
    
    Object.entries(data.services || {}).forEach(([service, status]) => {
      if (status.status !== 'healthy') {
        alerts.push({
          id: `service-${service}`,
          type: 'error',
          title: `${service} service unhealthy`,
          message: `${service} service is reporting ${status.status} status`,
          timestamp: Date.now(),
          severity: 'high'
        })
      }
      
      if (status.responseTime > 1000) {
        alerts.push({
          id: `latency-${service}`,
          type: 'warning',
          title: `High latency in ${service}`,
          message: `Response time: ${Math.round(status.responseTime)}ms`,
          timestamp: Date.now(),
          severity: 'medium'
        })
      }
    })
    
    if (data.resources?.cpu?.usage > 80) {
      alerts.push({
        id: 'cpu-high',
        type: 'warning',
        title: 'High CPU usage',
        message: `CPU usage is ${Math.round(data.resources.cpu.usage)}%`,
        timestamp: Date.now(),
        severity: 'medium'
      })
    }
    
    if (data.resources?.memory?.usage > 85) {
      alerts.push({
        id: 'memory-high',
        type: 'error',
        title: 'High memory usage',
        message: `Memory usage is ${Math.round(data.resources.memory.usage)}%`,
        timestamp: Date.now(),
        severity: 'high'
      })
    }
    
    if (data.resources?.disk?.usage > 90) {
      alerts.push({
        id: 'disk-high',
        type: 'error',
        title: 'Disk space critical',
        message: `Disk usage is ${Math.round(data.resources.disk.usage)}%`,
        timestamp: Date.now(),
        severity: 'high'
      })
    }
    
    if (data.performance?.errorRate > 5) {
      alerts.push({
        id: 'error-rate-high',
        type: 'error',
        title: 'High error rate',
        message: `Error rate is ${data.performance.errorRate.toFixed(1)}%`,
        timestamp: Date.now(),
        severity: 'high'
      })
    }
    
    return alerts
  }

  const startPeriodicRefresh = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current)
    }
    
    refreshTimer.current = setInterval(loadHealthData, refreshInterval)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'degraded': return 'text-amber-800 bg-yellow-50' 
      case 'unhealthy': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'degraded': return <ExclamationTriangleIcon className="h-5 w-5 text-amber-800" />
      case 'unhealthy': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getTrendIcon = (trend) => {
    return trend === 'up' 
      ? <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />
      : <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <ServerIcon className="h-8 w-8 animate-pulse text-olive-600 mr-3" />
          <span className="text-lg text-gray-600">Loading system health data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-olive-600 rounded-full flex items-center justify-center">
              <ServerIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
              <div className="flex items-center space-x-2">
                {getStatusIcon(healthData?.status)}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(healthData?.status)}`}>
                  {healthData?.status || 'Unknown'}
                </span>
                {lastUpdate && (
                  <span className="text-sm text-gray-500">
                    • Updated {new Date(lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {alerts.length > 0 && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Active Alerts</h3>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'error' 
                      ? 'bg-red-50 border-red-400 text-red-700' 
                      : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm">{alert.message}</p>
                    </div>
                    <span className="text-xs font-medium uppercase">
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Status */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Service Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(healthData?.services || {}).map(([service, status]) => (
              <div key={service} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 capitalize">{service}</h4>
                  {getStatusIcon(status.status)}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span className="font-medium">{Math.round(status.responseTime || 0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="font-medium">{status.uptime}%</span>
                  </div>
                  {status.connections && (
                    <div className="flex justify-between">
                      <span>Connections:</span>
                      <span className="font-medium">{status.connections}</span>
                    </div>
                  )}
                  {status.hitRate && (
                    <div className="flex justify-between">
                      <span>Hit Rate:</span>
                      <span className="font-medium">{Math.round(status.hitRate)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Usage */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Resource Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CpuChipIcon className="h-5 w-5 text-olive-600" />
                  <span className="font-medium text-gray-900">CPU</span>
                </div>
                {healthData?.trends?.cpuUsage && getTrendIcon(healthData.trends.cpuUsage)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage:</span>
                  <span className="font-medium">{Math.round(healthData?.resources?.cpu?.usage || 0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (healthData?.resources?.cpu?.usage || 0) > 80 ? 'bg-red-500' : 
                      (healthData?.resources?.cpu?.usage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${healthData?.resources?.cpu?.usage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CircleStackIcon className="h-5 w-5 text-gold-600" />
                  <span className="font-medium text-gray-900">Memory</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage:</span>
                  <span className="font-medium">{Math.round(healthData?.resources?.memory?.usage || 0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (healthData?.resources?.memory?.usage || 0) > 85 ? 'bg-red-500' : 
                      (healthData?.resources?.memory?.usage || 0) > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${healthData?.resources?.memory?.usage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Disk */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ServerIcon className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">Disk</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usage:</span>
                  <span className="font-medium">{Math.round(healthData?.resources?.disk?.usage || 0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (healthData?.resources?.disk?.usage || 0) > 90 ? 'bg-red-500' : 
                      (healthData?.resources?.disk?.usage || 0) > 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${healthData?.resources?.disk?.usage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Network */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <WifiIcon className="h-5 w-5 text-olive-600" />
                  <span className="font-medium text-gray-900">Network</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>In:</span>
                  <span className="font-medium">{formatBytes(healthData?.resources?.network?.bytesIn || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Out:</span>
                  <span className="font-medium">{formatBytes(healthData?.resources?.network?.bytesOut || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-olive-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-olive-900">Requests/sec</span>
                {healthData?.trends?.responseTime && getTrendIcon(healthData.trends.responseTime)}
              </div>
              <p className="text-2xl font-bold text-olive-700">
                {Math.round(healthData?.performance?.requestsPerSecond || 0)}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-green-900">Avg Response</span>
              <p className="text-2xl font-bold text-green-700">
                {Math.round(healthData?.performance?.averageResponseTime || 0)}ms
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-900">Error Rate</span>
                {healthData?.trends?.errorRate && getTrendIcon(healthData.trends.errorRate)}
              </div>
              <p className="text-2xl font-bold text-red-700">
                {(healthData?.performance?.errorRate || 0).toFixed(1)}%
              </p>
            </div>

            <div className="bg-gold-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-gold-900">Throughput</span>
              <p className="text-2xl font-bold text-gold-700">
                {Math.round(healthData?.performance?.throughput || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}