import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') // Optional filter by insight type

    try {
      // Call Python AI Insights Service
      const insights = await getAIInsights(user.id, { limit, type })
      
      return NextResponse.json({
        success: true,
        insights,
        count: insights.length,
        timestamp: new Date().toISOString()
      })

    } catch (aiError) {
      console.error('AI Insights error:', aiError)
      
      // Fallback to mock insights
      const mockInsights = await generateMockInsights(limit, type)
      
      return NextResponse.json({
        success: true,
        insights: mockInsights,
        count: mockInsights.length,
        fallback: true,
        fallbackReason: aiError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('AI Insights endpoint error:', error)
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

    const { businessContext, forceRefresh } = await request.json()

    try {
      // Generate new AI insights
      const insights = await generateAIInsights(user.id, businessContext, forceRefresh)
      
      return NextResponse.json({
        success: true,
        insights,
        generated: true,
        timestamp: new Date().toISOString()
      })

    } catch (aiError) {
      console.error('AI Insight generation error:', aiError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to generate AI insights',
        details: aiError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('AI Insights generation endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getAIInsights(userId, options = {}) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const queryParams = new URLSearchParams({
      limit: options.limit || 10,
      ...(options.type && { type: options.type })
    })
    
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/insights?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'AI Insights service failed')
    }

    return data.insights || []
    
  } catch (error) {
    console.error('Failed to get AI insights from FastAPI:', error)
    throw new Error(`AI Insights service unavailable: ${error.message}`)
  }
}

async function generateAIInsights(userId, businessContext = {}, forceRefresh = false) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/insights/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        business_context: businessContext,
        force_refresh: forceRefresh
      }),
      timeout: 25000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'AI Insights generation failed')
    }

    return data.insights || []
    
  } catch (error) {
    console.error('Failed to generate AI insights:', error)
    throw new Error(`AI Insights generation failed: ${error.message}`)
  }
}

async function generateMockInsights(limit = 10, type = null) {
  // Mock insights for development/fallback
  const insightTypes = [
    'revenue_opportunity',
    'customer_behavior', 
    'operational_efficiency',
    'marketing_insight',
    'scheduling_optimization'
  ]
  
  const mockInsights = [
    {
      id: `mock_revenue_${Date.now()}`,
      type: 'revenue_opportunity',
      title: 'Peak Hour Revenue Opportunity',
      description: 'Current revenue is 15% below average for Tuesday afternoons',
      recommendation: 'Consider offering express services during 2-4 PM to capture walk-in customers',
      confidence: 0.82,
      impact_score: 7.5,
      urgency: 'medium',
      data_points: {
        current_revenue: 850,
        avg_revenue: 1000,
        deficit_percentage: 15
      },
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `mock_customer_${Date.now()}`,
      type: 'customer_behavior',
      title: 'Customer Retention Alert',
      description: 'Repeat customer rate has dropped to 68% this month',
      recommendation: 'Implement personalized follow-up messages and loyalty program incentives',
      confidence: 0.89,
      impact_score: 8.2,
      urgency: 'high',
      data_points: {
        repeat_rate: 0.68,
        target_rate: 0.75,
        monthly_change: -0.07
      },
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `mock_scheduling_${Date.now()}`,
      type: 'scheduling_optimization',
      title: 'Booking Gap Optimization',
      description: '20-minute gaps detected between appointments causing efficiency loss',
      recommendation: 'Adjust booking intervals to 15 or 30 minutes to reduce gaps',
      confidence: 0.91,
      impact_score: 6.8,
      urgency: 'low',
      data_points: {
        avg_gap_minutes: 20,
        optimal_gap: 15,
        efficiency_loss: 12
      },
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `mock_marketing_${Date.now()}`,
      type: 'marketing_insight',
      title: 'Social Media Engagement Drop',
      description: 'Instagram engagement rate decreased to 2.1% this week',
      recommendation: 'Post before/after transformation photos and respond to comments within 1 hour',
      confidence: 0.76,
      impact_score: 7.0,
      urgency: 'medium',
      data_points: {
        engagement_rate: 0.021,
        target_rate: 0.045,
        weekly_change: -0.018
      },
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `mock_operational_${Date.now()}`,
      type: 'operational_efficiency',
      title: 'Chair Utilization Below Target',
      description: 'Chair utilization is 71%, below the optimal 85% target',
      recommendation: 'Promote off-peak discounts and extend evening hours on weekdays',
      confidence: 0.84,
      impact_score: 8.5,
      urgency: 'high',
      data_points: {
        utilization_rate: 0.71,
        target_rate: 0.85,
        revenue_potential: 250
      },
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    }
  ]
  
  // Filter by type if specified
  const filteredInsights = type 
    ? mockInsights.filter(insight => insight.type === type)
    : mockInsights
  
  // Return limited results
  return filteredInsights.slice(0, limit)
}