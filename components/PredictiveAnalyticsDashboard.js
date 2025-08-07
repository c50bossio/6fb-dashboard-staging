'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function PredictiveAnalyticsDashboard({ barbershop_id = 'demo', compact = false }) {
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState(30)

  useEffect(() => {
    loadPredictions()
  }, [barbershop_id, selectedTimeframe])

  const loadPredictions = async () => {
    try {
      setLoading(true)
      
      // Load main dashboard
      const dashboardResponse = await fetch(`/api/ai/predictive-analytics?barbershop_id=${barbershop_id}`)
      const dashboardData = await dashboardResponse.json()
      
      // Load revenue forecast
      const forecastResponse = await fetch('/api/ai/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'revenue_forecast',
          barbershop_id,
          parameters: { timeframe: selectedTimeframe, confidence_level: 0.85 }
        })
      })
      const forecastData = await forecastResponse.json()
      
      // Load demand patterns
      const demandResponse = await fetch('/api/ai/predictive-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'demand_prediction',
          barbershop_id
        })
      })
      const demandData = await demandResponse.json()
      
      setPredictions({
        dashboard: dashboardData.success ? dashboardData.dashboard : null,
        forecast: forecastData.success ? forecastData.forecast : null,
        demand: demandData.success ? demandData.demand_prediction : null
      })
    } catch (error) {
      console.error('Failed to load predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshPredictions = () => {
    loadPredictions()
  }

  if (loading && !predictions) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">Predictive Analytics</h3>
          {predictions?.dashboard && (
            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
              {predictions.dashboard.prediction_accuracy} accuracy
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!compact && (
            <>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
              <div className="h-4 w-px bg-gray-300"></div>
            </>
          )}
          <button
            onClick={refreshPredictions}
            disabled={loading}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center space-x-1"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Update</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      {!compact && (
        <div className="border-b">
          <nav className="flex space-x-6 px-4">
            {[
              { id: 'overview', name: 'Overview', icon: EyeIcon },
              { id: 'revenue', name: 'Revenue', icon: CurrencyDollarIcon },
              { id: 'demand', name: 'Demand', icon: CalendarDaysIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeView === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="p-6">
        {/* Overview View */}
        {(activeView === 'overview' || compact) && predictions?.dashboard && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-indigo-600">Revenue Forecast</div>
                    <div className="text-2xl font-bold text-indigo-900">
                      {predictions.dashboard.revenue_forecast_next_30_days}
                    </div>
                    <div className="text-xs text-indigo-600">Next {selectedTimeframe} days</div>
                  </div>
                  <TrendingUpIcon className="h-8 w-8 text-indigo-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-600">Confidence Level</div>
                    <div className="text-2xl font-bold text-green-900">
                      {predictions.dashboard.confidence_level}
                    </div>
                    <div className="text-xs text-green-600">Model accuracy: {predictions.dashboard.prediction_accuracy}</div>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-purple-600">Active Predictions</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {predictions.dashboard.active_predictions}
                    </div>
                    <div className="text-xs text-purple-600">Monitoring key patterns</div>
                  </div>
                  <EyeIcon className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Key Predictions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Key Predictions</h4>
              <div className="space-y-3">
                {predictions.dashboard.key_predictions.map((prediction, idx) => (
                  <div key={idx} className="border-l-4 border-l-indigo-500 bg-indigo-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-indigo-900">{prediction.type}</span>
                          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                            {Math.round(prediction.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-indigo-800 mb-2">{prediction.prediction}</p>
                        <p className="text-xs text-indigo-600 flex items-center space-x-1">
                          <LightBulbIcon className="h-3 w-3" />
                          <span>Recommended: {prediction.action}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trends Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Trend Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {predictions.dashboard.trends.revenue_trend}
                  </div>
                  <div className="text-sm text-gray-600">Revenue Growth</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {predictions.dashboard.trends.customer_growth}
                  </div>
                  <div className="text-sm text-gray-600">New Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">35%</div>
                  <div className="text-sm text-gray-600">Premium Adoption</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Forecast View */}
        {activeView === 'revenue' && predictions?.forecast && (
          <div className="space-y-6">
            {/* Forecast Scenarios */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Revenue Scenarios ({selectedTimeframe} days)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(predictions.forecast.scenarios).map(([scenario, data]) => (
                  <div key={scenario} className={`rounded-lg p-4 border ${
                    scenario === 'realistic' ? 'bg-blue-50 border-blue-200' :
                    scenario === 'optimistic' ? 'bg-green-50 border-green-200' :
                    'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="text-center">
                      <div className="text-sm font-medium capitalize text-gray-700 mb-2">{scenario}</div>
                      <div className={`text-xl font-bold ${
                        scenario === 'realistic' ? 'text-blue-900' :
                        scenario === 'optimistic' ? 'text-green-900' :
                        'text-orange-900'
                      }`}>
                        ${data.total_revenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        ${data.daily_average}/day avg
                      </div>
                      <div className={`text-xs mt-1 ${
                        data.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.growth_rate >= 0 ? '+' : ''}{data.growth_rate}% growth
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Drivers */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Revenue Drivers</h4>
              <div className="space-y-2">
                {predictions.forecast.key_drivers.map((driver, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm">
                    <span className="text-green-500">•</span>
                    <span className="text-gray-700">{driver}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Strategic Recommendations</h4>
              <div className="space-y-3">
                {predictions.forecast.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="font-medium text-amber-900 mb-1">{rec.action}</div>
                    <div className="text-sm text-amber-800 mb-2">{rec.impact}</div>
                    <div className="flex items-center space-x-2 text-xs text-amber-700">
                      <ClockIcon className="h-3 w-3" />
                      <span>{rec.timeframe}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demand Patterns View */}
        {activeView === 'demand' && predictions?.demand && (
          <div className="space-y-6">
            {/* Daily Demand Pattern */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Daily Demand Patterns</h4>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {Object.entries(predictions.demand.daily_patterns).map(([day, data]) => (
                  <div key={day} className={`text-center p-3 rounded-lg border ${
                    data.demand_level === 'Peak' || data.demand_level === 'Very High' ? 'bg-red-50 border-red-200' :
                    data.demand_level === 'High' ? 'bg-orange-50 border-orange-200' :
                    data.demand_level === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <div className="text-xs font-medium capitalize text-gray-600 mb-1">
                      {day}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {data.predicted_bookings}
                    </div>
                    <div className="text-xs text-gray-600">bookings</div>
                    <div className={`text-xs mt-1 font-medium ${
                      data.demand_level === 'Peak' || data.demand_level === 'Very High' ? 'text-red-600' :
                      data.demand_level === 'High' ? 'text-orange-600' :
                      data.demand_level === 'Medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {data.capacity_utilization}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Hours */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Peak Hours Analysis</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-green-600 mb-2">Peak Hours</div>
                    <div className="space-y-1">
                      {predictions.demand.hourly_patterns.peak_hours.map((hour, idx) => (
                        <div key={idx} className="text-sm text-gray-700 flex items-center space-x-2">
                          <span className="text-green-500">⚡</span>
                          <span>{hour}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-600 mb-2">Slow Periods</div>
                    <div className="space-y-1">
                      {predictions.demand.hourly_patterns.slow_periods.map((period, idx) => (
                        <div key={idx} className="text-sm text-gray-700 flex items-center space-x-2">
                          <span className="text-blue-500">📉</span>
                          <span>{period}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Recommendations */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Capacity Optimization</h4>
              <div className="space-y-3">
                {predictions.demand.capacity_recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-medium text-blue-900 mb-1">{rec.recommendation}</div>
                    <div className="text-sm text-blue-800 mb-2">{rec.impact}</div>
                    <div className="text-sm font-medium text-blue-700">{rec.revenue_potential}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}