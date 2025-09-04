/**
 * Analytics API Route Handler
 * 6FB AI Agent System - Advanced Analytics and Six Figure Barber Metrics
 * 
 * Provides comprehensive analytics dashboard data with methodology alignment
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { AnalyticsAPI, AuthenticationService } from '@/lib/api/customization-api'

// GET /api/customization/analytics
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('date_range') || '30d'
    const metrics = searchParams.get('metrics')?.split(',') || []
    const organizationId = searchParams.get('organization_id')
    const locationId = searchParams.get('location_id')

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate authentication
    const authResult = await AuthenticationService.validateToken(authToken)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get comprehensive dashboard analytics
    const result = await AnalyticsAPI.getDashboardAnalytics(dateRange, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Filter metrics if specific ones requested
    let responseData = result.data
    if (metrics.length > 0) {
      responseData = {}
      metrics.forEach(metric => {
        if (result.data[metric]) {
          responseData[metric] = result.data[metric]
        }
      })
    }

    // Add Six Figure methodology summary
    responseData.six_figure_summary = generateSixFigureSummary(result.data)

    return NextResponse.json({
      analytics: responseData,
      metadata: {
        date_range: dateRange,
        generated_at: new Date().toISOString(),
        organization_id: authResult.user.organization_id,
        location_id: locationId
      }
    })

  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customization/analytics/track
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required tracking data
    const requiredFields = ['type', 'action']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Get client IP and user agent for tracking
    const headersList = headers()
    const userAgent = headersList.get('user-agent') || 'Unknown'
    const clientIP = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'Unknown'

    // Prepare tracking data
    const trackingData = {
      ...body,
      userAgent,
      ipAddress: clientIP,
      timestamp: new Date().toISOString()
    }

    // Track the event
    const result = await AnalyticsAPI.trackCustomizationEvent(trackingData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Event tracked successfully',
      event_id: result.eventId,
      timestamp: trackingData.timestamp
    })

  } catch (error) {
    console.error('Analytics Track Event error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// This function is used internally, not exported as a route
async function getSixFigureMetrics(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('date_range') || '30d'
    const locationId = searchParams.get('location_id')

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get Six Figure specific metrics
    const startDate = getStartDate(dateRange)
    const result = await AnalyticsAPI.getSixFigureMetrics(startDate)

    // Generate detailed Six Figure methodology insights
    const insights = generateDetailedSixFigureInsights(result)
    
    // Calculate progression tracking
    const progression = calculateSixFigureProgression(result)

    return NextResponse.json({
      six_figure_metrics: result,
      insights: insights,
      progression: progression,
      recommendations: generateSixFigureRecommendations(result),
      methodology_compliance: calculateMethodologyCompliance(result),
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Six Figure Metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate Six Figure methodology summary
 */
function generateSixFigureSummary(analyticsData) {
  const sixFigureMetrics = analyticsData.six_figure_metrics || {}
  
  return {
    overall_alignment_score: sixFigureMetrics.overall_six_figure_alignment || 0,
    key_metrics: {
      premium_positioning: sixFigureMetrics.premium_positioning_score || 0,
      revenue_optimization: sixFigureMetrics.revenue_optimization_score || 0,
      client_relationships: sixFigureMetrics.client_relationship_score || 0
    },
    top_insights: sixFigureMetrics.methodology_insights?.slice(0, 3) || [],
    status: getSixFigureStatus(sixFigureMetrics.overall_six_figure_alignment || 0),
    next_focus_area: getNextFocusArea(sixFigureMetrics)
  }
}

/**
 * Get Six Figure methodology status based on alignment score
 */
function getSixFigureStatus(alignmentScore) {
  if (alignmentScore >= 90) return { level: 'Master', color: '#10B981', description: 'Exceptional Six Figure methodology alignment' }
  if (alignmentScore >= 75) return { level: 'Advanced', color: '#3B82F6', description: 'Strong Six Figure methodology implementation' }
  if (alignmentScore >= 60) return { level: 'Developing', color: '#F59E0B', description: 'Good progress on Six Figure methodology' }
  if (alignmentScore >= 40) return { level: 'Learning', color: '#EF4444', description: 'Building Six Figure methodology foundation' }
  return { level: 'Starting', color: '#6B7280', description: 'Beginning Six Figure methodology journey' }
}

/**
 * Determine next focus area for Six Figure improvement
 */
function getNextFocusArea(sixFigureMetrics) {
  const scores = {
    premium_positioning: sixFigureMetrics.premium_positioning_score || 0,
    revenue_optimization: sixFigureMetrics.revenue_optimization_score || 0,
    client_relationships: sixFigureMetrics.client_relationship_score || 0
  }
  
  // Find the lowest scoring area
  const lowestArea = Object.entries(scores).reduce((lowest, [area, score]) => 
    score < lowest.score ? { area, score } : lowest,
    { area: 'premium_positioning', score: scores.premium_positioning }
  )
  
  const focusAreas = {
    premium_positioning: {
      title: 'Premium Positioning',
      description: 'Focus on elevating brand perception and premium service delivery',
      actions: [
        'Implement premium service packages',
        'Enhance brand messaging and positioning',
        'Develop luxury client experience touchpoints'
      ]
    },
    revenue_optimization: {
      title: 'Revenue Optimization',
      description: 'Optimize pricing strategy and revenue generation techniques',
      actions: [
        'Implement value-based pricing strategies',
        'Develop upselling and cross-selling systems',
        'Optimize service mix for maximum profitability'
      ]
    },
    client_relationships: {
      title: 'Client Relationships',
      description: 'Strengthen client relationships and retention strategies',
      actions: [
        'Implement client feedback and satisfaction tracking',
        'Develop personalized client communication systems',
        'Create loyalty and referral programs'
      ]
    }
  }
  
  return focusAreas[lowestArea.area] || focusAreas.premium_positioning
}

