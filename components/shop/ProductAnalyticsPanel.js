'use client'

import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
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
    loading: true
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
      setAnalyticsData(prev => ({ ...prev, loading: true }))
      
      // Fetch product analytics from API
      const response = await fetch(`/api/shop/analytics/products?period_days=${selectedPeriod}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalyticsData({
          topProducts: data.topProducts || generateMockTopProducts(),
          categoryBreakdown: data.categoryBreakdown || generateMockCategoryData(),
          revenueOverTime: data.revenueOverTime || generateMockRevenueData(),
          profitMargins: data.profitMargins || generateMockProfitData(),
          recommendations: data.recommendations || generateMockRecommendations(),
          loading: false
        })
      } else {
        // Fall back to mock data for demo
        setAnalyticsData({
          topProducts: generateMockTopProducts(),
          categoryBreakdown: generateMockCategoryData(),
          revenueOverTime: generateMockRevenueData(),
          profitMargins: generateMockProfitData(),
          recommendations: generateMockRecommendations(),
          loading: false
        })
      }
    } catch (error) {
      console.error('Error loading product analytics:', error)
      // Use mock data on error
      setAnalyticsData({
        topProducts: generateMockTopProducts(),
        categoryBreakdown: generateMockCategoryData(),
        revenueOverTime: generateMockRevenueData(),
        profitMargins: generateMockProfitData(),
        recommendations: generateMockRecommendations(),
        loading: false
      })
    }
  }

  const generateMockTopProducts = () => [
    { name: 'Premium Hair Oil', unitsSold: 45, revenue: 675, category: 'Hair Care' },
    { name: 'Beard Styling Balm', unitsSold: 38, revenue: 570, category: 'Beard Care' },
    { name: 'Professional Scissors', unitsSold: 12, revenue: 840, category: 'Tools' },
    { name: 'Hair Styling Gel', unitsSold: 32, revenue: 480, category: 'Styling' },
    { name: 'Aftershave Lotion', unitsSold: 28, revenue: 420, category: 'Aftercare' }
  ]

  const generateMockCategoryData = () => [
    { name: 'Hair Care', value: 2450, percentage: 35 },
    { name: 'Beard Care', value: 1890, percentage: 27 },
    { name: 'Tools', value: 1260, percentage: 18 },
    { name: 'Styling', value: 980, percentage: 14 },
    { name: 'Aftercare', value: 420, percentage: 6 }
  ]

  const generateMockRevenueData = () => {
    const days = parseInt(selectedPeriod)
    const data = []
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 300) + 100,
        units: Math.floor(Math.random() * 15) + 5
      })
    }
    return data
  }

  const generateMockProfitData = () => [
    { name: 'Professional Scissors', costPrice: 45, sellingPrice: 70, margin: 35.7, category: 'Tools' },
    { name: 'Premium Hair Oil', costPrice: 8, sellingPrice: 15, margin: 46.7, category: 'Hair Care' },
    { name: 'Beard Styling Balm', costPrice: 6, sellingPrice: 15, margin: 60.0, category: 'Beard Care' },
    { name: 'Hair Styling Gel', costPrice: 5, sellingPrice: 12, margin: 58.3, category: 'Styling' },
    { name: 'Aftershave Lotion', costPrice: 7, sellingPrice: 15, margin: 53.3, category: 'Aftercare' }
  ]

  const generateMockRecommendations = () => [
    {
      type: 'reorder',
      title: 'Reorder Alert',
      message: 'Premium Hair Oil is running low (3 units left). Based on sales velocity, reorder in 5 days.',
      priority: 'high',
      action: 'Reorder 20 units'
    },
    {
      type: 'optimization',
      title: 'Price Optimization',
      message: 'Professional Scissors have lower margins (35.7%) compared to category average (45%). Consider adjusting pricing.',
      priority: 'medium',
      action: 'Review pricing'
    },
    {
      type: 'promotion',
      title: 'Promotion Opportunity',
      message: 'Aftercare products are underperforming. Consider bundling with popular hair services.',
      priority: 'low',
      action: 'Create bundle'
    }
  ]

  const formatCurrency = (value) => `$${value.toFixed(2)}`
  const formatPercentage = (value) => `${value.toFixed(1)}%`

  if (analyticsData.loading && isExpanded) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Product Analytics</h3>
          </div>
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        </div>
        
        {isExpanded && (
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading analytics...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Product Analytics</h3>
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
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{metrics.totalProducts || 0}</div>
            <div className="text-sm text-gray-600">Total Products</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalValue || 0)}</div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{formatPercentage(metrics.averageMargin || 0)}</div>
            <div className="text-sm text-gray-600">Avg Margin</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{metrics.lowStock || 0}</div>
            <div className="text-sm text-gray-600">Low Stock</div>
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
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedView('performance')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedView === 'performance' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setSelectedView('financial')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedView === 'financial' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Financial
              </button>
              <button
                onClick={() => setSelectedView('insights')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedView === 'insights' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Insights
              </button>
            </div>
          </div>

          {/* Performance View */}
          {selectedView === 'performance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <CubeIcon className="h-4 w-4 mr-2" />
                  Top Selling Products
                </h4>
                <div className="space-y-3">
                  {analyticsData.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{product.unitsSold} sold</div>
                        <div className="text-xs text-green-600">{formatCurrency(product.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
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
              <div className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
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
          {selectedView === 'financial' && (
            <div className="space-y-6">
              {/* Profit Margins */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BanknotesIcon className="h-4 w-4 mr-2" />
                  Profit Margin Analysis
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
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
                          <td className="py-2 font-medium text-gray-900">{product.name}</td>
                          <td className="py-2 text-gray-600">{formatCurrency(product.costPrice)}</td>
                          <td className="py-2 text-gray-600">{formatCurrency(product.sellingPrice)}</td>
                          <td className="py-2">
                            <span className={`font-semibold ${
                              product.margin >= 50 ? 'text-green-600' :
                              product.margin >= 30 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {formatPercentage(product.margin)}
                            </span>
                          </td>
                          <td className="py-2 text-gray-500">{product.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Insights View */}
          {selectedView === 'insights' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center">
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
                        {rec.type === 'optimization' && <ArrowTrendingUpIcon className="h-4 w-4 text-yellow-500" />}
                        {rec.type === 'promotion' && <LightBulbIcon className="h-4 w-4 text-blue-500" />}
                        <span className="text-sm font-medium text-gray-900">{rec.title}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rec.message}</p>
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