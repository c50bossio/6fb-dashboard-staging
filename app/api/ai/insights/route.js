import { NextResponse } from 'next/server'
import { getAIInsights } from '@/lib/dashboard-data'
import { createClient } from '@/lib/supabase/server'
import unifiedStaffService from '@/lib/unified-staff-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Reduced from 30 seconds - database operations are fast

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { searchParams } = new URL(request.url)
    
    // Allow public access with limited insights for demo/testing
    if (!user) {
      const barbershopId = searchParams.get('barbershop_id')
      
      if (barbershopId) {
        // Provide basic public insights
        return NextResponse.json({
          success: true,
          insights: [
            {
              type: 'staff_availability',
              title: 'Staff Status',
              description: 'Check staff availability for optimal scheduling',
              priority: 'high',
              timestamp: new Date().toISOString()
            },
            {
              type: 'booking_optimization',
              title: 'Booking Insights',
              description: 'AI-powered booking recommendations available',
              priority: 'medium',
              timestamp: new Date().toISOString()
            }
          ],
          count: 2,
          timestamp: new Date().toISOString(),
          source: 'public_demo',
          limited: true
        })
      }
      
      return NextResponse.json({ error: 'Unauthorized - provide barbershop_id for demo access' }, { status: 401 })
    }

    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') // Optional filter by insight type
    const barbershopId = user.barbershop_id
    
    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'No barbershop associated with your account'
      }, { status: 400 })
    }

    try {
      // Try to get database insights first
      const databaseInsights = await getDatabaseInsights(barbershopId, { limit, type })

      if (databaseInsights.length > 0) {
        return NextResponse.json({
          success: true,
          insights: databaseInsights,
          count: databaseInsights.length,
          timestamp: new Date().toISOString(),
          source: 'database'
        })
      }

      // Fall back to generating insights from analytics data
      const analyticsInsights = await generateInsightsFromAnalytics(barbershopId)

      return NextResponse.json({
        success: true,
        insights: analyticsInsights,
        count: analyticsInsights.length,
        timestamp: new Date().toISOString(),
        source: 'analytics_generated'
      })

    } catch (dbError) {
      console.error('Database insights error:', dbError)

      // Last resort: try analytics-based insights
      try {
        const analyticsInsights = await generateInsightsFromAnalytics(barbershopId)
        return NextResponse.json({
          success: true,
          insights: analyticsInsights,
          count: analyticsInsights.length,
          timestamp: new Date().toISOString(),
          source: 'analytics_fallback'
        })
      } catch (analyticsError) {
        console.error('Analytics insights error:', analyticsError)
        return NextResponse.json({
          success: true,
          insights: [],
          count: 0,
          error: 'No insights available',
          timestamp: new Date().toISOString(),
          source: 'empty_state'
        })
      }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessContext, forceRefresh } = await request.json()
    const barbershopId = user.barbershop_id
    
    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'No barbershop associated with your account'
      }, { status: 400 })
    }

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
  const supabase = await createClient()
  
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
  const supabase = await createClient()

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

/**
 * Generate dynamic insights from live analytics data (NO MOCK DATA)
 * Analyzes real business patterns and returns actionable recommendations
 */
async function generateInsightsFromAnalytics(barbershopId) {
  try {
    // Fetch real analytics data from live-data API
    const analyticsResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/analytics/live-data?barbershop_id=${barbershopId}&format=json`,
      { cache: 'no-store' }
    )

    if (!analyticsResponse.ok) {
      throw new Error('Failed to fetch analytics data')
    }

    const analyticsResult = await analyticsResponse.json()
    const analytics = analyticsResult.data

    const insights = []

    // Insight 1: Revenue Growth Analysis
    if (analytics.revenue_growth !== undefined && analytics.revenue_growth !== 0) {
      const growthDirection = analytics.revenue_growth > 0 ? 'up' : 'down'
      const growthMagnitude = Math.abs(analytics.revenue_growth)

      if (growthMagnitude > 15) {
        insights.push({
          description: `Revenue is ${growthDirection} ${growthMagnitude.toFixed(1)}% this month - ${
            growthDirection === 'up'
              ? 'excellent momentum! Consider expanding service offerings'
              : 'review pricing strategy and customer retention efforts'
          }`,
          type: 'revenue',
          priority: 'high',
          metric: analytics.revenue_growth
        })
      } else if (growthMagnitude > 5) {
        insights.push({
          description: `Revenue ${growthDirection === 'up' ? 'growing' : 'declining'} at ${growthMagnitude.toFixed(1)}% - ${
            growthDirection === 'up'
              ? 'maintain current strategies'
              : 'consider promotional campaigns'
          }`,
          type: 'revenue',
          priority: 'medium',
          metric: analytics.revenue_growth
        })
      }
    }

    // Insight 2: Weekly Pattern Analysis
    if (analytics.weekly_patterns) {
      const patterns = analytics.weekly_patterns
      const days = Object.entries(patterns).filter(([_, data]) => data.revenue > 0)

      if (days.length >= 2) {
        const sortedDays = days.sort((a, b) => b[1].revenue - a[1].revenue)
        const busiestDay = sortedDays[0]
        const slowestDay = sortedDays[sortedDays.length - 1]

        if (busiestDay[1].revenue > slowestDay[1].revenue * 2) {
          insights.push({
            description: `${busiestDay[0]} generates 2x more revenue than ${slowestDay[0]} - consider special promotions on slower days`,
            type: 'scheduling',
            priority: 'medium',
            metric: Math.round((busiestDay[1].revenue / slowestDay[1].revenue) * 100) / 100
          })
        }
      }
    }

    // Insight 3: Customer Lifetime Value
    if (analytics.average_customer_lifetime_value && analytics.total_customers > 10) {
      if (analytics.average_customer_lifetime_value > 150) {
        insights.push({
          description: `Strong $${Math.round(analytics.average_customer_lifetime_value)} average customer value - loyalty program ROI would be excellent`,
          type: 'retention',
          priority: 'high',
          metric: analytics.average_customer_lifetime_value
        })
      }
    }

    // If no insights were generated (insufficient data), return empty array
    // Following NO MOCK DATA policy - no fallback insights
    if (insights.length === 0) {
      return []
    }

    // Return top 2 highest priority insights
    return insights
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, 2)

  } catch (error) {
    console.error('Failed to generate insights from analytics:', error)
    return []
  }
}

