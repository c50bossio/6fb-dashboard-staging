'use client'

import {
  ChartBarIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, AreaChart
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function ProductPerformanceCharts({ products = [], metrics = {} }) {
  const [performanceData, setPerformanceData] = useState({
    salesTrends: [],
    categoryPerformance: [],
    inventoryTurnover: [],
    seasonalTrends: [],
    loading: true,
    error: null
  })
  const [selectedTimeframe, setSelectedTimeframe] = useState('30') // days
  const [selectedMetric, setSelectedMetric] = useState('revenue') // revenue, units, margin
  const [comparisonMode, setComparisonMode] = useState(false)

  useEffect(() => {
    loadPerformanceData()
  }, [selectedTimeframe, selectedMetric])

  const loadPerformanceData = async () => {
    try {
      setPerformanceData(prev => ({ ...prev, loading: true, error: null }))

      // Fetch performance charts data from API
      const response = await fetch(`/api/shop/analytics/performance-charts?period_days=${selectedTimeframe}&granularity=daily`)
      const data = await response.json()

      if (data.success) {
        // Map API response structure to component state
        // Transform revenue_over_time to match chart expectations
        const salesTrends = (data.charts?.revenue_over_time || []).map(item => ({
          date: item.date || item.period,
          current: item.revenue,
          previous: 0, // TODO: API doesn't provide comparison data yet
          target: item.revenue * 1.1 // 10% growth target
        }))

        // Transform category_performance to simple format
        const categoryPerformance = (data.charts?.category_performance || []).map(cat => ({
          category: cat.category,
          revenue: cat.total_revenue,
          previousRevenue: 0, // TODO: API doesn't provide comparison data yet
          growth: 0
        }))

        // Transform inventory_turnover to match component expectations
        const inventoryTurnover = (data.charts?.inventory_turnover || []).slice(0, 10).map(item => ({
          name: item.name,
          turnoverRate: item.turnover_rate,
          daysToSell: item.days_to_sell_inventory || 0,
          stockLevel: item.velocity_class === 'fast' ? 'Optimal' :
                      item.velocity_class === 'medium' ? 'Good' :
                      item.velocity_class === 'slow' ? 'Moderate' : 'Low'
        }))

        setPerformanceData({
          salesTrends: salesTrends,
          categoryPerformance: categoryPerformance,
          inventoryTurnover: inventoryTurnover,
          seasonalTrends: [], // TODO: API doesn't provide seasonal trends in expected format
          loading: false,
          error: null
        })
      } else {
        // API returned error
        setPerformanceData(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to load performance data'
        }))
      }
    } catch (error) {
      console.error('Error loading performance charts data:', error)
      // Network or parsing error
      setPerformanceData(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to connect to server. Please try again later.'
      }))
    }
  }

  const formatCurrency = (value) => `$${value.toLocaleString()}`
  const formatPercentage = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

  if (performanceData.loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (performanceData.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-card-foreground">Product Performance Charts</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Unable to Load Performance Data</h4>
              <p className="text-sm text-red-700">{performanceData.error}</p>
              <button
                onClick={loadPerformanceData}
                className="mt-3 px-4 py-2 text-sm font-medium text-red-700 hover:text-red-900 border border-red-300 rounded-md hover:bg-red-100"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  const hasNoData =
    performanceData.salesTrends.length === 0 &&
    performanceData.categoryPerformance.length === 0 &&
    performanceData.inventoryTurnover.length === 0 &&
    performanceData.seasonalTrends.length === 0

  if (hasNoData) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-card-foreground">Product Performance Charts</h3>
        </div>
        <div className="bg-muted border border-border rounded-lg p-8 text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-card-foreground mb-1">No Performance Data Available</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Complete some product sales to see performance trends and analytics.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-card-foreground">Product Performance Charts</h3>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="border border-input bg-background text-foreground rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-500" />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="border border-input bg-background text-foreground rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="revenue">Revenue</option>
              <option value="units">Units Sold</option>
              <option value="margin">Profit Margin</option>
            </select>
          </div>

          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`px-3 py-1 text-sm rounded-md border transition-colors ${
              comparisonMode
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-card text-card-foreground border-input hover:bg-muted'
            }`}
          >
            Compare
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trends Chart */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Sales Trends ({selectedMetric})
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData.salesTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    selectedMetric === 'revenue' ? formatCurrency(value) : value,
                    name === 'current' ? 'Current Period' : 
                    name === 'previous' ? 'Previous Period' : 'Target'
                  ]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="current" 
                  stackId="1"
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  name="Current"
                />
                {comparisonMode && (
                  <Line 
                    type="monotone" 
                    dataKey="previous" 
                    stroke="#10B981" 
                    strokeDasharray="5 5"
                    name="Previous"
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#F59E0B" 
                  strokeDasharray="3 3"
                  name="Target"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center">
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            Category Performance
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData.categoryPerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={80} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value) : 
                    name === 'margin' ? `${value}%` : value,
                    name === 'revenue' ? 'Revenue' : 
                    name === 'margin' ? 'Margin' : 'Units'
                  ]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                {comparisonMode && (
                  <Bar dataKey="previousRevenue" fill="#10B981" name="Previous" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Turnover */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-card-foreground mb-3">Inventory Turnover Rate</h4>
          <div className="space-y-3">
            {performanceData.inventoryTurnover.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-card-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.daysToSell} days to sell
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-card-foreground">
                      {item.turnoverRate.toFixed(1)}x
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.stockLevel === 'Optimal' ? 'bg-green-100 text-green-800' :
                    item.stockLevel === 'Good' ? 'bg-blue-100 text-blue-800' :
                    item.stockLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.stockLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seasonal Trends */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-card-foreground mb-3">Seasonal Trends</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData.seasonalTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="thisYear" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="This Year"
                />
                <Line 
                  type="monotone" 
                  dataKey="lastYear" 
                  stroke="#10B981" 
                  strokeDasharray="5 5"
                  name="Last Year"
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#F59E0B" 
                  strokeDasharray="3 3"
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        {performanceData.categoryPerformance.slice(0, 4).map((category, index) => (
          <div key={index} className="text-center">
            <div className="text-lg font-bold text-card-foreground">{formatCurrency(category.revenue)}</div>
            <div className="text-sm text-muted-foreground">{category.category}</div>
            <div className={`text-sm font-medium ${
              category.growth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(category.growth)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
