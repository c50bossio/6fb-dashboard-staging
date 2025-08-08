'use client'

import { 
  ChartBarIcon,
  ArrowPathIcon,
  ClockIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  LightBulbIcon,
  Cog6ToothIcon,
  SignalIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'

import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { Card } from '../../components/ui'

function MetricCard({ title, value, unit, status, trend, icon: Icon, description }) {
  const statusColors = {
    excellent: 'border-green-500 bg-green-50',
    good: 'border-blue-500 bg-blue-50',
    degraded: 'border-yellow-500 bg-yellow-50',
    poor: 'border-red-500 bg-red-50'
  }

  const statusIcons = {
    excellent: CheckCircleIcon,
    good: CheckCircleIcon,
    degraded: ExclamationTriangleIcon,
    poor: XCircleIcon
  }

  const StatusIcon = statusIcons[status] || CheckCircleIcon

  return (
    <Card className={`border-l-4 ${statusColors[status] || 'border-gray-500 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Icon className="h-5 w-5 mr-2 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        <StatusIcon className={`h-4 w-4 ${
          status === 'excellent' || status === 'good' ? 'text-green-600' :
          status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
        }`} />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toFixed(2) : value}
            {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
          </div>
          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center">
            {trend > 0 ? (
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-xs ml-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

function ComponentHealthCard({ component, health }) {
  const statusColors = {
    excellent: 'border-green-500 bg-green-50',
    good: 'border-blue-500 bg-blue-50', 
    degraded: 'border-yellow-500 bg-yellow-50',
    poor: 'border-red-500 bg-red-50'
  }

  const getComponentIcon = (componentName) => {
    if (componentName.includes('orchestrator')) return CpuChipIcon
    if (componentName.includes('agent')) return SparklesIcon
    if (componentName.includes('recommendation')) return LightBulbIcon
    if (componentName.includes('predictive')) return ChartBarIcon
    if (componentName.includes('vector')) return ShieldCheckIcon
    return Cog6ToothIcon
  }

  const Icon = getComponentIcon(component)

  return (
    <Card className={`border-l-4 ${statusColors[health.status] || 'border-gray-500 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className="h-6 w-6 mr-3 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {component.replace('_', ' ')}
            </h3>
            <div className="flex items-center mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                health.status === 'excellent' ? 'bg-green-100 text-green-800' :
                health.status === 'good' ? 'bg-blue-100 text-blue-800' :
                health.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {health.status.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600 ml-2">
                Score: {Math.round((health.overall_score || 0) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {health.metrics && Object.keys(health.metrics).length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">📊 Current Metrics</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(health.metrics).map(([metric, value]) => (
              <div key={metric} className="flex justify-between">
                <span className="text-gray-600 capitalize">{metric.replace('_', ' ')}:</span>
                <span className="font-medium">
                  {typeof value === 'number' ? 
                    (metric.includes('time') ? `${value.toFixed(2)}s` :
                     metric.includes('rate') || metric.includes('score') ? `${(value * 100).toFixed(0)}%` :
                     value.toFixed(2)) 
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {health.issues && health.issues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">⚠️ Issues</h4>
          <ul className="space-y-1">
            {health.issues.slice(0, 3).map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-red-600">•</span>
                <span className="text-gray-700">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {health.recommendations && health.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">💡 Recommendations</h4>
          <ul className="space-y-1">
            {health.recommendations.slice(0, 2).map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-blue-600">•</span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
        Last updated: {new Date(health.last_updated).toLocaleString()}
      </div>
    </Card>
  )
}

function OptimizationOpportunityCard({ opportunity }) {
  const impactColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  }

  const effortColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    low: 'bg-green-100 text-green-800'
  }

  return (
    <Card className="border-l-4 border-indigo-500">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{opportunity.opportunity}</h3>
          <p className="text-sm text-gray-600 capitalize">Component: {opportunity.component.replace('_', ' ')}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">{opportunity.priority_score}</div>
          <div className="text-xs text-gray-500">Priority Score</div>
        </div>
      </div>

      <p className="text-gray-700 mb-4">{opportunity.description}</p>

      <div className="flex items-center gap-4 mb-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${impactColors[opportunity.impact]}`}>
          {opportunity.impact.toUpperCase()} IMPACT
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${effortColors[opportunity.effort]}`}>
          {opportunity.effort.toUpperCase()} EFFORT
        </span>
      </div>

      {opportunity.estimated_improvement && (
        <div className="bg-indigo-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-indigo-900 mb-1">Expected Improvement</h4>
          <p className="text-sm text-indigo-800">{opportunity.estimated_improvement}</p>
        </div>
      )}
    </Card>
  )
}

function AIPerformanceContent() {
  const { user } = useAuth()
  const [realtimeMetrics, setRealtimeMetrics] = useState(null)
  const [performanceReport, setPerformanceReport] = useState(null)
  const [monitoringStatus, setMonitoringStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('realtime')

  const fetchRealtimeMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/performance?type=realtime')
      if (response.ok) {
        const data = await response.json()
        setRealtimeMetrics(data)
      }
    } catch (err) {
      console.error('Realtime metrics error:', err)
    }
  }, [])

  const fetchPerformanceReport = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/performance?type=report')
      if (response.ok) {
        const data = await response.json()
        setPerformanceReport(data)
      }
    } catch (err) {
      console.error('Performance report error:', err)
    }
  }, [])

  const fetchMonitoringStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/performance?type=status')
      if (response.ok) {
        const data = await response.json()
        setMonitoringStatus(data)
      }
    } catch (err) {
      console.error('Monitoring status error:', err)
    }
  }, [])

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      await Promise.all([
        fetchRealtimeMetrics(),
        fetchPerformanceReport(),
        fetchMonitoringStatus()
      ])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchRealtimeMetrics, fetchPerformanceReport, fetchMonitoringStatus])

  useEffect(() => {
    fetchAllData()
    
    // Set up periodic refresh for real-time metrics
    const interval = setInterval(fetchRealtimeMetrics, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [fetchAllData, fetchRealtimeMetrics])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 mr-3 text-blue-600" />
              AI Performance Monitoring
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time monitoring and optimization of AI system components
            </p>
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* System Status Bar */}
      {monitoringStatus && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="text-gray-600">Monitoring Status:</span>
                <span className="ml-2 font-medium text-green-600">Active</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Components:</span>
                <span className="ml-2 font-medium">{monitoringStatus.monitoring_status?.components_monitored || 0}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Metrics Collected:</span>
                <span className="ml-2 font-medium">{monitoringStatus.monitoring_status?.total_metrics_collected || 0}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <SignalIcon className="h-4 w-4 text-green-600" />
              <span>Live Monitoring</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'realtime', label: 'Real-time Metrics', icon: SignalIcon },
              { id: 'health', label: 'Component Health', icon: ShieldCheckIcon },
              { id: 'optimization', label: 'Optimization', icon: LightBulbIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'realtime' && realtimeMetrics && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Real-time Performance Metrics</h2>
          
          {realtimeMetrics.realtime_metrics?.metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(realtimeMetrics.realtime_metrics.metrics).map(([component, metrics]) => (
                Object.entries(metrics).map(([metricName, metricData]) => (
                  <MetricCard
                    key={`${component}-${metricName}`}
                    title={`${component.replace('_', ' ')} - ${metricName.replace('_', ' ')}`}
                    value={metricData.value}
                    unit={metricName.includes('time') ? 's' : metricName.includes('rate') || metricName.includes('score') ? '%' : ''}
                    status={metricData.status}
                    icon={metricName.includes('time') ? ClockIcon : 
                          metricName.includes('confidence') ? SparklesIcon :
                          metricName.includes('success') ? CheckCircleIcon : ChartBarIcon}
                    description={`Last updated: ${new Date(metricData.timestamp).toLocaleTimeString()}`}
                  />
                ))
              ))}
            </div>
          ) : realtimeMetrics.fallback_data?.metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(realtimeMetrics.fallback_data.metrics).map(([component, metrics]) => (
                Object.entries(metrics).map(([metricName, metricData]) => (
                  <MetricCard
                    key={`${component}-${metricName}`}
                    title={`${component.replace('_', ' ')} - ${metricName.replace('_', ' ')}`}
                    value={metricData.value}
                    unit={metricName.includes('time') ? 's' : '%'}
                    status={metricData.status}
                    icon={metricName.includes('time') ? ClockIcon : 
                          metricName.includes('confidence') ? SparklesIcon : ChartBarIcon}
                    description="Fallback data - service temporarily unavailable"
                  />
                ))
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No real-time metrics available</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'health' && performanceReport && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Component Health Status</h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-600">Overall Health:</span>
                <span className={`ml-2 font-medium ${
                  performanceReport.performance_report?.overall_health === 'excellent' ? 'text-green-600' :
                  performanceReport.performance_report?.overall_health === 'good' ? 'text-blue-600' :
                  performanceReport.performance_report?.overall_health === 'degraded' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {performanceReport.performance_report?.overall_health?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Score:</span>
                <span className="ml-2 font-medium">
                  {Math.round((performanceReport.performance_report?.overall_score || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {performanceReport.performance_report?.component_health ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(performanceReport.performance_report.component_health).map(([component, health]) => (
                <ComponentHealthCard key={component} component={component} health={health} />
              ))}
            </div>
          ) : performanceReport.fallback_data?.component_health ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(performanceReport.fallback_data.component_health).map(([component, health]) => (
                <ComponentHealthCard key={component} component={component} health={health} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No component health data available</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'optimization' && performanceReport && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Optimization Opportunities</h2>
          
          {performanceReport.performance_report?.optimization_opportunities?.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {performanceReport.performance_report.optimization_opportunities.map((opportunity, idx) => (
                <OptimizationOpportunityCard key={idx} opportunity={opportunity} />
              ))}
            </div>
          ) : performanceReport.fallback_data?.optimization_opportunities?.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {performanceReport.fallback_data.optimization_opportunities.map((opportunity, idx) => (
                <OptimizationOpportunityCard key={idx} opportunity={opportunity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <LightBulbIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No optimization opportunities identified - system is performing well!</p>
            </div>
          )}

          {/* Cost Analysis */}
          {performanceReport.performance_report?.cost_analysis && (
            <Card className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CpuChipIcon className="h-5 w-5 mr-2 text-green-600" />
                Cost Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${performanceReport.performance_report.cost_analysis.total_monthly_cost}
                  </div>
                  <div className="text-sm text-green-700">Monthly Cost</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${performanceReport.performance_report.cost_analysis.cost_per_request}
                  </div>
                  <div className="text-sm text-blue-700">Cost per Request</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((performanceReport.performance_report.cost_analysis.efficiency_score || 0) * 100)}%
                  </div>
                  <div className="text-sm text-purple-700">Efficiency Score</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {error && (
        <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Monitoring Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

export default function AIPerformancePage() {
  return (
    <ProtectedRoute>
      <AIPerformanceContent />
    </ProtectedRoute>
  )
}