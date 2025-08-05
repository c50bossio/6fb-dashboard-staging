import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 45 // Extended timeout for AI processing

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessContext, forceRefresh = false } = await request.json()

    if (!businessContext) {
      return NextResponse.json(
        { error: 'Business context is required' },
        { status: 400 }
      )
    }

    try {
      // Call the business recommendations engine via FastAPI
      const response = await getRecommendationsSuite({
        businessContext: {
          business_id: user.id,
          ...businessContext
        },
        forceRefresh,
        userId: user.id
      })
      
      return NextResponse.json({
        success: true,
        ...response,
        timestamp: new Date().toISOString()
      })

    } catch (engineError) {
      console.error('Recommendations engine error:', engineError)
      
      // Fallback response with basic recommendations
      return NextResponse.json({
        success: true,
        provider: 'fallback',
        recommendations: generateFallbackRecommendations(businessContext),
        analysis_summary: "Basic recommendations generated. Our AI system is temporarily unavailable for full analysis.",
        total_potential_impact: {
          total_revenue_increase_monthly: 1000,
          total_recommendations: 3
        },
        fallback: true,
        fallbackReason: engineError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Recommendations endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      // Get recommendations engine status
      const status = await getRecommendationsEngineStatus()
      
      return NextResponse.json({
        success: true,
        ...status,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Engine status error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        fallback_status: {
          engine_status: 'degraded',
          cached_businesses: 0,
          last_generation: null
        }
      })
    }

  } catch (error) {
    console.error('Engine status endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getRecommendationsSuite(options) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/business/recommendations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        business_context: options.businessContext,
        force_refresh: options.forceRefresh || false,
        user_id: options.userId
      }),
      timeout: 40000 // 40 second timeout
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Recommendations engine service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to get recommendations from FastAPI:', error)
    throw new Error(`Recommendations engine unavailable: ${error.message}`)
  }
}

async function getRecommendationsEngineStatus() {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/business/recommendations/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    return data
    
  } catch (error) {
    console.error('Failed to get engine status from FastAPI:', error)
    throw new Error(`Engine status service unavailable: ${error.message}`)
  }
}

function generateFallbackRecommendations(businessContext) {
  const currentRevenue = businessContext.monthly_revenue || 5000
  const currentCustomers = businessContext.customer_count || 150
  
  return [
    {
      id: 'fallback_social_media',
      title: 'Boost Revenue: Enhance Social Media Marketing',
      description: 'Increase social media presence with regular posts, customer testimonials, and before/after photos to attract new customers and increase bookings.',
      category: 'marketing_strategy',
      priority: 'high',
      estimated_impact: {
        revenue_increase_monthly: Math.round(currentRevenue * 0.15),
        new_customers_monthly: Math.round(currentCustomers * 0.10),
        roi_percentage: 25
      },
      implementation_effort: 'low',
      implementation_time: '1-2 weeks',
      action_steps: [
        'Post 3-4 times per week on Instagram and Facebook',
        'Share before/after transformation photos',
        'Encourage customer reviews and testimonials',
        'Use local hashtags and location tags'
      ],
      success_metrics: [
        'Social media followers growth',
        'Post engagement rate',
        'New booking inquiries from social media'
      ],
      roi_estimate: 25,
      confidence_score: 0.75,
      source_agent: 'Fallback Marketing Expert'
    },
    {
      id: 'fallback_customer_retention',
      title: 'Retain Customers: Implement Loyalty Program',
      description: 'Create a simple loyalty program offering discounts or free services after a certain number of visits to increase customer retention and lifetime value.',
      category: 'customer_retention',
      priority: 'high',
      estimated_impact: {
        revenue_increase_monthly: Math.round(currentRevenue * 0.12),
        customer_retention_improvement: 15,
        roi_percentage: 30
      },
      implementation_effort: 'medium',
      implementation_time: '2-4 weeks',
      action_steps: [
        'Design loyalty card or digital tracking system',
        'Define reward structure (e.g., 10th haircut free)',
        'Train staff on loyalty program promotion',
        'Launch with existing customers first'
      ],
      success_metrics: [
        'Customer return rate increase',
        'Average customer lifetime value',
        'Loyalty program participation rate'
      ],
      roi_estimate: 30,
      confidence_score: 0.80,
      source_agent: 'Fallback Customer Success Expert'
    },
    {
      id: 'fallback_premium_services',
      title: 'Boost Revenue: Introduce Premium Services',
      description: 'Add high-margin premium services like beard grooming packages, hair treatments, or styling consultations to increase average ticket size.',
      category: 'revenue_optimization',
      priority: 'medium',
      estimated_impact: {
        revenue_increase_monthly: Math.round(currentRevenue * 0.20),
        avg_ticket_increase: 25,
        roi_percentage: 35
      },
      implementation_effort: 'medium',
      implementation_time: '3-4 weeks',
      action_steps: [
        'Research popular premium barbershop services',
        'Train staff on new service techniques',
        'Create premium service menu and pricing',
        'Promote new services to existing customers'
      ],
      success_metrics: [
        'Premium service adoption rate',
        'Average transaction value increase',
        'Customer satisfaction with new services'
      ],
      roi_estimate: 35,
      confidence_score: 0.70,
      source_agent: 'Fallback Revenue Expert'
    }
  ]
}