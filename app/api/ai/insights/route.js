import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIInsights } from '@/lib/dashboard-data'

export const runtime = 'nodejs'
export const maxDuration = 10 // Reduced from 30 seconds - database operations are fast

export async function GET(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') // Optional filter by insight type
    const barbershopId = user.barbershop_id || 'demo-shop-001'

    try {
      const insights = await getDatabaseInsights(barbershopId, { limit, type })
      
      return NextResponse.json({
        success: true,
        insights,
        count: insights.length,
        timestamp: new Date().toISOString(),
        source: 'database' // Clearly indicate data source
      })

    } catch (dbError) {
      console.error('Database insights error:', dbError)
      
      return NextResponse.json({
        success: true,
        insights: [],
        count: 0,
        error: 'No insights available',
        timestamp: new Date().toISOString(),
        source: 'empty_state'
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessContext, forceRefresh } = await request.json()
    const barbershopId = user.barbershop_id || 'demo-shop-001'

    try {
      const insights = await generateInsightsToDatabase(barbershopId, businessContext, forceRefresh)
      
      return NextResponse.json({
        success: true,
        insights,
        generated: true,
        timestamp: new Date().toISOString(),
        source: 'database_generated'
      })

    } catch (dbError) {
      console.error('Database insight generation error:', dbError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to generate AI insights',
        details: dbError.message
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

async function getDatabaseInsights(barbershopId, options = {}) {
  const { limit = 10, type } = options
  
  try {
    const insights = await getAIInsights(barbershopId, limit)
    
    if (type) {
      return insights.filter(insight => insight.category === type || insight.type === type)
    }
    
    return insights
    
  } catch (error) {
    console.error('Failed to get insights from database:', error)
    throw new Error(`Database insights query failed: ${error.message}`)
  }
}

async function generateInsightsToDatabase(barbershopId, businessContext = {}, forceRefresh = false) {
  const supabase = createClient()
  
  try {
    if (forceRefresh) {
      await supabase
        .from('ai_insights')
        .update({ is_active: false })
        .eq('barbershop_id', barbershopId)
    }
    
    
    const newInsights = await generateContextualInsights(barbershopId, businessContext)
    
    const { data, error } = await supabase
      .from('ai_insights')
      .insert(newInsights)
      .select()
    
    if (error) throw error
    
    return data || []
    
  } catch (error) {
    console.error('Failed to generate insights to database:', error)
    throw new Error(`Database insight generation failed: ${error.message}`)
  }
}

async function generateContextualInsights(barbershopId, businessContext) {
  const supabase = createClient()
  
  try {
    const { data: metrics } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
    
    const insights = []
    
    if (metrics && metrics.length > 0) {
      const avgRevenue = metrics.reduce((sum, m) => sum + parseFloat(m.total_revenue || 0), 0) / metrics.length
      const latestRevenue = parseFloat(metrics[0]?.total_revenue || 0)
      
      if (latestRevenue < avgRevenue * 0.9) {
        insights.push({
          barbershop_id: barbershopId,
          type: 'opportunity',
          category: 'revenue',
          priority: 'high',
          title: 'Revenue Below Average',
          message: `Current revenue is ${Math.round(((avgRevenue - latestRevenue) / avgRevenue) * 100)}% below recent average`,
          recommendation: 'Consider promotional pricing or extended hours to boost bookings',
          confidence_score: 0.85,
          impact_score: 8.0,
          ai_agent_type: 'financial',
          data_points: { current_revenue: latestRevenue, avg_revenue: avgRevenue }
        })
      }
      
      const avgUtilization = metrics.reduce((sum, m) => sum + parseFloat(m.chair_utilization_rate || 0), 0) / metrics.length
      if (avgUtilization < 0.75) {
        insights.push({
          barbershop_id: barbershopId,
          type: 'alert',
          category: 'operations',
          priority: 'medium',
          title: 'Chair Utilization Below Optimal',
          message: `Chair utilization is ${Math.round(avgUtilization * 100)}%, below the optimal 85% target`,
          recommendation: 'Implement off-peak pricing and extend evening hours',
          confidence_score: 0.78,
          impact_score: 7.5,
          ai_agent_type: 'operations',
          data_points: { utilization_rate: avgUtilization, target_rate: 0.85 }
        })
      }
      
      const avgSatisfaction = metrics.reduce((sum, m) => sum + parseFloat(m.avg_satisfaction_score || 0), 0) / metrics.length
      if (avgSatisfaction > 4.5) {
        insights.push({
          barbershop_id: barbershopId,
          type: 'success',
          category: 'customer_behavior',
          priority: 'low',
          title: 'Excellent Customer Satisfaction',
          message: `Customer satisfaction is ${avgSatisfaction.toFixed(2)}/5.0 - above industry average`,
          recommendation: 'Leverage high satisfaction for referral programs and premium pricing',
          confidence_score: 0.92,
          impact_score: 6.0,
          ai_agent_type: 'client_acquisition',
          data_points: { satisfaction_score: avgSatisfaction, benchmark: 4.0 }
        })
      }
    }
    
    if (insights.length === 0) {
      insights.push({
        barbershop_id: barbershopId,
        type: 'opportunity',
        category: 'operations',
        priority: 'medium',
        title: 'Optimization Opportunity Available',
        message: 'Business metrics analysis suggests potential for operational improvements',
        recommendation: 'Focus on data collection and performance tracking to identify specific opportunities',
        confidence_score: 0.65,
        impact_score: 5.0,
        ai_agent_type: 'operations',
        data_points: { context: businessContext }
      })
    }
    
    return insights
    
  } catch (error) {
    console.error('Failed to generate contextual insights:', error)
    return []
  }
}

