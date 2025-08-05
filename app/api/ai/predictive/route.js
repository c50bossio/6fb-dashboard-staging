import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const forecastType = searchParams.get('type') || 'comprehensive'
    const timeHorizon = searchParams.get('horizon') || 'weekly'
    const barbershopId = searchParams.get('shopId') || 'default'

    try {
      // Call Python Predictive Analytics Service
      const predictions = await getPredictiveAnalytics(user.id, { 
        forecastType, 
        timeHorizon, 
        barbershopId 
      })
      
      return NextResponse.json({
        success: true,
        predictions,
        timestamp: new Date().toISOString(),
        metadata: {
          forecastType,
          timeHorizon,
          barbershopId,
          confidence: predictions.overallConfidence || 0.75
        }
      })

    } catch (aiError) {
      console.error('Predictive Analytics error:', aiError)
      
      // Fallback to mock predictions
      const mockPredictions = await generateMockPredictions(forecastType, timeHorizon)
      
      return NextResponse.json({
        success: true,
        predictions: mockPredictions,
        fallback: true,
        fallbackReason: aiError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Predictive Analytics endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { forecastType, businessContext, timeHorizon, options } = await request.json()

    try {
      // Generate new predictive forecast
      const forecast = await generatePredictiveForecast(user.id, {
        forecastType: forecastType || 'comprehensive',
        businessContext: businessContext || {},
        timeHorizon: timeHorizon || 'weekly',
        options: options || {}
      })
      
      return NextResponse.json({
        success: true,
        forecast,
        generated: true,
        timestamp: new Date().toISOString()
      })

    } catch (aiError) {
      console.error('Predictive forecast generation error:', aiError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to generate predictive forecast',
        details: aiError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Predictive forecast endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getPredictiveAnalytics(userId, options = {}) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const queryParams = new URLSearchParams({
      user_id: userId,
      forecast_type: options.forecastType || 'comprehensive',
      time_horizon: options.timeHorizon || 'weekly',
      barbershop_id: options.barbershopId || 'default'
    })
    
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/predictive?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Predictive Analytics service failed')
    }

    return data.predictions || {}
    
  } catch (error) {
    console.error('Failed to get predictive analytics from FastAPI:', error)
    throw new Error(`Predictive Analytics service unavailable: ${error.message}`)
  }
}

async function generatePredictiveForecast(userId, options = {}) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/predictive/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        forecast_type: options.forecastType,
        business_context: options.businessContext,
        time_horizon: options.timeHorizon,
        options: options.options
      }),
      timeout: 45000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Predictive forecast generation failed')
    }

    return data.forecast || {}
    
  } catch (error) {
    console.error('Failed to generate predictive forecast:', error)
    throw new Error(`Predictive forecast generation failed: ${error.message}`)
  }
}

async function generateMockPredictions(forecastType = 'comprehensive', timeHorizon = 'weekly') {
  // Mock predictive analytics data for development/fallback
  const baseForecast = {
    id: `mock_forecast_${Date.now()}`,
    type: forecastType,
    timeHorizon,
    generated_at: new Date().toISOString(),
    overallConfidence: 0.82
  }

  if (forecastType === 'revenue' || forecastType === 'comprehensive') {
    baseForecast.revenueForecast = {
      currentRevenue: 1250,
      predictions: {
        '1_day': { value: 1180, confidence: 0.89, trend: 'stable' },
        '1_week': { value: 8400, confidence: 0.84, trend: 'increasing' },
        '1_month': { value: 36500, confidence: 0.78, trend: 'increasing' }
      },
      factors: [
        'Seasonal holiday boost (+15%)',
        'Weekend demand surge (+25%)',
        'Customer retention improvement (+8%)'
      ],
      recommendations: [
        'Schedule additional staff for weekend peak hours',
        'Implement holiday service packages',
        'Focus on customer retention initiatives'
      ]
    }
  }

  if (forecastType === 'customer' || forecastType === 'comprehensive') {
    baseForecast.customerBehavior = {
      segments: [
        {
          name: 'VIP Customers',
          size: 85,
          retentionRate: 0.92,
          predictedGrowth: 0.08,
          avgMonthlyValue: 180,
          recommendations: [
            'Offer exclusive service previews',
            'Implement VIP loyalty rewards',
            'Provide priority booking access'
          ]
        },
        {
          name: 'Regular Customers',
          size: 240,
          retentionRate: 0.76,
          predictedGrowth: 0.05,
          avgMonthlyValue: 95,
          recommendations: [
            'Send personalized service reminders',
            'Offer loyalty program incentives',
            'Gather feedback for service improvement'
          ]
        },
        {
          name: 'New Customers',
          size: 45,
          retentionRate: 0.62,
          predictedGrowth: 0.18,
          avgMonthlyValue: 65,
          recommendations: [
            'Implement new customer welcome program',
            'Follow up after first visit',
            'Offer second visit discount'
          ]
        }
      ],
      churnPrediction: {
        highRisk: 12,
        mediumRisk: 28,
        lowRisk: 330,
        interventionRecommendations: [
          'Proactive outreach to high-risk customers',
          'Satisfaction surveys for medium-risk segment',
          'Loyalty rewards for stable customers'
        ]
      }
    }
  }

  if (forecastType === 'demand' || forecastType === 'comprehensive') {
    baseForecast.demandForecast = {
      peakHours: ['10:00-12:00', '14:00-16:00', '17:00-19:00'],
      peakDays: ['Friday', 'Saturday', 'Sunday'],
      servicePopularity: [
        { service: 'Classic Haircut', demandTrend: 'stable', growth: 0.02 },
        { service: 'Beard Styling', demandTrend: 'increasing', growth: 0.15 },
        { service: 'Premium Package', demandTrend: 'increasing', growth: 0.22 },
        { service: 'Quick Trim', demandTrend: 'decreasing', growth: -0.08 }
      ],
      capacityUtilization: {
        current: 0.73,
        predicted: 0.81,
        peakUtilization: 0.95,
        optimizationOpportunity: 0.12
      },
      recommendations: [
        'Extend hours during predicted peak demand',
        'Promote premium services with growing demand',
        'Offer off-peak discounts to balance utilization'
      ]
    }
  }

  if (forecastType === 'pricing' || forecastType === 'comprehensive') {
    baseForecast.pricingOptimization = {
      services: [
        {
          name: 'Classic Haircut',
          currentPrice: 28,
          optimalPrice: 32,
          elasticity: -0.6,
          revenueImpact: '+12%',
          recommendation: 'Gradual price increase over 2 months'
        },
        {
          name: 'Beard Styling',
          currentPrice: 18,
          optimalPrice: 22,
          elasticity: -0.4,
          revenueImpact: '+18%',
          recommendation: 'Immediate price adjustment - high demand service'
        },
        {
          name: 'Premium Package',
          currentPrice: 65,
          optimalPrice: 75,
          elasticity: -0.3,
          revenueImpact: '+14%',
          recommendation: 'Premium positioning allows price increase'
        }
      ],
      dynamicPricingOpportunities: [
        'Peak hour premium pricing (+15%)',
        'Weekend surge pricing (+20%)',
        'Off-peak promotional pricing (-10%)'
      ]
    }
  }

  return baseForecast
}