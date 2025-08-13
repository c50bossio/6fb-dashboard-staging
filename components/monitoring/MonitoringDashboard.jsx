'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState({
    system: {
      uptime: 0,
      cpu: 0,
      memory: 0,
      disk: 0
    },
    performance: {
      responseTime: [],
      throughput: [],
      errorRate: []
    },
    errors: {
      total: 0,
      critical: 0,
      warnings: 0,
      recent: []
    },
    services: []
  })

  const [timeRange, setTimeRange] = useState('1h')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState('overview')

  useEffect(() => {
    fetchMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [timeRange, autoRefresh])

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/monitoring/metrics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  // Chart configurations
  const responseTimeChart = {
    labels: metrics.performance.responseTime.map((_, i) => `${i * 5}m`),
    datasets: [{
      label: 'Response Time (ms)',
      data: metrics.performance.responseTime,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }

  const throughputChart = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Requests',
      data: metrics.performance.throughput,
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1
    }]
  }

  const errorDistribution = {
    labels: ['Success', 'Warnings', 'Errors', 'Critical'],
    datasets: [{
      data: [85, 8, 5, 2],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(127, 29, 29, 0.8)'
      ],
      borderWidth: 0
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'degraded': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="h-5 w-5" />
      case 'degraded': return <ExclamationTriangleIcon className="h-5 w-5" />
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5" />
      default: return <ClockIcon className="h-5 w-5" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time system metrics and health status</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <ServerIcon className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold">{metrics.system.uptime}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-700">Uptime</h3>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <CpuChipIcon className="h-8 w-8 text-purple-500" />
            <span className="text-2xl font-bold">{metrics.system.cpu}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-700">CPU Usage</h3>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${metrics.system.cpu}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <span className="text-2xl font-bold">{metrics.system.memory}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-700">Memory Usage</h3>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${metrics.system.memory}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            <span className="text-2xl font-bold">{metrics.errors.total}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-700">Total Errors</h3>
          <p className="text-xs text-red-500 mt-1">
            {metrics.errors.critical} critical
          </p>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time</h3>
          <div className="h-48">
            <Line data={responseTimeChart} options={chartOptions} />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Avg: 145ms</span>
            <span className="flex items-center text-green-500">
              <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              -12%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Throughput</h3>
          <div className="h-48">
            <Bar data={throughputChart} options={chartOptions} />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Total: 45.2k</span>
            <span className="flex items-center text-green-500">
              <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              +18%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Distribution</h3>
          <div className="h-48">
            <Doughnut data={errorDistribution} options={{ ...chartOptions, maintainAspectRatio: true }} />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Error Rate: 2.3%</span>
            <span className="text-green-500">Healthy</span>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { name: 'API Server', status: 'healthy', uptime: '99.99%', responseTime: '45ms' },
              { name: 'Database', status: 'healthy', uptime: '99.95%', responseTime: '12ms' },
              { name: 'Redis Cache', status: 'healthy', uptime: '100%', responseTime: '2ms' },
              { name: 'AI Service', status: 'degraded', uptime: '98.5%', responseTime: '250ms' },
              { name: 'Email Service', status: 'healthy', uptime: '99.9%', responseTime: '120ms' },
              { name: 'Payment Gateway', status: 'healthy', uptime: '100%', responseTime: '180ms' }
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={getStatusColor(service.status)}>
                    {getStatusIcon(service.status)}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                    <p className="text-sm text-gray-500">Response: {service.responseTime}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{service.uptime}</p>
                  <p className={`text-xs ${getStatusColor(service.status)}`}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Errors</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            View All →
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[
              { 
                time: '2 min ago', 
                level: 'error', 
                message: 'Database connection timeout', 
                count: 3 
              },
              { 
                time: '15 min ago', 
                level: 'warning', 
                message: 'High memory usage detected (87%)', 
                count: 1 
              },
              { 
                time: '1 hour ago', 
                level: 'error', 
                message: 'Failed to process payment webhook', 
                count: 1 
              },
              { 
                time: '3 hours ago', 
                level: 'warning', 
                message: 'Slow API response time (>2s)', 
                count: 5 
              }
            ].map((error, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className={`mt-1 ${
                  error.level === 'error' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{error.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {error.time} • Occurred {error.count} time{error.count > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}