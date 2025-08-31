import { subDays, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/no-show/analytics
 * Comprehensive no-show analytics and metrics
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    
    // Parse and validate date range from query params
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const barberId = searchParams.get('barber_id')
    
    // Validate and parse dates
    let startDate, endDate
    try {
      startDate = startDateParam ? new Date(startDateParam).toISOString() : subDays(new Date(), 30).toISOString()
      endDate = endDateParam ? new Date(endDateParam).toISOString() : new Date().toISOString()
      
      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 })
      }
      
      // Prevent excessively large date ranges (more than 2 years)
      const daysDifference = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
      if (daysDifference > 730) {
        return NextResponse.json({ error: 'Date range cannot exceed 2 years' }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid date format provided' }, { status: 400 })
    }
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Profile lookup error:', profileError)
      return NextResponse.json({ 
        error: 'Failed to load user profile',
        details: process.env.NODE_ENV === 'development' ? profileError.message : undefined
      }, { status: 500 })
    }
    
    // Check both barbershop_id and barbershop_id fields
    let barbershopId = profile?.barbershop_id || profile?.shop_id
    
    if (!barbershopId) {
      // Try to get barbershop from ownership
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)

      if (!ownedShops || ownedShops.length === 0) {
        return NextResponse.json({ 
          error: 'No barbershop associated with this user account',
          action: 'Please contact support to set up your barbershop association'
        }, { status: 404 })
      }
      
      barbershopId = ownedShops[0].id
    }

    // 1. Get no-show incidents in date range
    let incidentsQuery = supabase
      .from('no_show_incidents')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('incident_date', startDate)
      .lte('incident_date', endDate)
    
    if (barberId) {
      incidentsQuery = incidentsQuery.eq('barber_id', barberId)
    }
    
    const { data: incidents, error: incidentsError } = await incidentsQuery
    
    if (incidentsError) {
      console.error('Failed to load no-show incidents:', incidentsError)
      
      // Check if table doesn't exist (common in development)
      if (incidentsError.message?.includes('relation') && incidentsError.message?.includes('does not exist')) {
        console.warn('No-show tables not found, returning empty data structure')
        // Return empty but valid structure
        return NextResponse.json({
          dateRange: { start: startDate, end: endDate },
          kpis: {
            totalNoShows: 0,
            noShowRate: 0,
            revenueImpact: { lost: 0, recovered: 0 },
            feeCollection: { total: 0, collected: 0, pending: 0, failed: 0 },
            gracePeriodsApplied: 0,
            averageArrivalDelay: 0
          },
          trends: [],
          strikeSegments: { '1_strike': 0, '2_strikes': 0, '3_plus_strikes': 0 },
          blockedSummary: { currentlyBlocked: 0, inRecovery: 0, totalFeesOwed: 0 },
          policyEffectiveness: { hasPolicyConfigured: false, metrics: {} },
          topOffenders: [],
          serviceAnalysis: [],
          timePatterns: { byDayOfWeek: {}, byHour: {}, peakTimes: [] },
          summary: {
            totalIncidents: 0,
            totalAppointments: 0,
            noShowRate: 0,
            totalRevenueLost: 0,
            totalRevenueRecovered: 0,
            recoveryRate: 0
          }
        })
      }
      
      return NextResponse.json({ 
        error: 'Failed to load no-show data',
        details: process.env.NODE_ENV === 'development' ? incidentsError.message : undefined
      }, { status: 500 })
    }

    // 2. Get total appointments in same period for comparison
    let appointmentsQuery = supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', barbershopId)
      .gte('date', startDate)
      .lte('date', endDate)
    
    if (barberId) {
      appointmentsQuery = appointmentsQuery.eq('barber_id', barberId)
    }
    
    const { count: totalAppointments, error: appointmentsError } = await appointmentsQuery
    
    if (appointmentsError) {
      console.error('Failed to load appointment count:', appointmentsError)
      // Continue with incidents data only, but log the error
    }

    // 3. Calculate KPIs with safe fallbacks
    const safeIncidents = incidents || []
    const safeTotalAppointments = totalAppointments || 0
    
    const kpis = {
      totalNoShows: safeIncidents.length,
      noShowRate: safeTotalAppointments > 0 ? (safeIncidents.length / safeTotalAppointments) * 100 : 0,
      revenueImpact: {
        lost: safeIncidents.reduce((sum, i) => sum + (parseFloat(i.service_price) || 0), 0),
        recovered: safeIncidents
          .filter(i => i.fee_status === 'charged')
          .reduce((sum, i) => sum + (parseFloat(i.fee_amount) || 0), 0)
      },
      feeCollection: {
        total: safeIncidents.filter(i => i.fee_charged).length,
        collected: safeIncidents.filter(i => i.fee_status === 'charged').length,
        pending: safeIncidents.filter(i => i.fee_status === 'pending').length,
        failed: safeIncidents.filter(i => i.fee_status === 'failed').length
      },
      gracePeriodsApplied: safeIncidents.filter(i => i.grace_period_applied).length,
      averageArrivalDelay: calculateAverageDelay(safeIncidents)
    }

    // 4-7. Get additional data in parallel for better performance
    const [
      { data: strikeDistribution, error: strikeError },
      { data: blockedClients, error: blockedError },
      { data: policy, error: policyError }
    ] = await Promise.all([
      supabase
        .from('client_strike_history')
        .select('active_strikes')
        .eq('barbershop_id', barbershopId)
        .gt('active_strikes', 0),
      supabase
        .from('blocked_clients')
        .select('recovery_initiated_at, required_fee_amount')
        .eq('barbershop_id', barbershopId)
        .is('blocked_until', null), // Currently blocked
      supabase
        .from('no_show_policies')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()
    ])

    // Handle errors for parallel queries
    if (strikeError) console.error('Strike distribution error:', strikeError)
    if (blockedError) console.error('Blocked clients error:', blockedError)
    if (policyError) console.error('Policy error:', policyError)
    
    const strikeSegments = strikeDistribution ? {
      '1_strike': strikeDistribution.filter(s => s.active_strikes === 1).length || 0,
      '2_strikes': strikeDistribution.filter(s => s.active_strikes === 2).length || 0,
      '3_plus_strikes': strikeDistribution.filter(s => s.active_strikes >= 3).length || 0
    } : { '1_strike': 0, '2_strikes': 0, '3_plus_strikes': 0 }

    // 5. Calculate trends (daily aggregation)
    const dailyTrends = calculateDailyTrends(safeIncidents, startDate, endDate)
    
    const blockedSummary = {
      currentlyBlocked: blockedClients?.length || 0,
      inRecovery: blockedClients?.filter(b => b.recovery_initiated_at).length || 0,
      totalFeesOwed: blockedClients?.reduce((sum, b) => sum + (parseFloat(b.required_fee_amount) || 0), 0) || 0
    }
    
    const policyEffectiveness = calculatePolicyEffectiveness(safeIncidents, policy)

    // 8. Top offenders  
    const topOffenders = getTopOffenders(safeIncidents)

    // 9. Service analysis
    const serviceAnalysis = getServiceAnalysis(safeIncidents)

    // 10. Time pattern analysis
    const timePatterns = getTimePatterns(safeIncidents)

    return NextResponse.json({
      dateRange: {
        start: startDate,
        end: endDate
      },
      kpis,
      trends: dailyTrends,
      strikeSegments,
      blockedSummary,
      policyEffectiveness,
      topOffenders,
      serviceAnalysis,
      timePatterns,
      summary: {
        totalIncidents: safeIncidents.length,
        totalAppointments: safeTotalAppointments,
        noShowRate: kpis.noShowRate,
        totalRevenueLost: kpis.revenueImpact.lost,
        totalRevenueRecovered: kpis.revenueImpact.recovered,
        recoveryRate: kpis.revenueImpact.lost > 0 ? 
          (kpis.revenueImpact.recovered / kpis.revenueImpact.lost) * 100 : 0
      }
    })
    
  } catch (error) {
    console.error('Error fetching no-show analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

// Helper function to calculate average arrival delay
function calculateAverageDelay(incidents) {
  if (!Array.isArray(incidents) || incidents.length === 0) return 0
  
  const delayedIncidents = incidents.filter(i => 
    i.arrived_minutes_late && 
    typeof i.arrived_minutes_late === 'number' && 
    i.arrived_minutes_late > 0
  )
  
  if (delayedIncidents.length === 0) return 0
  
  const totalDelay = delayedIncidents.reduce((sum, i) => sum + i.arrived_minutes_late, 0)
  return Math.round(totalDelay / delayedIncidents.length)
}

// Helper function to calculate daily trends
function calculateDailyTrends(incidents, startDate, endDate) {
  if (!Array.isArray(incidents)) return []
  
  try {
    const days = eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(endDate)
    })
    
    const dailyData = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayIncidents = incidents.filter(i => 
        i.incident_date === dayStr || 
        i.incident_date === format(new Date(i.incident_date), 'yyyy-MM-dd')
      )
      
      return {
        date: dayStr,
        noShows: dayIncidents.length,
        feesCharged: dayIncidents.filter(i => i.fee_charged).length,
        revenueLost: dayIncidents.reduce((sum, i) => sum + (parseFloat(i.service_price) || 0), 0),
        recovered: dayIncidents
          .filter(i => i.fee_status === 'charged')
          .reduce((sum, i) => sum + (parseFloat(i.fee_amount) || 0), 0)
      }
    })
    
    return dailyData
  } catch (error) {
    console.error('Error calculating daily trends:', error)
    return []
  }
}

