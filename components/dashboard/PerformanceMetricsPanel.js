'use client'

import { useState, useEffect } from 'react'
import { 
  BoltIcon, 
  ClockIcon, 
  ServerIcon, 
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

function MetricItem({ icon: Icon, label, value, unit, status, trend }) {
  const statusColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  }

  const TrendIcon = trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
  const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400'

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
          <Icon className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <div className="flex items-center space-x-2">
            <p className={`text-xl font-bold ${statusColors[status]}`}>
              {value}
              <span className="text-sm ml-1">{unit}</span>
            </p>
            {trend && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PerformanceMetricsPanel() {
  const [metrics, setMetrics] = useState({
    responseTime: { value: 245, unit: 'ms', status: 'excellent', trend: 'down' },
    uptime: { value: 99.98, unit: '%', status: 'excellent', trend: 'up' },
    errorRate: { value: 0.12, unit: '%', status: 'good', trend: 'down' },
    throughput: { value: 1250, unit: 'req/s', status: 'good', trend: 'up' }
  })

  const [liveUpdates, setLiveUpdates] = useState(true)

  useEffect(() => {
    if (!liveUpdates) return

    // Simulate real-time metric updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        responseTime: {
          ...prev.responseTime,
          value: Math.max(100, Math.min(500, prev.responseTime.value + (Math.random() - 0.5) * 50)),
          status: prev.responseTime.value < 300 ? 'excellent' : prev.responseTime.value < 500 ? 'good' : 'warning'
        },
        uptime: {
          ...prev.uptime,
          value: Math.min(100, prev.uptime.value + (Math.random() - 0.2) * 0.01),
          status: prev.uptime.value > 99.9 ? 'excellent' : prev.uptime.value > 99 ? 'good' : 'warning'
        },
        errorRate: {
          ...prev.errorRate,
          value: Math.max(0, Math.min(5, prev.errorRate.value + (Math.random() - 0.5) * 0.1)),
          status: prev.errorRate.value < 0.5 ? 'excellent' : prev.errorRate.value < 1 ? 'good' : 'warning'
        },
        throughput: {
          ...prev.throughput,
          value: Math.max(500, Math.min(2000, prev.throughput.value + (Math.random() - 0.5) * 100)),
          status: prev.throughput.value > 1000 ? 'excellent' : prev.throughput.value > 500 ? 'good' : 'warning'
        }
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [liveUpdates])

  const getOverallHealth = () => {
    const statuses = Object.values(metrics).map(m => m.status)
    if (statuses.every(s => s === 'excellent')) return { status: 'Excellent', color: 'text-green-500' }
    if (statuses.some(s => s === 'critical')) return { status: 'Critical', color: 'text-red-500' }
    if (statuses.some(s => s === 'warning')) return { status: 'Warning', color: 'text-yellow-500' }
    return { status: 'Good', color: 'text-blue-500' }
  }

  const health = getOverallHealth()

  return (
    <div className="bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-200/10 dark:border-gray-700/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BoltIcon className="h-6 w-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">System Health:</span>
            <span className={`text-sm font-medium ${health.color}`}>{health.status}</span>
          </div>
          <button
            onClick={() => setLiveUpdates(!liveUpdates)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              liveUpdates 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {liveUpdates ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricItem
          icon={ClockIcon}
          label="Response Time"
          value={metrics.responseTime.value.toFixed(0)}
          unit={metrics.responseTime.unit}
          status={metrics.responseTime.status}
          trend={metrics.responseTime.trend}
        />
        <MetricItem
          icon={ServerIcon}
          label="Uptime"
          value={metrics.uptime.value.toFixed(2)}
          unit={metrics.uptime.unit}
          status={metrics.uptime.status}
          trend={metrics.uptime.trend}
        />
        <MetricItem
          icon={ShieldCheckIcon}
          label="Error Rate"
          value={metrics.errorRate.value.toFixed(2)}
          unit={metrics.errorRate.unit}
          status={metrics.errorRate.status}
          trend={metrics.errorRate.trend}
        />
        <MetricItem
          icon={BoltIcon}
          label="Throughput"
          value={metrics.throughput.value.toFixed(0)}
          unit={metrics.throughput.unit}
          status={metrics.throughput.status}
          trend={metrics.throughput.trend}
        />
      </div>

      {/* Status Bar */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Overall Performance Score</span>
          <span className="text-sm font-medium text-white">92/100</span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: '92%' }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          All systems operational. Performance is within expected parameters.
        </p>
      </div>
    </div>
  )
}