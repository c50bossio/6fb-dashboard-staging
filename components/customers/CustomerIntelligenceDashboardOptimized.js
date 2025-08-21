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
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import IntelligenceDashboardEmptyState from './IntelligenceDashboardEmptyState'

// Performance optimized gauge component with memo
const HealthScoreGauge = React.memo(({ score, label, size = 'md' }) => {
  const radius = size === 'lg' ? 60 : 40
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const getColor = (score) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    if (score >= 40) return '#F97316'
    return '#EF4444'
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
})

// Memoized Risk Badge Component
const RiskBadge = React.memo(({ risk, className = "" }) => {
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
})

// Skeleton loader component for progressive loading
const SkeletonLoader = ({ type = 'card' }) => {
  if (type === 'metric') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="animate-pulse">
      <div className="h-32 bg-gray-200 rounded-lg"></div>
    </div>
  )
}

// CLV Trend Component with memoization
const CLVTrend = React.memo(({ current, predicted, trend }) => {
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
})

export default function CustomerIntelligenceDashboardOptimized() {
  const { user, profile } = useAuth()
  
  // State management with reduced initial loads
  const [healthScores, setHealthScores] = useState([])
  const [clvData, setClvData] = useState([])
  const [churnRisks, setChurnRisks] = useState([])
  const [segments, setSegments] = useState([])
  const [actualCustomerCount, setActualCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [analyticsState, setAnalyticsState] = useState({
    loading: false,
    error: null,
    hasLoadedOnce: false
  })
  const [selectedTimeframe, setSelectedTimeframe] = useState('month')
  
  // Pagination state for performance
  const [pagination, setPagination] = useState({
    healthScores: { page: 1, limit: 10 },
    clv: { page: 1, limit: 10 },
    churn: { page: 1, limit: 10 }
  })
  
  // Cache control
  const cacheRef = useRef({})
  const abortControllerRef = useRef(null)
  
  // Get barbershop ID (using same pattern as original)
  const getBarbershopId = useCallback(() => {
    return profile?.barbershop_id || profile?.shop_id || profile?.barbershopId
  }, [profile])

  // Fetch customer count with abort control
  useEffect(() => {
    const barbershopId = getBarbershopId()
    
    if (!user || !barbershopId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    
    const fetchCustomerCount = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/customers?barbershop_id=${barbershopId}&limit=1`,
          { signal: controller.signal }
        )
        const data = await response.json()
        
        if (data.success && data.total !== undefined) {
          setActualCustomerCount(data.total)
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch customer count:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerCount()
    
    return () => controller.abort()
  }, [user, getBarbershopId])

  // Lazy load analytics with caching and pagination
  const fetchAnalyticsData = useCallback(async (forceRefresh = false) => {
    const barbershopId = getBarbershopId()
    if (!user || !barbershopId || actualCustomerCount < 5) return
    
    // Check cache first
    const cacheKey = `${barbershopId}-${selectedTimeframe}`
    if (!forceRefresh && cacheRef.current[cacheKey]) {
      const cachedData = cacheRef.current[cacheKey]
      if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minute cache
        setHealthScores(cachedData.healthScores)
        setClvData(cachedData.clvData)
        setChurnRisks(cachedData.churnRisks)
        setSegments(cachedData.segments)
        return
      }
    }
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    try {
      setAnalyticsState(prev => ({ ...prev, loading: true, error: null }))
      
      // Get user session for authorization
      const userResponse = await fetch('/api/auth/user', { signal })
      const userData = await userResponse.json()
      
      if (!userData.authenticated) {
        setAnalyticsState(prev => ({ 
          ...prev, 
          error: 'Authentication required for analytics'
        }))
        return
      }
      
      const authHeaders = {
        'Authorization': `Bearer ${userData.session?.access_token || ''}`,
        'Content-Type': 'application/json'
      }
      
      // Fetch data with pagination limits and authentication
      const endpoints = [
        `/api/customers/analytics/health-scores?barbershop_id=${barbershopId}&limit=${pagination.healthScores.limit}&page=${pagination.healthScores.page}`,
        `/api/customers/analytics/clv?barbershop_id=${barbershopId}&limit=${pagination.clv.limit}&page=${pagination.clv.page}&sort_by=total_clv&sort_desc=true`,
        `/api/customers/analytics/churn?barbershop_id=${barbershopId}&limit=${pagination.churn.limit}&page=${pagination.churn.page}&min_probability=0.3`,
        `/api/customers/analytics/segments?barbershop_id=${barbershopId}`
      ]
      
      // Fetch in parallel with proper error handling and authentication
      const responses = await Promise.allSettled(
        endpoints.map(url => fetch(url, { 
          signal, 
          headers: authHeaders 
        }))
      )
      
      const successfulResponses = responses
        .filter(r => r.status === 'fulfilled' && r.value.ok)
        .map(r => r.value)
      
      if (successfulResponses.length === 0) {
        throw new Error('Analytics services temporarily unavailable')
      }
      
      // Parse successful responses
      const data = await Promise.all(
        successfulResponses.map(r => r.json())
      )
      
      // Update state with available data
      if (data[0]) setHealthScores(data[0])
      if (data[1]) setClvData(data[1])
      if (data[2]) setChurnRisks(data[2])
      if (data[3]) setSegments(data[3])
      
      // Cache the results
      cacheRef.current[cacheKey] = {
        timestamp: Date.now(),
        healthScores: data[0] || [],
        clvData: data[1] || [],
        churnRisks: data[2] || [],
        segments: data[3] || []
      }
      
      setAnalyticsState(prev => ({ ...prev, hasLoadedOnce: true }))
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        setAnalyticsState(prev => ({ 
          ...prev, 
          error: 'Analytics temporarily unavailable'
        }))
      }
    } finally {
      setAnalyticsState(prev => ({ ...prev, loading: false }))
    }
  }, [user, getBarbershopId, actualCustomerCount, selectedTimeframe, pagination])

  // Lazy load analytics only when needed
  useEffect(() => {
    if (actualCustomerCount >= 5 && !analyticsState.hasLoadedOnce) {
      fetchAnalyticsData()
    }
  }, [actualCustomerCount, fetchAnalyticsData, analyticsState.hasLoadedOnce])

  // Handle timeframe change with debouncing
  useEffect(() => {
    if (analyticsState.hasLoadedOnce) {
      const timer = setTimeout(() => {
        fetchAnalyticsData()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedTimeframe, fetchAnalyticsData, analyticsState.hasLoadedOnce])

  // Memoized summary metrics
  const summaryMetrics = useMemo(() => ({
    averageHealthScore: healthScores.length > 0 
      ? Math.round(healthScores.reduce((sum, h) => sum + h.overall_score, 0) / healthScores.length)
      : 0,
    totalCLV: clvData.reduce((sum, c) => sum + c.total_clv, 0),
    highRiskCustomers: churnRisks.filter(c => ['high', 'critical'].includes(c.churn_risk_level)).length,
    totalCustomers: actualCustomerCount
  }), [healthScores, clvData, churnRisks, actualCustomerCount])

  // Determine empty state type
  const emptyStateType = useMemo(() => {
    if (summaryMetrics.totalCustomers === 0) return 'no-customers'
    if (summaryMetrics.totalCustomers < 5) return 'insufficient-data'
    if (summaryMetrics.totalCustomers < 10) return 'new-barbershop'
    return null
  }, [summaryMetrics.totalCustomers])

  const hasInsufficientData = emptyStateType !== null

  // Load more function for pagination
  const loadMore = useCallback((dataType) => {
    setPagination(prev => ({
      ...prev,
      [dataType]: {
        ...prev[dataType],
        page: prev[dataType].page + 1
      }
    }))
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  // Initial loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={i} type="metric" />
          ))}
        </div>
      </div>
    )
  }

  // Show empty state if insufficient data
  if (hasInsufficientData) {
    return (
      <div className="space-y-6">
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
          onAddCustomer={() => {
            const url = new URL(window.location)
            url.searchParams.set('tab', 'customers')
            window.history.pushState({}, '', url)
            window.location.reload()
          }}
          onViewCustomers={() => {
            const url = new URL(window.location)
            url.searchParams.set('tab', 'customers')
            window.history.pushState({}, '', url)
            window.location.reload()
          }}
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
          {analyticsState.error && (
            <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {analyticsState.error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
          {analyticsState.hasLoadedOnce && (
            <button
              onClick={() => fetchAnalyticsData(true)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={analyticsState.loading}
            >
              {analyticsState.loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics - Always show with customer count */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Health Score</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analyticsState.loading && !analyticsState.hasLoadedOnce ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    summaryMetrics.averageHealthScore
                  )}
                </p>
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
                <p className="text-3xl font-bold text-gray-900">
                  {analyticsState.loading && !analyticsState.hasLoadedOnce ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `$${summaryMetrics.totalCLV.toFixed(0)}`
                  )}
                </p>
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
                <p className="text-3xl font-bold text-red-600">
                  {analyticsState.loading && !analyticsState.hasLoadedOnce ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    summaryMetrics.highRiskCustomers
                  )}
                </p>
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

      {/* Analytics sections - Load progressively */}
      {!analyticsState.hasLoadedOnce && !analyticsState.loading && (
        <div className="text-center py-8">
          <button
            onClick={() => fetchAnalyticsData()}
            className="px-6 py-3 bg-olive-600 text-white rounded-md hover:bg-olive-700"
          >
            Load Customer Analytics
          </button>
        </div>
      )}

      {analyticsState.hasLoadedOnce && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Health Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {healthScores.length > 0 ? (
                <>
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
                  {healthScores.length > 4 && (
                    <button
                      onClick={() => loadMore('healthScores')}
                      className="mt-4 w-full text-sm text-olive-600 hover:text-olive-700"
                    >
                      Load More
                    </button>
                  )}
                </>
              ) : analyticsState.loading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <SkeletonLoader key={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="max-w-sm mx-auto">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <HeartIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Health Scores Coming Soon</h4>
                    <p className="text-sm text-gray-500">
                      Customer health scores will appear here once you have appointment history.
                    </p>
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
                <>
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
                  {clvData.length > 5 && (
                    <button
                      onClick={() => loadMore('clv')}
                      className="mt-4 w-full text-sm text-olive-600 hover:text-olive-700"
                    >
                      Load More
                    </button>
                  )}
                </>
              ) : analyticsState.loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <SkeletonLoader key={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="max-w-sm mx-auto">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <CurrencyDollarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">CLV Analysis Coming Soon</h4>
                    <p className="text-sm text-gray-500">
                      Customer lifetime value predictions will appear here as you build transaction history.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}