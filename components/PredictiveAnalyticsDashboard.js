'use client'

import { useState, useEffect } from 'react'

export default function PredictiveAnalyticsDashboard({ barbershopId }) {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (barbershopId) {
      loadPredictiveAnalytics()
    }
  }, [barbershopId])

  const loadPredictiveAnalytics = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/barbershop/${barbershopId}/predictive-analytics`)
      
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      } else {
        setError('Failed to load predictive analytics')
      }
      
    } catch (err) {
      setError('Error loading predictive analytics data')
      console.error('Error loading predictive analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDemandLevelColor = (level) => {
    switch (level) {
      case 'peak': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getImpactLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Generating predictive analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadPredictiveAnalytics}
          className="mt-2 text-red-600 hover:text-red-700 font-medium"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">No data available for predictive analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">🔮 Predictive Analytics</h2>
            <p className="opacity-90">AI-powered insights and forecasting for your barbershop</p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">Analysis based on</div>
            <div className="text-xl font-semibold">{analyticsData.total_bookings_analyzed} bookings</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'demand', name: 'Demand Forecast', icon: '📈' },
            { id: 'pricing', name: 'Dynamic Pricing', icon: '💰' },
            { id: 'insights', name: 'Business Insights', icon: '💡' },
            { id: 'patterns', name: 'Patterns', icon: '🔄' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Key Metrics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analyticsData.demand_forecasts.length}</div>
                <div className="text-sm text-blue-800">Demand Forecasts</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analyticsData.pricing_recommendations.length}</div>
                <div className="text-sm text-green-800">Pricing Recommendations</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{analyticsData.business_insights.length}</div>
                <div className="text-sm text-purple-800">Business Insights</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{analyticsData.seasonal_patterns.length}</div>
                <div className="text-sm text-orange-800">Seasonal Patterns</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
            
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Apply Pricing Recommendations</div>
                <div className="text-sm text-blue-700">Update service prices based on demand forecast</div>
              </button>
              
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="font-medium text-green-900">Staff Scheduling</div>
                <div className="text-sm text-green-700">Optimize staffing based on demand patterns</div>
              </button>
              
              <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Marketing Campaigns</div>
                <div className="text-sm text-purple-700">Launch targeted campaigns for low-demand periods</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demand Forecast Tab */}
      {activeTab === 'demand' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Demand Forecasts</h3>
            
            {analyticsData.demand_forecasts.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.demand_forecasts.map((forecast, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 capitalize">
                          {forecast.service_type.replace('_', ' ')} - {forecast.time_period}
                        </h4>
                        <p className="text-sm text-gray-600">Forecast for {formatDate(forecast.forecast_date)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatPercentage(forecast.predicted_demand)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatPercentage(forecast.confidence_level)} confidence
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Contributing Factors:</div>
                      <div className="flex flex-wrap gap-2">
                        {forecast.contributing_factors.map((factor, factorIndex) => (
                          <span key={factorIndex} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {forecast.recommended_actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No demand forecasts available</p>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Dynamic Pricing Recommendations</h3>
            
            {analyticsData.pricing_recommendations.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.pricing_recommendations.map((pricing, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{pricing.service_id}</h4>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getDemandLevelColor(pricing.demand_level)}`}>
                          {pricing.demand_level} demand
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 line-through">{formatCurrency(pricing.base_price)}</span>
                          <span className="text-xl font-bold text-green-600">{formatCurrency(pricing.recommended_price)}</span>
                        </div>
                        <div className={`text-sm font-medium ${
                          pricing.price_adjustment > 0 ? 'text-green-600' : 
                          pricing.price_adjustment < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {pricing.price_adjustment > 0 ? '+' : ''}{pricing.price_adjustment.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">{pricing.pricing_reason}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Revenue Impact</div>
                        <div className={`${
                          pricing.expected_impact.revenue_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {pricing.expected_impact.revenue_change > 0 ? '+' : ''}{formatPercentage(pricing.expected_impact.revenue_change)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Demand Impact</div>
                        <div className={`${
                          pricing.expected_impact.demand_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {pricing.expected_impact.demand_change > 0 ? '+' : ''}{formatPercentage(pricing.expected_impact.demand_change)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Valid Until</div>
                        <div className="text-gray-600">{formatDate(pricing.valid_until)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No pricing recommendations available</p>
            )}
          </div>
        </div>
      )}

      {/* Business Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Business Insights</h3>
            
            {analyticsData.business_insights.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.business_insights.map((insight, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{insight.title}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactLevelColor(insight.impact_level)}`}>
                            {insight.impact_level} impact
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(insight.potential_value)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatPercentage(insight.confidence_score)} confidence
                        </div>
                        <div className="text-xs text-orange-600">
                          Urgency: {insight.urgency_level}/10
                        </div>
                      </div>
                    </div>
                    
                    {insight.actionable_recommendations && insight.actionable_recommendations.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {insight.actionable_recommendations.map((action, actionIndex) => (
                            <li key={actionIndex} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span>{typeof action === 'object' ? action.action : action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No business insights available</p>
            )}
          </div>
        </div>
      )}

      {/* Seasonal Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Seasonal Patterns</h3>
            
            {analyticsData.seasonal_patterns.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.seasonal_patterns.map((pattern, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 capitalize">
                          {pattern.pattern_type.replace('_', ' ')} Pattern
                        </h4>
                        <p className="text-sm text-gray-600">
                          Next occurrence: {formatDate(pattern.next_occurrence)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">
                          {formatPercentage(pattern.strength)}
                        </div>
                        <div className="text-xs text-gray-500">Pattern strength</div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Pattern Data:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(pattern.pattern_data, null, 2)}</pre>
                      </div>
                    </div>
                    
                    {pattern.recommended_preparation && pattern.recommended_preparation.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Preparation Recommendations:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {pattern.recommended_preparation.map((prep, prepIndex) => (
                            <li key={prepIndex} className="flex items-start">
                              <span className="text-purple-500 mr-2">•</span>
                              <span>{prep}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No seasonal patterns detected</p>
            )}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadPredictiveAnalytics}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Refresh Analytics
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Last updated: {analyticsData.analytics_generated_at ? new Date(analyticsData.analytics_generated_at).toLocaleString() : 'Just now'}
        </p>
      </div>
    </div>
  )
}