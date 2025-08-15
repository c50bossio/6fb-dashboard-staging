'use client'

import { 
  Clock, TrendingUp, DollarSign, AlertTriangle, CheckCircle, XCircle,
  Activity, Zap, Target, Brain, Database, RefreshCw
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MODEL_COLORS = {
  'gpt-5': '#22c55e',
  'gpt-5-mini': '#546355', 
  'gpt-5-nano': '#D4B878',
  'claude-opus-4-1-20250805': '#f59e0b',
  'gemini-2.0-flash-exp': '#ef4444'
}

const ALERT_COLORS = {
  'info': '#546355',
  'warning': '#f59e0b', 
  'error': '#ef4444',
  'critical': '#dc2626'
}

export default function PerformanceDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [modelSnapshots, setModelSnapshots] = useState({})
  const [costAnalysis, setCostAnalysis] = useState(null)
  const [abTests, setAbTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef(null)

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/performance/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchModelSnapshots = async () => {
    try {
      const response = await fetch('/api/performance/snapshots')
      if (!response.ok) throw new Error('Failed to fetch model snapshots')
      const data = await response.json()
      setModelSnapshots(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchCostAnalysis = async () => {
    try {
      const response = await fetch('/api/performance/costs')
      if (!response.ok) throw new Error('Failed to fetch cost analysis')
      const data = await response.json()
      setCostAnalysis(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAbTests = async () => {
    try {
      const response = await fetch('/api/performance/ab-tests')
      if (!response.ok) throw new Error('Failed to fetch A/B tests')
      const data = await response.json()
      setAbTests(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchModelSnapshots(),
        fetchCostAnalysis(),
        fetchAbTests()
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAllData, 30000) // 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh])

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'excellent': { variant: 'default', color: 'bg-green-500', label: 'Excellent' },
      'good': { variant: 'secondary', color: 'bg-olive-500', label: 'Good' },
      'degraded': { variant: 'outline', color: 'bg-yellow-500', label: 'Degraded' },
      'poor': { variant: 'destructive', color: 'bg-orange-500', label: 'Poor' },
      'critical': { variant: 'destructive', color: 'bg-red-500', label: 'Critical' }
    }
    
    const config = statusConfig[status] || statusConfig['good']
    return (
      <Badge variant={config.variant} className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    )
  }

  const formatResponseTime = (seconds) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
    return `${seconds.toFixed(2)}s`
  }

  const formatCost = (cost) => {
    if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`
    return `$${cost.toFixed(3)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-lg">Loading performance data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-red-800">
              Error loading dashboard: {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Performance Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time monitoring and optimization for AI models</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={toggleAutoRefresh}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}</span>
            </Button>
            <Button onClick={fetchAllData} variant="outline">
              Refresh Now
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Health</p>
                    <p className="text-2xl font-bold">
                      {dashboardData.system_health === 'healthy' ? 'Healthy' : 'Degraded'}
                    </p>
                  </div>
                  {dashboardData.system_health === 'healthy' ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                    <p className="text-2xl font-bold">{dashboardData.active_alerts?.length || 0}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-800" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Requests (1h)</p>
                    <p className="text-2xl font-bold">{dashboardData.total_requests_last_hour || 0}</p>
                  </div>
                  <Activity className="w-8 h-8 text-olive-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cost (24h)</p>
                    <p className="text-2xl font-bold">
                      {costAnalysis ? formatCost(costAnalysis.total_cost) : '$0.00'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Alerts */}
        {dashboardData?.active_alerts?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Active Performance Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.active_alerts.map((alert) => (
                  <Alert key={alert.id} className={`border-l-4 border-l-${ALERT_COLORS[alert.severity]}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="font-semibold">{alert.title}</span>
                        </div>
                        <AlertDescription className="mt-1">
                          {alert.description}
                        </AlertDescription>
                        {alert.model && (
                          <p className="text-sm text-gray-500 mt-1">Model: {alert.model}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="models">Model Performance</TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
            <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
            <TabsTrigger value="sla">SLA Tracking</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Real-time Model Stats */}
            {dashboardData?.model_stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Model Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(dashboardData.model_stats).map(([modelKey, stats]) => {
                      const [provider, model] = modelKey.split('_')
                      return (
                        <Card key={modelKey} className="border">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold">{model}</h4>
                                <p className="text-sm text-gray-600">{provider}</p>
                              </div>
                              {getStatusBadge(stats.success_rate > 0.95 ? 'excellent' : 'good')}
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Avg Response:</span>
                                <span className="font-mono">{formatResponseTime(stats.avg_response_time)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Success Rate:</span>
                                <span className="font-mono">{(stats.success_rate * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Requests:</span>
                                <span className="font-mono">{stats.recent_requests}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Model Performance Tab */}
          <TabsContent value="models" className="space-y-6">
            {Object.entries(modelSnapshots).length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(modelSnapshots).map(([modelKey, snapshot]) => (
                  <Card key={modelKey}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{snapshot.model}</span>
                        {getStatusBadge(snapshot.status)}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{snapshot.provider}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold mb-2">Performance</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Avg Response:</span>
                              <span className="font-mono">{formatResponseTime(snapshot.avg_response_time)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>P95 Response:</span>
                              <span className="font-mono">{formatResponseTime(snapshot.p95_response_time)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Success Rate:</span>
                              <span className="font-mono">{(snapshot.success_rate * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-semibold mb-2">Quality & Cost</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Confidence:</span>
                              <span className="font-mono">{(snapshot.avg_confidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tokens/sec:</span>
                              <span className="font-mono">{snapshot.tokens_per_second.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost/Token:</span>
                              <span className="font-mono">{formatCost(snapshot.cost_per_token)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Overall Score:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-olive-500 h-2 rounded-full" 
                                style={{ width: `${snapshot.overall_score}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-sm">{snapshot.overall_score.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Cost Analysis Tab */}
          <TabsContent value="costs" className="space-y-6">
            {costAnalysis && (
              <>
                {/* Cost Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Cost (24h)</p>
                          <p className="text-2xl font-bold">{formatCost(costAnalysis.total_cost)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Avg Cost/Request</p>
                          <p className="text-2xl font-bold">
                            {costAnalysis.provider_breakdown.length > 0 
                              ? formatCost(costAnalysis.total_cost / costAnalysis.provider_breakdown.reduce((sum, p) => sum + p.requests, 0))
                              : '$0.00'
                            }
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-olive-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Potential Savings</p>
                          <p className="text-2xl font-bold">
                            {costAnalysis.optimization_recommendations.length > 0
                              ? formatCost(costAnalysis.optimization_recommendations[0]?.potential_savings || 0)
                              : '$0.00'
                            }
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cost Breakdown Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Provider Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost by Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={costAnalysis.provider_breakdown}
                            dataKey="cost"
                            nameKey="provider"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                          >
                            {costAnalysis.provider_breakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={Object.values(MODEL_COLORS)[index % Object.values(MODEL_COLORS).length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCost(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Hourly Cost Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Hourly Cost Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={costAnalysis.hourly_trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis tickFormatter={formatCost} />
                          <Tooltip formatter={(value) => formatCost(value)} />
                          <Area type="monotone" dataKey="cost" stroke="#546355" fill="#546355" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Optimization Recommendations */}
                {costAnalysis.optimization_recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost Optimization Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {costAnalysis.optimization_recommendations.map((rec, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold">{rec.title}</h4>
                              <Badge variant={rec.risk_level === 'low' ? 'default' : 'secondary'}>
                                {rec.risk_level} risk
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3">{rec.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Potential Savings:</span>
                                <span className="ml-2 font-semibold">{formatCost(rec.potential_savings)} ({rec.savings_percentage.toFixed(1)}%)</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Action Required:</span>
                                <span className="ml-2">{rec.action_required}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* A/B Tests Tab */}
          <TabsContent value="ab-tests" className="space-y-6">
            {abTests.length > 0 ? (
              <div className="space-y-4">
                {abTests.map((test) => (
                  <Card key={test.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{test.name}</CardTitle>
                          <p className="text-gray-600">{test.description}</p>
                        </div>
                        <Badge variant={test.active ? 'default' : 'secondary'}>
                          {test.active ? 'Active' : 'Completed'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-2">Test Configuration</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Model A:</span>
                              <span className="font-mono">{test.model_a}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Model B:</span>
                              <span className="font-mono">{test.model_b}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Traffic Split:</span>
                              <span className="font-mono">{(test.traffic_split * 100).toFixed(0)}% / {((1 - test.traffic_split) * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        {test.results && (
                          <div>
                            <h4 className="font-semibold mb-2">Results</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Winner:</span>
                                <span className="font-semibold">{test.results.overall_winner}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Confidence:</span>
                                <span className="font-mono">{(test.results.confidence_level * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {test.active && (
                        <div className="mt-4 pt-4 border-t">
                          <Button variant="outline" size="sm">
                            View Detailed Results
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No A/B Tests Running</h3>
                  <p className="text-gray-600 mb-4">Start comparing models to optimize performance</p>
                  <Button>Create A/B Test</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SLA Tracking Tab */}
          <TabsContent value="sla" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Level Agreement Tracking</CardTitle>
                <p className="text-gray-600">Monitor compliance with performance SLAs</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">99.2%</div>
                    <div className="text-sm text-gray-600">Uptime SLA</div>
                    <div className="text-xs text-gray-500">Target: 99.0%</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-olive-600">2.3s</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                    <div className="text-xs text-gray-500">Target: &lt; 5.0s</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">98.7%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                    <div className="text-xs text-gray-500">Target: &gt; 95%</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gold-600">$0.045</div>
                    <div className="text-sm text-gray-600">Avg Cost/Request</div>
                    <div className="text-xs text-gray-500">Target: &lt; $0.10</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}