// Helper function to calculate policy effectiveness
function calculatePolicyEffectiveness(incidents, policy) {
  if (!policy) {
    return {
      hasPolicyConfigured: false,
      metrics: {}
    }
  }
  
  const totalIncidents = incidents.length
  const feesCharged = incidents.filter(i => i.fee_charged).length
  const feesCollected = incidents.filter(i => i.fee_status === 'charged').length
  const gracePeriodApplied = incidents.filter(i => i.grace_period_applied).length
  
  return {
    hasPolicyConfigured: true,
    metrics: {
      feeEnforcementRate: totalIncidents > 0 ? (feesCharged / totalIncidents) * 100 : 0,
      feeCollectionRate: feesCharged > 0 ? (feesCollected / feesCharged) * 100 : 0,
      gracePeriodUsageRate: totalIncidents > 0 ? (gracePeriodApplied / totalIncidents) * 100 : 0,
      averageFeeAmount: policy.no_show_fee_amount,
      strikesBeforeBlock: policy.strikes_before_block
    },
    settings: {
      autoChargeFees: policy.auto_charge_fees,
      autoBlockEnabled: policy.auto_block_enabled,
      autoSendNotifications: policy.auto_send_notifications
    }
  }
}

// Helper function to get top offenders
function getTopOffenders(incidents) {
  const clientCounts = {}
  
  incidents.forEach(incident => {
    if (!clientCounts[incident.client_id]) {
      clientCounts[incident.client_id] = {
        client_id: incident.client_id,
        incidents: 0,
        totalLost: 0,
        lastIncident: null
      }
    }
    
    clientCounts[incident.client_id].incidents++
    clientCounts[incident.client_id].totalLost += incident.service_price || 0
    
    if (!clientCounts[incident.client_id].lastIncident || 
        incident.incident_date > clientCounts[incident.client_id].lastIncident) {
      clientCounts[incident.client_id].lastIncident = incident.incident_date
    }
  })
  
  // Convert to array and sort by incident count
  const offenders = Object.values(clientCounts)
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, 10) // Top 10
  
  return offenders
}

