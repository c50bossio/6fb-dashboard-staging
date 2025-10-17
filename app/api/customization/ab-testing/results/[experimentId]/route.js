/**
 * A/B Testing Results API Route Handler
 * 6FB AI Agent System - Statistical Analysis and Results
 * 
 * Provides detailed experiment results with statistical significance
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { ABTestingAPI, AuthenticationService } from '@/lib/api/customization-api'

// GET /api/customization/ab-testing/results/[experimentId]
export async function GET(request, { params }) {
  try {
    const experimentId = params.experimentId
    
    if (!experimentId) {
      return NextResponse.json(
        { error: 'Experiment ID is required' },
        { status: 400 }
      )
    }

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get experiment results with statistical analysis
    const result = await ABTestingAPI.getExperimentResults(experimentId, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    const experiment = result.data
    const statisticalResults = experiment.statistical_results || {}

    // Format response with comprehensive results
    const response = {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        primary_metric: experiment.primary_metric,
        six_figure_objective: experiment.six_figure_objective,
        expected_revenue_impact: experiment.expected_revenue_impact,
        start_date: experiment.start_date,
        end_date: experiment.end_date,
        participants: experiment.participants
      },
      variants: experiment.experiment_variants?.map(variant => ({
        id: variant.id,
        name: variant.variant_name,
        is_control: variant.is_control,
        traffic_allocation: variant.traffic_allocation,
        participants: variant.participants,
        conversions: variant.conversions,
        conversion_rate: variant.conversion_rate || 0
      })) || [],
      statistical_analysis: {
        is_significant: statisticalResults.is_significant || false,
        confidence_level: statisticalResults.confidence_level || 0,
        p_value: statisticalResults.p_value || 1,
        z_score: statisticalResults.z_score || 0,
        lift: statisticalResults.lift || 0,
        sample_size: statisticalResults.sample_size || { control: 0, test: 0, total: 0 },
        recommendation: statisticalResults.recommendation || {
          action: 'continue_testing',
          message: 'Not enough data for reliable results',
          priority: 'medium'
        }
      },
      six_figure_metrics: {
        revenue_impact_projection: calculateRevenueImpact(
          statisticalResults.lift || 0,
          experiment.expected_revenue_impact || 0
        ),
        client_value_improvement: calculateClientValueImprovement(
          statisticalResults.lift || 0
        ),
        methodology_alignment_score: calculateMethodologyAlignment(
          experiment.six_figure_objective,
          statisticalResults.lift || 0,
          statisticalResults.is_significant || false
        )
      },
      insights: generateSixFigureInsights(
        experiment,
        statisticalResults
      )
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('A/B Testing Results GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customization/ab-testing/results/[experimentId]/track
export async function POST(request, { params }) {
  try {
    const experimentId = params.experimentId
    const body = await request.json()
    
    if (!experimentId) {
      return NextResponse.json(
        { error: 'Experiment ID is required' },
        { status: 400 }
      )
    }

    // Validate required tracking data
    const { variantId, eventType, userId } = body
    
    if (!variantId || !eventType) {
      return NextResponse.json(
        { error: 'Variant ID and event type are required' },
        { status: 400 }
      )
    }

    // Track event
    const result = await ABTestingAPI.trackEvent(
      experimentId,
      variantId,
      eventType,
      userId
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Event tracked successfully',
      experiment_id: experimentId,
      variant_id: variantId,
      event_type: eventType,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('A/B Testing Track Event error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate projected revenue impact based on lift and expected impact
 */
function calculateRevenueImpact(lift, expectedImpact) {
  if (!lift || !expectedImpact) return null
  
  const actualImpact = (lift / 100) * expectedImpact
  return {
    projected_lift_percentage: lift,
    projected_revenue_multiplier: 1 + (actualImpact / 100),
    expected_vs_actual: {
      expected_impact: expectedImpact,
      actual_impact: actualImpact,
      performance_ratio: actualImpact / expectedImpact
    }
  }
}

/**
 * Calculate client value improvement metrics
 */
