import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id') || user.barbershop_id || 'demo-shop-001'
    const timeHorizons = searchParams.get('time_horizons')?.split(',') || ['1_week', '1_month', '3_months']

    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 days of history

      const { data: revenueData, error } = await supabase
        .from('bookings')
        .select(`
          scheduled_at,
          status,
          total_amount,
          service_id,
          services(name, price)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'completed')
        .gte('scheduled_at', startDate.toISOString())
        .order('scheduled_at', { ascending: true })

      if (error) {
        console.error('Error fetching revenue data:', error)
        throw error
      }

      const forecast = generateRealRevenueForecast(barbershopId, revenueData || [], timeHorizons)
      
      return NextResponse.json({
        success: true,
        data: forecast,
        data_source: 'database',
        historical_records: revenueData?.length || 0,
        timestamp: new Date().toISOString()
      })

    } catch (dbError) {
      console.error('Database error in revenue forecast:', dbError)
      
      return NextResponse.json({
        success: true,
        data: {
          barbershop_id: barbershopId,
          forecast_type: 'revenue',
          time_horizons: timeHorizons,
          forecasts: timeHorizons.map(horizon => ({
            horizon,
            predicted_revenue: 0,
            confidence: 0,
            insufficient_data: true
          })),
          summary: {
            total_predicted_revenue: 0,
            growth_rate: 0,
            insufficient_data: true
          },
          insights: [{
            type: 'data_collection',
            title: 'Insufficient Revenue Data',
            description: 'More completed booking history needed for revenue forecasting',
            recommendations: [
              'Track completed bookings with accurate pricing',
              'Record payment information for revenue analysis',
              'Monitor monthly revenue trends'
            ]
          }]
        },
        fallback: true,
        error: 'Insufficient historical revenue data',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Revenue forecast API error:', error)
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

    const { action, parameters } = await request.json()
    const barbershopId = parameters?.barbershop_id || user.barbershop_id || 'demo-shop-001'
    
    try {
      let response
      
      switch (action) {
        case 'analyze_revenue_trends':
          response = await analyzeRevenueTrendsFromDatabase(supabase, barbershopId, parameters)
          break
          
        case 'calculate_growth_rate':
          response = await calculateRevenueGrowthRate(supabase, barbershopId, parameters)
          break
          
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown action: ${action}`,
            available_actions: ['analyze_revenue_trends', 'calculate_growth_rate']
          }, { status: 400 })
      }
      
      return NextResponse.json({
        success: true,
        action,
        response,
        data_source: 'database',
        timestamp: new Date().toISOString()
      })

    } catch (dbError) {
      console.error('Database error in revenue action:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Database operation failed',
        details: dbError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Revenue forecast action error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


function generateRealRevenueForecast(barbershopId, revenueData, timeHorizons) {
  if (!revenueData || revenueData.length < 5) {
    return {
      barbershop_id: barbershopId,
      forecast_type: 'revenue',
      time_horizons: timeHorizons,
      forecasts: timeHorizons.map(horizon => ({
        horizon,
        predicted_revenue: 0,
        confidence: 0,
        insufficient_data: true
      })),
      summary: {
        total_predicted_revenue: 0,
        growth_rate: 0,
        insufficient_data: true
      },
      insights: [{
        type: 'data_collection',
        title: 'Insufficient Revenue Data',
        description: `Only ${revenueData.length} completed bookings found. Need at least 5 for forecasting.`,
        recommendations: [
          'Track completed bookings with accurate pricing',
          'Record payment information for revenue analysis',
          'Monitor monthly revenue trends'
        ]
      }]
    }
  }

  const patterns = analyzeRealRevenuePatterns(revenueData)
  const forecasts = generateRealRevenueForecasts(patterns, timeHorizons)
  
  return {
    barbershop_id: barbershopId,
    forecast_type: 'revenue',
    time_horizons: timeHorizons,
    generated_at: new Date().toISOString(),
    data_source: 'real_historical_revenue',
    historical_period_days: Math.ceil((new Date() - new Date(revenueData[0]?.scheduled_at || new Date())) / (1000 * 60 * 60 * 24)),
    
    forecasts,
    
    summary: {
      total_predicted_revenue: forecasts.reduce((sum, f) => sum + f.predicted_revenue, 0),
      average_monthly_revenue: Math.round(patterns.avgMonthlyRevenue * 100) / 100,
      growth_rate: patterns.growthRate,
      confidence_score: patterns.confidence,
      based_on_bookings: revenueData.length
    },
    
    historical_patterns: {
      daily_average_revenue: patterns.avgDailyRevenue,
      monthly_average_revenue: patterns.avgMonthlyRevenue,
      peak_revenue_day: patterns.peakRevenueDay,
      most_profitable_service: patterns.mostProfitableService?.name || 'Unknown',
      revenue_trend: patterns.trend
    },
    
    insights: generateRevenueInsights(patterns, revenueData)
  }
}

function analyzeRealRevenuePatterns(revenueData) {
  const totalRevenue = revenueData.reduce((sum, booking) => sum + (parseFloat(booking.total_amount) || 0), 0)
  const totalDays = Math.max(1, Math.ceil((new Date() - new Date(revenueData[0]?.scheduled_at || new Date())) / (1000 * 60 * 60 * 24)))
  const avgDailyRevenue = totalRevenue / totalDays
  const avgMonthlyRevenue = avgDailyRevenue * 30
  
  const revenueByDay = [0, 0, 0, 0, 0, 0, 0] // Sunday = 0
  const serviceRevenue = {}
  
  revenueData.forEach(booking => {
    const date = new Date(booking.scheduled_at)
    const dayOfWeek = date.getDay()
    const revenue = parseFloat(booking.total_amount) || 0
    
    revenueByDay[dayOfWeek] += revenue
    
    const serviceName = booking.services?.name || 'Unknown'
    serviceRevenue[serviceName] = (serviceRevenue[serviceName] || 0) + revenue
  })
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const peakDayIndex = revenueByDay.indexOf(Math.max(...revenueByDay))
  const peakRevenueDay = dayNames[peakDayIndex]
  
  const mostProfitableService = Object.entries(serviceRevenue)
    .sort(([,a], [,b]) => b - a)[0]
  
  const growthRate = calculateRevenueGrowthTrend(revenueData)
  
  return {
    avgDailyRevenue,
    avgMonthlyRevenue,
    peakRevenueDay,
    mostProfitableService: mostProfitableService ? { name: mostProfitableService[0], revenue: mostProfitableService[1] } : null,
    confidence: Math.min(0.95, revenueData.length / 50), // Higher confidence with more data
    growthRate,
    trend: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable',
    totalRevenue,
    totalBookings: revenueData.length
  }
}

function generateRealRevenueForecasts(patterns, timeHorizons) {
  const forecasts = []
  const baseMonthlyRevenue = patterns.avgMonthlyRevenue || 100
  
  timeHorizons.forEach(horizon => {
    let multiplier = 1
    let confidence = patterns.confidence || 0.5
    
    switch (horizon) {
      case '1_day':
        multiplier = 1/30
        confidence = Math.min(confidence + 0.2, 0.9)
        break
      case '1_week':
        multiplier = 7/30
        confidence = Math.min(confidence + 0.1, 0.85)
        break
      case '1_month':
        multiplier = 1
        break
      case '3_months':
        multiplier = 3
        confidence = Math.max(confidence - 0.1, 0.3)
        break
      case '6_months':
        multiplier = 6
        confidence = Math.max(confidence - 0.2, 0.2)
        break
      case '1_year':
        multiplier = 12
        confidence = Math.max(confidence - 0.3, 0.1)
        break
    }
    
    const growthMultiplier = 1 + (patterns.growthRate / 100)
    const predictedRevenue = Math.round(baseMonthlyRevenue * multiplier * growthMultiplier * 100) / 100
    
    forecasts.push({
      horizon,
      predicted_revenue: predictedRevenue,
      confidence: Math.round(confidence * 100) / 100,
      growth_factor: growthMultiplier,
      based_on_pattern: patterns.trend
    })
  })
  
  return forecasts
}

function calculateRevenueGrowthTrend(revenueData) {
  if (revenueData.length < 4) return 0
  
  const midpoint = Math.floor(revenueData.length / 2)
  const firstPeriod = revenueData.slice(0, midpoint)
  const secondPeriod = revenueData.slice(midpoint)
  
  const firstPeriodRevenue = firstPeriod.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0)
  const secondPeriodRevenue = secondPeriod.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0)
  
  if (firstPeriodRevenue === 0) return 0
  
  const growthRate = ((secondPeriodRevenue - firstPeriodRevenue) / firstPeriodRevenue) * 100
  return Math.round(growthRate * 10) / 10
}

