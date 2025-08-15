'use client'

import { useState, useEffect } from 'react'

export default function PredictiveAnalyticsPanel({ data }) {
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [selectedForecastType, setSelectedForecastType] = useState('comprehensive')
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState('weekly')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    if (data?.predictions) {
      setPredictions(data.predictions)
      setLastUpdated(new Date())
      setLoading(false)
    } else {
      loadPredictions()
    }
    
    const interval = setInterval(loadPredictions, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [data, selectedForecastType, selectedTimeHorizon])

  const loadPredictions = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/ai/predictive?barbershop_id=demo`)
      const data = await response.json()

      if (data.success) {
        setPredictions(data.predictions)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to load predictions')
      }
    } catch (err) {
      console.error('Failed to load predictions:', err)
      setError('Connection error - using demo predictions')
      setPredictions(await generateDemoPredictions())
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  const generateNewPredictions = async () => {
    setGenerating(true)
    try {
      const businessContext = {
        shop_name: 'Demo Barbershop',
        current_revenue: 1200 + Math.random() * 400,
        customer_count: 350 + Math.random() * 100,
        avg_satisfaction: 4.2 + Math.random() * 0.6,
        service_utilization: 0.7 + Math.random() * 0.2
      }

      const response = await fetch('/api/ai/predictive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prediction_type: 'revenue_forecast',
          barbershop_id: 'demo',
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              🔮 Predictive Analytics
            </h2>
            <p className="text-sm text-gray-600">
              AI-powered business forecasting and demand prediction
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedForecastType}
              onChange={(e) => setSelectedForecastType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 text-sm"
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button
              onClick={loadPredictions}
              disabled={loading}
              className="px-3 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:bg-gray-300 flex items-center gap-2 text-sm"
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
              className="px-3 py-2 bg-gold-700 text-white rounded-lg hover:bg-gold-700 disabled:bg-gray-300 flex items-center gap-2 text-sm"
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
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mt-2 text-sm">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading predictive analytics...</p>
        </div>
      ) : predictions ? (
        <div className="space-y-6">
          {/* Overview Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-2">🎯 Overall Confidence</h3>
              <div className="text-2xl font-bold mb-1">
                <span className={getConfidenceColor(predictions.overallConfidence || 0.75)}>
                  {Math.round((predictions.overallConfidence || 0.75) * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-600">Prediction accuracy</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-2">📊 Forecast Type</h3>
              <div className="text-lg font-bold mb-1 capitalize">
                {selectedForecastType}
              </div>
              <p className="text-xs text-gray-600">{selectedTimeHorizon} horizon</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-2">⏰ Generated</h3>
              <div className="text-lg font-bold mb-1">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
              </div>
              <p className="text-xs text-gray-600">Latest forecast run</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-2">🔬 Analysis Depth</h3>
              <div className="text-lg font-bold mb-1">Advanced</div>
              <p className="text-xs text-gray-600">ML + AI insights</p>
            </div>
          </div>

          {/* Revenue Forecast */}
          {predictions.revenueForecast && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">💰 Revenue Forecast</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {Object.entries(predictions.revenueForecast.predictions).map(([period, data]) => (
                  <div key={period} className="text-center p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2 capitalize">{period.replace('_', ' ')}</h3>
                    <div className="text-xl font-bold text-green-600 mb-1">
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
                  <h3 className="font-semibold text-sm mb-2">📈 Contributing Factors</h3>
                  <ul className="space-y-1">
                    {predictions.revenueForecast.factors?.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-olive-600">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-2">💡 Recommendations</h3>
                  <ul className="space-y-1">
                    {predictions.revenueForecast.recommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600">✓</span>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">👥 Customer Behavior Predictions</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {predictions.customerBehavior.segments?.map((segment, idx) => (
                  <div key={idx} className="p-4 bg-olive-50 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2">{segment.name}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span className="font-semibold">{segment.size} customers</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retention:</span>
                        <span className="font-semibold">{Math.round(segment.retentionRate * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Growth:</span>
                        <span className={`font-semibold ${segment.predictedGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {segment.predictedGrowth > 0 ? '+' : ''}{Math.round(segment.predictedGrowth * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Value:</span>
                        <span className="font-semibold">{formatCurrency(segment.avgMonthlyValue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {predictions.customerBehavior.churnPrediction && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3">⚠️ Churn Risk Analysis</h3>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">
                        {predictions.customerBehavior.churnPrediction.highRisk}
                      </div>
                      <div className="text-xs text-gray-600">High Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-800">
                        {predictions.customerBehavior.churnPrediction.mediumRisk}
                      </div>
                      <div className="text-xs text-gray-600">Medium Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {predictions.customerBehavior.churnPrediction.lowRisk}
                      </div>
                      <div className="text-xs text-gray-600">Low Risk</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-xs mb-1">Intervention Strategies:</h4>
                    <ul className="text-xs space-y-1">
                      {predictions.customerBehavior.churnPrediction.interventionRecommendations?.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-800">⚡</span>
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
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-4">No predictions available</p>
          <button
            onClick={generateNewPredictions}
            disabled={generating}
            className="px-6 py-3 bg-gold-700 text-white rounded-lg hover:bg-gold-700 disabled:bg-gray-300"
          >
            Generate Predictions
          </button>
        </div>
      )}
    </div>
  )
}

async function generateDemoPredictions() {
  return {
    id: `demo_forecast_${Date.now()}`,
    type: 'comprehensive',
    timeHorizon: 'weekly',
    generated_at: new Date().toISOString(),
    overallConfidence: 0.84,
    revenueForecast: {
      currentRevenue: 1350,
      predictions: {
        '1_day': { value: 1280, confidence: 0.91, trend: 'stable' },
        '1_week': { value: 8950, confidence: 0.86, trend: 'increasing' },
        '1_month': { value: 39200, confidence: 0.79, trend: 'increasing' }
      },
      factors: [
        'Holiday season demand increase (+18%)',
        'Customer retention improvement (+12%)',
        'Premium service uptake (+8%)'
      ],
      recommendations: [
        'Extend holiday hours to capture peak demand',
        'Promote premium services to loyal customers',
        'Implement holiday booking incentives'
      ]
    },
    customerBehavior: {
      segments: [
        {
          name: 'VIP Customers',
          size: 92,
          retentionRate: 0.94,
          predictedGrowth: 0.06,
          avgMonthlyValue: 195,
          recommendations: [
            'Offer exclusive holiday packages',
            'Provide VIP scheduling priority'
          ]
        },
        {
          name: 'Regular Customers',
          size: 285,
          retentionRate: 0.78,
          predictedGrowth: 0.04,
          avgMonthlyValue: 105,
          recommendations: [
            'Implement loyalty point system',
            'Send monthly service reminders'
          ]
        }
      ],
      churnPrediction: {
        highRisk: 15,
        mediumRisk: 32,
        lowRisk: 388,
        interventionRecommendations: [
          'Priority outreach to high-risk customers',
          'Satisfaction surveys for medium-risk segment',
          'Loyalty rewards for stable customer base'
        ]
      }
    }
  }
}