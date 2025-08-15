import { NextResponse } from 'next/server'
import { predictiveAnalytics } from '../../../../services/predictive-analytics-service'

/**
 * Predictive Analytics API Endpoint
 * Generates forecasts and predictions for business metrics
 */
export async function POST(request) {
  try {
    const { 
      barbershopId = 'demo-shop',
      timeframe = 30,
      models = ['all'],
      userId
    } = await request.json()

    console.log('📊 Predictive analytics request:', {
      barbershopId,
      timeframe,
      models
    })

    if (timeframe < 1 || timeframe > 90) {
      return NextResponse.json({
        success: false,
        error: 'Timeframe must be between 1 and 90 days'
      }, { status: 400 })
    }

    const predictions = await predictiveAnalytics.generatePredictions(
      barbershopId,
      timeframe
    )

    if (!predictions) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate predictions'
      }, { status: 500 })
    }

    let response = {
      success: true,
      barbershopId,
      timeframe,
      timestamp: predictions.timestamp,
      confidence: predictions.confidence
    }

    if (models.includes('all') || models.length === 0) {
      response.predictions = predictions.forecasts
      response.insights = predictions.insights
    } else {
      response.predictions = {}
      models.forEach(model => {
        if (predictions.forecasts[model]) {
          response.predictions[model] = predictions.forecasts[model]
        }
      })
      response.insights = predictions.insights
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Predictive analytics error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate predictions',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * GET endpoint to retrieve prediction history and model performance
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'performance'
    const barbershopId = searchParams.get('barbershopId') || 'demo-shop'

    let response

    switch (action) {
      case 'performance':
        response = {
          success: true,
          performance: predictiveAnalytics.getModelPerformance(),
          models: Object.keys(predictiveAnalytics.models),
          description: 'Model accuracy and performance metrics'
        }
        break

      case 'models':
        response = {
          success: true,
          models: Object.entries(predictiveAnalytics.models).map(([key, model]) => ({
            id: key,
            name: model.name,
            factors: model.factors,
            confidence: model.confidence,
            horizon: model.horizon
          }))
        }
        break

      case 'latest':
        const timeframe = parseInt(searchParams.get('timeframe') || '7')
        const latest = await predictiveAnalytics.generatePredictions(
          barbershopId,
          timeframe
        )
        
        response = {
          success: true,
          predictions: latest.forecasts,
          insights: latest.insights,
          confidence: latest.confidence,
          timeframe
        }
        break

      default:
        response = {
          success: true,
          status: 'Predictive analytics service is active',
          capabilities: {
            models: Object.keys(predictiveAnalytics.models),
            maxTimeframe: 90,
            confidenceRange: '75-95%'
          }
        }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Prediction retrieval error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve prediction data',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * PUT endpoint to track prediction outcomes for accuracy improvement
 */
export async function PUT(request) {
  try {
    const { 
      predictionId,
      actualOutcome,
      feedback
    } = await request.json()

    if (!predictionId || actualOutcome === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Prediction ID and actual outcome are required'
      }, { status: 400 })
    }

    const accuracy = await predictiveAnalytics.trackPredictionAccuracy(
      predictionId,
      actualOutcome
    )

    return NextResponse.json({
      success: true,
      predictionId,
      accuracy,
      message: 'Prediction outcome tracked successfully'
    })

  } catch (error) {
    console.error('Accuracy tracking error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to track prediction outcome',
      details: error.message
    }, { status: 500 })
  }
}