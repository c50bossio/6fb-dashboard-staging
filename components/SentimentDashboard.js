'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  HeartIcon, 
  FaceSmileIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon 
} from '@heroicons/react/24/outline'

export default function SentimentDashboard({ userId = 'demo_user' }) {
  const [sentimentData, setSentimentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30) // days
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    loadSentimentData()
  }, [userId, timeRange])

  const loadSentimentData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ai/emotion?action=sentiment_history&userId=${userId}&days=${timeRange}`)
      const data = await response.json()
      
      if (data.success) {
        setSentimentData(data.sentiment_history)
        setAnalytics(data.analytics)
        console.log('📊 Sentiment data loaded:', data.analytics)
      }
    } catch (error) {
      console.error('Failed to load sentiment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEmotionIcon = (emotion) => {
    const icons = {
      happy: '😊',
      satisfied: '😌',
      excited: '🤩',
      frustrated: '😤',
      angry: '😠',
      confused: '😕',
      anxious: '😰',
      neutral: '😐'
    }
    return icons[emotion] || '😐'
  }

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: 'bg-green-500',
      satisfied: 'bg-blue-500',
      excited: 'bg-orange-500',
      frustrated: 'bg-yellow-500',
      angry: 'bg-red-500',
      confused: 'bg-gray-500',
      anxious: 'bg-purple-500',
      neutral: 'bg-gray-300'
    }
    return colors[emotion] || 'bg-gray-300'
  }

  const getTrendIcon = (trend) => {
    return trend === 'improving' ? TrendingUpIcon : 
           trend === 'declining' ? TrendingDownIcon : 
           ChartBarIcon
  }

  const getTrendColor = (trend) => {
    return trend === 'improving' ? 'text-green-600' : 
           trend === 'declining' ? 'text-red-600' : 
           'text-gray-600'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <HeartIcon className="h-6 w-6 text-purple-600" />
          <span>Sentiment Analytics</span>
        </h2>
        <div className="flex space-x-2">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeRange === days 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Interactions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.total_interactions}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dominant Emotion</p>
                <p className="text-lg font-bold text-gray-900 flex items-center space-x-1">
                  <span>{getEmotionIcon(analytics.dominant_emotion)}</span>
                  <span className="capitalize">{analytics.dominant_emotion}</span>
                </p>
              </div>
              <FaceSmileIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Positive Ratio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(analytics.positive_ratio * 100)}%
                </p>
              </div>
              <HeartIcon className="h-8 w-8 text-pink-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(analytics.average_confidence * 100)}%
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Emotion Distribution Chart */}
      {analytics?.emotion_distribution && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.emotion_distribution)
              .sort(([,a], [,b]) => b - a) // Sort by count descending
              .map(([emotion, count]) => {
                const percentage = (count / analytics.total_interactions) * 100
                return (
                  <div key={emotion} className="flex items-center space-x-3">
                    <span className="text-lg">{getEmotionIcon(emotion)}</span>
                    <span className="text-sm font-medium text-gray-700 capitalize w-20">
                      {emotion}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                      <div 
                        className={`absolute left-0 top-0 h-2 rounded-full ${getEmotionColor(emotion)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {count}
                    </span>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Recent Sentiment History */}
      {sentimentData && sentimentData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <ClockIcon className="h-5 w-5" />
            <span>Recent Interactions</span>
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sentimentData.slice(0, 20).map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getEmotionIcon(record.emotion)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {record.emotion}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.round(record.confidence * 100)}% confidence
                    </p>
                  </div>
                  {record.context?.businessContext && (
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Business Context
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(record.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights and Recommendations */}
      {analytics?.insights && analytics.insights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
          <div className="space-y-3">
            {analytics.insights.map((insight, index) => {
              const IconComponent = insight.type === 'warning' ? ExclamationTriangleIcon :
                                 insight.type === 'success' ? HeartIcon : 
                                 ChartBarIcon
              const colorClass = insight.type === 'warning' ? 'text-yellow-600' :
                               insight.type === 'success' ? 'text-green-600' : 
                               'text-blue-600'
              
              return (
                <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
                  insight.type === 'warning' ? 'bg-yellow-50' :
                  insight.type === 'success' ? 'bg-green-50' : 
                  'bg-blue-50'
                }`}>
                  <IconComponent className={`h-5 w-5 ${colorClass} mt-0.5`} />
                  <div>
                    <p className="text-sm text-gray-900">{insight.message}</p>
                    <p className="text-xs text-gray-500 mt-1">Priority: {insight.priority}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!sentimentData || sentimentData.length === 0) && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FaceSmileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sentiment Data Yet</h3>
          <p className="text-gray-600">
            Start chatting with the AI to begin tracking emotional interactions.
          </p>
        </div>
      )}
    </div>
  )
}