// Helper function to analyze services
function getServiceAnalysis(incidents) {
  const serviceStats = {}
  
  incidents.forEach(incident => {
    const service = incident.service_name || 'Unknown'
    
    if (!serviceStats[service]) {
      serviceStats[service] = {
        name: service,
        incidents: 0,
        totalRevenueLost: 0,
        averagePrice: 0
      }
    }
    
    serviceStats[service].incidents++
    serviceStats[service].totalRevenueLost += incident.service_price || 0
  })
  
  // Calculate averages
  Object.values(serviceStats).forEach(stat => {
    stat.averagePrice = stat.incidents > 0 ? 
      stat.totalRevenueLost / stat.incidents : 0
  })
  
  // Convert to array and sort by incidents
  const services = Object.values(serviceStats)
    .sort((a, b) => b.incidents - a.incidents)
  
  return services
}

// Helper function to analyze time patterns
function getTimePatterns(incidents) {
  const patterns = {
    byDayOfWeek: {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0
    },
    byHour: {},
    peakTimes: []
  }
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  incidents.forEach(incident => {
    // Day of week analysis
    const date = new Date(incident.incident_date)
    const dayName = dayNames[date.getDay()]
    patterns.byDayOfWeek[dayName]++
    
    // Hour analysis
    if (incident.incident_time) {
      const hour = parseInt(incident.incident_time.split(':')[0])
      if (!patterns.byHour[hour]) {
        patterns.byHour[hour] = 0
      }
      patterns.byHour[hour]++
    }
  })
  
  // Find peak times
  const hourCounts = Object.entries(patterns.byHour)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
  
  patterns.peakTimes = hourCounts.map(h => ({
    hour: `${h.hour}:00`,
    incidents: h.count
  }))
  
  return patterns
}

/**
 * POST /api/no-show/analytics/export
 * Export analytics data as CSV or PDF
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { format: exportFormat, dateRange } = await request.json()
    
    // Get analytics data (reuse GET logic)
    const analyticsResponse = await GET(new Request(
      `${request.url}?start_date=${dateRange.start}&end_date=${dateRange.end}`
    ))
    
    const analyticsData = await analyticsResponse.json()
    
    if (exportFormat === 'csv') {
      // Generate CSV content
      const csvContent = generateCSVContent(analyticsData)
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="no-show-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv"`
        }
      })
    } else {
      // For PDF, return the data to be formatted client-side
      return NextResponse.json({
        format: 'pdf',
        data: analyticsData,
        generatedAt: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    )
  }
}

// Helper function to generate CSV content
function generateCSVContent(data) {
  const lines = []
  
  // Headers
  lines.push('No-Show Analytics Report')
  lines.push(`Date Range: ${data.dateRange.start} to ${data.dateRange.end}`)
  lines.push('')
  
  // KPIs
  lines.push('Key Performance Indicators')
  lines.push('Metric,Value')
  lines.push(`Total No-Shows,${data.kpis.totalNoShows}`)
  lines.push(`No-Show Rate,${data.kpis.noShowRate.toFixed(2)}%`)
  lines.push(`Revenue Lost,$${data.kpis.revenueImpact.lost.toFixed(2)}`)
  lines.push(`Revenue Recovered,$${data.kpis.revenueImpact.recovered.toFixed(2)}`)
  lines.push('')
  
  // Daily Trends
  lines.push('Daily Trends')
  lines.push('Date,No-Shows,Fees Charged,Revenue Lost,Revenue Recovered')
  data.trends.forEach(day => {
    lines.push(`${day.date},${day.noShows},${day.feesCharged},${day.revenueLost},${day.recovered}`)
  })
  
  return lines.join('\n')
}