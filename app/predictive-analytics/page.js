'use client'

import { useState, useEffect } from 'react'

export default function PredictiveAnalyticsPage() {
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [selectedForecastType, setSelectedForecastType] = useState('comprehensive')
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState('weekly')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    loadPredictions()
    
    // Auto-refresh predictions every 10 minutes
    const interval = setInterval(loadPredictions, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedForecastType, selectedTimeHorizon])

  const loadPredictions = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/ai/predictive?type=${selectedForecastType}&horizon=${selectedTimeHorizon}`)
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
      // Load mock predictions as fallback
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
          forecastType: selectedForecastType,
          businessContext,
          timeHorizon: selectedTimeHorizon,
          options: { forceRefresh: true }
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
    if (confidence >= 0.7) return 'text-yellow-600'
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🔮 Predictive Analytics
            </h1>
            <p className="text-lg text-gray-600">
              AI-powered business forecasting and demand prediction
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedForecastType}
              onChange={(e) => setSelectedForecastType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button
              onClick={loadPredictions}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2"
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
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading predictive analytics...</p>
        </div>
      ) : predictions ? (
        <div className="space-y-8">
          {/* Overview Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-lg font-semibold mb-2">🎯 Overall Confidence</h3>
              <div className="text-3xl font-bold mb-2">
                <span className={getConfidenceColor(predictions.overallConfidence || 0.75)}>
                  {Math.round((predictions.overallConfidence || 0.75) * 100)}%
                </span>
              </div>
              <p className="text-sm text-gray-600">Prediction accuracy</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-lg font-semibold mb-2">📊 Forecast Type</h3>
              <div className="text-xl font-bold mb-2 capitalize">
                {selectedForecastType}
              </div>
              <p className="text-sm text-gray-600">{selectedTimeHorizon} horizon</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-lg font-semibold mb-2">⏰ Predictions Generated</h3>
              <div className="text-xl font-bold mb-2">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
              </div>
              <p className="text-sm text-gray-600">Latest forecast run</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-lg font-semibold mb-2">🔬 Analysis Depth</h3>
              <div className="text-xl font-bold mb-2">Advanced</div>
              <p className="text-sm text-gray-600">ML + AI insights</p>
            </div>
          </div>

          {/* Revenue Forecast */}
          {predictions.revenueForecast && (
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h2 className="text-2xl font-bold mb-4">💰 Revenue Forecast</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {Object.entries(predictions.revenueForecast.predictions).map(([period, data]) => (
                  <div key={period} className="text-center p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2 capitalize">{period.replace('_', ' ')}</h3>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatCurrency(data.value)}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className={getConfidenceColor(data.confidence)}>
                        {Math.round(data.confidence * 100)}%
                      </span>
                      <span>{getTrendIcon(data.trend)}</span>
                      <span className="capitalize">{data.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">📈 Contributing Factors</h3>
                  <ul className="space-y-2">
                    {predictions.revenueForecast.factors?.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span className="text-sm">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">💡 Recommendations</h3>
                  <ul className="space-y-2">
                    {predictions.revenueForecast.recommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Customer Behavior Analysis */}
          {predictions.customerBehavior && (
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h2 className="text-2xl font-bold mb-4">👥 Customer Behavior Predictions</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {predictions.customerBehavior.segments?.map((segment, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">{segment.name}</h3>
                    <div className="space-y-2 text-sm">
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
                    <div className="mt-3">
                      <h4 className="font-medium text-xs text-gray-600 mb-1">Key Actions:</h4>
                      <ul className="text-xs space-y-1">
                        {segment.recommendations?.slice(0, 2).map((rec, ridx) => (
                          <li key={ridx} className="flex items-start gap-1">
                            <span className="text-blue-600">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {predictions.customerBehavior.churnPrediction && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">⚠️ Churn Risk Analysis</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {predictions.customerBehavior.churnPrediction.highRisk}
                      </div>
                      <div className="text-sm text-gray-600">High Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {predictions.customerBehavior.churnPrediction.mediumRisk}
                      </div>
                      <div className="text-sm text-gray-600">Medium Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {predictions.customerBehavior.churnPrediction.lowRisk}
                      </div>
                      <div className="text-sm text-gray-600">Low Risk</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Intervention Strategies:</h4>
                    <ul className="text-sm space-y-1">
                      {predictions.customerBehavior.churnPrediction.interventionRecommendations?.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-yellow-600">⚡</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Demand Forecast */}
          {predictions.demandForecast && (
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h2 className="text-2xl font-bold mb-4">📊 Demand Forecast</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold mb-3">⏰ Peak Hours</h3>
                  <div className="flex flex-wrap gap-2">
                    {predictions.demandForecast.peakHours?.map((hour, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm">
                        {hour}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-semibold mb-3">📅 Peak Days</h3>
                  <div className="flex flex-wrap gap-2">
                    {predictions.demandForecast.peakDays?.map((day, idx) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-200 text-indigo-800 rounded-full text-sm">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">📈 Service Popularity Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {predictions.demandForecast.servicePopularity?.map((service, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm mb-1">{service.service}</div>
                      <div className="flex items-center gap-2">
                        <span>{getTrendIcon(service.demandTrend)}</span>
                        <span className={`text-sm font-semibold ${
                          service.growth > 0 ? 'text-green-600' : 
                          service.growth < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {service.growth > 0 ? '+' : ''}{Math.round(service.growth * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {predictions.demandForecast.capacityUtilization && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">📊 Capacity Utilization</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold">
                        {Math.round(predictions.demandForecast.capacityUtilization.current * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Current</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-600">
                        {Math.round(predictions.demandForecast.capacityUtilization.predicted * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Predicted</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        {Math.round(predictions.demandForecast.capacityUtilization.peakUtilization * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Peak</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-purple-600">
                        {Math.round(predictions.demandForecast.capacityUtilization.optimizationOpportunity * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Opportunity</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing Optimization */}
          {predictions.pricingOptimization && (
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h2 className="text-2xl font-bold mb-4">💲 Pricing Optimization</h2>
              
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-3 text-left">Service</th>
                      <th className="border p-3 text-center">Current Price</th>
                      <th className="border p-3 text-center">Optimal Price</th>
                      <th className="border p-3 text-center">Revenue Impact</th>
                      <th className="border p-3 text-left">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.pricingOptimization.services?.map((service, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border p-3 font-medium">{service.name}</td>
                        <td className="border p-3 text-center">{formatCurrency(service.currentPrice)}</td>
                        <td className="border p-3 text-center font-semibold text-green-600">
                          {formatCurrency(service.optimalPrice)}
                        </td>
                        <td className="border p-3 text-center font-semibold text-blue-600">
                          {service.revenueImpact}
                        </td>
                        <td className="border p-3 text-sm">{service.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {predictions.pricingOptimization.dynamicPricingOpportunities && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">⚡ Dynamic Pricing Opportunities</h3>
                  <ul className="space-y-2">
                    {predictions.pricingOptimization.dynamicPricingOpportunities.map((opportunity, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600">💡</span>
                        <span className="text-sm">{opportunity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Week 3 Features Summary */}
          <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4">🚀 Week 3: Predictive Analytics Implementation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">✅ Advanced Forecasting:</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• Multi-horizon revenue forecasting (daily/weekly/monthly)</li>
                  <li>• Customer behavior prediction with churn analysis</li>
                  <li>• Demand forecasting with capacity optimization</li>
                  <li>• Service popularity trend analysis</li>
                  <li>• Peak hour and seasonal pattern detection</li>
                  <li>• ML-powered prediction confidence scoring</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🎯 Business Intelligence:</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• Dynamic pricing optimization recommendations</li>
                  <li>• Customer segment analysis and targeting</li>
                  <li>• Revenue impact assessment for decisions</li>
                  <li>• Operational efficiency optimization</li>
                  <li>• Risk-based customer intervention strategies</li>
                  <li>• Real-time predictive dashboard interface</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md border">
          <p className="text-gray-600 mb-4">No predictions available</p>
          <button
            onClick={generateNewPredictions}
            disabled={generating}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
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
            'Provide VIP scheduling priority',
            'Send personalized service recommendations'
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
            'Send monthly service reminders',
            'Offer family package discounts'
          ]
        },
        {
          name: 'New Customers',
          size: 58,
          retentionRate: 0.65,
          predictedGrowth: 0.22,
          avgMonthlyValue: 75,
          recommendations: [
            'Create new customer welcome program',
            'Follow up within 48 hours of first visit',
            'Offer return visit incentives'
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
    },
    demandForecast: {
      peakHours: ['10:00-12:00', '14:00-16:00', '17:00-19:00'],
      peakDays: ['Friday', 'Saturday', 'Sunday'],
      servicePopularity: [
        { service: 'Classic Haircut', demandTrend: 'stable', growth: 0.03 },
        { service: 'Beard Styling', demandTrend: 'increasing', growth: 0.18 },
        { service: 'Premium Package', demandTrend: 'increasing', growth: 0.25 },
        { service: 'Quick Trim', demandTrend: 'decreasing', growth: -0.05 }
      ],
      capacityUtilization: {
        current: 0.76,
        predicted: 0.84,
        peakUtilization: 0.97,
        optimizationOpportunity: 0.13
      },
      recommendations: [
        'Add weekend staff during peak hours',
        'Promote beard styling services aggressively',
        'Offer off-peak discounts Tuesday-Thursday'
      ]
    },
    pricingOptimization: {
      services: [
        {
          name: 'Classic Haircut',
          currentPrice: 30,
          optimalPrice: 34,
          elasticity: -0.5,
          revenueImpact: '+11%',
          recommendation: 'Gradual price increase over 6 weeks'
        },
        {
          name: 'Beard Styling',
          currentPrice: 20,
          optimalPrice: 25,
          elasticity: -0.3,
          revenueImpact: '+20%',
          recommendation: 'Immediate price adjustment - high demand'
        },
        {
          name: 'Premium Package',
          currentPrice: 70,
          optimalPrice: 82,
          elasticity: -0.25,
          revenueImpact: '+15%',
          recommendation: 'Premium positioning supports higher pricing'
        }
      ],
      dynamicPricingOpportunities: [
        'Weekend premium pricing (+18%)',
        'Peak hour surge pricing (+15%)',
        'Off-peak promotional pricing (-12%)',
        'Holiday special packages (+25%)'
      ]
    }
  }
}