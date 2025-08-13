'use client'

import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  StarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function PredictiveAnalyticsDashboard({ className = '' }) {
  const [predictiveData, setPredictiveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('1_week')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchPredictiveAnalytics()
  }, [selectedTimeframe])

  const fetchPredictiveAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/analytics/predictive?type=comprehensive&timeframe=${selectedTimeframe}`)
      const data = await response.json()
      
      if (data.success) {
        setPredictiveData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch predictive analytics')
      }
    } catch (err) {
      console.error('Predictive analytics error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshAnalytics = async () => {
    setRefreshing(true)
    await fetchPredictiveAnalytics()
    setRefreshing(false)
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-amber-800 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
    if (trend === 'decreasing') return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
    return <ClockIcon className="h-4 w-4 text-gray-500" />
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value) => {
    return (value * 100).toFixed(1) + '%'
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPredictiveAnalytics}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!predictiveData) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center py-8">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Predictive analytics data is not available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0">
            <SparklesIcon className="h-6 w-6 text-gold-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Predictive Business Intelligence</h2>
              <p className="text-sm text-gray-600">AI-powered forecasting and insights</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Timeframe Selector */}
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
            >
              <option value="1_day">24 Hours</option>
              <option value="1_week">1 Week</option>
              <option value="1_month">1 Month</option>
            </select>
            
            {/* Refresh Button */}
            <button
              onClick={refreshAnalytics}
              disabled={refreshing}
              className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Confidence Indicator */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Overall Confidence:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(predictiveData.confidence_level)}`}>
              {(predictiveData.confidence_level * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Generated: {new Date(predictiveData.generated_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Revenue Forecast */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 text-green-600 mr-2" />
            Revenue Forecast
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {Object.entries(predictiveData.revenue_forecast.predictions).map(([period, data]) => (
              <div key={period} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {period.replace('_', ' ').toUpperCase()}
                  </span>
                  {getTrendIcon(data.trend)}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(data.value)}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${getConfidenceColor(data.confidence)}`}>
                    {(data.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                {data.factors && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Key factors:</p>
                    <ul className="text-xs text-gray-500 mt-1">
                      {data.factors.slice(0, 2).map((factor, idx) => (
                        <li key={idx}>• {factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Customer Behavior Forecast */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 text-olive-600 mr-2" />
            Customer Behavior Predictions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-olive-50 rounded-lg p-4">
              <div className="text-sm font-medium text-olive-800 mb-2">Retention Rate</div>
              <div className="text-xl font-bold text-olive-900">
                {formatPercentage(predictiveData.customer_behavior_forecast.retention_rate.predicted_1_month)}
              </div>
              <div className="text-xs text-olive-700">
                Current: {formatPercentage(predictiveData.customer_behavior_forecast.retention_rate.current)}
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-800 mb-2">Visit Frequency</div>
              <div className="text-xl font-bold text-green-900">
                {predictiveData.customer_behavior_forecast.visit_frequency.predicted}
              </div>
              <div className="text-xs text-green-700">visits/month</div>
            </div>
            
            <div className="bg-gold-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gold-800 mb-2">Lifetime Value</div>
              <div className="text-xl font-bold text-gold-900">
                {formatCurrency(predictiveData.customer_behavior_forecast.customer_lifetime_value.predicted_6_months)}
              </div>
              <div className="text-xs text-gold-700">6-month projection</div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <LightBulbIcon className="h-5 w-5 text-amber-800 mr-2" />
            AI-Generated Business Insights
          </h3>
          
          <div className="space-y-4">
            {predictiveData.ai_insights.map((insight, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        insight.priority === 'high' ? 'bg-softred-100 text-softred-900' :
                        insight.priority === 'medium' ? 'bg-amber-100 text-amber-900' :
                        'bg-olive-100 text-olive-800'
                      }`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-green-600">
                      +{formatCurrency(insight.estimated_value)}
                    </div>
                    <div className="text-xs text-gray-500">monthly potential</div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded text-xs ${getConfidenceColor(insight.confidence)}`}>
                      {(insight.confidence * 100).toFixed(0)}% confidence
                    </span>
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-amber-800 mr-1" />
                      <span className="text-sm text-gray-600">
                        Impact Score: {(insight.impact_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {insight.recommendations && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {insight.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-olive-600 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Recommendations */}
        {predictiveData.recommendations && predictiveData.recommendations.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <EyeIcon className="h-5 w-5 text-olive-600 mr-2" />
              Strategic Recommendations
            </h3>
            
            <div className="bg-indigo-50 rounded-lg p-4">
              <ul className="space-y-2">
                {predictiveData.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start text-sm text-indigo-800">
                    <span className="text-olive-600 mr-2 mt-0.5">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Model Performance Info */}
        {predictiveData.model_performance && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div>Model Accuracy: {(predictiveData.model_performance.accuracy_score * 100).toFixed(1)}%</div>
              <div>Data Points: {predictiveData.model_performance.data_points_used?.toLocaleString()}</div>
              <div>Last Trained: {new Date(predictiveData.model_performance.model_last_trained).toLocaleDateString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}