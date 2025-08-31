import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * No-Show Client Risk Analytics API
 * GET /api/analytics/no-show/client-risk
 * 
 * Returns detailed client risk analysis including:
 * - Risk score distribution
 * - High-risk client identification
 * - Risk factor analysis
 * - Client segmentation by behavior patterns
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const dateRange = searchParams.get('date_range') || '30_days'

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'Missing barbershop_id parameter' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Calculate date boundaries
    const dateRanges = {
      '7_days': 7,
      '30_days': 30,
      '90_days': 90,
      '6_months': 180,
      '1_year': 365
    }

    const daysBack = dateRanges[dateRange] || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Get client behavior data
    const [appointmentsQuery, customersQuery, behaviorScoresQuery] = await Promise.all([
      // All appointments with customer info
      supabase
        .from('appointments')
        .select(`
          id,
          status,
          service_price,
          created_at,
          customer_id,
          customer_name,
          customer_email,
          customer_phone
        `)
        .eq('barbershop_id', barbershopId)
        .gte('created_at', startDate.toISOString()),

      // Customer profile data
      supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          total_bookings,
          total_spent,
          last_appointment
        `)
        .eq('barbershop_id', barbershopId),

      // Behavior scores if available
      supabase
        .from('customer_behavior_scores')
        .select(`
          customer_id,
          risk_score,
          reliability_score,
          no_show_count,
          last_updated
        `)
        .eq('barbershop_id', barbershopId)
    ])

    const appointments = appointmentsQuery.data || []
    const customers = customersQuery.data || []
    const behaviorScores = behaviorScoresQuery.data || []

    // Calculate client risk data
    const riskAnalysis = calculateClientRisk(appointments, customers, behaviorScores)

    return NextResponse.json({
      success: true,
      data: riskAnalysis,
      data_source: 'supabase_enhanced',
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Client risk API error:', error)
    
    // Return mock data for development
    return NextResponse.json({
      success: true,
      data: getMockClientRiskData(),
      data_source: 'mock_data',
      generated_at: new Date().toISOString(),
      note: 'Using mock data - database query failed'
    })
  }
}

function calculateClientRisk(appointments, customers, behaviorScores) {
  // Create customer risk profiles
  const customerProfiles = new Map()

  // Initialize with customer data
  customers.forEach(customer => {
    customerProfiles.set(customer.id, {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      total_bookings: customer.total_bookings || 0,
      total_spent: customer.total_spent || 0,
      last_appointment: customer.last_appointment,
      appointments: [],
      no_shows: 0,
      completed: 0,
      cancellations: 0,
      risk_score: 0,
      risk_level: 'low'
    })
  })

  // Add appointment data to profiles
  appointments.forEach(appointment => {
    if (appointment.customer_id && customerProfiles.has(appointment.customer_id)) {
      const profile = customerProfiles.get(appointment.customer_id)
      
      profile.appointments.push(appointment)
      
      switch (appointment.status) {
        case 'no_show':
          profile.no_shows++
          break
        case 'completed':
          profile.completed++
          break
        case 'cancelled':
          profile.cancellations++
          break
      }
    } else if (appointment.customer_id) {
      // Create profile for customer not in customers table
      const profile = {
        id: appointment.customer_id,
        name: appointment.customer_name || 'Unknown',
        email: appointment.customer_email || '',
        phone: appointment.customer_phone || '',
        total_bookings: 0,
        total_spent: 0,
        last_appointment: appointment.created_at,
        appointments: [appointment],
        no_shows: appointment.status === 'no_show' ? 1 : 0,
        completed: appointment.status === 'completed' ? 1 : 0,
        cancellations: appointment.status === 'cancelled' ? 1 : 0,
        risk_score: 0,
        risk_level: 'low'
      }
      customerProfiles.set(appointment.customer_id, profile)
    }
  })

  // Calculate risk scores
  const clientProfiles = Array.from(customerProfiles.values()).map(profile => {
    const totalAppointments = profile.appointments.length
    const noShowRate = totalAppointments > 0 ? (profile.no_shows / totalAppointments) * 100 : 0
    const completionRate = totalAppointments > 0 ? (profile.completed / totalAppointments) * 100 : 0
    
    // Risk score calculation (0-100)
    let riskScore = 0
    
    // No-show rate factor (40% of score)
    riskScore += noShowRate * 0.4
    
    // Booking frequency factor (20% of score)
    if (totalAppointments === 1) riskScore += 20
    else if (totalAppointments === 2) riskScore += 15
    else if (totalAppointments <= 5) riskScore += 10
    
    // Completion rate factor (20% of score) 
    riskScore += (100 - completionRate) * 0.2
    
    // Recency factor (20% of score)
    if (profile.last_appointment) {
      const daysSinceLastAppointment = Math.floor(
        (new Date() - new Date(profile.last_appointment)) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceLastAppointment > 90) riskScore += 20
      else if (daysSinceLastAppointment > 60) riskScore += 15
      else if (daysSinceLastAppointment > 30) riskScore += 10
    }
    
    // Cap at 100
    riskScore = Math.min(riskScore, 100)
    
    // Determine risk level
    let riskLevel = 'low'
    if (riskScore >= 70) riskLevel = 'high'
    else if (riskScore >= 40) riskLevel = 'medium'
    
    return {
      ...profile,
      risk_score: Math.round(riskScore),
      risk_level: riskLevel,
      no_show_rate: parseFloat(noShowRate.toFixed(1)),
      completion_rate: parseFloat(completionRate.toFixed(1))
    }
  })

  // Generate risk distribution
  const riskCounts = { low: 0, medium: 0, high: 0 }
  clientProfiles.forEach(profile => {
    riskCounts[profile.risk_level]++
  })

  // Generate score distribution
  const scoreRanges = {
    '0-20': 0,
    '21-40': 0,
    '41-60': 0,
    '61-80': 0,
    '81-100': 0
  }

  clientProfiles.forEach(profile => {
    const score = profile.risk_score
    if (score <= 20) scoreRanges['0-20']++
    else if (score <= 40) scoreRanges['21-40']++
    else if (score <= 60) scoreRanges['41-60']++
    else if (score <= 80) scoreRanges['61-80']++
    else scoreRanges['81-100']++
  })

  const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({
    score_range: range,
    client_count: count
  }))

  // Get high-risk clients (sorted by risk score)
  const highRiskClients = clientProfiles
    .filter(profile => profile.risk_level === 'high')
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 20) // Top 20 high-risk clients
    .map(profile => ({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      risk_score: profile.risk_score,
      no_show_count: profile.no_shows,
      total_appointments: profile.appointments.length,
      last_booking: profile.last_appointment,
      no_show_rate: profile.no_show_rate
    }))

  return {
    risk_distribution: riskCounts,
    total: clientProfiles.length,
    score_distribution: scoreDistribution,
    high_risk_list: highRiskClients,
    risk_factors: {
      primary_factors: [
        'Historical no-show rate',
        'Booking frequency',
        'Appointment completion rate',
        'Recent activity'
      ],
      thresholds: {
        high_risk: '70+ points',
        medium_risk: '40-69 points', 
        low_risk: '0-39 points'
      }
    }
  }
}

function getMockClientRiskData() {
  return {
    risk_distribution: { low: 120, medium: 22, high: 8 },
    total: 150,
    score_distribution: [
      { score_range: '0-20', client_count: 45 },
      { score_range: '21-40', client_count: 38 },
      { score_range: '41-60', client_count: 35 },
      { score_range: '61-80', client_count: 22 },
      { score_range: '81-100', client_count: 10 }
    ],
    high_risk_list: [
      { 
        name: 'John Smith', 
        email: 'john@example.com', 
        phone: '(555) 123-4567',
        risk_score: 85, 
        no_show_count: 4, 
        total_appointments: 6,
        last_booking: '2024-01-15',
        no_show_rate: 66.7
      },
      { 
        name: 'Jane Doe', 
        email: 'jane@example.com', 
        phone: '(555) 234-5678',
        risk_score: 78, 
        no_show_count: 3, 
        total_appointments: 5,
        last_booking: '2024-01-20',
        no_show_rate: 60.0
      },
      { 
        name: 'Bob Johnson', 
        email: 'bob@example.com', 
        phone: '(555) 345-6789',
        risk_score: 72, 
        no_show_count: 3, 
        total_appointments: 7,
        last_booking: '2024-01-10',
        no_show_rate: 42.9
      },
      { 
        name: 'Alice Brown', 
        email: 'alice@example.com', 
        phone: '(555) 456-7890',
        risk_score: 71, 
        no_show_count: 2, 
        total_appointments: 4,
        last_booking: '2024-01-25',
        no_show_rate: 50.0
      }
    ],
    risk_factors: {
      primary_factors: [
        'Historical no-show rate',
        'Booking frequency',
        'Appointment completion rate',
        'Recent activity'
      ],
      thresholds: {
        high_risk: '70+ points',
        medium_risk: '40-69 points', 
        low_risk: '0-39 points'
      }
    }
  }
}