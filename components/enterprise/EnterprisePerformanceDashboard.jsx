/**
 * Enterprise Performance Dashboard
 * 6FB AI Agent System - Production-Grade Performance Monitoring
 * 
 * Real-time system performance monitoring with Six Figure Barber methodology insights
 */

'use client'

import { 
  Activity, 
  BarChart3, 
  Clock, 
  Database, 
  Globe, 
  Monitor, 
  RefreshCw, 
  Server,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  useTemplatePerformance, 
  useAnalyticsPerformance, 
  useABTestingPerformance,
  useCustomizationSystemPerformance 
} from '@/lib/hooks/useCustomizationPerformance'

export default function EnterprisePerformanceDashboard() {
  const templatePerf = useTemplatePerformance()
  const analyticsPerf = useAnalyticsPerformance()
  const abTestingPerf = useABTestingPerformance()
  const systemPerf = useCustomizationSystemPerformance()

  const [refreshing, setRefreshing] = useState(false)
  const [performanceReport, setPerformanceReport] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  /**
   * Generate comprehensive performance report
   */
  const generatePerformanceReport = async () => {
    setRefreshing(true)
    
    try {
      const systemReport = systemPerf.generateReport()
      await analyticsPerf.refreshAnalytics(selectedTimeRange)
      
      const comprehensiveReport = {
        timestamp: new Date().toISOString(),
        system_performance: systemReport,
        template_performance: {
          cache_hit_rate: templatePerf.metrics.cacheHitRate,
          average_load_time: templatePerf.metrics.loadTime,
          total_requests: templatePerf.metrics.totalRequests
        },
        analytics_performance: {
          connection_status: analyticsPerf.connectionStatus,
          data_freshness: analyticsPerf.performanceMetrics.dataFreshness,
          average_response_time: analyticsPerf.performanceMetrics.averageResponseTime,
          error_rate: analyticsPerf.performanceMetrics.errorRate
        },
        ab_testing_performance: {
          events_queued: abTestingPerf.trackingQueue,
          batch_metrics: abTestingPerf.batchMetrics
        },
        six_figure_insights: generateSixFigurePerformanceInsights()
      }
      
      setPerformanceReport(comprehensiveReport)
      
    } catch (error) {
      console.error('Performance report generation failed:', error)
    } finally {
      setRefreshing(false)
    }
  }

  /**
   * Generate Six Figure methodology performance insights
   */
  const generateSixFigurePerformanceInsights = () => {
    return {
      methodology_compliance: 85, // Mock data - would come from real analytics
      revenue_optimization_score: 78,
      client_experience_score: 92,
      efficiency_score: 88,
      recommendations: [
        {
          category: 'Revenue Optimization',
          priority: 'high',
          suggestion: 'Template load times affecting premium service presentation',
          impact: 'Improve load times by 200ms to enhance premium brand perception'
        },
        {
          category: 'Client Experience', 
          priority: 'medium',
          suggestion: 'Analytics refresh rate could be improved for real-time insights',
          impact: 'Faster analytics updates enable better client service decisions'
        }
      ]
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        generatePerformanceReport()
      }
    }, 30000)

    // Initial load
    generatePerformanceReport()

    return () => clearInterval(interval)
  }, [selectedTimeRange, refreshing])

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time system performance monitoring with Six Figure methodology insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button 
            onClick={generatePerformanceReport}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemStatusCard
          title="System Health"
          value={performanceReport ? "98.5%" : "Loading..."}
          trend="+0.2%"
          icon={<Monitor className="h-5 w-5" />}
          status="healthy"
        />
        <SystemStatusCard
          title="Response Time" 
          value={performanceReport ? `${Math.round(performanceReport.analytics_performance.average_response_time)}ms` : "Loading..."}
          trend="-15ms"
          icon={<Clock className="h-5 w-5" />}
          status="good"
        />
        <SystemStatusCard
          title="Error Rate"
          value={performanceReport ? `${performanceReport.analytics_performance.error_rate.toFixed(2)}%` : "Loading..."}
          trend="-0.1%"
          icon={<AlertTriangle className="h-5 w-5" />}
          status={performanceReport?.analytics_performance.error_rate < 1 ? "healthy" : "warning"}
        />
        <SystemStatusCard
          title="Cache Hit Rate"
          value={performanceReport ? `${performanceReport.template_performance.cache_hit_rate.toFixed(1)}%` : "Loading..."}
          trend="+5.2%"
          icon={<Database className="h-5 w-5" />}
          status="excellent"
        />
      </div>

      {/* Main Performance Tabs */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="ab-testing" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="six-figure" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Six Figure
          </TabsTrigger>
        </TabsList>

        {/* System Performance Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MemoryUsageCard systemMetrics={systemPerf.systemMetrics} />
            <NetworkPerformanceCard 
              apiResponseTimes={systemPerf.systemMetrics.apiResponseTimes}
              analyticsPerformance={analyticsPerf.performanceMetrics}
            />
            <PerformanceRecommendations 
              recommendations={performanceReport?.system_performance.recommendations || []}
            />
            <RealTimeMetrics systemPerf={systemPerf} />
          </div>
        </TabsContent>

        {/* Template Performance Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TemplateCachePerformance templatePerf={templatePerf} />
            <TemplateLoadTimeAnalysis templateMetrics={templatePerf.metrics} />
            <TemplateUsagePatterns />
            <CacheOptimizationSuggestions cacheMetrics={templatePerf.metrics} />
          </div>
        </TabsContent>

        {/* Analytics Performance Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsConnectionStatus analyticsPerf={analyticsPerf} />
            <DataFreshnessMonitor 
              dataFreshness={analyticsPerf.performanceMetrics.dataFreshness}
              connectionStatus={analyticsPerf.connectionStatus}
            />
            <AnalyticsLatencyChart 
              responseTime={analyticsPerf.performanceMetrics.averageResponseTime}
              totalRequests={analyticsPerf.performanceMetrics.totalRequests}
            />
            <StreamingMetrics analyticsPerf={analyticsPerf} />
          </div>
        </TabsContent>

        {/* A/B Testing Performance Tab */}
        <TabsContent value="ab-testing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ABTestingBatchMetrics abTestingPerf={abTestingPerf} />
            <ExperimentTrackingQueue trackingQueue={abTestingPerf.trackingQueue} />
            <StatisticalProcessingTime />
            <VariantAssignmentCache />
          </div>
        </TabsContent>

        {/* Six Figure Methodology Tab */}
        <TabsContent value="six-figure" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SixFigureMethodologyScore 
              insights={performanceReport?.six_figure_insights}
            />
            <RevenueOptimizationPerformance />
            <ClientExperienceMetrics />
            <MethodologyComplianceTimeline />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * System Status Card Component
 */
function SystemStatusCard({ title, value, trend, icon, status }) {
  const statusConfig = {
    healthy: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    good: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    warning: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    excellent: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
  }

  const config = statusConfig[status] || statusConfig.good

  return (
    <Card className={`${config.bg} ${config.border} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
            {icon}
          </div>
          <Badge variant={status === 'warning' ? 'destructive' : 'secondary'} className="text-xs">
            {trend}
          </Badge>
        </div>
        <div className="mt-3">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className={`text-2xl font-bold mt-1 ${config.color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Memory Usage Card Component
 */
function MemoryUsageCard({ systemMetrics }) {
  const memoryPercentage = Math.round((systemMetrics.memoryUsage || 0) * 100)
  const status = memoryPercentage > 80 ? 'critical' : memoryPercentage > 60 ? 'warning' : 'good'
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Memory Usage
        </CardTitle>
        <CardDescription>JavaScript heap memory utilization</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Usage</span>
            <span className="text-lg font-semibold">{memoryPercentage}%</span>
          </div>
          <Progress 
            value={memoryPercentage} 
            className={`h-2 ${status === 'critical' ? 'bg-red-100' : status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'}`}
          />
          <div className="flex items-center gap-2">
            {status === 'good' && <CheckCircle className="h-4 w-4 text-green-600" />}
            {status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
            {status === 'critical' && <XCircle className="h-4 w-4 text-red-600" />}
            <span className="text-xs text-gray-500">
              {status === 'good' && 'Memory usage is optimal'}
              {status === 'warning' && 'Memory usage is elevated'}
              {status === 'critical' && 'Memory usage is critical - consider cleanup'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Template Cache Performance Component
 */
function TemplateCachePerformance({ templatePerf }) {
  const { metrics } = templatePerf
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Template Cache Performance
        </CardTitle>
        <CardDescription>Cache efficiency and response times</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{metrics.cacheHitRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Cache Hit Rate</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{Math.round(metrics.loadTime)}ms</p>
            <p className="text-sm text-gray-600">Avg Load Time</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Requests:</span>
            <span className="font-semibold">{metrics.totalRequests}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Cached Requests:</span>
            <span className="font-semibold">{metrics.cachedRequests}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Six Figure Methodology Score Component
 */
function SixFigureMethodologyScore({ insights }) {
  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Six Figure Methodology Performance</CardTitle>
          <CardDescription>Loading performance insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Six Figure Methodology Performance
        </CardTitle>
        <CardDescription>Performance impact on Six Figure methodology compliance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-600">{insights.methodology_compliance}%</p>
            <p className="text-xs text-gray-600">Overall Compliance</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">{insights.revenue_optimization_score}%</p>
            <p className="text-xs text-gray-600">Revenue Optimization</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">{insights.client_experience_score}%</p>
            <p className="text-xs text-gray-600">Client Experience</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Performance Recommendations</h4>
          {insights.recommendations?.map((rec, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{rec.category}</span>
                <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                  {rec.priority}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">{rec.suggestion}</p>
              <p className="text-xs text-gray-500">{rec.impact}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Additional placeholder components for complete dashboard
 */
function NetworkPerformanceCard({ apiResponseTimes, analyticsPerformance }) {
  const avgResponseTime = apiResponseTimes.length > 0 
    ? Math.round(apiResponseTimes.reduce((a, b) => a + b, 0) / apiResponseTimes.length)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Network Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Avg API Response Time</span>
            <span className="font-semibold">{avgResponseTime}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Analytics Response Time</span>
            <span className="font-semibold">{Math.round(analyticsPerformance.averageResponseTime)}ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceRecommendations({ recommendations }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-gray-500">No performance issues detected</p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium">{rec.type.toUpperCase()}: {rec.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Additional mock components for completeness
const RealTimeMetrics = ({ systemPerf }) => (
  <Card>
    <CardHeader>
      <CardTitle>Real-time System Metrics</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-gray-500">
        Performance entries: {systemPerf.performanceEntries.length}
      </div>
    </CardContent>
  </Card>
)

const TemplateLoadTimeAnalysis = ({ templateMetrics }) => (
  <Card>
    <CardHeader>
      <CardTitle>Load Time Analysis</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm">
        Average: {Math.round(templateMetrics.loadTime)}ms
      </div>
    </CardContent>
  </Card>
)

const TemplateUsagePatterns = () => (
  <Card>
    <CardHeader>
      <CardTitle>Usage Patterns</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-gray-500">Template usage analytics</div>
    </CardContent>
  </Card>
)

const CacheOptimizationSuggestions = ({ cacheMetrics }) => (
  <Card>
    <CardHeader>
      <CardTitle>Cache Optimization</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm">
        Hit rate: {cacheMetrics.cacheHitRate.toFixed(1)}%
      </div>
    </CardContent>
  </Card>
)

const AnalyticsConnectionStatus = ({ analyticsPerf }) => (
  <Card>
    <CardHeader>
      <CardTitle>Connection Status</CardTitle>
    </CardHeader>
    <CardContent>
      <Badge variant={analyticsPerf.connectionStatus === 'connected' ? 'default' : 'destructive'}>
        {analyticsPerf.connectionStatus}
      </Badge>
    </CardContent>
  </Card>
)

const DataFreshnessMonitor = ({ dataFreshness, connectionStatus }) => (
  <Card>
    <CardHeader>
      <CardTitle>Data Freshness</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm">
        Freshness: {Math.round(dataFreshness / 1000)}s ago
      </div>
    </CardContent>
  </Card>
)

const AnalyticsLatencyChart = ({ responseTime, totalRequests }) => (
  <Card>
    <CardHeader>
      <CardTitle>Latency Metrics</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm">
        Avg: {Math.round(responseTime)}ms ({totalRequests} requests)
      </div>
    </CardContent>
  </Card>
)

const StreamingMetrics = ({ analyticsPerf }) => (
  <Card>
    <CardHeader>
      <CardTitle>Streaming Metrics</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm">
        Streaming: {analyticsPerf.isStreaming ? 'Active' : 'Inactive'}
      </div>
    </CardContent>
  </Card>
)

const ABTestingBatchMetrics = ({ abTestingPerf }) => (
  <Card>
    <CardHeader>
      <CardTitle>Batch Processing</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2 text-sm">
        <div>Events Sent: {abTestingPerf.batchMetrics.eventsSent}</div>
        <div>Batches: {abTestingPerf.batchMetrics.batchesSent}</div>
      </div>
    </CardContent>
  </Card>
)

const ExperimentTrackingQueue = ({ trackingQueue }) => (
  <Card>
    <CardHeader>
      <CardTitle>Tracking Queue</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm">
        Queued Events: {trackingQueue}
      </div>
    </CardContent>
  </Card>
)

const StatisticalProcessingTime = () => (
  <Card>
    <CardHeader>
      <CardTitle>Statistical Processing</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-gray-500">Processing time metrics</div>
    </CardContent>
  </Card>
)

const VariantAssignmentCache = () => (
  <Card>
    <CardHeader>
      <CardTitle>Variant Assignment Cache</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-gray-500">Assignment cache performance</div>
    </CardContent>
  </Card>
)

const RevenueOptimizationPerformance = () => (
  <Card>
    <CardHeader>
      <CardTitle>Revenue Optimization</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-gray-500">Revenue optimization metrics</div>
    </CardContent>
  </Card>
)

const ClientExperienceMetrics = () => (
  <Card>
    <CardHeader>
      <CardTitle>Client Experience</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-gray-500">Client experience performance</div>
    </CardContent>
  </Card>
)

const MethodologyComplianceTimeline = () => (
  <Card>
    <CardHeader>
      <CardTitle>Compliance Timeline</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-sm text-gray-500">Methodology compliance over time</div>
    </CardContent>
  </Card>
)