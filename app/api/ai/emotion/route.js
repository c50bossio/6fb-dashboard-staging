import { NextResponse } from 'next/server'
import emotionService from '../../../../services/emotion-recognition-service'

/**
 * AI Emotion Recognition API
 * Provides emotion analysis and empathetic response generation
 */

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      text, 
      action = 'analyze',
      userId = 'demo_user',
      context = {},
      businessContext = {}
    } = body

    console.log('🎭 Emotion API request:', { action, hasText: !!text, userId })

    switch (action) {
      case 'analyze':
        return await handleEmotionAnalysis(text, context, userId, businessContext)
      
      case 'empathetic_response':
        return await handleEmpatheticResponse(body)
      
      case 'track_sentiment':
        return await handleSentimentTracking(body)
      
      case 'sentiment_history':
        return await handleSentimentHistory(userId, body.days)
      
      case 'voice_emotion':
        return await handleVoiceEmotion(body.voiceData)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: analyze, empathetic_response, track_sentiment, sentiment_history, voice_emotion'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Emotion API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process emotion analysis',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'health'
    const userId = searchParams.get('userId') || 'demo_user'

    switch (action) {
      case 'health':
        return NextResponse.json({
          success: true,
          service: 'Emotion Recognition',
          version: '2.0',
          status: 'operational',
          capabilities: [
            'text_sentiment_analysis',
            'emotion_detection',
            'empathetic_responses',
            'sentiment_tracking',
            'voice_emotion_analysis',
            'historical_analytics'
          ],
          emotions_supported: [
            'happy', 'frustrated', 'confused', 'satisfied', 
            'angry', 'anxious', 'excited', 'neutral'
          ],
          timestamp: new Date().toISOString()
        })

      case 'sentiment_history':
        const days = parseInt(searchParams.get('days')) || 30
        return await handleSentimentHistory(userId, days)

      case 'analytics':
        return await handleEmotionAnalytics(userId)

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid GET action. Supported: health, sentiment_history, analytics'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Emotion GET API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process GET request',
      details: error.message
    }, { status: 500 })
  }
}

// Handler functions
async function handleEmotionAnalysis(text, context, userId, businessContext) {
  if (!text || typeof text !== 'string') {
    return NextResponse.json({
      success: false,
      error: 'Text is required for emotion analysis'
    }, { status: 400 })
  }

  const startTime = Date.now()
  
  // Perform emotion analysis
  const emotionResult = await emotionService.analyzeSentiment(text, context)
  
  // Generate empathetic response suggestions
  const empatheticResponse = emotionService.generateEmpatheticResponse(
    emotionResult.emotion,
    emotionResult.confidence,
    text,
    businessContext
  )

  // Track the sentiment
  await emotionService.trackSentiment(userId, emotionResult, {
    messageLength: text.length,
    sessionId: context.sessionId,
    businessContext,
    previousEmotion: context.previousEmotion
  })

  const processingTime = Date.now() - startTime

  return NextResponse.json({
    success: true,
    analysis: {
      ...emotionResult,
      empathetic_response: empatheticResponse,
      processing_time_ms: processingTime,
      user_id: userId
    },
    recommendations: {
      immediate_actions: getImmediateActions(emotionResult.emotion, emotionResult.confidence),
      follow_up_suggested: empatheticResponse.strategy.trackingRecommended,
      escalation_needed: empatheticResponse.strategy.emergencyEscalation
    },
    metadata: {
      api_version: '2.0',
      timestamp: new Date().toISOString()
    }
  })
}

async function handleEmpatheticResponse(body) {
  const { emotion, confidence, originalMessage, businessContext = {} } = body

  if (!emotion || confidence === undefined) {
    return NextResponse.json({
      success: false,
      error: 'Emotion and confidence are required'
    }, { status: 400 })
  }

  const empatheticResponse = emotionService.generateEmpatheticResponse(
    emotion,
    confidence,
    originalMessage || '',
    businessContext
  )

  return NextResponse.json({
    success: true,
    empathetic_response: empatheticResponse,
    timestamp: new Date().toISOString()
  })
}

async function handleSentimentTracking(body) {
  const { userId, emotionResult, context = {} } = body

  if (!userId || !emotionResult) {
    return NextResponse.json({
      success: false,
      error: 'User ID and emotion result are required for tracking'
    }, { status: 400 })
  }

  const trackingResult = await emotionService.trackSentiment(userId, emotionResult, context)

  return NextResponse.json({
    success: true,
    tracking_result: trackingResult,
    message: 'Sentiment tracked successfully'
  })
}

async function handleSentimentHistory(userId, days = 30) {
  const history = emotionService.getSentimentHistory(userId, days)
  
  // Generate analytics from history
  const analytics = generateSentimentAnalytics(history)

  return NextResponse.json({
    success: true,
    sentiment_history: history,
    analytics,
    metadata: {
      user_id: userId,
      days_requested: days,
      records_found: history.length
    }
  })
}

async function handleVoiceEmotion(voiceData) {
  if (!voiceData) {
    return NextResponse.json({
      success: false,
      error: 'Voice data is required for voice emotion analysis'
    }, { status: 400 })
  }

  const voiceEmotionResult = await emotionService.analyzeVoiceEmotion(voiceData)

  return NextResponse.json({
    success: true,
    voice_emotion: voiceEmotionResult,
    note: 'Voice emotion analysis is currently in beta. Full implementation coming soon.'
  })
}

