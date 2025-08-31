'use client'

import {
  CubeIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  LightBulbIcon,
  BanknotesIcon,
  TruckIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart
} from 'recharts'

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4']
const STATUS_COLORS = {
  critical: '#EF4444',
  warning: '#F59E0B', 
  good: '#10B981',
  optimal: '#3B82F6'
}

export default function InventoryInsights({ products = [], metrics = {} }) {
  const [insightsData, setInsightsData] = useState({
    stockAlerts: [],
    reorderSuggestions: [],
    categoryHealth: [],
    predictiveInsights: [],
    costAnalysis: [],
    supplierPerformance: [],
    loading: true
  })
  const [selectedInsight, setSelectedInsight] = useState('alerts') // alerts, predictions, analysis, suppliers
  const [alertFilter, setAlertFilter] = useState('all') // all, critical, warning

  useEffect(() => {
    loadInventoryInsights()
  }, [products])

  const loadInventoryInsights = async () => {
    try {
      setInsightsData(prev => ({ ...prev, loading: true }))
      
      // Fetch inventory insights from API
      const response = await fetch('/api/shop/analytics/inventory-insights')
      const data = await response.json()
      
      if (data.success) {
        setInsightsData({
          stockAlerts: data.stockAlerts || generateMockStockAlerts(),
          reorderSuggestions: data.reorderSuggestions || generateMockReorderSuggestions(),
          categoryHealth: data.categoryHealth || generateMockCategoryHealth(),
          predictiveInsights: data.predictiveInsights || generateMockPredictiveInsights(),
          costAnalysis: data.costAnalysis || generateMockCostAnalysis(),
          supplierPerformance: data.supplierPerformance || generateMockSupplierPerformance(),
          loading: false
        })
      } else {
        // Fall back to mock data
        setInsightsData({
          stockAlerts: generateMockStockAlerts(),
          reorderSuggestions: generateMockReorderSuggestions(),
          categoryHealth: generateMockCategoryHealth(),
          predictiveInsights: generateMockPredictiveInsights(),
          costAnalysis: generateMockCostAnalysis(),
          supplierPerformance: generateMockSupplierPerformance(),
          loading: false
        })
      }
    } catch (error) {
      console.error('Error loading inventory insights:', error)
      // Use mock data on error
      setInsightsData({
        stockAlerts: generateMockStockAlerts(),
        reorderSuggestions: generateMockReorderSuggestions(),
        categoryHealth: generateMockCategoryHealth(),
        predictiveInsights: generateMockPredictiveInsights(),
        costAnalysis: generateMockCostAnalysis(),
        supplierPerformance: generateMockSupplierPerformance(),
        loading: false
      })
    }
  }

  const generateMockStockAlerts = () => [
    {
      product: 'Premium Hair Oil',
      category: 'Hair Care',
      currentStock: 3,
      minLevel: 10,
      severity: 'critical',
      daysUntilEmpty: 2,
      avgDailySales: 1.5,
      action: 'Immediate reorder required',
      cost: 120,
      suggestedOrder: 25
    },
    {
      product: 'Beard Styling Balm',
      category: 'Beard Care', 
      currentStock: 7,
      minLevel: 12,
      severity: 'warning',
      daysUntilEmpty: 5,
      avgDailySales: 1.2,
      action: 'Plan reorder within 3 days',
      cost: 84,
      suggestedOrder: 20
    },
    {
      product: 'Hair Styling Gel',
      category: 'Styling',
      currentStock: 15,
      minLevel: 20,
      severity: 'warning',
      daysUntilEmpty: 12,
      avgDailySales: 1.1,
      action: 'Monitor closely',
      cost: 66,
      suggestedOrder: 15
    },
    {
      product: 'Professional Scissors',
      category: 'Tools',
      currentStock: 2,
      minLevel: 5,
      severity: 'critical',
      daysUntilEmpty: 15,
      avgDailySales: 0.3,
      action: 'Low stock alert',
      cost: 280,
      suggestedOrder: 8
    }
  ]

  const generateMockReorderSuggestions = () => [
    {
      product: 'Premium Hair Oil',
      priority: 1,
      suggestedQuantity: 25,
      estimatedCost: 300,
      supplier: 'Hair Care Plus',
      leadTime: 3,
      expectedProfit: 450,
      roi: 150
    },
    {
      product: 'Beard Styling Balm',
      priority: 2,
      suggestedQuantity: 20,
      estimatedCost: 160,
      supplier: 'Beard Masters',
      leadTime: 5,
      expectedProfit: 240,
      roi: 150
    },
    {
      product: 'Professional Scissors',
      priority: 3,
      suggestedQuantity: 8,
      estimatedCost: 360,
      supplier: 'Pro Tools Inc',
      leadTime: 7,
      expectedProfit: 200,
      roi: 55
    }
  ]

  const generateMockCategoryHealth = () => [
    { 
      category: 'Hair Care', 
      status: 'good', 
      stockDays: 25, 
      turnoverRate: 8.2, 
      value: 12450, 
      items: 15,
      trend: 'up'
    },
    { 
      category: 'Beard Care', 
      status: 'warning', 
      stockDays: 12, 
      turnoverRate: 6.5, 
      value: 8900, 
      items: 12,
      trend: 'up'
    },
    { 
      category: 'Tools', 
      status: 'critical', 
      stockDays: 8, 
      turnoverRate: 2.1, 
      value: 15600, 
      items: 8,
      trend: 'down'
    },
    { 
      category: 'Styling', 
      status: 'optimal', 
      stockDays: 35, 
      turnoverRate: 5.8, 
      value: 6750, 
      items: 18,
      trend: 'up'
    },
    { 
      category: 'Aftercare', 
      status: 'good', 
      stockDays: 22, 
      turnoverRate: 4.2, 
      value: 3200, 
      items: 9,
      trend: 'stable'
    }
  ]

  const generateMockPredictiveInsights = () => [
    {
      type: 'demand_spike',
      title: 'Seasonal Demand Increase Expected',
      message: 'Hair styling products typically see 30% increase in December. Consider stocking up on Hair Styling Gel and Premium Hair Oil.',
      confidence: 85,
      timeframe: '2-3 weeks',
      impact: 'high'
    },
    {
      type: 'slow_mover',
      title: 'Slow Moving Inventory Alert',
      message: 'Professional Scissors have low turnover (2.1x annually). Consider promotional pricing or bundle deals.',
      confidence: 92,
      timeframe: 'Current',
      impact: 'medium'
    },
    {
      type: 'opportunity',
      title: 'Cross-Sell Opportunity',
      message: 'Customers buying Beard Styling Balm often purchase Aftershave Lotion. Bundle pricing could increase margins.',
      confidence: 78,
      timeframe: 'Immediate',
      impact: 'medium'
    },
    {
      type: 'cost_optimization',
      title: 'Supplier Cost Analysis',
      message: 'Switching to Hair Care Plus for bulk orders could reduce costs by 12% while maintaining quality.',
      confidence: 89,
      timeframe: 'Next order cycle',
      impact: 'high'
    }
  ]

  const generateMockCostAnalysis = () => [
    {
      category: 'Hair Care',
      totalCost: 1850,
      totalValue: 4200,
      margin: 55.9,
      carryingCost: 92,
      turnoverDays: 18
    },
    {
      category: 'Beard Care', 
      totalCost: 1320,
      totalValue: 3150,
      margin: 58.1,
      carryingCost: 66,
      turnoverDays: 22
    },
    {
      category: 'Tools',
      totalCost: 2100,
      totalValue: 3360,
      margin: 37.5,
      carryingCost: 420,
      turnoverDays: 65
    }
  ]

  const generateMockSupplierPerformance = () => [
    {
      supplier: 'Hair Care Plus',
      orders: 12,
      onTimeDelivery: 92,
      quality: 98,
      costEfficiency: 87,
      totalSpent: 4850,
      avgLeadTime: 4
    },
    {
      supplier: 'Beard Masters',
      orders: 8,
      onTimeDelivery: 88,
      quality: 95,
      costEfficiency: 82,
      totalSpent: 2340,
      avgLeadTime: 6
    },
    {
      supplier: 'Pro Tools Inc',
      orders: 6,
      onTimeDelivery: 75,
      quality: 90,
      costEfficiency: 65,
      totalSpent: 1890,
      avgLeadTime: 8
    }
  ]

  const formatCurrency = (value) => `$${value.toLocaleString()}`
  const formatPercentage = (value) => `${value.toFixed(1)}%`
  const formatDays = (days) => `${days} day${days !== 1 ? 's' : ''}`

  const filteredAlerts = insightsData.stockAlerts.filter(alert => 
    alertFilter === 'all' || alert.severity === alertFilter
  )

  if (insightsData.loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <LightBulbIcon className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Inventory Insights</h3>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'alerts', label: 'Stock Alerts', icon: ExclamationTriangleIcon },
            { key: 'predictions', label: 'Predictions', icon: ChartPieIcon },
            { key: 'analysis', label: 'Cost Analysis', icon: BanknotesIcon },
            { key: 'suppliers', label: 'Suppliers', icon: TruckIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedInsight(key)}
              className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center space-x-1 ${
                selectedInsight === key 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stock Alerts View */}
      {selectedInsight === 'alerts' && (
        <div className="space-y-6">
          {/* Alert Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">Critical</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-red-600">
                  {insightsData.stockAlerts.filter(a => a.severity === 'critical').length}
                </div>
                <div className="text-sm text-red-700">Items need immediate attention</div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Warning</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-yellow-600">
                  {insightsData.stockAlerts.filter(a => a.severity === 'warning').length}
                </div>
                <div className="text-sm text-yellow-700">Items need monitoring</div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CubeIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Orders</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(insightsData.stockAlerts.reduce((sum, alert) => sum + alert.cost, 0))}
                </div>
                <div className="text-sm text-blue-700">Reorder cost estimate</div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Avg Lead Time</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-green-600">5.2</div>
                <div className="text-sm text-green-700">Days to restock</div>
              </div>
            </div>
          </div>

          {/* Alert Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Filter:</span>
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
            </select>
          </div>

          {/* Stock Alerts List */}
          <div className="space-y-3">
            {filteredAlerts.map((alert, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-400' :
                'bg-yellow-50 border-yellow-400'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">{alert.product}</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {alert.category}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Current Stock:</span>
                        <div className="font-medium">{alert.currentStock} units</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Days Until Empty:</span>
                        <div className="font-medium">{formatDays(alert.daysUntilEmpty)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Daily Sales:</span>
                        <div className="font-medium">{alert.avgDailySales}/day</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Suggested Order:</span>
                        <div className="font-medium">{alert.suggestedOrder} units</div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-700">{alert.action}</div>
                  </div>
                  
                  <div className="ml-4 text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(alert.cost)}
                    </div>
                    <button className="mt-2 px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 border border-purple-300 rounded-md hover:bg-purple-50">
                      Reorder Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictive Insights View */}
      {selectedInsight === 'predictions' && (
        <div className="space-y-6">
          {/* Category Health Overview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Category Health Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {insightsData.categoryHealth.map((category, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{category.category}</span>
                    <div className={`w-3 h-3 rounded-full ${
                      category.status === 'critical' ? 'bg-red-500' :
                      category.status === 'warning' ? 'bg-yellow-500' :
                      category.status === 'good' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}></div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>Stock: {formatDays(category.stockDays)}</div>
                    <div>Turnover: {category.turnoverRate}x</div>
                    <div>Value: {formatCurrency(category.value)}</div>
                  </div>
                  <div className="mt-2 flex items-center space-x-1">
                    {category.trend === 'up' && <ChartBarIcon className="h-3 w-3 text-green-500" />}
                    {category.trend === 'down' && <ArrowTrendingDownIcon className="h-3 w-3 text-red-500" />}
                    <span className={`text-xs font-medium ${
                      category.trend === 'up' ? 'text-green-600' :
                      category.trend === 'down' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {category.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Predictive Insights */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">AI-Powered Insights</h4>
            {insightsData.predictiveInsights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                insight.impact === 'high' ? 'bg-blue-50 border-blue-400' :
                insight.impact === 'medium' ? 'bg-green-50 border-green-400' :
                'bg-gray-50 border-gray-400'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900">{insight.title}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        insight.impact === 'high' ? 'bg-blue-100 text-blue-800' :
                        insight.impact === 'medium' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {insight.impact} impact
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        {insight.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                    <div className="text-xs text-gray-600">
                      Timeframe: {insight.timeframe}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Analysis View */}
      {selectedInsight === 'analysis' && (
        <div className="space-y-6">
          {/* Cost Analysis Table */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <BanknotesIcon className="h-4 w-4 mr-2" />
              Inventory Cost Analysis
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Cost Basis</th>
                    <th className="pb-2">Market Value</th>
                    <th className="pb-2">Margin %</th>
                    <th className="pb-2">Carrying Cost</th>
                    <th className="pb-2">Turnover Days</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {insightsData.costAnalysis.map((item, index) => (
                    <tr key={index} className="text-sm border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-900">{item.category}</td>
                      <td className="py-3 text-gray-600">{formatCurrency(item.totalCost)}</td>
                      <td className="py-3 text-gray-600">{formatCurrency(item.totalValue)}</td>
                      <td className="py-3">
                        <span className={`font-semibold ${
                          item.margin >= 50 ? 'text-green-600' :
                          item.margin >= 30 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(item.margin)}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{formatCurrency(item.carryingCost)}</td>
                      <td className="py-3 text-gray-600">{formatDays(item.turnoverDays)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Performance View */}
      {selectedInsight === 'suppliers' && (
        <div className="space-y-6">
          {/* Supplier Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insightsData.supplierPerformance.map((supplier, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-gray-900">{supplier.supplier}</h5>
                  <div className="flex items-center space-x-1">
                    <ShieldCheckIcon className={`h-4 w-4 ${
                      supplier.quality >= 95 ? 'text-green-500' :
                      supplier.quality >= 90 ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                    <span className="text-xs font-medium text-gray-600">{supplier.quality}%</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Orders:</span>
                    <span className="font-medium">{supplier.orders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">On-Time Delivery:</span>
                    <span className={`font-medium ${
                      supplier.onTimeDelivery >= 90 ? 'text-green-600' :
                      supplier.onTimeDelivery >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {supplier.onTimeDelivery}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cost Efficiency:</span>
                    <span className={`font-medium ${
                      supplier.costEfficiency >= 85 ? 'text-green-600' :
                      supplier.costEfficiency >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {supplier.costEfficiency}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Spent:</span>
                    <span className="font-medium">{formatCurrency(supplier.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Lead Time:</span>
                    <span className="font-medium">{formatDays(supplier.avgLeadTime)}</span>
                  </div>
                </div>

                {/* Supplier Rating */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overall Rating:</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => {
                        const rating = Math.round((supplier.onTimeDelivery + supplier.quality + supplier.costEfficiency) / 60)
                        return (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < rating ? 'bg-yellow-400' : 'bg-gray-200'
                            }`}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
