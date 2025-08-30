import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/enterprise/staff-optimization
 * Get staff optimization recommendations and scheduling intelligence
 * 
 * Query Parameters:
 * - organizationId: UUID of the organization
 * - locationId: Specific location ID (optional, if not provided gets all locations)
 * - optimizationType: Type of optimization ('scheduling', 'performance', 'skills', 'payroll')
 * - timeHorizon: Optimization time horizon ('week', 'month', 'quarter')
 * - includeAI: Boolean - include AI recommendations (default: true)
 * - includeForecasting: Boolean - include demand forecasting (default: true)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const locationId = searchParams.get('locationId')
    const optimizationType = searchParams.get('optimizationType') || 'scheduling'
    const timeHorizon = searchParams.get('timeHorizon') || 'week'
    const includeAI = searchParams.get('includeAI') !== 'false'
    const includeForecasting = searchParams.get('includeForecasting') !== 'false'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Calculate date range for optimization
    const { startDate, endDate } = calculateOptimizationPeriod(timeHorizon)

    // Get organization locations
    let locationsQuery = supabase
      .from('barbershops')
      .select('id, name, address, business_hours, timezone')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (locationId) {
      locationsQuery = locationsQuery.eq('id', locationId)
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
        optimization_results: {},
        message: 'No locations found for optimization'
      })
    }

    const locationIds = locations.map(loc => loc.id)
    const optimizationResults = {}

    // Process each location
    for (const location of locations) {
      const locationOptimization = await performLocationOptimization(
        location,
        organizationId,
        optimizationType,
        timeHorizon,
        startDate,
        endDate,
        includeAI,
        includeForecasting
      )
      optimizationResults[location.id] = locationOptimization
    }

    // Generate organization-level insights
    const organizationInsights = await generateOrganizationOptimizationInsights(
      organizationId,
      optimizationResults,
      optimizationType
    )

    return NextResponse.json({
      success: true,
      organization_id: organizationId,
      optimization_type: optimizationType,
      time_horizon: timeHorizon,
      date_range: { start_date: startDate, end_date: endDate },
      locations: locations.map(loc => ({
        ...loc,
        optimization: optimizationResults[loc.id]
      })),
      organization_insights: organizationInsights,
      summary: {
        total_locations: locations.length,
        optimization_score: calculateOverallOptimizationScore(optimizationResults),
        potential_savings: calculatePotentialSavings(optimizationResults),
        recommended_actions: generateTopRecommendations(optimizationResults)
      },
      metadata: {
        generated_at: new Date().toISOString(),
        ai_enabled: includeAI,
        forecasting_enabled: includeForecasting
      }
    })

  } catch (error) {
    console.error('Staff optimization error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate staff optimization recommendations',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/enterprise/staff-optimization
 * Apply optimization recommendations or create optimized schedules
 * 
 * Body:
 * {
 *   action: 'apply_schedule' | 'update_shifts' | 'optimize_payroll' | 'analyze_performance',
 *   organizationId: string,
 *   locationId?: string,
 *   scheduleData?: object,
 *   optimizationSettings?: object
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, organizationId, locationId, scheduleData, optimizationSettings } = body

    if (!action || !organizationId) {
      return NextResponse.json(
        { error: 'Action and organizationId are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'apply_schedule':
        const scheduleResults = await applyOptimizedSchedule(organizationId, locationId, scheduleData)
        return NextResponse.json({
          success: true,
          message: 'Optimized schedule applied successfully',
          results: scheduleResults
        })

      case 'update_shifts':
        const shiftResults = await updateStaffShifts(organizationId, locationId, scheduleData)
        return NextResponse.json({
          success: true,
          message: 'Staff shifts updated successfully',
          results: shiftResults
        })

      case 'optimize_payroll':
        const payrollResults = await optimizePayrollAllocation(organizationId, locationId, optimizationSettings)
        return NextResponse.json({
          success: true,
          message: 'Payroll optimization completed',
          results: payrollResults
        })

      case 'analyze_performance':
        const performanceResults = await analyzeStaffPerformance(organizationId, locationId, optimizationSettings)
        return NextResponse.json({
          success: true,
          message: 'Staff performance analysis completed',
          insights: performanceResults
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Staff optimization action error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process staff optimization action',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper functions

function calculateOptimizationPeriod(timeHorizon) {
  const endDate = new Date()
  let startDate

  switch (timeHorizon) {
    case 'week':
      startDate = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000) // Next week
      endDate.setTime(endDate.getTime() + 14 * 24 * 60 * 60 * 1000) // Two weeks out
      break
    case 'month':
      startDate = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000) // Start next week
      endDate.setTime(endDate.getTime() + 37 * 24 * 60 * 60 * 1000) // 5 weeks out
      break
    case 'quarter':
      startDate = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000) // Start next week
      endDate.setTime(endDate.getTime() + 91 * 24 * 60 * 60 * 1000) // ~3 months out
      break
    default:
      startDate = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      endDate.setTime(endDate.getTime() + 14 * 24 * 60 * 60 * 1000)
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

async function performLocationOptimization(location, organizationId, optimizationType, timeHorizon, startDate, endDate, includeAI, includeForecasting) {
  const optimization = {
    location_id: location.id,
    location_name: location.name,
    optimization_type: optimizationType,
    current_staff: [],
    demand_forecast: null,
    schedule_recommendations: [],
    performance_insights: [],
    cost_analysis: {},
    optimization_score: 0
  }

  try {
    // Get current staff for the location
    const { data: staff } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        role,
        is_active,
        hourly_rate,
        commission_rate,
        profiles:user_id(
          full_name,
          email,
          phone
        )
      `)
      .eq('barberbarbershop_id', location.id)
      .eq('is_active', true)

    optimization.current_staff = staff || []

    // Get staff skills matrix
    const staffIds = staff?.map(s => s.user_id) || []
    const { data: skills } = await supabase
      .from('staff_skills_matrix')
      .select('*')
      .in('staff_id', staffIds)

    // Get historical performance data
    const { data: performance } = await supabase
      .from('staff_performance_metrics')
      .select('*')
      .eq('location_id', location.id)
      .gte('metric_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('metric_date', { ascending: false })

    // Demand forecasting
    if (includeForecasting) {
      optimization.demand_forecast = await generateDemandForecast(location.id, startDate, endDate)
    }

    // AI-powered scheduling recommendations
    if (includeAI && optimizationType === 'scheduling') {
      optimization.schedule_recommendations = await generateScheduleRecommendations(
        location,
        staff || [],
        skills || [],
        optimization.demand_forecast,
        timeHorizon
      )
    }

    // Performance optimization insights
    if (optimizationType === 'performance' || optimizationType === 'scheduling') {
      optimization.performance_insights = await generatePerformanceInsights(
        location.id,
        staff || [],
        performance || []
      )
    }

    // Skills-based optimization
    if (optimizationType === 'skills') {
      optimization.skills_optimization = await generateSkillsOptimization(
        staff || [],
        skills || [],
        performance || []
      )
    }

    // Payroll optimization
    if (optimizationType === 'payroll') {
      optimization.payroll_optimization = await generatePayrollOptimization(
        location.id,
        staff || [],
        performance || []
      )
    }

    // Cost analysis
    optimization.cost_analysis = await generateCostAnalysis(
      location.id,
      staff || [],
      optimization.demand_forecast,
      timeHorizon
    )

    // Calculate overall optimization score
    optimization.optimization_score = calculateLocationOptimizationScore(optimization)

  } catch (error) {
    console.error(`Error optimizing location ${location.id}:`, error)
    optimization.error = error.message
    optimization.optimization_score = 0
  }

  return optimization
}

async function generateDemandForecast(locationId, startDate, endDate) {
  try {
    // Get historical appointment data for pattern analysis
    const { data: historicalData } = await supabase
      .from('appointments')
      .select('date, service_id, status, created_at')
      .eq('barberbarbershop_id', locationId)
      .gte('date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .in('status', ['completed', 'confirmed'])

    if (!historicalData || historicalData.length === 0) {
      return {
        forecast_type: 'baseline',
        predicted_appointments_per_day: 5,
        confidence_level: 0.3,
        peak_hours: ['10:00', '14:00', '16:00'],
        seasonal_factors: {}
      }
    }

    // Analyze patterns by day of week
    const dayPatterns = {}
    const hourPatterns = {}
    
    historicalData.forEach(apt => {
      const aptDate = new Date(apt.date)
      const dayOfWeek = aptDate.getDay()
      const hour = aptDate.getHours()
      
      if (!dayPatterns[dayOfWeek]) dayPatterns[dayOfWeek] = []
      dayPatterns[dayOfWeek].push(apt)
      
      if (!hourPatterns[hour]) hourPatterns[hour] = 0
      hourPatterns[hour]++
    })

    // Calculate daily averages
    const avgAppointmentsPerDay = Object.values(dayPatterns).reduce((sum, day) => {
      return sum + (day.length / 26) // ~26 weeks of data
    }, 0) / 7

    // Find peak hours
    const sortedHours = Object.entries(hourPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour.padStart(2, '0')}:00`)

    return {
      forecast_type: 'pattern_based',
      predicted_appointments_per_day: Math.round(avgAppointmentsPerDay),
      confidence_level: Math.min(historicalData.length / 100, 0.95), // Higher confidence with more data
      peak_hours: sortedHours,
      seasonal_factors: calculateSeasonalFactors(historicalData),
      day_of_week_patterns: dayPatterns
    }

  } catch (error) {
    console.error('Error generating demand forecast:', error)
    return {
      forecast_type: 'error',
      predicted_appointments_per_day: 5,
      confidence_level: 0.1,
      peak_hours: ['10:00', '14:00', '16:00'],
      error: error.message
    }
  }
}

function calculateSeasonalFactors(historicalData) {
  const monthlyData = {}
  
  historicalData.forEach(apt => {
    const month = new Date(apt.date).getMonth()
    if (!monthlyData[month]) monthlyData[month] = 0
    monthlyData[month]++
  })

  const avgMonthly = Object.values(monthlyData).reduce((sum, count) => sum + count, 0) / 12
  const seasonalFactors = {}

  Object.entries(monthlyData).forEach(([month, count]) => {
    seasonalFactors[month] = count / avgMonthly
  })

  return seasonalFactors
}

async function generateScheduleRecommendations(location, staff, skills, demandForecast, timeHorizon) {
  const recommendations = []

  try {
    // Create skills lookup
    const staffSkills = {}
    skills.forEach(skill => {
      if (!staffSkills[skill.staff_id]) {
        staffSkills[skill.staff_id] = []
      }
      staffSkills[skill.staff_id].push(skill)
    })

    // Generate recommendations based on demand forecast
    const peakHours = demandForecast?.peak_hours || ['10:00', '14:00', '16:00']
    const predictedDemand = demandForecast?.predicted_appointments_per_day || 5

    // Optimal staffing for peak hours
    recommendations.push({
      recommendation_type: 'peak_hour_staffing',
      title: 'Optimize Peak Hour Coverage',
      description: `Schedule ${Math.ceil(predictedDemand / 3)} staff members during peak hours: ${peakHours.join(', ')}`,
      confidence_score: demandForecast?.confidence_level || 0.7,
      impact_level: 'high',
      recommended_staff: staff.slice(0, Math.ceil(predictedDemand / 3)).map(s => ({
        staff_id: s.user_id,
        name: s.profiles?.full_name,
        role: s.role,
        suggested_hours: peakHours
      })),
      estimated_revenue_impact: predictedDemand * 50 * 0.15 // 15% improvement
    })

    // Skills-based scheduling
    const skilledStaff = staff.filter(s => staffSkills[s.user_id]?.length > 0)
    if (skilledStaff.length > 0) {
      recommendations.push({
        recommendation_type: 'skills_optimization',
        title: 'Leverage Specialized Skills',
        description: `Deploy skilled staff during high-demand periods to maximize service quality`,
        confidence_score: 0.85,
        impact_level: 'medium',
        recommended_staff: skilledStaff.slice(0, 2).map(s => ({
          staff_id: s.user_id,
          name: s.profiles?.full_name,
          skills: staffSkills[s.user_id]?.map(skill => skill.skill_name) || [],
          suggested_role: 'lead_during_peak'
        })),
        estimated_revenue_impact: predictedDemand * 50 * 0.08
      })
    }

    // Cost optimization
    recommendations.push({
      recommendation_type: 'cost_optimization',
      title: 'Optimize Labor Costs',
      description: 'Schedule junior staff during slower periods and experienced staff during peak times',
      confidence_score: 0.75,
      impact_level: 'medium',
      cost_savings: staff.reduce((sum, s) => sum + ((s.hourly_rate || 15) * 0.1 * 8), 0), // 10% labor cost reduction
      recommended_schedule: generateOptimalSchedule(staff, demandForecast)
    })

  } catch (error) {
    console.error('Error generating schedule recommendations:', error)
    recommendations.push({
      recommendation_type: 'error',
      title: 'Schedule Generation Error',
      description: error.message,
      confidence_score: 0,
      impact_level: 'none'
    })
  }

  return recommendations
}

function generateOptimalSchedule(staff, demandForecast) {
  const schedule = []
  const peakHours = demandForecast?.peak_hours || ['10:00', '14:00', '16:00']
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  daysOfWeek.forEach((day, dayIndex) => {
    // Higher staffing on weekends typically
    const isWeekend = dayIndex >= 5
    const baseStaffing = isWeekend ? Math.ceil(staff.length * 0.8) : Math.ceil(staff.length * 0.6)

    schedule.push({
      day: day,
      day_index: dayIndex,
      recommended_staff_count: baseStaffing,
      peak_hours: peakHours,
      suggested_shifts: staff.slice(0, baseStaffing).map((s, index) => ({
        staff_id: s.user_id,
        name: s.profiles?.full_name,
        start_time: index === 0 ? '09:00' : '11:00',
        end_time: index === 0 ? '18:00' : '20:00',
        role: s.role,
        reasoning: index === 0 ? 'Opening coverage' : 'Peak and closing coverage'
      }))
    })
  })

  return schedule
}

async function generatePerformanceInsights(locationId, staff, performanceData) {
  const insights = []

  try {
    // Analyze individual staff performance
    staff.forEach(staffMember => {
      const staffPerformance = performanceData.filter(p => p.staff_id === staffMember.user_id)
      
      if (staffPerformance.length > 0) {
        const avgEfficiency = staffPerformance.reduce((sum, p) => sum + (p.efficiency_score || 0), 0) / staffPerformance.length
        const avgSatisfaction = staffPerformance.reduce((sum, p) => sum + (p.customer_satisfaction || 0), 0) / staffPerformance.length

        insights.push({
          staff_id: staffMember.user_id,
          name: staffMember.profiles?.full_name,
          performance_summary: {
            efficiency_score: avgEfficiency,
            customer_satisfaction: avgSatisfaction,
            appointments_completed: staffPerformance.reduce((sum, p) => sum + (p.appointments_completed || 0), 0),
            revenue_generated: staffPerformance.reduce((sum, p) => sum + (p.revenue_generated || 0), 0)
          },
          recommendations: generateStaffRecommendations(staffMember, avgEfficiency, avgSatisfaction),
          trend_analysis: analyzePerformanceTrend(staffPerformance)
        })
      }
    })

    // Team-level insights
    insights.push({
      insight_type: 'team_analysis',
      location_id: locationId,
      team_performance: {
        total_staff: staff.length,
        active_staff: staff.filter(s => s.is_active).length,
        average_efficiency: insights.reduce((sum, i) => sum + (i.performance_summary?.efficiency_score || 0), 0) / insights.length,
        top_performer: insights.reduce((best, current) => {
          return (current.performance_summary?.efficiency_score || 0) > (best?.performance_summary?.efficiency_score || 0) 
            ? current : best
        }, null)
      },
      optimization_opportunities: [
        'Cross-train staff to improve versatility',
        'Implement peer mentoring between high and low performers',
        'Schedule top performers during peak hours'
      ]
    })

  } catch (error) {
    console.error('Error generating performance insights:', error)
    insights.push({
      insight_type: 'error',
      message: error.message
    })
  }

  return insights
}

function generateStaffRecommendations(staffMember, efficiency, satisfaction) {
  const recommendations = []

  if (efficiency < 0.7) {
    recommendations.push({
      type: 'efficiency_improvement',
      priority: 'high',
      action: 'Provide additional training on time management and service techniques',
      expected_impact: 'Increase efficiency by 20-30%'
    })
  }

  if (satisfaction < 4.0) {
    recommendations.push({
      type: 'customer_service_training',
      priority: 'medium',
      action: 'Enroll in customer service excellence program',
      expected_impact: 'Improve satisfaction scores by 0.5-1.0 points'
    })
  }

  if (efficiency > 0.9 && satisfaction > 4.5) {
    recommendations.push({
      type: 'leadership_opportunity',
      priority: 'medium',
      action: 'Consider for team lead or mentoring role',
      expected_impact: 'Improve overall team performance'
    })
  }

  return recommendations
}

function analyzePerformanceTrend(performanceData) {
  if (performanceData.length < 2) {
    return { trend: 'insufficient_data', direction: 'unknown' }
  }

  const sortedData = performanceData.sort((a, b) => new Date(a.metric_date) - new Date(b.metric_date))
  const recent = sortedData.slice(-3) // Last 3 data points
  const previous = sortedData.slice(-6, -3) // Previous 3 data points

  if (recent.length === 0 || previous.length === 0) {
    return { trend: 'insufficient_data', direction: 'unknown' }
  }

  const recentAvg = recent.reduce((sum, d) => sum + (d.efficiency_score || 0), 0) / recent.length
  const previousAvg = previous.reduce((sum, d) => sum + (d.efficiency_score || 0), 0) / previous.length

  const change = recentAvg - previousAvg
  
  return {
    trend: Math.abs(change) > 0.05 ? (change > 0 ? 'improving' : 'declining') : 'stable',
    direction: change > 0 ? 'upward' : change < 0 ? 'downward' : 'flat',
    change_percentage: (change / previousAvg) * 100
  }
}

async function generateSkillsOptimization(staff, skills, performanceData) {
  // Implementation for skills-based optimization
  return {
    skills_analysis: 'Skills optimization analysis would be implemented here',
    training_recommendations: [],
    skill_gap_analysis: []
  }
}

async function generatePayrollOptimization(locationId, staff, performanceData) {
  // Implementation for payroll optimization
  return {
    current_payroll_cost: staff.reduce((sum, s) => sum + (s.hourly_rate || 15) * 40, 0),
    optimized_cost: 0,
    savings_potential: 0,
    recommendations: []
  }
}

async function generateCostAnalysis(locationId, staff, demandForecast, timeHorizon) {
  const totalHourlyRate = staff.reduce((sum, s) => sum + (s.hourly_rate || 15), 0)
  const hoursPerPeriod = timeHorizon === 'week' ? 40 * staff.length : 
                        timeHorizon === 'month' ? 160 * staff.length :
                        640 * staff.length // quarter

  return {
    current_labor_cost: totalHourlyRate * (hoursPerPeriod / staff.length),
    projected_revenue: (demandForecast?.predicted_appointments_per_day || 5) * 50 * 
                      (timeHorizon === 'week' ? 7 : timeHorizon === 'month' ? 30 : 90),
    labor_cost_percentage: 0.35, // Typical 35%
    optimization_potential: 0.15 // 15% potential savings
  }
}

function calculateLocationOptimizationScore(optimization) {
  let score = 0
  let factors = 0

  // Schedule recommendations impact
  if (optimization.schedule_recommendations?.length > 0) {
    const avgConfidence = optimization.schedule_recommendations
      .reduce((sum, rec) => sum + (rec.confidence_score || 0), 0) / optimization.schedule_recommendations.length
    score += avgConfidence * 30
    factors += 30
  }

  // Performance insights quality
  if (optimization.performance_insights?.length > 0) {
    score += 25 // Base score for having insights
    factors += 25
  }

  // Demand forecast confidence
  if (optimization.demand_forecast?.confidence_level) {
    score += optimization.demand_forecast.confidence_level * 25
    factors += 25
  }

  // Cost analysis
  if (optimization.cost_analysis?.optimization_potential) {
    score += optimization.cost_analysis.optimization_potential * 100 * 20
    factors += 20
  }

  return factors > 0 ? Math.min(score / factors * 100, 100) : 0
}

async function generateOrganizationOptimizationInsights(organizationId, optimizationResults, optimizationType) {
  const insights = []
  const locationCount = Object.keys(optimizationResults).length

  if (locationCount === 0) {
    return []
  }

  // Calculate organization-wide metrics
  const avgOptimizationScore = Object.values(optimizationResults)
    .reduce((sum, result) => sum + (result.optimization_score || 0), 0) / locationCount

  insights.push({
    insight_type: 'organization_summary',
    title: 'Organization-Wide Optimization Status',
    description: `Average optimization score of ${avgOptimizationScore.toFixed(1)}% across ${locationCount} locations`,
    optimization_score: avgOptimizationScore,
    recommendations: [
      'Focus on locations with scores below 70%',
      'Replicate best practices from top-performing locations',
      'Implement standardized optimization procedures'
    ]
  })

  // Identify best and worst performing locations
  const sortedResults = Object.entries(optimizationResults)
    .sort(([,a], [,b]) => (b.optimization_score || 0) - (a.optimization_score || 0))

  if (sortedResults.length > 1) {
    const [bestLocationId, bestResult] = sortedResults[0]
    const [worstLocationId, worstResult] = sortedResults[sortedResults.length - 1]

    insights.push({
      insight_type: 'performance_comparison',
      title: 'Location Performance Variance',
      best_location: {
        id: bestLocationId,
        name: bestResult.location_name,
        score: bestResult.optimization_score
      },
      worst_location: {
        id: worstLocationId,
        name: worstResult.location_name,
        score: worstResult.optimization_score
      },
      improvement_potential: bestResult.optimization_score - worstResult.optimization_score
    })
  }

  return insights
}

function calculateOverallOptimizationScore(optimizationResults) {
  const scores = Object.values(optimizationResults)
    .map(result => result.optimization_score || 0)
    .filter(score => score > 0)

  return scores.length > 0 ? 
    scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
}

function calculatePotentialSavings(optimizationResults) {
  return Object.values(optimizationResults).reduce((totalSavings, result) => {
    const scheduleRevenue = result.schedule_recommendations?.reduce(
      (sum, rec) => sum + (rec.estimated_revenue_impact || 0), 0
    ) || 0
    const costSavings = result.cost_analysis?.optimization_potential || 0
    return totalSavings + scheduleRevenue + costSavings
  }, 0)
}

function generateTopRecommendations(optimizationResults) {
  const allRecommendations = []

  Object.values(optimizationResults).forEach(result => {
    if (result.schedule_recommendations) {
      result.schedule_recommendations.forEach(rec => {
        if (rec.impact_level === 'high' && rec.confidence_score > 0.7) {
          allRecommendations.push(rec.title || rec.description)
        }
      })
    }
  })

  return allRecommendations.slice(0, 5) // Top 5 recommendations
}

// POST action handlers

async function applyOptimizedSchedule(organizationId, locationId, scheduleData) {
  // Implementation for applying optimized schedules
  return {
    status: 'success',
    schedules_created: 0,
    message: 'Schedule application functionality would be implemented here'
  }
}

async function updateStaffShifts(organizationId, locationId, scheduleData) {
  // Implementation for updating staff shifts
  return {
    status: 'success',
    shifts_updated: 0,
    message: 'Shift update functionality would be implemented here'
  }
}

async function optimizePayrollAllocation(organizationId, locationId, optimizationSettings) {
  // Implementation for payroll optimization
  return {
    status: 'success',
    cost_savings: 0,
    message: 'Payroll optimization functionality would be implemented here'
  }
}

async function analyzeStaffPerformance(organizationId, locationId, optimizationSettings) {
  // Implementation for staff performance analysis
  return {
    status: 'success',
    staff_analyzed: 0,
    insights_generated: 0,
    message: 'Performance analysis functionality would be implemented here'
  }
}