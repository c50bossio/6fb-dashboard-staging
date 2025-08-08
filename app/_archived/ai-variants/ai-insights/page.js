'use client'

import { useState, useEffect } from 'react'

export default function AIInsightsPage() {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    loadInsights()
    
    // Auto-refresh insights every 5 minutes
    const interval = setInterval(loadInsights, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadInsights = async () => {
    try {
      setError(null)
      const response = await fetch('/api/ai/insights?limit=20')
      const data = await response.json()

      if (data.success) {
        setInsights(data.insights)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to load insights')
      }
    } catch (err) {
      console.error('Failed to load insights:', err)
      setError('Connection error - using demo insights')
      // Load mock insights as fallback
      setInsights(await generateDemoInsights())
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  const generateNewInsights = async () => {
    setGenerating(true)
    try {
      const businessContext = {
        shop_name: 'Demo Barbershop',
        daily_revenue: Math.random() * 1000 + 800,
        avg_satisfaction: Math.random() * 1.0 + 4.0,
        chair_utilization: Math.random() * 0.3 + 0.6,
        social_engagement_rate: Math.random() * 0.06 + 0.02
      }

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessContext, forceRefresh: true })
      })

      const data = await response.json()
      if (data.success) {
        setInsights(data.insights)
        setLastUpdated(new Date())
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (err) {
      console.error('Failed to generate insights:', err)
      setError('Failed to generate new insights')
    } finally {
      setGenerating(false)
    }
  }

  const dismissInsight = async (insightId) => {
    try {
      await fetch(`/api/ai/insights/${insightId}`, { method: 'DELETE' })
      setInsights(prev => prev.filter(insight => insight.id !== insightId))
    } catch (err) {
      console.error('Failed to dismiss insight:', err)
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'border-red-200 bg-red-50 text-red-800'
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      case 'low': return 'border-green-200 bg-green-50 text-green-800'
      default: return 'border-gray-200 bg-gray-50 text-gray-800'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'revenue_opportunity': return '💰'
      case 'customer_behavior': return '👥'
      case 'operational_efficiency': return '⚡'
      case 'marketing_insight': return '📱'
      case 'scheduling_optimization': return '📅'
      case 'performance_alert': return '⚠️'
      default: return '🤖'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🧠 AI Business Insights
            </h1>
            <p className="text-lg text-gray-600">
              Real-time AI-powered business intelligence and recommendations
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadInsights}
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
              onClick={generateNewInsights}
              disabled={generating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
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

      {/* Insights Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h3 className="text-lg font-semibold mb-2">📊 Insights Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Active:</span>
              <span className="font-semibold">{insights.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">High Priority:</span>
              <span className="font-semibold text-red-600">
                {insights.filter(i => i.urgency === 'high').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Confidence:</span>
              <span className="font-semibold">
                {insights.length > 0 
                  ? Math.round(insights.reduce((sum, i) => sum + (i.confidence || 0), 0) / insights.length * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h3 className="text-lg font-semibold mb-2">🎯 Impact Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">High Impact:</span>
              <span className="font-semibold text-green-600">
                {insights.filter(i => (i.impact_score || 0) >= 8).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medium Impact:</span>
              <span className="font-semibold text-yellow-600">
                {insights.filter(i => (i.impact_score || 0) >= 6 && (i.impact_score || 0) < 8).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Impact Score:</span>
              <span className="font-semibold">
                {insights.length > 0 
                  ? (insights.reduce((sum, i) => sum + (i.impact_score || 0), 0) / insights.length).toFixed(1)
                  : 0}/10
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h3 className="text-lg font-semibold mb-2">📈 Categories</h3>
          <div className="space-y-1 text-sm">
            {['revenue_opportunity', 'customer_behavior', 'operational_efficiency', 'marketing_insight', 'scheduling_optimization'].map(type => (
              <div key={type} className="flex justify-between">
                <span className="text-gray-600 capitalize">{type.replace('_', ' ')}:</span>
                <span className="font-semibold">
                  {insights.filter(i => i.type === type).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading AI insights...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md border">
            <p className="text-gray-600 mb-4">No insights available</p>
            <button
              onClick={generateNewInsights}
              disabled={generating}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              Generate First Insights
            </button>
          </div>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className={`bg-white rounded-lg shadow-md border p-6 ${getUrgencyColor(insight.urgency)}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getTypeIcon(insight.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{insight.title}</h3>
                    <p className="text-gray-700 mb-2">{insight.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(insight.urgency)}`}>
                    {insight.urgency}
                  </span>
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                    title="Dismiss insight"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-2">💡 Recommendation:</h4>
                <p className="text-gray-800">{insight.recommendation}</p>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600">
                <div className="flex gap-4">
                  <span>Confidence: {Math.round((insight.confidence || 0) * 100)}%</span>
                  <span>Impact: {(insight.impact_score || 0).toFixed(1)}/10</span>
                  <span className="capitalize">Type: {(insight.type || '').replace('_', ' ')}</span>
                </div>
                <div>
                  {insight.created_at && new Date(insight.created_at).toLocaleString()}
                </div>
              </div>

              {insight.data_points && Object.keys(insight.data_points).length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    View Data Points
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(insight.data_points, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      {/* Week 3 Features Summary */}
      <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border">
        <h2 className="text-xl font-semibold mb-4">🚀 Week 3: Advanced AI Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">✅ Real-Time AI Insights:</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• AI-powered business intelligence generation</li>
              <li>• Multiple insight categories (revenue, customer, ops)</li>
              <li>• Confidence scoring and impact assessment</li>
              <li>• Priority-based urgency classification</li>
              <li>• Automated insight expiration and cleanup</li>
              <li>• Real-time dashboard with auto-refresh</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">🎯 Advanced Analytics:</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Predictive revenue opportunity detection</li>
              <li>• Customer behavior pattern analysis</li>
              <li>• Operational efficiency optimization</li>
              <li>• Marketing performance insights</li>
              <li>• Scheduling optimization recommendations</li>
              <li>• Performance alert system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

async function generateDemoInsights() {
  return [
    {
      id: `demo_revenue_${Date.now()}`,
      type: 'revenue_opportunity',
      title: 'Peak Hour Revenue Gap',
      description: 'Tuesday afternoon revenue is 18% below optimal levels',
      recommendation: 'Offer express haircuts and walk-in specials between 2-4 PM to capture additional revenue',
      confidence: 0.87,
      impact_score: 8.2,
      urgency: 'high',
      data_points: { revenue_gap: 220, optimal_revenue: 1200, current_revenue: 980 },
      created_at: new Date().toISOString()
    },
    {
      id: `demo_customer_${Date.now()}`,
      type: 'customer_behavior',
      title: 'Customer Satisfaction Trend',
      description: 'Average satisfaction score dropped to 4.1/5.0 this week',
      recommendation: 'Implement post-service follow-up texts and train staff on customer engagement techniques',
      confidence: 0.91,
      impact_score: 7.8,
      urgency: 'medium',
      data_points: { satisfaction_score: 4.1, target_score: 4.5, weekly_change: -0.3 },
      created_at: new Date().toISOString()
    }
  ]
}