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
    loading: true,
    error: null
  })
  const [selectedInsight, setSelectedInsight] = useState('alerts') // alerts, predictions, analysis, suppliers
  const [alertFilter, setAlertFilter] = useState('all') // all, critical, warning

  useEffect(() => {
    loadInventoryInsights()
  }, [products])

  const loadInventoryInsights = async () => {
    try {
      setInsightsData(prev => ({ ...prev, loading: true, error: null }))

      // Fetch inventory insights from API
      const response = await fetch('/api/shop/analytics/inventory-insights?period_days=90')
      const data = await response.json()

      if (data.success) {
        // Map API response structure to component state
        // Transform stock_alerts object to flat array
        const stockAlertsArray = [
          ...(data.stock_alerts?.alerts?.critical || []).map(alert => ({ ...alert, severity: 'critical' })),
          ...(data.stock_alerts?.alerts?.high || []).map(alert => ({ ...alert, severity: 'warning' })),
          ...(data.stock_alerts?.alerts?.medium || []).map(alert => ({ ...alert, severity: 'warning' }))
        ].map(alert => ({
          product: alert.name,
          category: alert.category,
          severity: alert.severity,
          currentStock: alert.current_stock,
          daysUntilEmpty: alert.days_remaining || 0,
          avgDailySales: 0, // TODO: Not in API response
          suggestedOrder: 0, // TODO: Not in API response
          action: alert.recommended_action,
          cost: 0 // TODO: Not in API response
        }))

        // Transform reorder_recommendations
        const reorderSuggestions = (data.reorder_recommendations?.recommendations || []).map(rec => ({
          product: rec.name,
          category: rec.category,
          currentStock: rec.current_stock,
          suggestedQuantity: rec.suggested_reorder_quantity,
          estimatedCost: rec.estimated_cost,
          priority: rec.priority
        }))

        // Transform ABC analysis to category health
        const categoryHealth = (data.abc_analysis?.products || []).slice(0, 5).map(product => ({
          category: product.category,
          status: product.classification === 'A' ? 'optimal' :
                  product.classification === 'B' ? 'good' : 'warning',
          stockDays: 30, // TODO: Not directly available
          turnoverRate: product.turnover_rate,
          value: product.revenue_value,
          trend: 'stable'
        }))

        // Transform actionable_insights to predictive insights
        const predictiveInsights = (data.actionable_insights || []).map(insight => ({
          title: insight.title,
          message: insight.description,
          impact: insight.priority === 1 ? 'high' : insight.priority === 2 ? 'medium' : 'low',
          confidence: 85, // TODO: Not in API
          timeframe: '30 days'
        }))

        // Transform inventory_valuation to cost analysis
        const costAnalysis = (data.inventory_valuation?.category_breakdown || []).map(cat => ({
          category: cat.category,
          totalCost: cat.inventory_value,
          totalValue: cat.retail_value,
          margin: ((cat.retail_value - cat.inventory_value) / cat.retail_value) * 100,
          carryingCost: 0, // TODO: Not in API
          turnoverDays: 0 // TODO: Not in API
        }))

        setInsightsData({
          stockAlerts: stockAlertsArray,
          reorderSuggestions: reorderSuggestions,
          categoryHealth: categoryHealth,
          predictiveInsights: predictiveInsights,
          costAnalysis: costAnalysis,
          supplierPerformance: [], // TODO: API doesn't provide supplier performance data yet
          loading: false,
          error: null
        })
      } else {
        // API returned error - show error state
        setInsightsData(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to load inventory insights'
        }))
      }
    } catch (error) {
      console.error('Error loading inventory insights:', error)
      // Network or parsing error - show error state
      setInsightsData(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to connect to server. Please try again later.'
      }))
    }
  }

  const formatCurrency = (value) => `$${value.toLocaleString()}`
  const formatPercentage = (value) => `${value.toFixed(1)}%`
  const formatDays = (days) => `${days} day${days !== 1 ? 's' : ''}`

  const filteredAlerts = insightsData.stockAlerts.filter(alert => 
    alertFilter === 'all' || alert.severity === alertFilter
  )

  if (insightsData.loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (insightsData.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <LightBulbIcon className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-card-foreground">Inventory Insights</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Unable to Load Insights</h4>
              <p className="text-sm text-red-700">{insightsData.error}</p>
              <button
                onClick={loadInventoryInsights}
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

  // Empty state - no data available
  const hasNoData =
    insightsData.stockAlerts.length === 0 &&
    insightsData.categoryHealth.length === 0 &&
    insightsData.predictiveInsights.length === 0 &&
    insightsData.costAnalysis.length === 0 &&
    insightsData.supplierPerformance.length === 0

  if (hasNoData) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <LightBulbIcon className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-card-foreground">Inventory Insights</h3>
        </div>
        <div className="bg-muted border border-border rounded-lg p-8 text-center">
          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-card-foreground mb-1">No Inventory Data Available</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Start adding products to your inventory to see intelligent insights and analytics.
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
          <LightBulbIcon className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-card-foreground">Inventory Insights</h3>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
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
                  ? 'bg-card text-purple-600 shadow-sm'
                  : 'text-muted-foreground hover:text-card-foreground'
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
            <span className="text-sm text-muted-foreground">Filter:</span>
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="border border-input bg-background text-foreground rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                      <span className="font-semibold text-card-foreground">{alert.product}</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
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
                        <span className="text-muted-foreground">Current Stock:</span>
                        <div className="font-medium">{alert.currentStock} units</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Days Until Empty:</span>
                        <div className="font-medium">{formatDays(alert.daysUntilEmpty)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Daily Sales:</span>
                        <div className="font-medium">{alert.avgDailySales}/day</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Suggested Order:</span>
                        <div className="font-medium">{alert.suggestedOrder} units</div>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">{alert.action}</div>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-lg font-bold text-card-foreground">
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
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-card-foreground mb-3">Category Health Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {insightsData.categoryHealth.map((category, index) => (
                <div key={index} className="bg-card p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-card-foreground">{category.category}</span>
                    <div className={`w-3 h-3 rounded-full ${
                      category.status === 'critical' ? 'bg-red-500' :
                      category.status === 'warning' ? 'bg-yellow-500' :
                      category.status === 'good' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}></div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
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
                      'text-muted-foreground'
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
            <h4 className="text-sm font-semibold text-card-foreground">AI-Powered Insights</h4>
            {insightsData.predictiveInsights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                insight.impact === 'high' ? 'bg-blue-50 border-blue-400' :
                insight.impact === 'medium' ? 'bg-green-50 border-green-400' :
                'bg-muted border-border'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-card-foreground">{insight.title}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        insight.impact === 'high' ? 'bg-blue-100 text-blue-800' :
                        insight.impact === 'medium' ? 'bg-green-100 text-green-800' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {insight.impact} impact
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        {insight.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{insight.message}</p>
                    <div className="text-xs text-muted-foreground">
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
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center">
              <BanknotesIcon className="h-4 w-4 mr-2" />
              Inventory Cost Analysis
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
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
                    <tr key={index} className="text-sm border-b border-border">
                      <td className="py-3 font-medium text-card-foreground">{item.category}</td>
                      <td className="py-3 text-muted-foreground">{formatCurrency(item.totalCost)}</td>
                      <td className="py-3 text-muted-foreground">{formatCurrency(item.totalValue)}</td>
                      <td className="py-3">
                        <span className={`font-semibold ${
                          item.margin >= 50 ? 'text-green-600' :
                          item.margin >= 30 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(item.margin)}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{formatCurrency(item.carryingCost)}</td>
                      <td className="py-3 text-muted-foreground">{formatDays(item.turnoverDays)}</td>
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
              <div key={index} className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-card-foreground">{supplier.supplier}</h5>
                  <div className="flex items-center space-x-1">
                    <ShieldCheckIcon className={`h-4 w-4 ${
                      supplier.quality >= 95 ? 'text-green-500' :
                      supplier.quality >= 90 ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                    <span className="text-xs font-medium text-muted-foreground">{supplier.quality}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="font-medium">{supplier.orders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">On-Time Delivery:</span>
                    <span className={`font-medium ${
                      supplier.onTimeDelivery >= 90 ? 'text-green-600' :
                      supplier.onTimeDelivery >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {supplier.onTimeDelivery}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost Efficiency:</span>
                    <span className={`font-medium ${
                      supplier.costEfficiency >= 85 ? 'text-green-600' :
                      supplier.costEfficiency >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {supplier.costEfficiency}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Spent:</span>
                    <span className="font-medium">{formatCurrency(supplier.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Lead Time:</span>
                    <span className="font-medium">{formatDays(supplier.avgLeadTime)}</span>
                  </div>
                </div>

                {/* Supplier Rating */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overall Rating:</span>
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
