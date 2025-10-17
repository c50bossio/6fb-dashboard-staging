'use client'

import { useState, useEffect } from 'react'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'

export default function PredictiveAnalyticsPanel({ data }) {
  // Get current location from GlobalDashboardContext (source of truth for shop selection)
  const { currentLocationId } = useGlobalDashboard()
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [selectedForecastType, setSelectedForecastType] = useState('comprehensive')
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState('weekly')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    // Use the data passed from UnifiedDashboard
    if (data?.predictions) {
      setPredictions(data.predictions)
      setLastUpdated(new Date())
      setLoading(false)
    } else if (currentLocationId) {
      // Only load predictions if we have a location selected
      loadPredictions()
    }

    // Auto-refresh predictions every 10 minutes (only if location is selected)
    let interval
    if (currentLocationId) {
      interval = setInterval(loadPredictions, 10 * 60 * 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [data, selectedForecastType, selectedTimeHorizon, currentLocationId])

  const loadPredictions = async () => {
    try {
      setError(null)

      // CRITICAL: Use real barbershop ID from GlobalDashboardContext (NO DEMO DATA!)
      if (!currentLocationId) {
        setError('No location selected. Please select a shop to view predictions.')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/ai/predictive?barbershopId=${currentLocationId}`)
      const data = await response.json()

      if (data.success) {
        setPredictions(data.predictions)
        setLastUpdated(new Date())
      } else if (data.insufficient_data) {
        // Handle insufficient data gracefully (following NO MOCK DATA policy)
        setError(data.friendly_message || 'Insufficient data for predictions')
        setPredictions(null)
      } else {
        setError(data.error || 'Failed to load predictions')
      }
    } catch (err) {
      console.error('Failed to load predictions:', err)
      setError('Connection error. Please try again.')
      setPredictions(null) // NO FALLBACK TO DEMO DATA!
    } finally {
      setLoading(false)
    }
  }

  const generateNewPredictions = async () => {
    setGenerating(true)
    try {
      // CRITICAL: Use real barbershop ID from GlobalDashboardContext (NO DEMO DATA!)
      if (!currentLocationId) {
        setError('No location selected. Please select a shop to generate predictions.')
        setGenerating(false)
        return
      }

      // Get actual business context from data prop (passed from UnifiedDashboard)
      const businessContext = {
        shop_name: data?.shopName || 'Your Shop',
        current_revenue: data?.metrics?.revenue || 0,
        customer_count: data?.metrics?.customers || 0,
        avg_satisfaction: data?.metrics?.satisfaction || 0,
        service_utilization: data?.todayMetrics?.capacity / 100 || 0
      }

      const response = await fetch('/api/ai/predictive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'revenue_forecast',
          barbershop_id: currentLocationId, // Use REAL ID!
          parameters: {
            timeframe: selectedTimeHorizon === 'weekly' ? 7 : selectedTimeHorizon === 'monthly' ? 30 : 1,
            confidence_level: 0.85
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        setPredictions(data.forecast)
        setLastUpdated(new Date())
      } else if (data.insufficient_data) {
        // Handle insufficient data gracefully (following NO MOCK DATA policy)
        setError(data.error || 'Insufficient data to generate predictions')
        setPredictions(null)
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (err) {
      console.error('Failed to generate predictions:', err)
      setError('Failed to generate new predictions')
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.7) return 'text-amber-800'
    return 'text-red-600'
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return '📈'
      case 'decreasing': return '📉'
      case 'stable': return '➡️'
      default: return '📊'
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              🔮 Predictive Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              AI-powered business forecasting and demand prediction
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedForecastType}
              onChange={(e) => setSelectedForecastType(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-olive-500 text-sm"
            >
              <option value="comprehensive">Comprehensive</option>
              <option value="revenue">Revenue Forecast</option>
              <option value="customer">Customer Behavior</option>
              <option value="demand">Demand Forecast</option>
              <option value="pricing">Pricing Optimization</option>
            </select>
            <select
              value={selectedTimeHorizon}
              onChange={(e) => setSelectedTimeHorizon(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-olive-500 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button
              onClick={loadPredictions}
              disabled={loading}
              className="px-3 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:bg-muted disabled:text-muted-foreground flex items-center gap-2 text-sm"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                '🔄'
              )}
              Refresh
            </button>
            <button
              onClick={generateNewPredictions}
              disabled={generating}
              className="px-3 py-2 bg-gold-700 text-white rounded-lg hover:bg-gold-700 disabled:bg-muted disabled:text-muted-foreground flex items-center gap-2 text-sm"
            >
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                '✨'
              )}
              Generate New
            </button>
          </div>
        </div>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg mt-2 text-sm">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading predictive analytics...</p>
        </div>
      ) : predictions ? (
        <div className="space-y-6">
          {/* Overview Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">🎯 Overall Confidence</h3>
              <div className="text-2xl font-bold mb-1">
                <span className={getConfidenceColor(predictions.overallConfidence || 0.75)}>
                  {Math.round((predictions.overallConfidence || 0.75) * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Prediction accuracy</p>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">📊 Forecast Type</h3>
              <div className="text-lg font-bold text-foreground mb-1 capitalize">
                {selectedForecastType}
              </div>
              <p className="text-xs text-muted-foreground">{selectedTimeHorizon} horizon</p>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">⏰ Generated</h3>
              <div className="text-lg font-bold text-foreground mb-1">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">Latest forecast run</p>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">🔬 Analysis Depth</h3>
              <div className="text-lg font-bold text-foreground mb-1">Advanced</div>
              <p className="text-xs text-muted-foreground">ML + AI insights</p>
            </div>
          </div>

          {/* Revenue Forecast */}
          {predictions.revenueForecast && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">💰 Revenue Forecast</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {Object.entries(predictions.revenueForecast.predictions).map(([period, data]) => (
                  <div key={period} className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="font-semibold text-sm text-foreground mb-2 capitalize">{period.replace('_', ' ')}</h3>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400 mb-1">
                      {formatCurrency(data.value)}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className={getConfidenceColor(data.confidence)}>
                        {Math.round(data.confidence * 100)}%
                      </span>
                      <span>{getTrendIcon(data.trend)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">📈 Contributing Factors</h3>
                  <ul className="space-y-1">
                    {predictions.revenueForecast.factors?.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-olive-600 dark:text-olive-400">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">💡 Recommendations</h3>
                  <ul className="space-y-1">
                    {predictions.revenueForecast.recommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-green-600 dark:text-green-400">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Customer Behavior Analysis */}
          {predictions.customerBehavior && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">👥 Customer Behavior Predictions</h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {predictions.customerBehavior.segments?.map((segment, idx) => (
                  <div key={idx} className="p-4 bg-olive-50 dark:bg-olive-900/20 rounded-lg">
                    <h3 className="font-semibold text-sm text-foreground mb-2">{segment.name}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-semibold text-foreground">{segment.size} customers</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retention:</span>
                        <span className="font-semibold text-foreground">{Math.round(segment.retentionRate * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Growth:</span>
                        <span className={`font-semibold ${segment.predictedGrowth > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {segment.predictedGrowth > 0 ? '+' : ''}{Math.round(segment.predictedGrowth * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Value:</span>
                        <span className="font-semibold text-foreground">{formatCurrency(segment.avgMonthlyValue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {predictions.customerBehavior.churnPrediction && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-foreground mb-3">⚠️ Churn Risk Analysis</h3>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        {predictions.customerBehavior.churnPrediction.highRisk}
                      </div>
                      <div className="text-xs text-muted-foreground">High Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-800 dark:text-amber-400">
                        {predictions.customerBehavior.churnPrediction.mediumRisk}
                      </div>
                      <div className="text-xs text-muted-foreground">Medium Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {predictions.customerBehavior.churnPrediction.lowRisk}
                      </div>
                      <div className="text-xs text-muted-foreground">Low Risk</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-xs text-foreground mb-1">Intervention Strategies:</h4>
                    <ul className="text-xs space-y-1">
                      {predictions.customerBehavior.churnPrediction.interventionRecommendations?.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-foreground">
                          <span className="text-amber-800 dark:text-amber-400">⚡</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-lg shadow-sm border border-border">
          <p className="text-muted-foreground mb-4">No predictions available</p>
          <button
            onClick={generateNewPredictions}
            disabled={generating}
            className="px-6 py-3 bg-gold-700 text-white rounded-lg hover:bg-gold-700 disabled:bg-muted disabled:text-muted-foreground"
          >
            Generate Predictions
          </button>
        </div>
      )}
    </div>
  )
}

// Following NO MOCK DATA policy: generateDemoPredictions() function has been removed
// When predictions cannot be loaded, user sees friendly empty state prompting real data entry