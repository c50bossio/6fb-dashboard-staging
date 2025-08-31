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
    loading: true
  })
  const [selectedTimeframe, setSelectedTimeframe] = useState('30') // days
  const [selectedMetric, setSelectedMetric] = useState('revenue') // revenue, units, margin
  const [comparisonMode, setComparisonMode] = useState(false)

  useEffect(() => {
    loadPerformanceData()
  }, [selectedTimeframe, selectedMetric])

  const loadPerformanceData = async () => {
    try {
      setPerformanceData(prev => ({ ...prev, loading: true }))
      
      // Fetch performance charts data from API
      const response = await fetch(`/api/shop/analytics/performance-charts?timeframe=${selectedTimeframe}&metric=${selectedMetric}`)
      const data = await response.json()
      
      if (data.success) {
        setPerformanceData({
          salesTrends: data.salesTrends || generateMockSalesTrends(),
          categoryPerformance: data.categoryPerformance || generateMockCategoryPerformance(),
          inventoryTurnover: data.inventoryTurnover || generateMockInventoryTurnover(),
          seasonalTrends: data.seasonalTrends || generateMockSeasonalTrends(),
          loading: false
        })
      } else {
        // Fall back to mock data
        setPerformanceData({
          salesTrends: generateMockSalesTrends(),
          categoryPerformance: generateMockCategoryPerformance(),
          inventoryTurnover: generateMockInventoryTurnover(),
          seasonalTrends: generateMockSeasonalTrends(),
          loading: false
        })
      }
    } catch (error) {
      console.error('Error loading performance charts data:', error)
      // Use mock data on error
      setPerformanceData({
        salesTrends: generateMockSalesTrends(),
        categoryPerformance: generateMockCategoryPerformance(),
        inventoryTurnover: generateMockInventoryTurnover(),
        seasonalTrends: generateMockSeasonalTrends(),
        loading: false
      })
    }
  }

  const generateMockSalesTrends = () => {
    const days = parseInt(selectedTimeframe)
    const data = []
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const baseValue = selectedMetric === 'revenue' ? 150 : selectedMetric === 'units' ? 8 : 40
      const variation = baseValue * 0.3
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        current: Math.floor(Math.random() * variation + baseValue),
        previous: Math.floor(Math.random() * variation + baseValue * 0.85),
        target: baseValue * 1.2
      })
    }
    return data
  }

  const generateMockCategoryPerformance = () => [
    { 
      category: 'Hair Care', 
      revenue: 2450, 
      units: 89, 
      margin: 45.2, 
      growth: 12.3,
      previousRevenue: 2180
    },
    { 
      category: 'Beard Care', 
      revenue: 1890, 
      units: 67, 
      margin: 52.1, 
      growth: 8.7,
      previousRevenue: 1740
    },
    { 
      category: 'Tools', 
      revenue: 1260, 
      units: 18, 
      margin: 38.5, 
      growth: -3.2,
      previousRevenue: 1302
    },
    { 
      category: 'Styling', 
      revenue: 980, 
      units: 45, 
      margin: 48.9, 
      growth: 15.6,
      previousRevenue: 848
    },
    { 
      category: 'Aftercare', 
      revenue: 420, 
      units: 23, 
      margin: 41.3, 
      growth: 5.2,
      previousRevenue: 399
    }
  ]

  const generateMockInventoryTurnover = () => [
    { name: 'Premium Hair Oil', turnoverRate: 8.2, daysToSell: 12, stockLevel: 'Optimal' },
    { name: 'Beard Styling Balm', turnoverRate: 6.5, daysToSell: 18, stockLevel: 'Good' },
    { name: 'Professional Scissors', turnoverRate: 2.1, daysToSell: 45, stockLevel: 'Slow' },
    { name: 'Hair Styling Gel', turnoverRate: 5.8, daysToSell: 21, stockLevel: 'Good' },
    { name: 'Aftershave Lotion', turnoverRate: 4.2, daysToSell: 28, stockLevel: 'Moderate' }
  ]

  const generateMockSeasonalTrends = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months.map(month => ({
      month,
      thisYear: Math.floor(Math.random() * 1000) + 500,
      lastYear: Math.floor(Math.random() * 800) + 400,
      forecast: Math.floor(Math.random() * 1200) + 600
    }))
  }

  const formatCurrency = (value) => `$${value.toLocaleString()}`
  const formatPercentage = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

  if (performanceData.loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Product Performance Charts</h3>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Compare
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trends Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Inventory Turnover Rate</h4>
          <div className="space-y-3">
            {performanceData.inventoryTurnover.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.daysToSell} days to sell
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Seasonal Trends</h4>
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
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        {performanceData.categoryPerformance.slice(0, 4).map((category, index) => (
          <div key={index} className="text-center">
            <div className="text-lg font-bold text-gray-900">{formatCurrency(category.revenue)}</div>
            <div className="text-sm text-gray-600">{category.category}</div>
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
