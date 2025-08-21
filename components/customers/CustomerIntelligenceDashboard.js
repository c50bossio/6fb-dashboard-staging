'use client'

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
import React, { useState, useEffect } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import IntelligenceDashboardEmptyState from './IntelligenceDashboardEmptyState'

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
  const [actualCustomerCount, setActualCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [analyticsError, setAnalyticsError] = useState(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('month')

  // Fetch actual customer count from the working customer API
  useEffect(() => {
    if (!user || !profile?.barbershop_id) return

    const fetchCustomerCount = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/customers?barbershop_id=${profile.barbershop_id}&limit=1`)
        const data = await response.json()
        if (data.success && data.total !== undefined) {
          setActualCustomerCount(data.total)
        }
      } catch (error) {
        console.error('Failed to fetch customer count:', error)
        setError('Failed to load customer data')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerCount()
  }, [user, profile])

  // Fetch customer analytics data (optional - don't block UI if this fails)
  useEffect(() => {
    if (!user || !profile?.barbershop_id) return

    const fetchAnalyticsData = async () => {
      try {
        setAnalyticsLoading(true)
        setAnalyticsError(null)
        
        // Fetch customer analytics data from our Next.js API routes
        const [healthResponse, clvResponse, churnResponse, segmentsResponse, insightsResponse] = await Promise.all([
          fetch(`/api/customers/analytics/health-scores?barbershop_id=${profile.barbershop_id}&limit=50`),
          fetch(`/api/customers/analytics/clv?barbershop_id=${profile.barbershop_id}&limit=50&sort_by=total_clv&sort_desc=true`),
          fetch(`/api/customers/analytics/churn?barbershop_id=${profile.barbershop_id}&limit=20&min_probability=0.3`),
          fetch(`/api/customers/analytics/segments?barbershop_id=${profile.barbershop_id}`),
          fetch(`/api/customers/analytics/insights?barbershop_id=${profile.barbershop_id}&insight_type=summary&time_period=${selectedTimeframe}`)
        ])

        if (!healthResponse.ok || !clvResponse.ok || !churnResponse.ok || !segmentsResponse.ok) {
          throw new Error('Analytics services temporarily unavailable')
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
        setAnalyticsError(err.message)
        console.log('Analytics temporarily unavailable:', err.message)
        // Don't set main error - this is expected when FastAPI isn't running
      } finally {
        setAnalyticsLoading(false)
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
    totalCustomers: actualCustomerCount
  }

  // Determine empty state type based on data availability
  const getEmptyStateType = () => {
    console.log('🎯 Intelligence Dashboard Debug:', {
      totalCustomers: summaryMetrics.totalCustomers,
      loading,
      analyticsLoading,
      error,
      analyticsError
    })
    
    if (summaryMetrics.totalCustomers === 0) return 'no-customers'
    if (summaryMetrics.totalCustomers < 5) return 'insufficient-data'
    if (summaryMetrics.totalCustomers < 10) return 'new-barbershop'
    return null
  }

  const emptyStateType = getEmptyStateType()
  const hasInsufficientData = emptyStateType !== null
  
  console.log('🔧 Intelligence Dashboard State:', {
    emptyStateType,
    hasInsufficientData,
    willShowEmptyState: hasInsufficientData
  })

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

  if (error && actualCustomerCount === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customer Data</h3>
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

  // Helper functions for empty state actions
  const handleAddCustomer = () => {
    // Navigate to customer management tab
    const url = new URL(window.location)
    url.searchParams.set('tab', 'customers')
    window.history.pushState({}, '', url)
    
    // Trigger add customer modal if available
    const addButton = document.querySelector('[data-testid="add-customer-btn"]')
    if (addButton) {
      addButton.click()
    } else {
      // Fallback: scroll to customer section
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleViewCustomers = () => {
    const url = new URL(window.location)
    url.searchParams.set('tab', 'customers')
    window.history.pushState({}, '', url)
    window.location.reload()
  }

  // Show enhanced empty state if insufficient data
  if (hasInsufficientData) {
    return (
      <div className="space-y-6">
        {/* Header with Timeframe Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Customer Intelligence Dashboard</h2>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white opacity-50 cursor-not-allowed"
            disabled
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        <IntelligenceDashboardEmptyState
          type={emptyStateType}
          totalCustomers={summaryMetrics.totalCustomers}
          hasRecentActivity={healthScores.length > 0}
          onAddCustomer={handleAddCustomer}
          onViewCustomers={handleViewCustomers}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Intelligence Dashboard</h2>
          {analyticsError && (
            <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Advanced analytics temporarily unavailable - showing basic insights
            </p>
          )}
        </div>
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
              <div className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <HeartIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Health Scores Coming Soon</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Customer health scores will appear here once you have appointment history and interactions.
                  </p>
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-md p-2">
                    💡 Tip: Add past appointments to see immediate results
                  </div>
                </div>
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
              <div className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                    <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">CLV Tracking Ready</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Customer lifetime value calculations will show here as customers make appointments and purchases.
                  </p>
                  <div className="text-xs text-gray-400 bg-blue-50 rounded-md p-2">
                    💰 Revenue tracking starts with your first paid appointment
                  </div>
                </div>
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
              <div className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
                    <HeartIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">All Customers Healthy!</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    No high-risk customers detected. Churn predictions will appear here as data patterns emerge.
                  </p>
                  <div className="text-xs text-gray-400 bg-green-50 rounded-md p-2">
                    ✨ Great customer retention so far!
                  </div>
                </div>
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
              <div className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-50 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-8 w-8 text-purple-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Segments Building</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Customer segments will automatically form as you collect more customer behavior data.
                  </p>
                  <div className="text-xs text-gray-400 bg-purple-50 rounded-md p-2">
                    🎯 Segments help target marketing campaigns effectively
                  </div>
                </div>
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