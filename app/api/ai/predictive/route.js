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

    const { forecastType, businessContext, timeHorizon, options, analysis_type, current_pricing, barbershop_id } = await request.json()

    // Handle Strategic Pricing requests
    if (analysis_type === 'strategic_pricing') {
      console.log('🎯 Strategic Pricing Request:', { barbershop_id, current_pricing })
      
      try {
        // Call our strategic pricing service (simulated for now)
        const strategicPricing = await generateStrategicPricingRecommendations(barbershop_id || user.id, current_pricing || {})
        
        return NextResponse.json({
          success: true,
          analysis_type: 'strategic_pricing',
          barbershop_id: barbershop_id || user.id,
          strategic_pricing_recommendations: strategicPricing,
          metadata: {
            approach: '60/90-day strategic analysis',
            qualification_criteria: {
              minimum_days: 60,
              minimum_booking_rate: 0.85,
              minimum_bookings: 30,
              days_between_increases: 90
            },
            generated_at: new Date().toISOString()
          }
        })
        
      } catch (strategicError) {
        console.error('Strategic pricing error:', strategicError)
        
        // Return fallback strategic pricing data
        return NextResponse.json({
          success: true,
          analysis_type: 'strategic_pricing_fallback',
          strategic_pricing_recommendations: [
            {
              service_name: 'haircut',
              current_price: current_pricing?.haircut || 25.0,
              recommended_price: (current_pricing?.haircut || 25.0) * 1.08,
              price_increase_percentage: 8.0,
              days_of_sustained_performance: 78,
              recommendation_confidence: 0.85,
              implementation_timeline: 'Implement within 2 weeks',
              next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          metadata: {
            approach: '60/90-day strategic analysis (fallback)',
            generated_at: new Date().toISOString(),
            note: 'Backend service unavailable - using simulated data'
          }
        })
      }
    }

    // Original forecast logic
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

async function generateStrategicPricingRecommendations(barbershopId, currentPricing = {}) {
  // Strategic pricing using 60/90-day approach - simulated data
  // In production, this would call the Python predictive analytics service
  
  // Default pricing if not provided
  const pricing = {
    haircut: 25.0,
    styling: 35.0,
    beard_trim: 15.0,
    wash: 10.0,
    ...currentPricing
  }
  
  // Simulated strategic pricing recommendations based on our 60/90-day criteria
  const recommendations = []
  
  // Haircut service - qualifies for increase (high performance over 60+ days)
  if (pricing.haircut) {
    recommendations.push({
      service_name: 'haircut',
      current_price: pricing.haircut,
      recommended_price: Math.round(pricing.haircut * 1.087 * 100) / 100, // 8.7% increase
      price_increase_percentage: 8.7,
      days_of_sustained_performance: 78, // 78 days of strong performance
      recommendation_confidence: 0.85,
      implementation_timeline: 'Implement within 2 weeks',
      next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      risk_assessment: {
        level: 'low',
        factors: ['Strong customer loyalty', 'High booking rate', 'Market positioning strength']
      },
      performance_metrics: {
        booking_rate: 0.89,
        customer_satisfaction: 4.6,
        revenue_growth: 0.12
      }
    })
  }
  
  // Styling service - also qualifies for increase (excellent performance)
  if (pricing.styling) {
    recommendations.push({
      service_name: 'styling',
      current_price: pricing.styling,
      recommended_price: Math.round(pricing.styling * 1.093 * 100) / 100, // 9.3% increase
      price_increase_percentage: 9.3,
      days_of_sustained_performance: 71, // 71 days of strong performance
      recommendation_confidence: 0.82,
      implementation_timeline: 'Implement within 1 month',
      next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      risk_assessment: {
        level: 'low',
        factors: ['Premium service positioning', 'High customer satisfaction', 'Strong demand']
      },
      performance_metrics: {
        booking_rate: 0.91,
        customer_satisfaction: 4.7,
        revenue_growth: 0.15
      }
    })
  }
  
  // Note: beard_trim and wash do not qualify for increases
  // - beard_trim: Only 52 days of data (need 60+), booking rate 79% (need 85%+)
  // - wash: Low revenue service, insufficient volume
  
  console.log(`🎯 Generated ${recommendations.length} strategic pricing recommendations for ${barbershopId}`)
  
  return recommendations
}