function generateRevenueInsights(patterns, revenueData) {
  const insights = []
  
  if (patterns.growthRate > 10) {
    insights.push({
      type: 'growth_opportunity',
      title: 'Strong Revenue Growth',
      description: `Revenue is growing at ${patterns.growthRate}% based on recent trends`,
      recommendations: [
        'Consider expanding services or hours',
        'Invest in marketing to maintain growth',
        'Plan for increased capacity needs'
      ],
      impact_score: 0.9,
      data_points: { growth_rate: patterns.growthRate, total_revenue: patterns.totalRevenue }
    })
  } else if (patterns.growthRate < -10) {
    insights.push({
      type: 'revenue_decline',
      title: 'Revenue Decline Detected',
      description: `Revenue is declining at ${Math.abs(patterns.growthRate)}% - immediate attention needed`,
      recommendations: [
        'Review pricing strategy',
        'Implement customer retention programs',
        'Analyze competitor offerings'
      ],
      impact_score: 0.95,
      data_points: { growth_rate: patterns.growthRate, decline_amount: patterns.totalRevenue * (patterns.growthRate / 100) }
    })
  }
  
  if (patterns.mostProfitableService && patterns.mostProfitableService.revenue > patterns.totalRevenue * 0.5) {
    insights.push({
      type: 'service_concentration',
      title: `${patterns.mostProfitableService.name} Drives Major Revenue`,
      description: `${patterns.mostProfitableService.name} accounts for ${Math.round((patterns.mostProfitableService.revenue / patterns.totalRevenue) * 100)}% of revenue`,
      recommendations: [
        'Diversify service offerings to reduce risk',
        'Optimize pricing for this popular service',
        'Create related service packages'
      ],
      impact_score: 0.7,
      data_points: { service: patterns.mostProfitableService.name, revenue_percentage: (patterns.mostProfitableService.revenue / patterns.totalRevenue) }
    })
  }
  
  if (insights.length === 0) {
    insights.push({
      type: 'revenue_performance',
      title: 'Stable Revenue Performance',
      description: 'Revenue patterns show consistent business performance',
      recommendations: [
        'Continue current business practices',
        'Look for gradual optimization opportunities',
        'Monitor seasonal trends for planning'
      ],
      impact_score: 0.5,
      data_points: patterns
    })
  }
  
  return insights
}

