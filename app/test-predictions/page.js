'use client'

import { 
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function TestPredictionsPage() {
  const [timeframe, setTimeframe] = useState(30)
  const [isGenerating, setIsGenerating] = useState(false)
  const [predictions, setPredictions] = useState(null)

  const handleGeneratePredictions = async () => {
    setIsGenerating(true)
    setPredictions(null)

    try {
      const response = await fetch('/api/ai/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId: 'demo-shop',
          timeframe: parseInt(timeframe),
          models: ['all']
        })
      })

      const data = await response.json()
      setPredictions(data)
    } catch (error) {
      console.error('Prediction generation failed:', error)
      setPredictions({
        success: false,
        error: error.message
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.85) return 'text-green-600'
    if (confidence >= 0.75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.85) return 'High'
    if (confidence >= 0.75) return 'Medium'
    return 'Low'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Predictive Analytics Testing 📈
          </h1>
          <p className="text-gray-600">
            AI-powered forecasting for proactive business decisions
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate Predictions</h2>
          
          <div className="flex items-end space-x-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forecast Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Next 7 days</option>
                <option value="14">Next 14 days</option>
                <option value="30">Next 30 days</option>
                <option value="60">Next 60 days</option>
                <option value="90">Next 90 days</option>
              </select>
            </div>
            
            <button
              onClick={handleGeneratePredictions}
              disabled={isGenerating}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <ClockIcon className="h-5 w-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <ChartBarIcon className="h-5 w-5" />
                  <span>Generate Predictions</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>AI Models:</strong> Revenue, Bookings, Customer Churn, Service Demand, Staff Utilization, Inventory
            </p>
          </div>
        </div>

        {/* Results */}
        {predictions && predictions.success && (
          <>
            {/* Overall Confidence */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Prediction Confidence</h2>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl font-bold ${getConfidenceColor(predictions.confidence)}`}>
                    {Math.round(predictions.confidence * 100)}%
                  </span>
                  <span className="text-sm text-gray-500">
                    ({getConfidenceLabel(predictions.confidence)})
                  </span>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            {predictions.insights && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">AI-Generated Insights</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Immediate Actions */}
                  {predictions.insights.immediate_actions?.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h3 className="font-medium text-red-900 mb-3 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                        Immediate Actions Required
                      </h3>
                      <ul className="space-y-2">
                        {predictions.insights.immediate_actions.map((action, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start">
                            <span className="mr-2">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {predictions.insights.opportunities?.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="font-medium text-green-900 mb-3 flex items-center">
                        <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                        Growth Opportunities
                      </h3>
                      <ul className="space-y-2">
                        {predictions.insights.opportunities.map((opp, i) => (
                          <li key={i} className="text-sm text-green-700 flex items-start">
                            <span className="mr-2">•</span>
                            {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks */}
                  {predictions.insights.risks?.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-medium text-yellow-900 mb-3 flex items-center">
                        <ArrowTrendingDownIcon className="h-5 w-5 mr-2" />
                        Potential Risks
                      </h3>
                      <ul className="space-y-2">
                        {predictions.insights.risks.map((risk, i) => (
                          <li key={i} className="text-sm text-yellow-700 flex items-start">
                            <span className="mr-2">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Optimizations */}
                  {predictions.insights.optimizations?.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                        <ChartBarIcon className="h-5 w-5 mr-2" />
                        Optimization Suggestions
                      </h3>
                      <ul className="space-y-2">
                        {predictions.insights.optimizations.map((opt, i) => (
                          <li key={i} className="text-sm text-blue-700 flex items-start">
                            <span className="mr-2">•</span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Forecast */}
              {predictions.predictions?.revenue && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <CurrencyDollarIcon className="h-6 w-6 mr-2 text-green-500" />
                    Revenue Forecast
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Predicted</span>
                      <span className="font-bold">{formatCurrency(predictions.predictions.revenue.summary.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Average</span>
                      <span className="font-bold">{formatCurrency(predictions.predictions.revenue.summary.average)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Growth Rate</span>
                      <span className={`font-bold ${
                        parseFloat(predictions.predictions.revenue.summary.growth) > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {predictions.predictions.revenue.summary.growth}
                      </span>
                    </div>
                    {predictions.predictions.revenue.insights?.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-gray-700">
                          {predictions.predictions.revenue.insights[0]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Booking Volume */}
              {predictions.predictions?.bookings && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <CalendarIcon className="h-6 w-6 mr-2 text-blue-500" />
                    Booking Volume
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Bookings</span>
                      <span className="font-bold">{predictions.predictions.bookings.summary.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Average</span>
                      <span className="font-bold">{predictions.predictions.bookings.summary.average}</span>
                    </div>
                    {predictions.predictions.bookings.summary.peakDays?.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">Peak Days:</p>
                        {predictions.predictions.bookings.summary.peakDays.map((day, i) => (
                          <div key={i} className="text-sm text-gray-600">
                            {day.date}: {day.bookings} bookings
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Churn */}
              {predictions.predictions?.churn && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <UserGroupIcon className="h-6 w-6 mr-2 text-red-500" />
                    Customer Churn Risk
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">At-Risk Customers</span>
                      <span className="font-bold text-red-600">
                        {predictions.predictions.churn.summary.totalAtRisk}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Critical Risk</span>
                      <span className="font-bold text-red-700">
                        {predictions.predictions.churn.summary.criticalRisk}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Potential Loss</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(predictions.predictions.churn.summary.preventionValue)}
                      </span>
                    </div>
                    {predictions.predictions.churn.preventionStrategies?.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-1">Prevention:</p>
                        <p className="text-sm text-gray-600">
                          {predictions.predictions.churn.preventionStrategies[0]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Demand */}
              {predictions.predictions?.demand && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <ChartBarIcon className="h-6 w-6 mr-2 text-purple-500" />
                    Service Demand Trends
                  </h3>
                  <div className="space-y-2">
                    {predictions.predictions.demand.predictions.slice(0, 3).map((service, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">{service.service}</span>
                          <span className={`text-sm font-bold ${
                            parseFloat(service.change) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {service.change}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {service.currentDemand} → {service.predictedDemand} bookings
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Staff and Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Staff Utilization */}
              {predictions.predictions?.staffing && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Staff Utilization Forecast</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Utilization</span>
                      <span className="font-bold">{predictions.predictions.staffing.summary.avgUtilization}%</span>
                    </div>
                    {predictions.predictions.staffing.summary.optimalStaffing?.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
                        {predictions.predictions.staffing.summary.optimalStaffing.map((rec, i) => (
                          <p key={i} className="text-sm text-gray-600">{rec}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inventory */}
              {predictions.predictions?.inventory && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Inventory Management</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Need Reorder</span>
                      <span className="font-bold text-orange-600">
                        {predictions.predictions.inventory.summary.itemsNeedingReorder}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Order Value</span>
                      <span className="font-bold">
                        {formatCurrency(predictions.predictions.inventory.summary.totalOrderValue)}
                      </span>
                    </div>
                    {predictions.predictions.inventory.summary.nextReorderDate && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-gray-700">
                          Next reorder by: {new Date(predictions.predictions.inventory.summary.nextReorderDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Error State */}
        {predictions && !predictions.success && (
          <div className="bg-red-50 rounded-lg p-6">
            <p className="text-red-800">
              {predictions.error || 'Failed to generate predictions'}
            </p>
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How Predictive Analytics Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium mb-2">Data Analysis</h3>
              <p className="text-sm text-gray-600">
                AI analyzes historical patterns, trends, and seasonality from your business data
              </p>
            </div>
            
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-medium mb-2">Model Generation</h3>
              <p className="text-sm text-gray-600">
                Multiple predictive models run simultaneously for different business metrics
              </p>
            </div>
            
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-medium mb-2">Actionable Insights</h3>
              <p className="text-sm text-gray-600">
                Predictions are synthesized into clear, actionable recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}