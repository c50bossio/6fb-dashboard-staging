import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/enterprise/multi-location-dashboard
 * Get comprehensive multi-location dashboard data for franchise management
 * 
 * Query Parameters:
 * - organizationId: UUID of the organization
 * - timeRange: Time range for metrics ('today', 'week', 'month', 'quarter', 'year')
 * - locationIds: Optional comma-separated list of specific location IDs
 * - metrics: Optional comma-separated list of metrics to include
 * - includeComparisons: Boolean - include location comparisons (default: true)
 * - includeInsights: Boolean - include AI insights (default: true)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const timeRange = searchParams.get('timeRange') || 'month'
    const locationIdsParam = searchParams.get('locationIds')
    const metricsParam = searchParams.get('metrics')
    const includeComparisons = searchParams.get('includeComparisons') !== 'false'
    const includeInsights = searchParams.get('includeInsights') !== 'false'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const locationIds = locationIdsParam ? locationIdsParam.split(',') : null
    const requestedMetrics = metricsParam ? metricsParam.split(',') : [
      'revenue', 'customers', 'satisfaction', 'efficiency', 'capacity'
    ]

    // Calculate date range
    const { startDate, endDate } = calculateDateRange(timeRange)

    // Get organization locations
    let locationsQuery = supabase
      .from('barbershops')
      .select(`
        id,
        name,
        address,
        phone,
        email,
        is_active,
        created_at
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (locationIds) {
      locationsQuery = locationsQuery.in('id', locationIds)
    }

    const { data: locations, error: locationsError } = await locationsQuery

    if (locationsError) {
      console.error('Locations query error:', locationsError)
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({
        success: true,
        locations: [],
        metrics: {},
        summary: { message: 'No locations found for this organization' }
      })
    }

    const locationIdsList = locations.map(loc => loc.id)

    // Get performance metrics for all locations
    const { data: performanceMetrics } = await supabase
      .from('location_performance_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .in('location_id', locationIdsList)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .eq('metric_period', getMetricPeriod(timeRange))
      .order('metric_date', { ascending: false })

    // Process performance data by location
    const locationMetrics = {}
    const organizationTotals = initializeMetricTotals()

    performanceMetrics?.forEach(metric => {
      if (!locationMetrics[metric.location_id]) {
        locationMetrics[metric.location_id] = []
      }
      locationMetrics[metric.location_id].push(metric)
      
      // Add to organization totals
      addToTotals(organizationTotals, metric)
    })

    // Calculate averages for organization totals
    if (performanceMetrics?.length > 0) {
      calculateAverages(organizationTotals, locations.length)
    }

    // Get location comparisons if requested
    let locationComparisons = null
    if (includeComparisons) {
      locationComparisons = await generateLocationComparisons(
        organizationId, 
        locationIdsList, 
        timeRange
      )
    }

    // Get business intelligence insights if requested
    let insights = null
    if (includeInsights) {
      const { data: insightsData } = await supabase
        .from('business_intelligence_insights')
        .select(`
          id,
          location_id,
          insight_type,
          insight_category,
          insight_title,
          insight_description,
          confidence_score,
          impact_level,
          potential_revenue_impact,
          potential_cost_savings,
          priority_score,
          recommended_actions,
          insight_status,
          generated_at,
          expires_at
        `)
        .eq('organization_id', organizationId)
        .in('insight_status', ['new', 'reviewed', 'approved'])
        .order('priority_score', { ascending: false })
        .limit(10)

      insights = insightsData || []
    }

    // Build location details with metrics
    const locationDetails = locations.map(location => {
      const metrics = locationMetrics[location.id] || []
      const latestMetrics = metrics[0] || {}
      
      // Calculate trends (compare with previous period)
      const previousMetrics = metrics[1] || {}
      const trends = calculateTrends(latestMetrics, previousMetrics)

      return {
        ...location,
        current_metrics: latestMetrics,
        trends,
        historical_metrics: metrics.slice(0, 30), // Last 30 data points
        insights: insights?.filter(insight => 
          insight.location_id === location.id || insight.location_id === null
        ) || []
      }
    })

    // Calculate organization summary
    const summary = {
      total_locations: locations.length,
      active_locations: locations.filter(loc => loc.is_active).length,
      time_range: timeRange,
      date_range: { start_date: startDate, end_date: endDate },
      organization_totals: organizationTotals,
      top_performing_location: getTopPerformingLocation(locationDetails),
      areas_for_improvement: identifyImprovementAreas(locationDetails),
      key_insights: insights?.slice(0, 5) || []
    }

    return NextResponse.json({
      success: true,
      organization_id: organizationId,
      locations: locationDetails,
      location_comparisons: locationComparisons,
      insights: insights,
      summary,
      metadata: {
        generated_at: new Date().toISOString(),
        metrics_included: requestedMetrics,
        locations_analyzed: locations.length,
        data_freshness: calculateDataFreshness(performanceMetrics)
      }
    })

  } catch (error) {
    console.error('Multi-location dashboard error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch multi-location dashboard data',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/enterprise/multi-location-dashboard
 * Update or refresh multi-location dashboard data
 * 
 * Body:
 * {
 *   action: 'refresh_metrics' | 'update_targets' | 'generate_insights',
 *   organizationId: string,
 *   locationIds?: string[],
 *   targets?: object,
 *   insightTypes?: string[]
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, organizationId, locationIds, targets, insightTypes } = body

    if (!action || !organizationId) {
      return NextResponse.json(
        { error: 'Action and organizationId are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'refresh_metrics':
        const refreshResults = await refreshLocationMetrics(organizationId, locationIds)
        return NextResponse.json({
          success: true,
          message: 'Metrics refreshed successfully',
          results: refreshResults
        })

      case 'update_targets':
        if (!targets) {
          return NextResponse.json(
            { error: 'Targets are required for update_targets action' },
            { status: 400 }
          )
        }
        
        const targetResults = await updateLocationTargets(organizationId, locationIds, targets)
        return NextResponse.json({
          success: true,
          message: 'Targets updated successfully',
          results: targetResults
        })

      case 'generate_insights':
        const insightResults = await generateBusinessInsights(organizationId, locationIds, insightTypes)
        return NextResponse.json({
          success: true,
          message: 'Insights generated successfully',
          insights_created: insightResults.length,
          insights: insightResults
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Multi-location dashboard action error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process dashboard action',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper functions

function calculateDateRange(timeRange) {
  const endDate = new Date().toISOString().split('T')[0]
  let startDate

  switch (timeRange) {
    case 'today':
      startDate = endDate
      break
    case 'week':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'month':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'quarter':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'year':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }

  return { startDate, endDate }
}

function getMetricPeriod(timeRange) {
  switch (timeRange) {
    case 'today':
      return 'hourly'
    case 'week':
      return 'daily'
    case 'month':
      return 'daily'
    case 'quarter':
      return 'weekly'
    case 'year':
      return 'monthly'
    default:
      return 'daily'
  }
}

function initializeMetricTotals() {
  return {
    total_revenue: 0,
    gross_profit: 0,
    total_customers: 0,
    total_appointments: 0,
    staff_efficiency: 0,
    customer_satisfaction_score: 0,
    capacity_utilization: 0,
    cross_sell_success_rate: 0
  }
}

function addToTotals(totals, metric) {
  totals.total_revenue += metric.total_revenue || 0
  totals.gross_profit += metric.gross_profit || 0
  totals.total_customers += metric.total_customers || 0
  totals.total_appointments += metric.total_appointments || 0
  totals.staff_efficiency += metric.staff_efficiency || 0
  totals.customer_satisfaction_score += metric.customer_satisfaction_score || 0
  totals.capacity_utilization += metric.capacity_utilization || 0
  totals.cross_sell_success_rate += metric.cross_sell_success_rate || 0
}

function calculateAverages(totals, locationCount) {
  if (locationCount === 0) return

  // Some metrics are averages, not sums
  totals.staff_efficiency = totals.staff_efficiency / locationCount
  totals.customer_satisfaction_score = totals.customer_satisfaction_score / locationCount
  totals.capacity_utilization = totals.capacity_utilization / locationCount
  totals.cross_sell_success_rate = totals.cross_sell_success_rate / locationCount
}

function calculateTrends(current, previous) {
  const calculateChange = (currentVal, previousVal) => {
    if (!previousVal || previousVal === 0) return 0
    return ((currentVal - previousVal) / previousVal) * 100
  }

  return {
    revenue_change: calculateChange(current.total_revenue, previous.total_revenue),
    customer_change: calculateChange(current.total_customers, previous.total_customers),
    satisfaction_change: calculateChange(current.customer_satisfaction_score, previous.customer_satisfaction_score),
    efficiency_change: calculateChange(current.staff_efficiency, previous.staff_efficiency)
  }
}

function getTopPerformingLocation(locationDetails) {
  if (!locationDetails.length) return null

  return locationDetails.reduce((best, location) => {
    const currentRevenue = location.current_metrics?.total_revenue || 0
    const bestRevenue = best?.current_metrics?.total_revenue || 0
    return currentRevenue > bestRevenue ? location : best
  }, null)
}

function identifyImprovementAreas(locationDetails) {
  const areas = []
  
  locationDetails.forEach(location => {
    const metrics = location.current_metrics || {}
    
    if (metrics.customer_satisfaction_score < 4.0) {
      areas.push({
        location_id: location.id,
        location_name: location.name,
        area: 'customer_satisfaction',
        current_value: metrics.customer_satisfaction_score,
        target_value: 4.5
      })
    }
    
    if (metrics.staff_efficiency < 0.75) {
      areas.push({
        location_id: location.id,
        location_name: location.name,
        area: 'staff_efficiency',
        current_value: metrics.staff_efficiency,
        target_value: 0.85
      })
    }
    
    if (metrics.capacity_utilization < 0.70) {
      areas.push({
        location_id: location.id,
        location_name: location.name,
        area: 'capacity_utilization',
        current_value: metrics.capacity_utilization,
        target_value: 0.80
      })
    }
  })
  
  return areas
}

function calculateDataFreshness(performanceMetrics) {
  if (!performanceMetrics || performanceMetrics.length === 0) {
    return 'no_data'
  }

  const latestDate = new Date(Math.max(...performanceMetrics.map(m => new Date(m.metric_date))))
  const now = new Date()
  const hoursSinceUpdate = (now - latestDate) / (1000 * 60 * 60)

  if (hoursSinceUpdate < 1) return 'very_fresh'
  if (hoursSinceUpdate < 6) return 'fresh'
  if (hoursSinceUpdate < 24) return 'recent'
  if (hoursSinceUpdate < 72) return 'stale'
  return 'very_stale'
}

async function generateLocationComparisons(organizationId, locationIds, timeRange) {
  // Get all locations performance data for comparison
  const { data: performanceData } = await supabase
    .from('location_performance_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .in('location_id', locationIds)
    .gte('metric_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('metric_date', { ascending: false })

  if (!performanceData || performanceData.length === 0) {
    return {
      comparison_type: 'performance_ranking',
      time_range: timeRange,
      rankings: [],
      best_practices: [],
      improvement_opportunities: []
    }
  }

  // Calculate location averages for ranking
  const locationAverages = {}
  performanceData.forEach(metric => {
    if (!locationAverages[metric.location_id]) {
      locationAverages[metric.location_id] = {
        location_id: metric.location_id,
        revenue_avg: 0,
        efficiency_avg: 0,
        satisfaction_avg: 0,
        count: 0
      }
    }
    
    const avg = locationAverages[metric.location_id]
    avg.revenue_avg = (avg.revenue_avg * avg.count + (metric.total_revenue || 0)) / (avg.count + 1)
    avg.efficiency_avg = (avg.efficiency_avg * avg.count + (metric.staff_efficiency || 0)) / (avg.count + 1)
    avg.satisfaction_avg = (avg.satisfaction_avg * avg.count + (metric.customer_satisfaction_score || 0)) / (avg.count + 1)
    avg.count++
  })

  // Rank locations by composite performance score
  const rankings = Object.values(locationAverages).map(avg => ({
    location_id: avg.location_id,
    composite_score: (avg.revenue_avg * 0.4 + avg.efficiency_avg * 100 * 0.3 + avg.satisfaction_avg * 20 * 0.3),
    revenue_rank: 0,
    efficiency_rank: 0,
    satisfaction_rank: 0
  })).sort((a, b) => b.composite_score - a.composite_score)

  // Assign rankings
  rankings.forEach((location, index) => {
    location.overall_rank = index + 1
  })

  return {
    comparison_type: 'performance_ranking',
    time_range: timeRange,
    rankings,
    best_practices: identifyBestPractices(rankings.slice(0, 3)),
    improvement_opportunities: identifyImprovementOpportunities(rankings)
  }
}

function identifyBestPractices(topLocations) {
  return topLocations.map(location => ({
    location_id: location.location_id,
    practice_category: 'performance',
    practice_description: `High composite performance score of ${location.composite_score.toFixed(2)}`,
    recommended_replication: 'Analyze scheduling patterns and staff training methods'
  }))
}

function identifyImprovementOpportunities(allRankings) {
  const opportunities = []
  const bottomQuartile = allRankings.slice(-Math.ceil(allRankings.length * 0.25))
  
  bottomQuartile.forEach(location => {
    opportunities.push({
      location_id: location.location_id,
      opportunity_type: 'performance_improvement',
      description: `Location ranks ${location.overall_rank} out of ${allRankings.length}`,
      recommended_actions: [
        'Review top-performing location practices',
        'Implement staff training program',
        'Optimize scheduling efficiency'
      ],
      estimated_impact: 'Medium'
    })
  })
  
  return opportunities
}

async function refreshLocationMetrics(organizationId, locationIds) {
  const targetLocations = locationIds || []
  
  // If no specific locations provided, get all organization locations
  if (targetLocations.length === 0) {
    const { data: locations } = await supabase
      .from('barbershops')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
    
    if (locations) {
      targetLocations.push(...locations.map(loc => loc.id))
    }
  }

  // Calculate new metrics for each location
  const refreshResults = []
  const currentDate = new Date().toISOString().split('T')[0]
  
  for (const locationId of targetLocations) {
    try {
      // Get recent data for calculations (last 30 days)
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // Get appointments data
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', locationId)
        .gte('date', startDate)
        .lte('date', currentDate)
      
      // Get payment data
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('barbershop_id', locationId)
        .gte('created_at', startDate + 'T00:00:00.000Z')
        .lte('created_at', currentDate + 'T23:59:59.999Z')

      // Calculate metrics
      const totalRevenue = payments?.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) || 0
      const totalCustomers = new Set(appointments?.map(apt => apt.customer_id)).size || 0
      const totalAppointments = appointments?.length || 0
      
      // Calculate staff efficiency (completed appointments / total appointments)
      const completedAppointments = appointments?.filter(apt => apt.status === 'completed').length || 0
      const staffEfficiency = totalAppointments > 0 ? completedAppointments / totalAppointments : 0
      
      // Simple satisfaction score based on completed appointments (placeholder logic)
      const customerSatisfactionScore = staffEfficiency > 0.8 ? 4.5 : staffEfficiency > 0.6 ? 4.0 : 3.5

      // Capacity utilization (placeholder - would need staff schedule data)
      const capacityUtilization = Math.min(staffEfficiency * 1.2, 1.0)

      // Cross-sell success rate (placeholder)
      const crossSellSuccessRate = totalRevenue > 0 && totalAppointments > 0 ? 
        Math.min((totalRevenue / totalAppointments) / 50, 1.0) : 0

      // Insert or update performance metrics
      const { error: upsertError } = await supabase
        .from('location_performance_metrics')
        .upsert({
          location_id: locationId,
          organization_id: organizationId,
          metric_date: currentDate,
          metric_period: 'daily',
          total_revenue: totalRevenue,
          gross_profit: totalRevenue * 0.7, // 70% margin estimate
          total_customers: totalCustomers,
          total_appointments: totalAppointments,
          staff_efficiency: staffEfficiency,
          customer_satisfaction_score: customerSatisfactionScore,
          capacity_utilization: capacityUtilization,
          cross_sell_success_rate: crossSellSuccessRate,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'location_id,organization_id,metric_date'
        })

      if (!upsertError) {
        refreshResults.push({
          location_id: locationId,
          status: 'success',
          metrics_calculated: {
            total_revenue: totalRevenue,
            total_customers: totalCustomers,
            staff_efficiency: staffEfficiency,
            customer_satisfaction_score: customerSatisfactionScore
          }
        })
      } else {
        refreshResults.push({
          location_id: locationId,
          status: 'error',
          error: upsertError.message
        })
      }
    } catch (error) {
      refreshResults.push({
        location_id: locationId,
        status: 'error',
        error: error.message
      })
    }
  }

  return {
    locations_updated: refreshResults.filter(r => r.status === 'success').length,
    total_locations: targetLocations.length,
    metrics_updated: ['revenue', 'customers', 'satisfaction', 'efficiency', 'capacity', 'cross_sell'],
    timestamp: new Date().toISOString(),
    detailed_results: refreshResults
  }
}

async function updateLocationTargets(organizationId, locationIds, targets) {
  const targetLocations = locationIds || []
  
  // If no specific locations provided, get all organization locations
  if (targetLocations.length === 0) {
    const { data: locations } = await supabase
      .from('barbershops')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
    
    if (locations) {
      targetLocations.push(...locations.map(loc => loc.id))
    }
  }

  const updateResults = []
  
  for (const locationId of targetLocations) {
    try {
      // Update or insert performance targets for this location
      const { error: upsertError } = await supabase
        .from('location_performance_targets')
        .upsert({
          location_id: locationId,
          organization_id: organizationId,
          target_period: 'monthly', // Default to monthly targets
          revenue_target: targets.revenue_target || null,
          customer_target: targets.customer_target || null,
          satisfaction_target: targets.satisfaction_target || 4.5,
          efficiency_target: targets.efficiency_target || 0.85,
          capacity_target: targets.capacity_target || 0.80,
          cross_sell_target: targets.cross_sell_target || 0.25,
          set_date: new Date().toISOString(),
          target_year: new Date().getFullYear(),
          target_month: new Date().getMonth() + 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'location_id,organization_id,target_year,target_month'
        })

      if (!upsertError) {
        updateResults.push({
          location_id: locationId,
          status: 'success',
          targets_updated: Object.keys(targets)
        })
      } else {
        updateResults.push({
          location_id: locationId,
          status: 'error',
          error: upsertError.message
        })
      }
    } catch (error) {
      updateResults.push({
        location_id: locationId,
        status: 'error',
        error: error.message
      })
    }
  }

  return {
    locations_updated: updateResults.filter(r => r.status === 'success').length,
    total_locations: targetLocations.length,
    targets_set: Object.keys(targets),
    timestamp: new Date().toISOString(),
    detailed_results: updateResults
  }
}

async function generateBusinessInsights(organizationId, locationIds, insightTypes) {
  const targetTypes = insightTypes || ['performance', 'opportunity', 'risk', 'optimization']
  const insights = []
  
  try {
    // Get recent performance data for analysis
    const { data: performanceData } = await supabase
      .from('location_performance_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('metric_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('metric_date', { ascending: false })

    if (!performanceData || performanceData.length === 0) {
      return []
    }

    // Performance insights
    if (targetTypes.includes('performance')) {
      const performanceInsights = generatePerformanceInsights(performanceData)
      insights.push(...performanceInsights)
    }

    // Opportunity insights  
    if (targetTypes.includes('opportunity')) {
      const opportunityInsights = generateOpportunityInsights(performanceData)
      insights.push(...opportunityInsights)
    }

    // Risk insights
    if (targetTypes.includes('risk')) {
      const riskInsights = generateRiskInsights(performanceData)
      insights.push(...riskInsights)
    }

    // Optimization insights
    if (targetTypes.includes('optimization')) {
      const optimizationInsights = generateOptimizationInsights(performanceData)
      insights.push(...optimizationInsights)
    }

    // Store generated insights in database
    const insightRecords = insights.map(insight => ({
      organization_id: organizationId,
      location_id: insight.location_id,
      insight_type: insight.insight_type,
      insight_category: insight.insight_category,
      insight_title: insight.insight_title,
      insight_description: insight.insight_description,
      confidence_score: insight.confidence_score,
      impact_level: insight.impact_level,
      potential_revenue_impact: insight.potential_revenue_impact,
      potential_cost_savings: insight.potential_cost_savings,
      priority_score: insight.priority_score,
      recommended_actions: insight.recommended_actions,
      insight_status: 'new',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }))

    if (insightRecords.length > 0) {
      const { error } = await supabase
        .from('business_intelligence_insights')
        .insert(insightRecords)

      if (error) {
        console.error('Failed to store insights:', error)
      }
    }

    return insights
    
  } catch (error) {
    console.error('Error generating business insights:', error)
    return []
  }
}

function generatePerformanceInsights(performanceData) {
  const insights = []
  
  // Group by location
  const locationData = {}
  performanceData.forEach(metric => {
    if (!locationData[metric.location_id]) {
      locationData[metric.location_id] = []
    }
    locationData[metric.location_id].push(metric)
  })

  // Analyze each location
  Object.entries(locationData).forEach(([locationId, metrics]) => {
    const recentMetrics = metrics.slice(0, 7) // Last 7 data points
    const avgRevenue = recentMetrics.reduce((sum, m) => sum + (m.total_revenue || 0), 0) / recentMetrics.length
    const avgEfficiency = recentMetrics.reduce((sum, m) => sum + (m.staff_efficiency || 0), 0) / recentMetrics.length
    
    if (avgRevenue > 0) {
      insights.push({
        location_id: locationId,
        insight_type: 'performance',
        insight_category: 'revenue_analysis',
        insight_title: `Revenue Performance: $${avgRevenue.toFixed(0)}/week`,
        insight_description: `Location averaging $${avgRevenue.toFixed(0)} weekly revenue with ${(avgEfficiency * 100).toFixed(1)}% staff efficiency`,
        confidence_score: 0.85,
        impact_level: 'medium',
        potential_revenue_impact: avgRevenue * 0.1, // 10% improvement potential
        potential_cost_savings: 0,
        priority_score: Math.min(avgRevenue / 100, 100),
        recommended_actions: [
          'Monitor revenue trends closely',
          'Analyze peak performance periods',
          'Compare with location benchmarks'
        ]
      })
    }
  })

  return insights
}

function generateOpportunityInsights(performanceData) {
  const insights = []
  
  // Find underperforming locations
  const locationAverages = {}
  performanceData.forEach(metric => {
    if (!locationAverages[metric.location_id]) {
      locationAverages[metric.location_id] = {
        revenue: [],
        efficiency: [],
        satisfaction: []
      }
    }
    locationAverages[metric.location_id].revenue.push(metric.total_revenue || 0)
    locationAverages[metric.location_id].efficiency.push(metric.staff_efficiency || 0)
    locationAverages[metric.location_id].satisfaction.push(metric.customer_satisfaction_score || 0)
  })

  Object.entries(locationAverages).forEach(([locationId, data]) => {
    const avgRevenue = data.revenue.reduce((sum, val) => sum + val, 0) / data.revenue.length
    const avgEfficiency = data.efficiency.reduce((sum, val) => sum + val, 0) / data.efficiency.length
    const avgSatisfaction = data.satisfaction.reduce((sum, val) => sum + val, 0) / data.satisfaction.length

    // Low efficiency opportunity
    if (avgEfficiency < 0.7) {
      insights.push({
        location_id: locationId,
        insight_type: 'opportunity',
        insight_category: 'efficiency_improvement',
        insight_title: 'Staff Efficiency Improvement Opportunity',
        insight_description: `Staff efficiency at ${(avgEfficiency * 100).toFixed(1)}% indicates potential for optimization`,
        confidence_score: 0.78,
        impact_level: 'high',
        potential_revenue_impact: avgRevenue * 0.25, // 25% increase potential
        potential_cost_savings: avgRevenue * 0.1,
        priority_score: (1 - avgEfficiency) * 100,
        recommended_actions: [
          'Implement staff training program',
          'Review scheduling optimization',
          'Analyze workflow bottlenecks'
        ]
      })
    }

    // Low satisfaction opportunity
    if (avgSatisfaction < 4.0) {
      insights.push({
        location_id: locationId,
        insight_type: 'opportunity',
        insight_category: 'customer_experience',
        insight_title: 'Customer Satisfaction Enhancement Opportunity',
        insight_description: `Customer satisfaction score of ${avgSatisfaction.toFixed(1)} indicates room for improvement`,
        confidence_score: 0.82,
        impact_level: 'medium',
        potential_revenue_impact: avgRevenue * 0.15,
        potential_cost_savings: 0,
        priority_score: (5 - avgSatisfaction) * 20,
        recommended_actions: [
          'Collect customer feedback',
          'Enhance service quality training',
          'Review customer journey touchpoints'
        ]
      })
    }
  })

  return insights
}

function generateRiskInsights(performanceData) {
  const insights = []
  
  // Analyze revenue trends for declining performance
  const locationTrends = {}
  performanceData.forEach(metric => {
    if (!locationTrends[metric.location_id]) {
      locationTrends[metric.location_id] = []
    }
    locationTrends[metric.location_id].push({
      date: metric.metric_date,
      revenue: metric.total_revenue || 0,
      efficiency: metric.staff_efficiency || 0
    })
  })

  Object.entries(locationTrends).forEach(([locationId, trends]) => {
    trends.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    if (trends.length >= 4) {
      const recent = trends.slice(0, 2)
      const previous = trends.slice(2, 4)
      
      const recentAvgRevenue = recent.reduce((sum, t) => sum + t.revenue, 0) / recent.length
      const previousAvgRevenue = previous.reduce((sum, t) => sum + t.revenue, 0) / previous.length
      
      // Declining revenue risk
      if (previousAvgRevenue > 0) {
        const revenueChange = (recentAvgRevenue - previousAvgRevenue) / previousAvgRevenue
        
        if (revenueChange < -0.15) { // 15% decline
          insights.push({
            location_id: locationId,
            insight_type: 'risk',
            insight_category: 'revenue_decline',
            insight_title: 'Revenue Decline Risk Detected',
            insight_description: `Revenue declined by ${(Math.abs(revenueChange) * 100).toFixed(1)}% compared to previous period`,
            confidence_score: 0.75,
            impact_level: 'high',
            potential_revenue_impact: -Math.abs(revenueChange) * recentAvgRevenue,
            potential_cost_savings: 0,
            priority_score: Math.abs(revenueChange) * 100,
            recommended_actions: [
              'Investigate cause of revenue decline',
              'Review marketing and customer acquisition',
              'Analyze competitive landscape changes'
            ]
          })
        }
      }
    }
  })

  return insights
}

function generateOptimizationInsights(performanceData) {
  const insights = []
  
  // Find optimization patterns across locations
  const allLocations = [...new Set(performanceData.map(m => m.location_id))]
  
  if (allLocations.length > 1) {
    // Multi-location optimization insight
    const totalRevenue = performanceData.reduce((sum, m) => sum + (m.total_revenue || 0), 0)
    const avgEfficiency = performanceData.reduce((sum, m) => sum + (m.staff_efficiency || 0), 0) / performanceData.length
    
    insights.push({
      location_id: null, // Organization-level insight
      insight_type: 'optimization',
      insight_category: 'cross_location_analysis',
      insight_title: 'Multi-Location Optimization Opportunity',
      insight_description: `Analyzing ${allLocations.length} locations shows potential for knowledge sharing and best practice implementation`,
      confidence_score: 0.88,
      impact_level: 'high',
      potential_revenue_impact: totalRevenue * 0.05, // 5% optimization potential
      potential_cost_savings: totalRevenue * 0.03,
      priority_score: 75,
      recommended_actions: [
        'Identify and replicate best practices from top-performing locations',
        'Implement standardized processes across locations',
        'Create cross-location staff training programs'
      ]
    })
  }

  return insights
}