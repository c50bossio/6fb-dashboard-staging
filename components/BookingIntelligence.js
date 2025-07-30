'use client'

import { useState, useEffect } from 'react'

export default function BookingIntelligence({ customerId }) {
  const [analytics, setAnalytics] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [aiInsights, setAiInsights] = useState([])
  const [preferences, setPreferences] = useState(null)
  const [rebookingSuggestion, setRebookingSuggestion] = useState(null)
  const [intelligenceStatus, setIntelligenceStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (customerId) {
      loadBookingIntelligence()
    }
  }, [customerId])

  const loadBookingIntelligence = async () => {
    try {
      setLoading(true)
      
      // Load all intelligence data in parallel (including AI-powered features)
      const [analyticsRes, recommendationsRes, aiInsightsRes, preferencesRes, rebookingRes, statusRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/${customerId}/analytics`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/${customerId}/recommendations/ai`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/${customerId}/ai-insights`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/${customerId}/preferences`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/${customerId}/rebooking-suggestion`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/intelligence/status`)
      ])

      // Parse responses
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData.analytics)
      }

      if (recommendationsRes.ok) {
        const recommendationsData = await recommendationsRes.json()
        setRecommendations(recommendationsData.recommendations || [])
      }

      if (aiInsightsRes.ok) {
        const aiInsightsData = await aiInsightsRes.json()
        setAiInsights(aiInsightsData.insights || [])
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setIntelligenceStatus(statusData.ai_intelligence_status)
      }

      if (preferencesRes.ok) {
        const preferencesData = await preferencesRes.json()
        setPreferences(preferencesData.preferences)
      }

      if (rebookingRes.ok) {
        const rebookingData = await rebookingRes.json()
        if (rebookingData.success) {
          setRebookingSuggestion(rebookingData.suggestion)
        }
      }

    } catch (err) {
      setError('Failed to load booking intelligence data')
      console.error('Error loading booking intelligence:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'next_appointment': return '📅'
      case 'preferred_time': return '⏰'
      case 'new_service': return '✨'
      case 'service_upgrade': return '⬆️'
      case 'loyalty_reward': return '🎁'
      case 'time_optimization': return '⚡'
      default: return '💡'
    }
  }

  const getInsightIcon = (type) => {
    switch (type) {
      case 'behavior_pattern': return '📊'
      case 'preference_change': return '🔄'
      case 'loyalty_risk': return '⚠️'
      case 'upsell_opportunity': return '💰'
      default: return '🔍'
    }
  }

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getLoyaltyScoreColor = (score) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className=\"text-center py-8\">
        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto\"></div>
        <p className=\"mt-2 text-gray-600\">Loading your booking insights...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className=\"bg-red-50 border border-red-200 rounded-lg p-4\">
        <p className=\"text-red-600\">{error}</p>
        <button 
          onClick={loadBookingIntelligence}
          className=\"mt-2 text-red-600 hover:text-red-700 text-sm font-medium\"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Show message if no booking history
  if (!analytics || analytics.total_bookings === 0) {
    return (
      <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-6 text-center\">
        <div className=\"text-4xl mb-4\">📊</div>
        <h3 className=\"text-lg font-medium text-blue-900 mb-2\">Booking Intelligence</h3>
        <p className=\"text-blue-700 mb-4\">
          Book a few appointments to unlock personalized insights and smart recommendations!
        </p>
        <div className=\"text-sm text-blue-600\">
          <p>• Personalized booking preferences</p>
          <p>• Smart rebooking suggestions</p>
          <p>• Analytics and insights</p>
        </div>
      </div>
    )
  }

  return (
    <div className=\"space-y-6\">
      {/* Analytics Overview */}
      <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">📊 Your Booking Analytics</h3>
        
        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 mb-6\">
          <div className=\"text-center p-4 bg-blue-50 rounded-lg\">
            <div className=\"text-2xl font-bold text-blue-600\">{analytics.total_bookings}</div>
            <div className=\"text-sm text-blue-800\">Total Bookings</div>
          </div>
          
          <div className=\"text-center p-4 bg-green-50 rounded-lg\">
            <div className=\"text-2xl font-bold text-green-600\">${analytics.total_spent?.toFixed(2) || '0.00'}</div>
            <div className=\"text-sm text-green-800\">Total Spent</div>
          </div>
          
          <div className=\"text-center p-4 bg-purple-50 rounded-lg\">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getLoyaltyScoreColor(analytics.loyalty_score)}`}>
              {Math.round((analytics.loyalty_score || 0) * 100)}% Loyalty
            </div>
            <div className=\"text-sm text-purple-800 mt-1\">Loyalty Score</div>
          </div>
        </div>

        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm\">
          <div>
            <span className=\"font-medium text-gray-700\">Average Price:</span>
            <span className=\"ml-2 text-gray-900\">${analytics.average_booking_price?.toFixed(2) || '0.00'}</span>
          </div>
          <div>
            <span className=\"font-medium text-gray-700\">Favorite Service:</span>
            <span className=\"ml-2 text-gray-900\">{analytics.favorite_service || 'None yet'}</span>
          </div>
          <div>
            <span className=\"font-medium text-gray-700\">Booking Frequency:</span>
            <span className=\"ml-2 text-gray-900\">
              {analytics.booking_frequency_days ? `Every ${analytics.booking_frequency_days} days` : 'Not determined'}
            </span>
          </div>
          <div>
            <span className=\"font-medium text-gray-700\">Last Booking:</span>
            <span className=\"ml-2 text-gray-900\">{formatDate(analytics.most_recent_booking)}</span>
          </div>
        </div>
      </div>

      {/* AI Intelligence Status */}
      {intelligenceStatus && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🧠</span>
              <div>
                <h3 className="font-medium text-purple-900">AI-Powered Intelligence</h3>
                <p className="text-sm text-purple-700">
                  {intelligenceStatus.fallback_mode ? 
                    "Using rule-based recommendations (AI models not available)" :
                    intelligenceStatus.anthropic_available ? "Powered by Claude AI" :
                    intelligenceStatus.openai_available ? "Powered by GPT-4" :
                    "Enhanced intelligence active"
                  }
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              intelligenceStatus.fallback_mode ? 
                'bg-yellow-100 text-yellow-800' : 
                'bg-green-100 text-green-800'
            }`}>
              {intelligenceStatus.fallback_mode ? 'Rule-based' : 'AI-Enhanced'}
            </div>
          </div>
        </div>
      )}

      {/* AI Customer Insights */}
      {aiInsights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 AI Customer Insights</h3>
          
          <div className="space-y-4">
            {aiInsights.map((insight, index) => (
              <div key={insight.insight_id || index} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{getInsightIcon(insight.insight_type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-purple-900 capitalize">{insight.insight_type.replace('_', ' ')}</h4>
                      <div className="flex items-center space-x-2">
                        <div className={`text-xs font-medium ${getConfidenceColor(insight.confidence_score)}`}>
                          {Math.round(insight.confidence_score * 100)}% confidence
                        </div>
                        <div className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                          {insight.ai_model_used}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-purple-800 mb-3">{insight.insight_text}</p>
                    
                    {insight.actionable_recommendations && insight.actionable_recommendations.length > 0 && (
                      <div className="bg-white rounded-md p-3 border border-purple-200">
                        <h5 className="font-medium text-purple-900 text-sm mb-2">💡 Recommended Actions:</h5>
                        <ul className="text-sm text-purple-700 space-y-1">
                          {insight.actionable_recommendations.map((action, actionIndex) => (
                            <li key={actionIndex} className="flex items-start">
                              <span className="text-purple-500 mr-2">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">💡 Smart Recommendations</h3>
          
          <div className=\"space-y-4\">
            {recommendations.map((rec, index) => (
              <div key={rec.id || index} className=\"border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors\">
                <div className=\"flex items-start justify-between\">
                  <div className=\"flex items-start space-x-3\">
                    <span className=\"text-2xl\">{getRecommendationIcon(rec.type)}</span>
                    <div className=\"flex-1\">
                      <h4 className=\"font-medium text-gray-900\">{rec.title}</h4>
                      <p className=\"text-gray-600 text-sm mt-1\">{rec.description}</p>
                      <p className=\"text-xs text-gray-500 mt-2\">{rec.reasoning}</p>
                      
                      {rec.suggested_datetime && (
                        <div className=\"mt-2 text-sm text-blue-600\">
                          <span className=\"font-medium\">Suggested:</span> {formatDate(rec.suggested_datetime)} at {formatTime(rec.suggested_datetime)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className=\"text-right\">
                    <div className=\"flex flex-col items-end space-y-1\">
                      <div className={`text-xs font-medium ${getConfidenceColor(rec.confidence_score)}`}>
                        {Math.round(rec.confidence_score * 100)}% confident
                      </div>
                      {rec.ai_powered && (
                        <div className=\"px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium\">
                          AI-Powered
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Rebooking */}
      {rebookingSuggestion && (
        <div className=\"bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200\">
          <h3 className=\"text-lg font-semibold text-blue-900 mb-4\">🔄 Smart Rebooking</h3>
          
          <div className=\"bg-white rounded-lg p-4 mb-4\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"font-medium text-gray-900\">Next suggested appointment:</p>
                <p className=\"text-blue-600 text-lg font-semibold\">
                  {formatDate(rebookingSuggestion.suggested_datetime)} at {formatTime(rebookingSuggestion.suggested_datetime)}
                </p>
                <p className=\"text-sm text-gray-600 mt-1\">{rebookingSuggestion.reasoning}</p>
              </div>
              
              <div className=\"text-right\">
                <div className={`text-sm font-medium ${getConfidenceColor(rebookingSuggestion.confidence)}`}>
                  {Math.round(rebookingSuggestion.confidence * 100)}% match
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              // Navigate to booking with pre-filled preferences
              const bookingUrl = `/book?barber=${rebookingSuggestion.preferred_barber_id}&service=${rebookingSuggestion.preferred_service_id}&datetime=${rebookingSuggestion.suggested_datetime}`
              window.location.href = bookingUrl
            }}
            className=\"w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors\"
          >
            📅 Book with Smart Suggestions
          </button>
        </div>
      )}

      {/* Booking Preferences */}
      {preferences && (
        <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">⚙️ Your Preferences</h3>
          
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
            <div>
              <h4 className=\"font-medium text-gray-700 mb-2\">Preferred Times</h4>
              <div className=\"flex flex-wrap gap-2\">
                {preferences.preferred_times.length > 0 ? (
                  preferences.preferred_times.map((time, index) => (
                    <span key={index} className=\"px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm\">
                      {time}
                    </span>
                  ))
                ) : (
                  <span className=\"text-gray-500 text-sm\">No preference detected</span>
                )}
              </div>
            </div>
            
            <div>
              <h4 className=\"font-medium text-gray-700 mb-2\">Preferred Days</h4>
              <div className=\"flex flex-wrap gap-2\">
                {preferences.preferred_days.length > 0 ? (
                  preferences.preferred_days.map((day, index) => {
                    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    return (
                      <span key={index} className=\"px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm\">
                        {dayNames[day]}
                      </span>
                    )
                  })
                ) : (
                  <span className=\"text-gray-500 text-sm\">No preference detected</span>
                )}
              </div>
            </div>
          </div>
          
          <div className=\"mt-4 text-sm text-gray-600\">
            <p>These preferences are automatically learned from your booking history and help us provide better recommendations.</p>
          </div>
        </div>
      )}
    </div>
  )
}