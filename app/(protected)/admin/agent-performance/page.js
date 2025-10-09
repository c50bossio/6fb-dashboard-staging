'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

import AgentUsageChart from '@/components/analytics/AgentUsageChart'
import CostTimelineChart from '@/components/analytics/CostTimelineChart'
import ResponseTimeChart from '@/components/analytics/ResponseTimeChart'
import HandoffFlowDiagram from '@/components/analytics/HandoffFlowDiagram'
import QueryPerformanceTable from '@/components/analytics/QueryPerformanceTable'

export default function AgentPerformanceDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState('30') // days
  const [agentFilter, setAgentFilter] = useState(null)

  // Data states
  const [metrics, setMetrics] = useState(null)
  const [queries, setQueries] = useState([])
  const [handoffs, setHandoffs] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadDashboardData()
  }, [dateRange, agentFilter, currentPage])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Build query params
      const params = new URLSearchParams({
        days: dateRange,
        page: currentPage,
        per_page: 20
      })

      if (agentFilter) {
        params.append('agent', agentFilter)
      }

      // Fetch metrics
      const metricsResponse = await fetch(`/api/admin/agent-performance/metrics?${params}`)
      const metricsData = await metricsResponse.json()

      if (metricsData.success) {
        setMetrics(metricsData)
      }

      // Fetch query logs
      const queriesResponse = await fetch(`/api/admin/agent-performance/queries?${params}`)
      const queriesData = await queriesResponse.json()

      if (queriesData.success) {
        setQueries(queriesData.queries || [])
        setPagination(queriesData.pagination)
      }

      // Fetch handoff data
      const handoffsResponse = await fetch(`/api/admin/agent-performance/handoffs?days=${dateRange}`)
      const handoffsData = await handoffsResponse.json()

      if (handoffsData.success) {
        setHandoffs(handoffsData)
      }

    } catch (error) {
      console.error('[AgentPerformance] Failed to load data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  const handleAgentClick = (agent) => {
    setAgentFilter(agent === agentFilter ? null : agent)
    setCurrentPage(1) // Reset to first page
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleExport = async (filters) => {
    try {
      const params = new URLSearchParams({
        days: dateRange,
        export: 'true'
      })

      if (filters.search) params.append('search', filters.search)
      if (filters.agent) params.append('agent', filters.agent)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/admin/agent-performance/queries?${params}`)
      const csv = await response.text()

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agent-performance-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('[AgentPerformance] Export failed:', error)
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading agent performance data...</p>
        </div>
      </div>
    )
  }

  const overview = metrics?.overview || {}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-olive-100 flex items-center justify-center">
              <CpuChipIcon className="h-8 w-8 text-olive-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground">Agent Performance Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">Monitor AgentKit usage, costs, and performance metrics</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2 bg-white dark:bg-card border border-gray-300 rounded-lg px-3 py-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value)
                  setCurrentPage(1)
                }}
                className="border-0 focus:ring-0 text-sm"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-white dark:bg-card border border-gray-300 rounded-lg hover:bg-background flex items-center space-x-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-gray-700 dark:text-gray-300">Refresh</span>
            </button>
          </div>
        </div>

        {/* Active Filter */}
        {agentFilter && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Filtered by agent:</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-olive-100 text-olive-800">
              {cleanAgentName(agentFilter)}
              <button
                onClick={() => handleAgentClick(null)}
                className="ml-2 text-olive-600 hover:text-olive-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Queries */}
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">{overview.total_queries || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Queries</p>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">Last {dateRange} days</p>
        </div>

        {/* Total Cost */}
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">
            ${(overview.total_cost || 0).toFixed(4)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Cost</p>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
            Avg: ${overview.total_queries > 0 ? (overview.total_cost / overview.total_queries).toFixed(4) : '0.0000'} per query
          </p>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">
            {((overview.avg_response_time || 0) / 1000).toFixed(2)}s
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Avg Response Time</p>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
            {overview.avg_response_time < 10000 ? 'Excellent' : overview.avg_response_time < 15000 ? 'Good' : 'Needs optimization'}
          </p>
        </div>

        {/* Most Used Agent */}
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CpuChipIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-card-foreground truncate">
            {cleanAgentName(overview.most_used_agent) || 'N/A'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Most Used Agent</p>
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
            {overview.success_rate ? `${overview.success_rate}% success rate` : 'No data'}
          </p>
        </div>
      </div>

      {/* Charts Row 1: Agent Usage & Cost Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {metrics?.queries_by_agent && (
          <AgentUsageChart
            data={metrics.queries_by_agent}
            onAgentClick={handleAgentClick}
          />
        )}

        {metrics?.cost_by_day && (
          <CostTimelineChart data={metrics.cost_by_day} />
        )}
      </div>

      {/* Charts Row 2: Response Time & Handoff Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {metrics?.response_time_distribution && (
          <ResponseTimeChart data={metrics.response_time_distribution} />
        )}

        {handoffs?.flows && (
          <HandoffFlowDiagram
            flows={handoffs.flows}
            collaborationStats={handoffs.collaboration_stats}
          />
        )}
      </div>

      {/* Query Performance Table */}
      <QueryPerformanceTable
        queries={queries}
        pagination={pagination}
        onPageChange={handlePageChange}
        onExport={handleExport}
      />
    </div>
  )
}

// Utility: Clean agent name for display
function cleanAgentName(name) {
  if (!name) return 'Unknown'

  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Agent', '')
    .trim()
}