async function handleEmotionAnalytics(userId) {
  const history = emotionService.getSentimentHistory(userId, 30)
  const analytics = generateSentimentAnalytics(history)

  // Add trend analysis
  const trends = analyzeSentimentTrends(history)

  return NextResponse.json({
    success: true,
    analytics: {
      ...analytics,
      trends,
      insights: generateInsights(analytics, trends)
    }
  })
}

// Utility functions
function getImmediateActions(emotion, confidence) {
  const actions = {
    happy: ['Capitalize on positive momentum', 'Offer premium services'],
    frustrated: ['Address root cause immediately', 'Provide clear resolution steps'],
    confused: ['Simplify explanation', 'Offer guided assistance'],
    satisfied: ['Maintain current approach', 'Ask for feedback'],
    angry: ['Escalate to management', 'Offer immediate compensation'],
    anxious: ['Provide reassurance', 'Offer additional support'],
    excited: ['Present relevant opportunities', 'Match enthusiasm'],
    neutral: ['Gather more context', 'Use standard approach']
  }

  return actions[emotion] || actions.neutral
}

function generateSentimentAnalytics(history) {
  if (history.length === 0) {
    return {
      total_interactions: 0,
      emotion_distribution: {},
      average_confidence: 0,
      dominant_emotion: 'neutral'
    }
  }

  const emotionCounts = {}
  let totalConfidence = 0

  history.forEach(record => {
    emotionCounts[record.emotion] = (emotionCounts[record.emotion] || 0) + 1
    totalConfidence += record.confidence
  })

  const dominantEmotion = Object.entries(emotionCounts)
    .reduce((a, b) => emotionCounts[a[0]] > emotionCounts[b[0]] ? a : b)[0]

  return {
    total_interactions: history.length,
    emotion_distribution: emotionCounts,
    average_confidence: Math.round((totalConfidence / history.length) * 100) / 100,
    dominant_emotion: dominantEmotion,
    positive_ratio: calculatePositiveRatio(emotionCounts),
    last_updated: new Date().toISOString()
  }
}

function analyzeSentimentTrends(history) {
  if (history.length < 2) {
    return { trend: 'insufficient_data', direction: 'neutral' }
  }

  // Sort by timestamp (newest first)
  const sortedHistory = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  
  // Compare recent vs older sentiment
  const recentCount = Math.min(5, Math.floor(sortedHistory.length / 2))
  const recent = sortedHistory.slice(0, recentCount)
  const older = sortedHistory.slice(recentCount, recentCount * 2)

  const recentPositive = calculatePositiveRatio(getEmotionCounts(recent))
  const olderPositive = calculatePositiveRatio(getEmotionCounts(older))

  let trend = 'stable'
  let direction = 'neutral'

  if (recentPositive > olderPositive + 0.2) {
    trend = 'improving'
    direction = 'positive'
  } else if (recentPositive < olderPositive - 0.2) {
    trend = 'declining'
    direction = 'negative'
  }

  return {
    trend,
    direction,
    recent_positive_ratio: recentPositive,
    older_positive_ratio: olderPositive,
    change: recentPositive - olderPositive
  }
}

function generateInsights(analytics, trends) {
  const insights = []

  // Dominant emotion insights
  if (analytics.dominant_emotion === 'frustrated') {
    insights.push({
      type: 'warning',
      message: 'Customer frustration is your dominant emotion. Focus on improving service response times.',
      priority: 'high'
    })
  } else if (analytics.dominant_emotion === 'happy') {
    insights.push({
      type: 'success',
      message: 'Great news! Customers are predominantly happy with your service.',
      priority: 'medium'
    })
  }

  // Trend insights
  if (trends.trend === 'declining') {
    insights.push({
      type: 'alert',
      message: 'Customer sentiment is declining. Consider reviewing recent service changes.',
      priority: 'high'
    })
  } else if (trends.trend === 'improving') {
    insights.push({
      type: 'success',
      message: 'Customer sentiment is improving! Keep up the great work.',
      priority: 'medium'
    })
  }

  // Confidence insights
  if (analytics.average_confidence < 0.6) {
    insights.push({
      type: 'info',
      message: 'Emotion detection confidence is moderate. Consider gathering more explicit feedback.',
      priority: 'low'
    })
  }

  return insights
}

function calculatePositiveRatio(emotionCounts) {
  const positive = ['happy', 'satisfied', 'excited']
  const negative = ['frustrated', 'angry', 'anxious']
  
  const positiveCount = positive.reduce((sum, emotion) => sum + (emotionCounts[emotion] || 0), 0)
  const negativeCount = negative.reduce((sum, emotion) => sum + (emotionCounts[emotion] || 0), 0)
  const total = positiveCount + negativeCount

  return total === 0 ? 0.5 : positiveCount / total
}

function getEmotionCounts(records) {
  const counts = {}
  records.forEach(record => {
    counts[record.emotion] = (counts[record.emotion] || 0) + 1
  })
  return counts
}