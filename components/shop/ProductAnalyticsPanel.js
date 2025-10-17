'use client'

import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  TagIcon,
  CubeIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function ProductAnalyticsPanel({ products = [], metrics = {} }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [analyticsData, setAnalyticsData] = useState({
    topProducts: [],
    categoryBreakdown: [],
    revenueOverTime: [],
    profitMargins: [],
    recommendations: [],
    loading: true,
    error: null
  })
  const [selectedPeriod, setSelectedPeriod] = useState('30') // days
  const [selectedView, setSelectedView] = useState('performance') // performance, financial, insights

  useEffect(() => {
    if (isExpanded) {
      loadAnalyticsData()
    }
  }, [isExpanded, selectedPeriod])

  const loadAnalyticsData = async () => {
    try {
      setAnalyticsData(prev => ({ ...prev, loading: true, error: null }))

      // Fetch product analytics from API
      const response = await fetch(`/api/shop/analytics/products?period_days=${selectedPeriod}`)
      const data = await response.json()

      if (data.success) {
        // Map API response structure to component state
        const topProducts = (data.top_selling_products || []).map(product => ({
          name: product.name,
          category: product.category,
          unitsSold: product.quantity_sold,
          revenue: product.revenue
        }))

        const categoryBreakdown = (data.category_performance || []).map(cat => ({
          name: cat.category,
          value: cat.total_revenue,
          percentage: 0 // Will be calculated if needed
        }))

        const profitMargins = (data.top_selling_products || []).map(product => ({
          name: product.name,
          costPrice: product.avg_price / (1 + (product.profit_margin / 100)), // Approximate cost
          sellingPrice: product.avg_price,
          margin: product.profit_margin,
          category: product.category
        }))

        setAnalyticsData({
          topProducts: topProducts,
          categoryBreakdown: categoryBreakdown,
          revenueOverTime: [], // TODO: API doesn't provide time series data
          profitMargins: profitMargins,
          recommendations: [], // TODO: API doesn't provide recommendations in expected format
          loading: false,
          error: null
        })
      } else {
        // API returned error
        setAnalyticsData(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to load product analytics'
        }))
      }
    } catch (error) {
      console.error('Error loading product analytics:', error)
      // Network or parsing error
      setAnalyticsData(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to connect to server. Please try again later.'
      }))
    }
  }

  const formatCurrency = (value) => `$${value.toFixed(2)}`
  const formatPercentage = (value) => `${value.toFixed(1)}%`

  if (analyticsData.loading && isExpanded) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-card-foreground">Product Analytics</h3>
          </div>
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        </div>

        {isExpanded && (
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-muted-foreground">Loading analytics...</span>
          </div>
        )}
      </div>
    )
  }

  // Check if we have no data after successful load (empty state)
  // Only check topProducts and categoryBreakdown (revenueOverTime not yet implemented in API)
  const hasNoData = isExpanded && !analyticsData.loading && !analyticsData.error &&
    analyticsData.topProducts.length === 0 &&
    analyticsData.categoryBreakdown.length === 0

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-card-foreground">Product Analytics</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {selectedPeriod} days
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {/* Quick Stats Preview (Always Visible) */}
      {!isExpanded && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-2xl font-bold text-card-foreground">{metrics.totalProducts || 0}</div>
            <div className="text-sm text-muted-foreground">Total Products</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalValue || 0)}</div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{formatPercentage(metrics.averageMargin || 0)}</div>
            <div className="text-sm text-muted-foreground">Avg Margin</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{metrics.lowStock || 0}</div>
            <div className="text-sm text-muted-foreground">Low Stock</div>
          </div>
        </div>
      )}

      {/* Expanded Analytics */}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-input bg-background text-foreground rounded-md px-3 py-1 text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setSelectedView('performance')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedView === 'performance'
                    ? 'bg-card text-blue-600 shadow-sm'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setSelectedView('financial')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedView === 'financial'
                    ? 'bg-card text-blue-600 shadow-sm'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                Financial
              </button>
              <button
                onClick={() => setSelectedView('insights')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedView === 'insights'
                    ? 'bg-card text-blue-600 shadow-sm'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                Insights
              </button>
            </div>
          </div>

          {/* Error State */}
          {analyticsData.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Unable to Load Analytics</h4>
                  <p className="text-sm text-red-700">{analyticsData.error}</p>
                  <button
                    onClick={loadAnalyticsData}
                    className="mt-3 px-4 py-2 text-sm font-medium text-red-700 hover:text-red-900 border border-red-300 rounded-md hover:bg-red-100"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {hasNoData && (
            <div className="bg-muted border border-border rounded-lg p-8 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-card-foreground mb-1">No Analytics Data Available</h4>
              <p className="text-sm text-muted-foreground">
                Complete some product sales to see performance analytics and insights.
              </p>
            </div>
          )}

          {/* Performance View */}
          {!analyticsData.error && !hasNoData && selectedView === 'performance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center">
                  <CubeIcon className="h-4 w-4 mr-2" />
                  Top Selling Products
                </h4>
                <div className="space-y-3">
                  {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-card-foreground">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-card-foreground">{product.unitsSold} sold</div>
                        <div className="text-xs text-green-600">{formatCurrency(product.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center">
                  <TagIcon className="h-4 w-4 mr-2" />
                  Revenue by Category
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analyticsData.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="bg-muted p-4 rounded-lg lg:col-span-2">
                <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center">
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Revenue Trend
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.revenueOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? formatCurrency(value) : value,
                          name === 'revenue' ? 'Revenue' : 'Units Sold'
                        ]}
                      />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Financial View */}
          {!analyticsData.error && !hasNoData && selectedView === 'financial' && (
            <div className="space-y-6">
              {/* Profit Margins */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center">
                  <BanknotesIcon className="h-4 w-4 mr-2" />
                  Profit Margin Analysis
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="pb-2">Product</th>
                        <th className="pb-2">Cost Price</th>
                        <th className="pb-2">Selling Price</th>
                        <th className="pb-2">Margin %</th>
                        <th className="pb-2">Category</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {analyticsData.profitMargins.map((product, index) => (
                        <tr key={index} className="text-sm">
                          <td className="py-2 font-medium text-card-foreground">{product.name}</td>
                          <td className="py-2 text-muted-foreground">{formatCurrency(product.costPrice)}</td>
                          <td className="py-2 text-muted-foreground">{formatCurrency(product.sellingPrice)}</td>
                          <td className="py-2">
                            <span className={`font-semibold ${
                              product.margin >= 50 ? 'text-green-600' :
                              product.margin >= 30 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {formatPercentage(product.margin)}
                            </span>
                          </td>
                          <td className="py-2 text-muted-foreground">{product.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Insights View */}
          {!analyticsData.error && !hasNoData && selectedView === 'insights' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-card-foreground flex items-center">
                <LightBulbIcon className="h-4 w-4 mr-2" />
                Business Insights & Recommendations
              </h4>

              {analyticsData.recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'high' ? 'bg-red-50 border-red-400' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {rec.type === 'reorder' && <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
                        {rec.type === 'optimization' && <ChartBarIcon className="h-4 w-4 text-yellow-500" />}
                        {rec.type === 'promotion' && <LightBulbIcon className="h-4 w-4 text-blue-500" />}
                        <span className="text-sm font-medium text-card-foreground">{rec.title}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.message}</p>
                    </div>
                    <button className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50">
                      {rec.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}