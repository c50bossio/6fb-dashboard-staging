/**
 * Real-time Performance Dashboard Component
 * Displays subscription metrics, connection status, and optimization insights
 */

import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Timer,
  Users,
  Layers,
  Signal
} from 'lucide-react'
import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtimePerformance, useConnectionStatus, usePerformanceBenchmark } from '@/hooks/useRealtimePerformance'

export function RealtimePerformanceDashboard({ className = '', compact = false }) {
  const { metrics, connectionStatus, insights, isLoading, refetch } = useRealtimePerformance()
  const { isOnline, lastConnected } = useConnectionStatus()
  const { benchmark, resetBaseline } = usePerformanceBenchmark()

  if (isLoading && !metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading performance metrics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const StatusIcon = isOnline ? Wifi : WifiOff
  const statusColor = isOnline ? 'text-green-500' : 'text-red-500'
  const statusBadge = isOnline ? 'success' : 'destructive'

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          <Badge variant={statusBadge} className="text-xs">
            {connectionStatus}
          </Badge>
        </div>
        
        {metrics && (
          <>
            <div className="text-sm text-muted-foreground">
              {metrics.activeConnections} connections
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(metrics.averageLatency)}ms avg
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Connection Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{connectionStatus}</div>
            {lastConnected && (
              <p className="text-xs text-muted-foreground">
                Last connected: {lastConnected.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Connections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeConnections || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.subscriptionsWithCallbacks || 0} subscription groups
            </p>
          </CardContent>
        </Card>

        {/* Average Latency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics?.averageLatency || 0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detailed Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Subscriptions</span>
                <Badge variant="secondary">{metrics?.totalSubscriptions || 0}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Messages Received</span>
                <Badge variant="secondary">{metrics?.messagesReceived || 0}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Reconnect Attempts</span>
                <Badge variant={metrics?.reconnectAttempts > 5 ? 'destructive' : 'secondary'}>
                  {metrics?.reconnectAttempts || 0}
                </Badge>
              </div>
              
              {insights?.connectionEfficiency && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Connection Efficiency</span>
                  <Badge variant={insights.connectionEfficiency >= 2 ? 'success' : 'destructive'}>
                    {insights.connectionEfficiency}x
                  </Badge>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Health Status</span>
                <Badge variant={insights?.isHealthy ? 'success' : 'destructive'}>
                  {insights?.isHealthy ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Healthy
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Needs Attention
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Benchmark */}
        {benchmark && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Performance Benchmark
                </span>
                <button
                  onClick={resetBaseline}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Connection Reduction</span>
                  <Badge variant={benchmark.connectionReduction > 0 ? 'success' : 'secondary'}>
                    {benchmark.connectionReduction > 0 ? '-' : ''}{Math.abs(benchmark.connectionReduction)} 
                    ({benchmark.connectionReductionPercent}%)
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Efficiency Ratio</span>
                  <Badge variant="secondary">
                    {benchmark.efficiencyRatio}:1
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Latency Change</span>
                  <Badge variant={benchmark.latencyImprovement > 0 ? 'success' : 'secondary'}>
                    {benchmark.latencyImprovement > 0 ? '-' : '+'}
                    {Math.abs(Math.round(benchmark.latencyImprovement))}ms
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overall Status</span>
                  <Badge variant={benchmark.isImproved ? 'success' : 'secondary'}>
                    {benchmark.isImproved ? 'Improved' : 'Baseline'}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Monitored for {benchmark.timeElapsed} minutes
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Optimization Recommendations */}
      {insights?.recommendedOptimizations && insights.recommendedOptimizations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Optimization Recommendations</h3>
          <div className="space-y-2">
            {insights.recommendedOptimizations.map((rec, index) => (
              <Alert key={index} variant={rec.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{rec.priority.toUpperCase()}</strong>: {rec.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Active Subscriptions */}
      {metrics?.activeSubscriptionKeys && metrics.activeSubscriptionKeys.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {metrics.activeSubscriptionKeys.map((key, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {key.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
        <span>Real-time monitoring active</span>
        <button
          onClick={refetch}
          className="flex items-center hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </button>
      </div>
    </div>
  )
}

export function RealtimeStatusIndicator({ className = '' }) {
  const { isOnline } = useConnectionStatus()
  
  const StatusIcon = isOnline ? Wifi : WifiOff
  const statusColor = isOnline ? 'text-green-500' : 'text-red-500'
  
  return (
    <div className={`flex items-center ${className}`}>
      <StatusIcon className={`h-4 w-4 ${statusColor} mr-1`} />
      <span className="text-xs text-muted-foreground">
        {isOnline ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}