async function analyzeRevenueTrendsFromDatabase(supabase, barbershopId, parameters) {
  const period = parameters?.period || '90_days'
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
  
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('scheduled_at, status, total_amount, services(name)')
    .eq('barbershop_id', barbershopId)
    .eq('status', 'completed')
    .gte('scheduled_at', startDate.toISOString())
    .order('scheduled_at', { ascending: true })
  
  if (error) throw error
  
  const totalRevenue = bookings?.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0) || 0
  const avgRevenue = totalRevenue / (bookings?.length || 1)
  
  return {
    total_revenue: totalRevenue,
    total_bookings: bookings?.length || 0,
    average_booking_value: Math.round(avgRevenue * 100) / 100,
    revenue_trend: calculateRevenueGrowthTrend(bookings || []),
    top_services: getTopServicesByRevenue(bookings || [])
  }
}

async function calculateRevenueGrowthRate(supabase, barbershopId, parameters) {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('scheduled_at, total_amount')
    .eq('barbershop_id', barbershopId)
    .eq('status', 'completed')
    .gte('scheduled_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
    .order('scheduled_at', { ascending: true })
  
  if (error) throw error
  
  const growthRate = calculateRevenueGrowthTrend(bookings || [])
  
  return {
    growth_rate: growthRate,
    trend: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable',
    total_bookings_analyzed: bookings?.length || 0,
    calculation_period: '60_days'
  }
}

function getTopServicesByRevenue(bookings) {
  const serviceRevenue = {}
  bookings.forEach(booking => {
    const serviceName = booking.services?.name || 'Unknown'
    const revenue = parseFloat(booking.total_amount) || 0
    serviceRevenue[serviceName] = (serviceRevenue[serviceName] || 0) + revenue
  })
  
  return Object.entries(serviceRevenue)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([service, revenue]) => ({ service, revenue: Math.round(revenue * 100) / 100 }))
}

