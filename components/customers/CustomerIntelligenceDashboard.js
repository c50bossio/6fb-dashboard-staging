'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  BoltIcon,
  HeartIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui'
import { useAuth } from '../SupabaseAuthProvider'

// Gauge Chart Component for Health Scores
const HealthScoreGauge = ({ score, label, size = 'md' }) => {
  const radius = size === 'lg' ? 60 : 40
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const getColor = (score) => {
    if (score >= 80) return '#10B981' // green
    if (score >= 60) return '#F59E0B' // yellow
    if (score >= 40) return '#F97316' // orange
    return '#EF4444' // red
  }

  return (
    <div className="relative flex items-center justify-center">
      <svg 
        width={radius * 2.5} 
        height={radius * 2.5} 
        className="transform -rotate-90"
      >
        <circle
          cx={radius * 1.25}
          cy={radius * 1.25}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx={radius * 1.25}
          cy={radius * 1.25}
          r={radius}
          stroke={getColor(score)}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-sm text-gray-600 text-center leading-tight">{label}</span>
      </div>
    </div>
  )
}

// Risk Level Badge Component
const RiskBadge = ({ risk, className = "" }) => {
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'critical':
      case 'high':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Badge className={`${getRiskColor(risk)} ${className} flex items-center gap-1`}>
      {getRiskIcon(risk)}
      {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
    </Badge>
  )
}

// CLV Trend Component
const CLVTrend = ({ current, predicted, trend }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Current CLV</span>
        <span className="text-lg font-bold text-gray-900">${current?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Predicted CLV</span>
        <div className="flex items-center space-x-1">
          <span className="text-lg font-bold text-gray-900">${predicted?.toFixed(2) || '0.00'}</span>
          {trend && (
            <div className="flex items-center">
              {trend > 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CustomerIntelligenceDashboard() {
  const { user, profile } = useAuth()
  const [healthScores, setHealthScores] = useState([])
  const [clvData, setClvData] = useState([])
  const [churnRisks, setChurnRisks] = useState([])
  const [segments, setSegments] = useState([])
  const [journeyStages, setJourneyStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('month')

  // Fetch customer analytics data
  useEffect(() => {
    if (!user || !profile?.barbershop_id) return

    const fetchAnalyticsData = async () => {
      try {
        setLoading(true)
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://your-api-domain.com'
          : 'http://localhost:8001'

        const token = await user.getIdToken()

        // Fetch all analytics data in parallel
        const [healthResponse, clvResponse, churnResponse, segmentsResponse, insightsResponse] = await Promise.all([
          fetch(`${baseUrl}/customer-health-scores?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/customer-clv?limit=50&sort_by=total_clv&sort_desc=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/customer-churn-risk?limit=20&min_probability=0.3`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/customer-segments`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/customer-analytics/insights?insight_type=summary&time_period=${selectedTimeframe}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ])

        if (!healthResponse.ok || !clvResponse.ok || !churnResponse.ok || !segmentsResponse.ok) {
          throw new Error('Failed to fetch analytics data')
        }

        const [healthData, clvData, churnData, segmentsData, insightsData] = await Promise.all([
          healthResponse.json(),
          clvResponse.json(),
          churnResponse.json(),
          segmentsResponse.json(),
          insightsResponse.json()
        ])

        setHealthScores(healthData)
        setClvData(clvData)
        setChurnRisks(churnData)
        setSegments(segmentsData)
        setJourneyStages(insightsData?.journey_stages || [])

      } catch (err) {
        setError(err.message)
        console.error('Error fetching analytics data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [user, profile?.barbershop_id, selectedTimeframe])

  // Calculate summary metrics
  const summaryMetrics = {
    averageHealthScore: healthScores.length > 0 
      ? Math.round(healthScores.reduce((sum, h) => sum + h.overall_score, 0) / healthScores.length)
      : 0,
    totalCLV: clvData.reduce((sum, c) => sum + c.total_clv, 0),
    highRiskCustomers: churnRisks.filter(c => ['high', 'critical'].includes(c.churn_risk_level)).length,
    totalCustomers: healthScores.length
  }

  // Journey stage distribution
  const stageDistribution = journeyStages.reduce((acc, stage) => {
    acc[stage.stage] = (acc[stage.stage] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Intelligence Dashboard</h2>
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Health Score</p>
                <p className="text-3xl font-bold text-gray-900">{summaryMetrics.averageHealthScore}</p>
              </div>
              <HeartIcon className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total CLV</p>
                <p className="text-3xl font-bold text-gray-900">${summaryMetrics.totalCLV.toFixed(0)}</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk Customers</p>
                <p className="text-3xl font-bold text-red-600">{summaryMetrics.highRiskCustomers}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">{summaryMetrics.totalCustomers}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Health Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {healthScores.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {healthScores.slice(0, 4).map((customer, index) => (
                  <div key={customer.customer_id} className="text-center">
                    <HealthScoreGauge 
                      score={customer.overall_score} 
                      label={`Customer ${index + 1}`}
                    />
                    <div className="mt-2">
                      <RiskBadge risk={customer.churn_risk} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No health score data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* CLV Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Lifetime Value</CardTitle>
          </CardHeader>
          <CardContent>
            {clvData.length > 0 ? (
              <div className="space-y-4">
                {clvData.slice(0, 5).map((customer, index) => (
                  <div key={customer.customer_id} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Customer {index + 1}</span>
                      <span className="text-lg font-bold text-gray-900">${customer.total_clv.toFixed(2)}</span>
                    </div>
                    <CLVTrend 
                      current={customer.historical_clv}
                      predicted={customer.predicted_clv}
                      trend={customer.churn_probability > 50 ? -5 : 12}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No CLV data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Churn Risk Monitor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Churn Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {churnRisks.length > 0 ? (
              <div className="space-y-3">
                {churnRisks.slice(0, 5).map((customer) => (
                  <div key={customer.customer_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Customer {customer.customer_id}</span>
                        <RiskBadge risk={customer.churn_risk_level} className="text-xs" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {customer.churn_probability.toFixed(1)}% probability
                      </p>
                    </div>
                    <button className="px-3 py-1 bg-olive-600 text-white text-sm rounded-md hover:bg-olive-700">
                      Take Action
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No high-risk customers identified
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            {segments.length > 0 ? (
              <div className="space-y-3">
                {segments.map((segment) => (
                  <div key={segment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{segment.segment_name}</h4>
                      <p className="text-sm text-gray-600">{segment.customer_count} customers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {segment.percentage_of_customer_base.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        ${segment.average_clv.toFixed(0)} avg CLV
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No segments defined
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-olive-500 hover:bg-olive-50 transition-colors">
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">Create Segment</span>
            </button>
            <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-olive-500 hover:bg-olive-50 transition-colors">
              <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">Launch Campaign</span>
            </button>
            <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-olive-500 hover:bg-olive-50 transition-colors">
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">Analyze Trends</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}