/**
 * Generate detailed Six Figure methodology insights
 */
function generateDetailedSixFigureInsights(metrics) {
  const insights = []
  
  // Premium positioning insights
  if (metrics.premium_positioning_score < 70) {
    insights.push({
      category: 'Premium Positioning',
      type: 'opportunity',
      title: 'Enhance Premium Brand Positioning',
      description: 'Your premium positioning score indicates opportunities to elevate brand perception',
      impact: 'high',
      actions: [
        'Review and update brand messaging to emphasize expertise and quality',
        'Implement premium service packages with higher margins',
        'Enhance client consultation process to demonstrate value'
      ]
    })
  }
  
  // Revenue optimization insights
  if (metrics.revenue_optimization_score < 60) {
    insights.push({
      category: 'Revenue Optimization',
      type: 'critical',
      title: 'Revenue Generation Needs Attention',
      description: 'Revenue optimization tools are underutilized, limiting income potential',
      impact: 'critical',
      actions: [
        'Implement dynamic pricing strategies based on demand',
        'Develop upselling techniques for additional services',
        'Analyze service profitability and optimize service mix'
      ]
    })
  }
  
  // Client relationship insights
  if (metrics.client_relationship_score < 65) {
    insights.push({
      category: 'Client Relationships',
      type: 'important',
      title: 'Strengthen Client Relationship Building',
      description: 'Client relationship features need more engagement to maximize retention',
      impact: 'high',
      actions: [
        'Implement regular client feedback collection',
        'Personalize client communication and service delivery',
        'Create loyalty programs to encourage repeat business'
      ]
    })
  }
  
  return insights
}

/**
 * Calculate Six Figure methodology progression
 */
function calculateSixFigureProgression(metrics) {
  const currentScore = metrics.overall_six_figure_alignment || 0
  
  // Define progression milestones
  const milestones = [
    { score: 25, title: 'Foundation', description: 'Building basic Six Figure principles' },
    { score: 50, title: 'Development', description: 'Developing core Six Figure strategies' },
    { score: 75, title: 'Proficiency', description: 'Proficient in Six Figure methodology' },
    { score: 90, title: 'Mastery', description: 'Master of Six Figure principles' }
  ]
  
  // Find current milestone and next milestone
  const currentMilestone = milestones.reduce((current, milestone) => 
    milestone.score <= currentScore ? milestone : current,
    milestones[0]
  )
  
  const nextMilestone = milestones.find(milestone => milestone.score > currentScore)
  
  return {
    current_milestone: currentMilestone,
    next_milestone: nextMilestone,
    progress_percentage: nextMilestone ? 
      ((currentScore - currentMilestone.score) / (nextMilestone.score - currentMilestone.score)) * 100 :
      100,
    points_to_next: nextMilestone ? nextMilestone.score - currentScore : 0
  }
}

/**
 * Generate Six Figure methodology recommendations
 */
function generateSixFigureRecommendations(metrics) {
  const recommendations = []
  
  // Based on overall alignment score
  const overallScore = metrics.overall_six_figure_alignment || 0
  
  if (overallScore < 50) {
    recommendations.push({
      priority: 'high',
      category: 'Foundation',
      title: 'Establish Six Figure Foundation',
      description: 'Focus on building core Six Figure methodology principles',
      timeframe: '30-60 days',
      expected_impact: '15-25% improvement in methodology alignment'
    })
  }
  
  if (overallScore >= 50 && overallScore < 75) {
    recommendations.push({
      priority: 'medium',
      category: 'Optimization',
      title: 'Optimize Six Figure Implementation',
      description: 'Fine-tune existing Six Figure strategies for better results',
      timeframe: '60-90 days',
      expected_impact: '10-20% improvement in methodology alignment'
    })
  }
  
  if (overallScore >= 75) {
    recommendations.push({
      priority: 'low',
      category: 'Innovation',
      title: 'Innovate Within Six Figure Framework',
      description: 'Explore advanced Six Figure strategies and customizations',
      timeframe: '90+ days',
      expected_impact: '5-15% improvement in methodology alignment'
    })
  }
  
  return recommendations
}

/**
 * Calculate methodology compliance score
 */
function calculateMethodologyCompliance(metrics) {
  const weights = {
    premium_positioning: 0.4,
    revenue_optimization: 0.35,
    client_relationships: 0.25
  }
  
  const scores = {
    premium_positioning: metrics.premium_positioning_score || 0,
    revenue_optimization: metrics.revenue_optimization_score || 0,
    client_relationships: metrics.client_relationship_score || 0
  }
  
  const weightedScore = Object.entries(weights).reduce((total, [area, weight]) => 
    total + (scores[area] * weight), 0
  )
  
  return {
    overall_compliance: Math.round(weightedScore),
    component_scores: scores,
    compliance_level: getComplianceLevel(weightedScore),
    areas_for_improvement: Object.entries(scores)
      .filter(([, score]) => score < 70)
      .map(([area]) => area)
      .sort((a, b) => scores[a] - scores[b])
  }
}

/**
 * Get compliance level description
 */
function getComplianceLevel(score) {
  if (score >= 90) return 'Excellent - Full methodology compliance'
  if (score >= 75) return 'Good - Strong methodology alignment'
  if (score >= 60) return 'Fair - Moderate methodology implementation'
  if (score >= 40) return 'Poor - Limited methodology adoption'
  return 'Critical - Major methodology gaps'
}

/**
 * Get start date based on range string
 */
function getStartDate(range) {
  const now = new Date()
  const days = parseInt(range.replace('d', ''))
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  return startDate.toISOString()
}