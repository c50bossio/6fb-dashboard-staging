'use client'

import { 
  HeartIcon, 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ChartBarIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import SentimentDashboard from '../../components/SentimentDashboard'

export default function TestSentimentPage() {
  const [testMessage, setTestMessage] = useState('')
  const [sentimentResult, setSentimentResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [testHistory, setTestHistory] = useState([])

  const testSentiments = [
    { message: "I absolutely love this service! It's amazing!", expected: "happy" },
    { message: "This is so frustrating, nothing works properly.", expected: "frustrated" },
    { message: "I'm confused about how this works, can you help?", expected: "confused" },
    { message: "The service is fine, it does what I need.", expected: "satisfied" },
    { message: "I'm really angry about the poor service quality!", expected: "angry" },
    { message: "I'm worried this might not work for my business.", expected: "anxious" },
    { message: "This is incredible! I'm so excited to get started!", expected: "excited" },
    { message: "Hello, how are you today?", expected: "neutral" }
  ]

  const analyzeSentiment = async (message) => {
    if (!message.trim()) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          action: 'analyze',
          userId: 'test_user',
          businessContext: {
            shopName: 'Test Barbershop',
            isOwner: true
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSentimentResult(data.analysis)
        setTestHistory(prev => [{
          message,
          result: data.analysis,
          timestamp: new Date()
        }, ...prev].slice(0, 10))
        
        console.log('🎭 Sentiment analysis result:', data.analysis)
      } else {
        console.error('Sentiment analysis failed:', data.error)
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runAllTests = async () => {
    for (const test of testSentiments) {
      setTestMessage(test.message)
      await analyzeSentiment(test.message)
      await new Promise(resolve => setTimeout(resolve, 500)) // Small delay between tests
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

  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return 'text-green-600'
    if (confidence > 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAccuracyColor = (detected, expected) => {
    return detected === expected ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <HeartIcon className="h-8 w-8 text-purple-600" />
            <span>Emotion Recognition & Sentiment Analysis Testing</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Test the AI's ability to detect and analyze emotions in text, providing empathetic responses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Testing Interface */}
          <div className="space-y-6">
            {/* Manual Testing */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                <span>Manual Sentiment Testing</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="3"
                    placeholder="Enter a message to analyze its emotional content..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => analyzeSentiment(testMessage)}
                    disabled={!testMessage.trim() || isAnalyzing}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Sentiment'}</span>
                  </button>

                  <button
                    onClick={runAllTests}
                    disabled={isAnalyzing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Run All Tests
                  </button>
                </div>
              </div>
            </div>

            {/* Pre-defined Test Cases */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-green-600" />
                <span>Test Cases</span>
              </h2>

              <div className="space-y-2">
                {testSentiments.map((test, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setTestMessage(test.message)
                      analyzeSentiment(test.message)
                    }}
                    disabled={isAnalyzing}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{test.message}</p>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <span>Expected:</span>
                          <span>{getEmotionIcon(test.expected)}</span>
                          <span className="capitalize">{test.expected}</span>
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Test Results */}
            {testHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Test Results</h2>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {testHistory.map((test, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getEmotionIcon(test.result.emotion)}</span>
                          <span className="font-medium capitalize">{test.result.emotion}</span>
                          <span className={`text-sm ${getConfidenceColor(test.result.confidence)}`}>
                            {Math.round(test.result.confidence * 100)}%
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {test.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">"{test.message}"</p>
                      {test.result.empathetic_response && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          Strategy: {test.result.empathetic_response.strategy.approach}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          <div className="space-y-6">
            {/* Current Analysis Result */}
            {sentimentResult && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FaceSmileIcon className="h-5 w-5 text-purple-600" />
                  <span>Analysis Result</span>
                </h2>

                <div className="space-y-4">
                  {/* Primary Emotion */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getEmotionIcon(sentimentResult.emotion)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900 capitalize">
                          {sentimentResult.emotion}
                        </h3>
                        <p className="text-sm text-purple-700">
                          Confidence: {Math.round(sentimentResult.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                    {sentimentResult.analysis?.sentiment_polarity !== undefined && (
                      <div className="text-sm text-purple-700">
                        Polarity: {sentimentResult.analysis.sentiment_polarity > 0 ? 'Positive' : 
                                  sentimentResult.analysis.sentiment_polarity < 0 ? 'Negative' : 'Neutral'} 
                        ({sentimentResult.analysis.sentiment_polarity.toFixed(2)})
                      </div>
                    )}
                  </div>

                  {/* Empathetic Response Strategy */}
                  {sentimentResult.empathetic_response && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Empathetic Response Strategy</h4>
                      <div className="space-y-2 text-sm text-blue-800">
                        <p><strong>Tone:</strong> {sentimentResult.empathetic_response.strategy.tone}</p>
                        <p><strong>Approach:</strong> {sentimentResult.empathetic_response.strategy.approach}</p>
                        <p><strong>Follow-up:</strong> {sentimentResult.empathetic_response.strategy.followUp}</p>
                        {sentimentResult.empathetic_response.strategy.emergencyEscalation && (
                          <div className="p-2 bg-red-100 text-red-800 rounded">
                            ⚠️ Emergency escalation recommended
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detailed Analysis */}
                  {sentimentResult.analysis && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Detailed Analysis</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Word Count:</span>
                          <span className="ml-2 font-medium">{sentimentResult.analysis.wordCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Processing Time:</span>
                          <span className="ml-2 font-medium">{sentimentResult.processing_time_ms}ms</span>
                        </div>
                        {sentimentResult.analysis.emotionalWords?.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Emotional Words:</span>
                            <div className="mt-1 space-x-1">
                              {sentimentResult.analysis.emotionalWords.map((word, idx) => (
                                <span key={idx} className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                                  {word.word} ({word.emotion})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {sentimentResult.recommendations && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">AI Recommendations</h4>
                      <ul className="space-y-1 text-sm text-green-800">
                        {sentimentResult.recommendations.immediate_actions?.map((action, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span>•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                      {sentimentResult.recommendations.escalation_needed && (
                        <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-sm">
                          🚨 Escalation to management recommended
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* API Health Check */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
              <APIHealthCheck />
            </div>
          </div>
        </div>

        {/* Sentiment Dashboard */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Historical Sentiment Analysis</h2>
          <SentimentDashboard userId="test_user" />
        </div>
      </div>
    </div>
  )
}

function APIHealthCheck() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/ai/emotion?action=health')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      setHealth({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  if (loading) {
    return <div className="text-gray-600">Checking API health...</div>
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center space-x-2 ${health?.success ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`w-2 h-2 rounded-full ${health?.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="font-medium">
          {health?.success ? 'Emotion API Operational' : 'Emotion API Error'}
        </span>
      </div>
      
      {health?.success && (
        <div className="text-sm text-gray-600">
          <p>Service: {health.service} v{health.version}</p>
          <p>Emotions Supported: {health.emotions_supported?.join(', ')}</p>
        </div>
      )}
      
      {health?.error && (
        <div className="text-sm text-red-600">
          Error: {health.error}
        </div>
      )}
    </div>
  )
}