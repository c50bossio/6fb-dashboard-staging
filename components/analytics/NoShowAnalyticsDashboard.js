'use client'

import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

/**
 * NoShowAnalyticsDashboard - Comprehensive analytics dashboard for no-show tracking
 * Provides deep insights into no-show patterns, policy effectiveness, and revenue impact
 */
export default function NoShowAnalyticsDashboard({
  barbershopId,
  dateRange = { start: subDays(new Date(), 30), end: new Date() },
  onExport,
  className = ''
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeView, setActiveView] = useState('overview')
  const [filters, setFilters] = useState({
    services: [],
    staff: [],
    clientSegments: [],
    timeRange: '30days'
  })
  const [collapsedSections, setCollapsedSections] = useState({})
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadAnalyticsData()
  }, [barbershopId, dateRange.start, dateRange.end, filters])

  useEffect(() => {
    let interval
    if (autoRefresh) {
      interval = setInterval(loadAnalyticsData, 60000) // Refresh every minute
    }
    return () => clearInterval(interval)
  }, [autoRefresh, loadAnalyticsData])

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString()
      })

      // Add filter params if they exist
      if (filters.barber_id) params.append('barber_id', filters.barber_id)

      const response = await fetch(`/api/no-show/analytics?${params}`)
      if (!response.ok) throw new Error('Failed to load analytics data')
      
      const analyticsData = await response.json()
      
      // Transform API response to component's expected structure
      const transformedData = {
        summary: {
          noShowRate: analyticsData.summary?.noShowRate || analyticsData.kpis?.noShowRate || 0,
          previousNoShowRate: analyticsData.summary?.previousNoShowRate || 0,
          lostRevenue: analyticsData.summary?.totalRevenueLost || analyticsData.kpis?.revenueImpact?.lost || 0,
          recoveredRevenue: analyticsData.summary?.totalRevenueRecovered || analyticsData.kpis?.revenueImpact?.recovered || 0,
          feeCollectionRate: analyticsData.policyEffectiveness?.metrics?.feeCollectionRate || analyticsData.kpis?.feeCollection?.collectionRate || 75,
          clientRecoveryRate: analyticsData.policyEffectiveness?.metrics?.clientRecoveryRate || 85,
          repeatOffenderRate: analyticsData.policyEffectiveness?.metrics?.repeatOffenderRate || 15
        },
        trends: {
          daily: Array.isArray(analyticsData.trends?.daily) ? analyticsData.trends.daily : 
                 Array.isArray(analyticsData.trends) ? analyticsData.trends : []
        },
        clientSegmentation: analyticsData.clientSegmentation || (analyticsData.strikeSegments ? [
          { name: 'Low Risk', count: analyticsData.strikeSegments?.['1_strike'] || 0, description: '1 strike' },
          { name: 'Medium Risk', count: analyticsData.strikeSegments?.['2_strikes'] || 0, description: '2 strikes' },
          { name: 'High Risk', count: analyticsData.strikeSegments?.['3_plus_strikes'] || 0, description: '3+ strikes' },
          { name: 'Blocked', count: analyticsData.blockedSummary?.currentlyBlocked || 0, description: 'Currently blocked' }
        ] : []),
        revenueAnalysis: {
          lost: analyticsData.kpis?.revenueImpact?.lost || 0,
          recovered: analyticsData.kpis?.revenueImpact?.recovered || 0,
          net: (analyticsData.kpis?.revenueImpact?.recovered || 0) - (analyticsData.kpis?.revenueImpact?.lost || 0),
          lostAppointments: analyticsData.kpis?.totalNoShows || 0,
          monthlyTrend: Array.isArray(analyticsData.revenueAnalysis?.monthlyTrend) ? 
                        analyticsData.revenueAnalysis.monthlyTrend : []
        },
        serviceAnalysis: Array.isArray(analyticsData.serviceAnalysis) ? analyticsData.serviceAnalysis : [],
        timePatterns: {
          byDayOfWeek: Array.isArray(analyticsData.timePatterns?.byDayOfWeek) ? 
                       analyticsData.timePatterns.byDayOfWeek : [],
          byHour: Array.isArray(analyticsData.timePatterns?.byHour) ? 
                  analyticsData.timePatterns.byHour : [],
          peakTimes: Array.isArray(analyticsData.timePatterns?.peakTimes) ? 
                     analyticsData.timePatterns.peakTimes : []
        },
        policyEffectiveness: {
          ...analyticsData.policyEffectiveness,
          beforeAfter: Array.isArray(analyticsData.policyEffectiveness?.beforeAfter) ?
                       analyticsData.policyEffectiveness.beforeAfter : []
        }
      }
      
      setData(transformedData)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err.message)
      // Use mock data for development with user notification
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock data due to API error')
        setData({
          ...generateMockAnalyticsData(),
          _isMockData: true,
          _mockReason: 'API connection failed - using sample data for development'
        })
      }
    } finally {
      setLoading(false)
    }
  }, [barbershopId, dateRange.start, dateRange.end, filters])

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const exportData = async (format = 'pdf') => {
    try {
      const response = await fetch('/api/no-show/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString()
          }
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `no-show-analytics-${format}-${format(new Date(), 'yyyy-MM-dd')}.${format}`
      link.click()
      window.URL.revokeObjectURL(url)

      if (onExport) onExport(format)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  const kpis = useMemo(() => {
    if (!data) return null

    return {
      noShowRate: {
        current: data.summary.noShowRate,
        previous: data.summary.previousNoShowRate,
        change: data.summary.noShowRate - data.summary.previousNoShowRate,
        target: 5 // Target no-show rate of 5%
      },
      revenueImpact: {
        lost: data.summary.lostRevenue,
        recovered: data.summary.recoveredRevenue,
        net: data.summary.recoveredRevenue - data.summary.lostRevenue
      },
      policyEffectiveness: {
        feeCollection: data.summary.feeCollectionRate,
        clientRecovery: data.summary.clientRecoveryRate,
        repeatOffenders: data.summary.repeatOffenderRate
      }
    }
  }, [data])

  const renderKPICard = (title, value, change, Icon, color = 'blue') => {
    const isPositive = change > 0
    const TrendIcon = isPositive ? ChartBarIcon : ArrowTrendingDownIcon
    const trendColor = title.includes('Rate') || title.includes('Lost') 
      ? (isPositive ? 'text-red-600' : 'text-green-600')  // Lower is better for rates
      : (isPositive ? 'text-green-600' : 'text-red-600')   // Higher is better for revenue

    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Icon className={`h-8 w-8 text-${color}-600`} />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center ${trendColor}`}>
              <TrendIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderNoShowTrendChart = () => {
    if (!data?.trends) return null

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">No-Show Rate Trends</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
              No-Show Rate
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
              Target (5%)
            </div>
          </div>
        </div>
        <div className="min-h-[300px] overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={400}>
            <LineChart data={data.trends.daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
            />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
              formatter={(value) => [`${value}%`, 'No-Show Rate']}
            />
            <Line 
              type="monotone" 
              dataKey="noShowRate" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444' }}
            />
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="#3b82f6" 
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderClientRiskSegmentation = () => {
    if (!data?.clientSegmentation) return null

    const segmentColors = {
      'Low Risk': '#10b981',
      'Medium Risk': '#f59e0b', 
      'High Risk': '#ef4444',
      'Blocked': '#6b7280'
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Client Risk Segmentation</h3>
          <button
            onClick={() => toggleSection('clientSegmentation')}
            className="text-gray-400 hover:text-gray-600"
          >
            {collapsedSections.clientSegmentation ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </button>
        </div>
        
        {!collapsedSections.clientSegmentation && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="min-h-[250px]">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.clientSegmentation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.clientSegmentation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={segmentColors[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {data.clientSegmentation.map((segment, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: segmentColors[segment.name] }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900">{segment.name}</p>
                      <p className="text-sm text-gray-600">{segment.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{segment.count}</p>
                    <p className="text-xs text-gray-600">clients</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderRevenueImpactAnalysis = () => {
    if (!data?.revenueAnalysis) return null

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Revenue Impact Analysis</h3>
          <button
            onClick={() => toggleSection('revenueAnalysis')}
            className="text-gray-400 hover:text-gray-600"
          >
            {collapsedSections.revenueAnalysis ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </button>
        </div>

        {!collapsedSections.revenueAnalysis && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Revenue Lost</p>
                <p className="text-2xl font-bold text-red-700">${data.revenueAnalysis.lost.toLocaleString()}</p>
                <p className="text-xs text-red-600">{data.revenueAnalysis.lostAppointments} appointments</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Revenue Recovered</p>
                <p className="text-2xl font-bold text-green-700">${data.revenueAnalysis.recovered.toLocaleString()}</p>
                <p className="text-xs text-green-600">via fees & policies</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Net Impact</p>
                <p className={`text-2xl font-bold ${data.revenueAnalysis.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${data.revenueAnalysis.net.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600">
                  {data.revenueAnalysis.net >= 0 ? 'Positive' : 'Negative'} impact
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Monthly Revenue Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.revenueAnalysis.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => [`$${value}`, '']} />
                  <Area 
                    type="monotone" 
                    dataKey="lost" 
                    stackId="1" 
                    stroke="#ef4444" 
                    fill="#fecaca" 
                    name="Lost Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="recovered" 
                    stackId="2" 
                    stroke="#10b981" 
                    fill="#d1fae5" 
                    name="Recovered Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderServiceAnalysis = () => {
    if (!data?.serviceAnalysis) return null

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Service-Specific Analysis</h3>
          <button
            onClick={() => toggleSection('serviceAnalysis')}
            className="text-gray-400 hover:text-gray-600"
          >
            {collapsedSections.serviceAnalysis ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </button>
        </div>

        {!collapsedSections.serviceAnalysis && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No-Shows</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue Lost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.serviceAnalysis.map((service, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.totalBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.noShows}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        service.noShowRate > 10 ? 'bg-red-100 text-red-800' :
                        service.noShowRate > 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {service.noShowRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${service.revenueLost.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${service.averagePrice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderTimePatternAnalysis = () => {
    if (!data?.timePatterns) return null

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Time Pattern Analysis</h3>
          <button
            onClick={() => toggleSection('timePatterns')}
            className="text-gray-400 hover:text-gray-600"
          >
            {collapsedSections.timePatterns ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </button>
        </div>

        {!collapsedSections.timePatterns && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">By Day of Week</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.timePatterns.byDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${value}%`, 'No-Show Rate']} />
                  <Bar dataKey="noShowRate" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">By Hour of Day</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.timePatterns.byHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(value) => `${value}:00`} />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'No-Show Rate']}
                    labelFormatter={(value) => `${value}:00`}
                  />
                  <Bar dataKey="noShowRate" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPolicyEffectiveness = () => {
    if (!data?.policyEffectiveness) return null

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Policy Effectiveness</h3>
          <button
            onClick={() => toggleSection('policyEffectiveness')}
            className="text-gray-400 hover:text-gray-600"
          >
            {collapsedSections.policyEffectiveness ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
          </button>
        </div>

        {!collapsedSections.policyEffectiveness && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Fee Collection Rate</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.policyEffectiveness.feeCollectionRate}%
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Client Recovery Rate</p>
                <p className="text-2xl font-bold text-green-700">
                  {data.policyEffectiveness.clientRecoveryRate}%
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Repeat Offender Rate</p>
                <p className="text-2xl font-bold text-purple-700">
                  {data.policyEffectiveness.repeatOffenderRate}%
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Grace Period Usage</p>
                <p className="text-2xl font-bold text-orange-700">
                  {data.policyEffectiveness.gracePeriodUsage}%
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Before vs After Policy Implementation</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.policyEffectiveness.beforeAfter}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="noShowRate" fill="#ef4444" name="No-Show Rate %" />
                  <Bar dataKey="revenueRecovered" fill="#10b981" name="Revenue Recovered $" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg animate-pulse">
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-200 h-96 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={loadAnalyticsData}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Mock Data Warning */}
      {data?._isMockData && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Development Mode - Sample Data</h4>
              <p className="text-sm text-yellow-700 mt-1">{data._mockReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">No-Show Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">
            {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md ${
              autoRefresh ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-700'
            } hover:bg-gray-50`}
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Auto Refresh
          </button>
          
          <button
            onClick={() => exportData('pdf')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Export PDF
          </button>
          
          <button
            onClick={() => exportData('csv')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderKPICard(
            'No-Show Rate',
            `${kpis.noShowRate.current.toFixed(1)}%`,
            kpis.noShowRate.change,
            ExclamationTriangleIcon,
            'red'
          )}
          {renderKPICard(
            'Revenue Lost',
            `$${kpis.revenueImpact.lost.toLocaleString()}`,
            undefined,
            CurrencyDollarIcon,
            'red'
          )}
          {renderKPICard(
            'Revenue Recovered',
            `$${kpis.revenueImpact.recovered.toLocaleString()}`,
            undefined,
            ChartBarIcon,
            'green'
          )}
          {renderKPICard(
            'Fee Collection Rate',
            `${kpis.policyEffectiveness.feeCollection}%`,
            undefined,
            ChartBarIcon,
            'blue'
          )}
        </div>
      )}

      {/* Charts and Analysis Sections */}
      <div className="space-y-6">
        {renderNoShowTrendChart()}
        {renderClientRiskSegmentation()}
        {renderRevenueImpactAnalysis()}
        {renderServiceAnalysis()}
        {renderTimePatternAnalysis()}
        {renderPolicyEffectiveness()}
      </div>
    </div>
  )
}

// Mock data generator for development
const generateMockAnalyticsData = () => {
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)
  
  return {
    summary: {
      noShowRate: 8.5,
      previousNoShowRate: 12.3,
      lostRevenue: 2450,
      recoveredRevenue: 1200,
      feeCollectionRate: 75,
      clientRecoveryRate: 85,
      repeatOffenderRate: 15
    },
    trends: {
      daily: eachDayOfInterval({ start: thirtyDaysAgo, end: today }).map(date => ({
        date: date.toISOString(),
        noShowRate: Math.random() * 15 + 5,
        target: 5
      }))
    },
    clientSegmentation: [
      { name: 'Low Risk', count: 245, description: '0-1 no-shows, good history' },
      { name: 'Medium Risk', count: 67, description: '2 no-shows, moderate history' },
      { name: 'High Risk', count: 23, description: '3+ no-shows, poor history' },
      { name: 'Blocked', count: 8, description: 'Exceeded strike limit' }
    ],
    revenueAnalysis: {
      lost: 2450,
      recovered: 1200,
      net: -1250,
      lostAppointments: 35,
      monthlyTrend: Array.from({ length: 6 }, (_, i) => ({
        month: format(subDays(today, (5-i) * 30), 'MMM'),
        lost: Math.random() * 3000 + 1000,
        recovered: Math.random() * 1500 + 500
      }))
    },
    serviceAnalysis: [
      { name: 'Haircut', totalBookings: 450, noShows: 38, noShowRate: 8.4, revenueLost: 1140, averagePrice: 30 },
      { name: 'Hair & Beard', totalBookings: 280, noShows: 31, noShowRate: 11.1, revenueLost: 1550, averagePrice: 50 },
      { name: 'Beard Trim', totalBookings: 180, noShows: 12, noShowRate: 6.7, revenueLost: 240, averagePrice: 20 },
      { name: 'Styling', totalBookings: 95, noShows: 14, noShowRate: 14.7, revenueLost: 840, averagePrice: 60 }
    ],
    timePatterns: {
      byDayOfWeek: [
        { day: 'Mon', noShowRate: 6.2 },
        { day: 'Tue', noShowRate: 7.8 },
        { day: 'Wed', noShowRate: 8.1 },
        { day: 'Thu', noShowRate: 9.3 },
        { day: 'Fri', noShowRate: 12.1 },
        { day: 'Sat', noShowRate: 15.4 },
        { day: 'Sun', noShowRate: 5.9 }
      ],
      byHour: Array.from({ length: 12 }, (_, i) => ({
        hour: i + 8,
        noShowRate: Math.random() * 20 + 2
      }))
    },
    policyEffectiveness: {
      feeCollectionRate: 75,
      clientRecoveryRate: 85,
      repeatOffenderRate: 15,
      gracePeriodUsage: 45,
      beforeAfter: [
        { period: 'Before Policy', noShowRate: 12.3, revenueRecovered: 200 },
        { period: 'After Policy', noShowRate: 8.5, revenueRecovered: 1200 }
      ]
    }
  }
}

export { generateMockAnalyticsData }