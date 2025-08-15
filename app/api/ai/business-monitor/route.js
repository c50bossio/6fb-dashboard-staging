import { NextResponse } from 'next/server'
export const runtime = 'edge'

/**
 * Smart Business Monitoring System
 * Analyzes business metrics and generates intelligent alerts and recommendations
 */

export async function POST(request) {
  try {
    const { action, barbershop_id } = await request.json()

    switch (action) {
      case 'analyze_metrics':
        return await analyzeBusinessMetrics(barbershop_id)
      case 'get_alerts':
        return await getActiveAlerts(barbershop_id)
      case 'dismiss_alert':
        return await dismissAlert(request)
      case 'get_recommendations':
        return await getSmartRecommendations(barbershop_id)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Business Monitor error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process business monitoring request'
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id') || 'demo'
    
    const healthStatus = await getBusinessHealthStatus(barbershop_id)
    
    return NextResponse.json({
      success: true,
      data: healthStatus
    })
  } catch (error) {
    console.error('Business Health check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get business health status'
    }, { status: 500 })
  }
}

/**
 * Analyze current business metrics and identify issues/opportunities
 */
async function analyzeBusinessMetrics(barbershop_id) {
  try {
    const analyticsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/analytics/live-data?barbershop_id=${barbershop_id}`)
    const analyticsData = await analyticsResponse.json()
    
    if (!analyticsData.success) {
      throw new Error('Could not fetch analytics data')
    }

    const metrics = analyticsData.data
    const alerts = []
    const recommendations = []
    
    const revenueAnalysis = analyzeRevenue(metrics)
    if (revenueAnalysis.alerts.length > 0) {
      alerts.push(...revenueAnalysis.alerts)
      recommendations.push(...revenueAnalysis.recommendations)
    }
    
    const bookingAnalysis = analyzeBookings(metrics)
    if (bookingAnalysis.alerts.length > 0) {
      alerts.push(...bookingAnalysis.alerts)
      recommendations.push(...bookingAnalysis.recommendations)
    }
    
    const customerAnalysis = analyzeCustomers(metrics)
    if (customerAnalysis.alerts.length > 0) {
      alerts.push(...customerAnalysis.alerts)
      recommendations.push(...customerAnalysis.recommendations)
    }
    
    const performanceAnalysis = analyzePerformance(metrics)
    if (performanceAnalysis.alerts.length > 0) {
      alerts.push(...performanceAnalysis.alerts)
      recommendations.push(...performanceAnalysis.recommendations)
    }

    return NextResponse.json({
      success: true,
      analysis: {
        timestamp: new Date().toISOString(),
        barbershop_id,
        metrics_analyzed: Object.keys(metrics).length,
        alerts: alerts.length,
        recommendations: recommendations.length,
        overall_health: calculateOverallHealth(alerts),
        alerts_detail: alerts.slice(0, 5), // Top 5 most important
        recommendations_detail: recommendations.slice(0, 5), // Top 5 most important
        next_analysis: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min from now
      }
    })
  } catch (error) {
    console.error('Metrics analysis failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze business metrics'
    }, { status: 500 })
  }
}

/**
 * Analyze revenue trends and patterns
 */
function analyzeRevenue(metrics) {
  const alerts = []
  const recommendations = []
  
  const currentRevenue = metrics.total_revenue || 0
  const previousRevenue = metrics.previous_period_revenue || currentRevenue * 1.1 // Simulated
  const revenueChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100
  
  if (revenueChange < -15) {
    alerts.push({
      id: 'revenue_drop_critical',
      type: 'critical',
      title: '💸 Revenue Drop Alert',
      message: `Revenue decreased by ${Math.abs(revenueChange).toFixed(1)}% compared to last period`,
      impact: 'high',
      urgency: 'high',
      created_at: new Date().toISOString()
    })
    
    recommendations.push({
      id: 'boost_revenue_campaign',
      type: 'action',
      title: '🚀 Launch Recovery Campaign',
      description: 'Create targeted promotion to boost bookings',
      actions: [
        'Send "We Miss You" email to inactive customers',
        'Launch 20% weekend promotion on social media', 
        'Offer referral bonus to existing customers',
        'Consider flash sale for premium services'
      ],
      estimated_impact: '+15-25% revenue',
      effort: 'medium',
      priority: 'high'
    })
  }
  
  if (revenueChange > 20) {
    alerts.push({
      id: 'revenue_surge_opportunity',
      type: 'opportunity',
      title: '📈 Revenue Growth Detected',
      message: `Revenue increased by ${revenueChange.toFixed(1)}%! Perfect time for strategic growth`,
      impact: 'high',
      urgency: 'medium',
      created_at: new Date().toISOString()
    })
    
    recommendations.push({
      id: 'capitalize_on_growth',
      type: 'strategy',
      title: '💡 Capitalize on Growth',
      description: 'Leverage current momentum for expansion',
      actions: [
        'Consider raising premium service prices by 10-15%',
        'Launch premium package bundles',
        'Hire additional staff for peak hours',
        'Invest in marketing to maintain growth'
      ],
      estimated_impact: '+30-40% revenue potential',
      effort: 'high',
      priority: 'medium'
    })
  }
  
  return { alerts, recommendations }
}

/**
 * Analyze booking patterns and capacity
 */
function analyzeBookings(metrics) {
  const alerts = []
  const recommendations = []
  
  const totalBookings = metrics.total_bookings || 0
  const cancelledBookings = metrics.cancelled_bookings || 0
  const cancelationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0
  
  if (cancelationRate > 20) {
    alerts.push({
      id: 'high_cancellation_rate',
      type: 'warning',
      title: '⚠️ High Cancellation Rate',
      message: `${cancelationRate.toFixed(1)}% of bookings are being cancelled`,
      impact: 'medium',
      urgency: 'medium',
      created_at: new Date().toISOString()
    })
    
    recommendations.push({
      id: 'reduce_cancellations',
      type: 'process',
      title: '📋 Reduce Cancellations',
      description: 'Implement strategies to minimize booking cancellations',
      actions: [
        'Send reminder emails 24h before appointments',
        'Implement cancellation fee policy',
        'Offer easy rescheduling options',
        'Follow up with cancellation reasons survey'
      ],
      estimated_impact: '5-10% revenue increase',
      effort: 'low',
      priority: 'medium'
    })
  }
  
  if (totalBookings < 10) {
    alerts.push({
      id: 'low_booking_volume',
      type: 'warning',
      title: '📉 Low Booking Volume',
      message: `Only ${totalBookings} bookings this period - below optimal capacity`,
      impact: 'high',
      urgency: 'high',
      created_at: new Date().toISOString()
    })
    
    recommendations.push({
      id: 'boost_bookings',
      type: 'marketing',
      title: '📢 Boost Booking Volume',
      description: 'Increase customer acquisition and retention',
      actions: [
        'Launch social media booking campaign',
        'Offer first-time customer discounts',
        'Partner with local businesses for referrals',
        'Optimize Google My Business listing'
      ],
      estimated_impact: '20-40% more bookings',
      effort: 'medium',
      priority: 'high'
    })
  }
  
  return { alerts, recommendations }
}

/**
 * Analyze customer behavior and retention
 */
function analyzeCustomers(metrics) {
  const alerts = []
  const recommendations = []
  
  const totalCustomers = metrics.total_customers || 0
  const returningCustomers = metrics.returning_customers || 0
  const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0
  
  if (retentionRate < 60) {
    alerts.push({
      id: 'low_customer_retention',
      type: 'critical',
      title: '👥 Low Customer Retention',
      message: `Only ${retentionRate.toFixed(1)}% of customers are returning`,
      impact: 'high',
      urgency: 'medium',
      created_at: new Date().toISOString()
    })
    
    recommendations.push({
      id: 'improve_retention',
      type: 'customer_experience',
      title: '💝 Improve Customer Retention',
      description: 'Build stronger customer relationships and loyalty',
      actions: [
        'Launch customer loyalty program with points',
        'Send personalized follow-up messages after visits',
        'Collect feedback and address service issues',
        'Offer birthday discounts and special occasions'
      ],
      estimated_impact: '15-25% retention improvement',
      effort: 'medium',
      priority: 'high'
    })
  }
  
  return { alerts, recommendations }
}

/**
 * Analyze overall business performance
 */
function analyzePerformance(metrics) {
  const alerts = []
  const recommendations = []
  
  const avgServiceTime = metrics.avg_service_time || 45 // minutes
  const customerSatisfaction = metrics.customer_satisfaction || 85 // percentage
  
  if (avgServiceTime > 60) {
    alerts.push({
      id: 'long_service_times',
      type: 'warning',
      title: '⏱️ Long Service Times',
      message: `Average service time is ${avgServiceTime} minutes - affecting capacity`,
      impact: 'medium',
      urgency: 'medium',
      created_at: new Date().toISOString()
    })
    
    recommendations.push({
      id: 'optimize_service_time',
      type: 'efficiency',
      title: '⚡ Optimize Service Efficiency',
      description: 'Reduce service times while maintaining quality',
      actions: [
        'Analyze time spent on each service step',
        'Pre-prepare tools and products between clients',
        'Implement time management training for staff',
        'Consider service time goals and incentives'
      ],
      estimated_impact: '20-30% more daily capacity',
      effort: 'medium',
      priority: 'medium'
    })
  }
  
  if (customerSatisfaction < 80) {
    alerts.push({
      id: 'low_customer_satisfaction',
      type: 'critical',
      title: '😞 Customer Satisfaction Concern',
      message: `Customer satisfaction is ${customerSatisfaction}% - below industry standard`,
      impact: 'high',
      urgency: 'high',
      created_at: new Date().toISOString()
    })
    
    recommendations.push({
      id: 'improve_satisfaction',
      type: 'quality',
      title: '⭐ Improve Customer Satisfaction',
      description: 'Focus on service quality and customer experience',
      actions: [
        'Conduct customer satisfaction surveys',
        'Implement staff training on customer service',
        'Upgrade equipment and shop ambiance',
        'Address common customer complaints'
      ],
      estimated_impact: '10-20% satisfaction increase',
      effort: 'high',
      priority: 'critical'
    })
  }
  
  return { alerts, recommendations }
}

/**
 * Calculate overall business health score
 */
function calculateOverallHealth(alerts) {
  let score = 100
  
  alerts.forEach(alert => {
    switch (alert.type) {
      case 'critical':
        score -= 25
        break
      case 'warning':
        score -= 15
        break
      case 'opportunity':
        score += 5
        break
    }
  })
  
  score = Math.max(0, Math.min(100, score))
  
  let status = 'excellent'
  if (score < 60) status = 'critical'
  else if (score < 75) status = 'warning'
  else if (score < 90) status = 'good'
  
  return {
    score,
    status,
    description: getHealthDescription(status)
  }
}

/**
 * Get business health status description
 */
function getHealthDescription(status) {
  const descriptions = {
    excellent: '🟢 Your business is performing excellently! Keep up the great work.',
    good: '🟡 Your business is performing well with some areas for improvement.',
    warning: '🟠 Your business needs attention in several key areas.',
    critical: '🔴 Your business requires immediate attention to address critical issues.'
  }
  
  return descriptions[status] || descriptions.warning
}

/**
 * Get current business health status
 */
async function getBusinessHealthStatus(barbershop_id) {
  const alerts = [
    {
      id: 'demo_alert_1',
      type: 'opportunity',
      title: '📈 Revenue Growth Opportunity',
      message: 'Weekend bookings are up 25% - consider premium pricing',
      created_at: new Date().toISOString()
    },
    {
      id: 'demo_alert_2', 
      type: 'warning',
      title: '📅 Low Tuesday Bookings',
      message: 'Tuesdays are consistently slow - consider promotions',
      created_at: new Date().toISOString()
    }
  ]
  
  const overallHealth = calculateOverallHealth(alerts)
  
  return {
    barbershop_id,
    timestamp: new Date().toISOString(),
    overall_health: overallHealth,
    active_alerts: alerts.length,
    alerts: alerts,
    recommendations: [
      {
        id: 'tuesday_promotion',
        title: '💡 Tuesday Special Promotion',
        description: 'Launch "Terrific Tuesday" 15% discount to boost slow day',
        priority: 'medium',
        estimated_impact: '+20% Tuesday revenue'
      }
    ],
    next_check: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  }
}

/**
 * Get active alerts for a business
 */
async function getActiveAlerts(barbershop_id) {
  const alerts = [
    {
      id: 'revenue_opportunity_001',
      type: 'opportunity',
      title: '💰 Premium Service Opportunity',
      message: 'High-value customers are booking frequently - perfect time to introduce premium packages',
      impact: 'high',
      urgency: 'medium',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      actions: [
        'Create premium service packages',
        'Train staff on upselling techniques',
        'Design marketing materials for premium services'
      ]
    }
  ]
  
  return NextResponse.json({
    success: true,
    alerts,
    total: alerts.length,
    new_alerts: alerts.filter(alert => 
      new Date(alert.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length
  })
}

/**
 * Get smart recommendations based on business analysis
 */
async function getSmartRecommendations(barbershop_id) {
  const recommendations = [
    {
      id: 'social_media_automation',
      category: 'marketing',
      title: '📱 Social Media Automation',
      description: 'Set up automated posting to maintain consistent online presence',
      difficulty: 'easy',
      time_investment: '2 hours setup',
      estimated_roi: '15-25% increase in bookings',
      steps: [
        'Choose social media management tool',
        'Create content calendar template',
        'Set up automated posting schedule',
        'Monitor engagement and adjust'
      ]
    },
    {
      id: 'loyalty_program',
      category: 'customer_retention',
      title: '💎 Customer Loyalty Program',
      description: 'Implement points-based loyalty program to increase retention',
      difficulty: 'medium',
      time_investment: '1 week setup',
      estimated_roi: '20-30% retention improvement',
      steps: [
        'Choose loyalty program platform',
        'Design rewards structure',
        'Train staff on program benefits',
        'Launch with existing customers first'
      ]
    }
  ]
  
  return NextResponse.json({
    success: true,
    recommendations,
    categories: ['marketing', 'customer_retention', 'efficiency', 'revenue'],
    total: recommendations.length
  })
}

/**
 * Dismiss an alert
 */
async function dismissAlert(request) {
  const { alert_id, barbershop_id } = await request.json()
  
  console.log(`Alert ${alert_id} dismissed for ${barbershop_id}`)
  
  return NextResponse.json({
    success: true,
    message: 'Alert dismissed successfully'
  })
}