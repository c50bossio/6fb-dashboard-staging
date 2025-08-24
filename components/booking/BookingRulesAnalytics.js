'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar,
  Activity,
  Download,
  RefreshCw,
  Info,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useBookingRules } from '@/hooks/useBookingRules'
import CustomerBehaviorScoring from './CustomerBehaviorScoring'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function BookingRulesAnalytics({ barbershopId }) {
  const { 
    rules, 
    loading, 
    error, 
    getAnalytics, 
    syncStatus, 
    connectedUsers,
    isConnected 
  } = useBookingRules(barbershopId)
  
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState('summary')
  const [dateRange, setDateRange] = useState(30) // days
  const [refreshInterval, setRefreshInterval] = useState(null)

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (!barbershopId) return
    
    setLoadingAnalytics(true)
    try {
      const endDate = new Date()
      const startDate = subDays(endDate, dateRange)
      
      const data = await getAnalytics(
        selectedMetric, 
        startDate.toISOString(), 
        endDate.toISOString()
      )
      
      setAnalyticsData(data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }, [barbershopId, dateRange, selectedMetric, getAnalytics])

  // Initial load and refresh
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(loadAnalytics, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, loadAnalytics])

  // Export analytics data
  const exportAnalytics = async (format = 'json') => {
    try {
      const response = await fetch('/api/booking-rules/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbershop_id: barbershopId, format })
      })
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `booking-analytics-${format === 'csv' ? 'csv' : 'json'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export analytics:', err)
    }
  }

  if (loading || loadingAnalytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Booking Rules Analytics</h2>
          <p className="text-muted-foreground">
            Monitor rule effectiveness and booking patterns
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Realtime Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected() ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500">Live</span>
                {connectedUsers.length > 1 && (
                  <Badge variant="secondary">{connectedUsers.length} users</Badge>
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Offline</span>
              </>
            )}
          </div>
          
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <div className="flex gap-2">
            <Button onClick={() => exportAnalytics('json')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button onClick={() => exportAnalytics('csv')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map(days => (
          <Button
            key={days}
            variant={dateRange === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(days)}
          >
            {days} days
          </Button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      {analyticsData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Evaluations"
            value={analyticsData.summary.total_evaluations}
            icon={<Activity className="h-4 w-4" />}
            trend={analyticsData.summary.evaluation_trend}
          />
          
          <MetricCard
            title="Allowed Bookings"
            value={analyticsData.summary.allowed_bookings}
            icon={<CheckCircle className="h-4 w-4" />}
            trend={analyticsData.summary.allowed_trend}
            format="percentage"
            percentage={
              analyticsData.summary.total_evaluations > 0
                ? (analyticsData.summary.allowed_bookings / analyticsData.summary.total_evaluations) * 100
                : 0
            }
          />
          
          <MetricCard
            title="Violations"
            value={analyticsData.summary.total_violations}
            icon={<AlertTriangle className="h-4 w-4" />}
            trend={analyticsData.summary.violation_trend}
            inverse
          />
          
          <MetricCard
            title="Avg Evaluation Time"
            value={analyticsData.summary.avg_evaluation_time}
            icon={<Clock className="h-4 w-4" />}
            format="time"
            suffix="ms"
          />
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="customer-intelligence">Customer AI</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          {analyticsData?.hourly_distribution && (
            <Card>
              <CardHeader>
                <CardTitle>Booking Attempts by Hour</CardTitle>
                <CardDescription>
                  Distribution of booking evaluation requests throughout the day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatHourlyData(analyticsData.hourly_distribution)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="attempts" fill="#8884d8" />
                    <Bar dataKey="allowed" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {analyticsData?.rule_trigger_frequency && (
            <Card>
              <CardHeader>
                <CardTitle>Most Triggered Rules</CardTitle>
                <CardDescription>
                  Which booking rules are being evaluated most frequently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatRuleTriggers(analyticsData.rule_trigger_frequency)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formatRuleTriggers(analyticsData.rule_trigger_frequency).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-4">
          {analyticsData?.by_type && (
            <Card>
              <CardHeader>
                <CardTitle>Violation Breakdown</CardTitle>
                <CardDescription>
                  Types and frequency of booking rule violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analyticsData.by_type).map(([code, data]) => (
                    <ViolationItem key={code} code={code} data={data} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analyticsData?.by_hour && (
            <Card>
              <CardHeader>
                <CardTitle>Violations by Time of Day</CardTitle>
                <CardDescription>
                  When violations occur most frequently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={formatHourlyViolations(analyticsData.by_hour)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="violations" 
                      stroke="#ff8042" 
                      fill="#ff8042" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {analyticsData?.daily_trend && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Booking Trends</CardTitle>
                <CardDescription>
                  Booking attempts and success rate over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.daily_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="total" 
                      stroke="#8884d8" 
                      name="Total Attempts"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="allowed" 
                      stroke="#82ca9d" 
                      name="Allowed"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="success_rate" 
                      stroke="#ffc658" 
                      name="Success Rate %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Effectiveness Tab */}
        <TabsContent value="effectiveness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rule Effectiveness Score</CardTitle>
              <CardDescription>
                How well your booking rules are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EffectivenessScore data={analyticsData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                Suggestions to improve your booking rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Recommendations data={analyticsData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Intelligence Tab */}
        <TabsContent value="customer-intelligence" className="space-y-4">
          <CustomerBehaviorScoring barbershopId={barbershopId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Metric Card Component
function MetricCard({ title, value, icon, trend, format = 'number', percentage, suffix = '', inverse = false }) {
  const isPositive = inverse ? trend < 0 : trend > 0
  
  const formatValue = () => {
    if (format === 'percentage' && percentage !== undefined) {
      return `${percentage.toFixed(1)}%`
    }
    if (format === 'time') {
      return `${value}${suffix}`
    }
    return value.toLocaleString()
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue()}</div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Violation Item Component
function ViolationItem({ code, data }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="font-medium">{code}</span>
        </div>
        <Badge variant="secondary">{data.count} occurrences</Badge>
      </div>
      
      <div className="space-y-2">
        {data.messages.slice(0, 2).map((message, idx) => (
          <p key={idx} className="text-sm text-muted-foreground">
            • {message}
          </p>
        ))}
      </div>
      
      {data.examples.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Last occurrence: {format(new Date(data.examples[0].timestamp), 'PPp')}
        </div>
      )}
    </div>
  )
}

// Effectiveness Score Component
function EffectivenessScore({ data }) {
  if (!data?.summary) return null
  
  const score = calculateEffectivenessScore(data.summary)
  const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red'
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-lg font-medium">Overall Score</span>
        <span className={`text-3xl font-bold text-${color}-500`}>{score}%</span>
      </div>
      
      <Progress value={score} className="h-3" />
      
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {((data.summary.allowed_bookings / data.summary.total_evaluations) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Success Rate</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">
            {data.summary.avg_evaluation_time}ms
          </div>
          <div className="text-sm text-muted-foreground">Avg Response Time</div>
        </div>
      </div>
    </div>
  )
}

// Recommendations Component
function Recommendations({ data }) {
  const recommendations = generateRecommendations(data)
  
  return (
    <div className="space-y-3">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{rec.title}</p>
            <p className="text-sm text-muted-foreground">{rec.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Helper Functions
function formatHourlyData(hourlyData) {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    attempts: hourlyData?.attempts?.[i] || 0,
    allowed: hourlyData?.allowed?.[i] || 0
  }))
}

function formatHourlyViolations(hourlyData) {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    violations: hourlyData?.[i] || 0
  }))
}

function formatRuleTriggers(triggers) {
  if (!triggers) return []
  return Object.entries(triggers)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

function renderCustomizedLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function calculateEffectivenessScore(summary) {
  if (!summary) return 0
  
  const successRate = (summary.allowed_bookings / summary.total_evaluations) * 100
  const responseTimeScore = Math.max(0, 100 - (summary.avg_evaluation_time / 10))
  const violationScore = Math.max(0, 100 - (summary.total_violations / summary.total_evaluations) * 100)
  
  return Math.round((successRate * 0.5 + responseTimeScore * 0.3 + violationScore * 0.2))
}

function generateRecommendations(data) {
  const recommendations = []
  
  if (!data?.summary) return recommendations
  
  const violationRate = (data.summary.total_violations / data.summary.total_evaluations) * 100
  
  if (violationRate > 30) {
    recommendations.push({
      title: 'High Violation Rate',
      description: 'Consider reviewing your booking rules. Many attempts are being blocked.'
    })
  }
  
  if (data.summary.avg_evaluation_time > 100) {
    recommendations.push({
      title: 'Slow Evaluation Time',
      description: 'Rule evaluation is taking longer than optimal. Consider simplifying complex rules.'
    })
  }
  
  if (data.by_hour) {
    const peakHour = data.by_hour.indexOf(Math.max(...data.by_hour))
    recommendations.push({
      title: 'Peak Violation Hour',
      description: `Most violations occur at ${peakHour}:00. Consider adjusting availability or staffing.`
    })
  }
  
  return recommendations
}