function calculateClientValueImprovement(lift) {
  if (!lift) return null
  
  return {
    estimated_ltv_increase: Math.max(0, lift * 0.8), // Conservative estimate
    retention_improvement: Math.max(0, lift * 0.6),
    referral_potential_increase: Math.max(0, lift * 0.4)
  }
}

/**
 * Calculate Six Figure methodology alignment score
 */
function calculateMethodologyAlignment(objective, lift, isSignificant) {
  let baseScore = 50 // Neutral starting point
  
  // Objective-based scoring
  const objectiveWeights = {
    revenue_optimization: 1.2,
    client_retention: 1.1,
    premium_positioning: 1.15,
    service_excellence: 1.0,
    operational_efficiency: 0.9
  }
  
  const weight = objectiveWeights[objective] || 1.0
  
  // Performance-based adjustments
  if (isSignificant) {
    baseScore += 30 // Significant results bonus
  }
  
  if (lift > 0) {
    baseScore += Math.min(20, lift * 0.5) // Positive lift bonus
  } else if (lift < 0) {
    baseScore += Math.max(-30, lift * 0.5) // Negative lift penalty
  }
  
  // Apply methodology weight
  const finalScore = Math.round(baseScore * weight)
  
  return Math.max(0, Math.min(100, finalScore))
}

/**
 * Generate Six Figure methodology insights
 */
function generateSixFigureInsights(experiment, statisticalResults) {
  const insights = []
  
  // Statistical significance insights
  if (statisticalResults.is_significant) {
    if (statisticalResults.lift > 0) {
      insights.push({
        type: 'success',
        category: 'Performance',
        title: 'Significant Improvement Detected',
        message: `Test variant shows ${statisticalResults.lift.toFixed(1)}% improvement with ${statisticalResults.confidence_level.toFixed(1)}% confidence`,
        impact: 'high',
        six_figure_relevance: 'This improvement aligns with Six Figure methodology of continuous optimization'
      })
    } else {
      insights.push({
        type: 'warning',
        category: 'Performance',
        title: 'Significant Decline Detected',
        message: `Test variant shows ${Math.abs(statisticalResults.lift).toFixed(1)}% decline. Consider reverting to control`,
        impact: 'high',
        six_figure_relevance: 'Protecting revenue and client experience is core to Six Figure success'
      })
    }
  } else {
    insights.push({
      type: 'info',
      category: 'Testing',
      title: 'Continue Testing',
      message: `Results not yet significant (${statisticalResults.confidence_level.toFixed(1)}% confidence). Need more data`,
      impact: 'medium',
      six_figure_relevance: 'Six Figure methodology requires data-driven decisions'
    })
  }
  
  // Sample size insights
  const totalSampleSize = statisticalResults.sample_size?.total || 0
  if (totalSampleSize < 100) {
    insights.push({
      type: 'warning',
      category: 'Sample Size',
      title: 'Small Sample Size',
      message: 'Consider running test longer to gather more reliable data',
      impact: 'medium',
      six_figure_relevance: 'Reliable data is essential for Six Figure business decisions'
    })
  }
  
  // Six Figure methodology specific insights
  if (experiment.six_figure_objective) {
    const objectiveInsights = {
      revenue_optimization: {
        title: 'Revenue Optimization Focus',
        message: 'This test directly impacts revenue generation, core to Six Figure success',
        recommendations: ['Monitor client lifetime value changes', 'Track service upsell rates', 'Measure premium service adoption']
      },
      client_retention: {
        title: 'Client Relationship Building',
        message: 'Testing client retention improvements aligns with relationship-focused approach',
        recommendations: ['Track repeat booking rates', 'Monitor client satisfaction scores', 'Measure referral generation']
      },
      premium_positioning: {
        title: 'Premium Brand Positioning',
        message: 'This test affects premium positioning, critical for Six Figure methodology',
        recommendations: ['Monitor price sensitivity', 'Track premium service adoption', 'Measure brand perception changes']
      }
    }
    
    const objInsight = objectiveInsights[experiment.six_figure_objective]
    if (objInsight) {
      insights.push({
        type: 'info',
        category: 'Six Figure Methodology',
        title: objInsight.title,
        message: objInsight.message,
        impact: 'high',
        recommendations: objInsight.recommendations
      })
    }
  }
  
  return insights
}