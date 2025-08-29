import { NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant-resolver'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// FastAPI base URL
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8001'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's auth token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No valid session' }, { status: 401 })
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url)
    const periodDays = searchParams.get('period_days') || '30'

    // Get user's profile and barbershop access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get barbershop ID using unified tenant resolver
    const { barbershopId } = await getTenant(profile.id, { supabase })
    if (!barbershopId) {
      return NextResponse.json({ error: 'No barbershop access' }, { status: 403 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(periodDays))

    // CRITICAL FIX: Get real-time analytics from database
    const [
      revenueResult,
      appointmentsResult,
      servicesResult,
      paymentsResult
    ] = await Promise.all([
      // Total revenue for period
      supabase
        .from('bookings')
        .select('total_amount, service_price, tip_amount')
        .eq('barbershop_id', barbershopId)
        .eq('payment_status', 'PAID')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
        
      // Appointment counts and status
      supabase
        .from('bookings')
        .select('id, status, scheduled_at')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
        
      // Popular services
      supabase
        .from('bookings')
        .select('service_id, services(name)')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
        
      // Payment methods
      supabase
        .from('payments')
        .select('payment_method, amount')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ])

    // Process revenue data
    const revenueData = revenueResult.data || []
    const totalRevenue = revenueData.reduce((sum, booking) => sum + (booking.total_amount || 0), 0)
    const totalServiceRevenue = revenueData.reduce((sum, booking) => sum + (booking.service_price || 0), 0)
    const totalTips = revenueData.reduce((sum, booking) => sum + (booking.tip_amount || 0), 0)

    // Process appointment data
    const appointmentData = appointmentsResult.data || []
    const totalAppointments = appointmentData.length
    const confirmedAppointments = appointmentData.filter(a => a.status === 'CONFIRMED').length
    const cancelledAppointments = appointmentData.filter(a => a.status === 'CANCELLED').length
    
    // Process services data
    const servicesData = servicesResult.data || []
    const serviceStats = servicesData.reduce((acc, booking) => {
      const serviceName = booking.services?.name || 'Unknown Service'
      acc[serviceName] = (acc[serviceName] || 0) + 1
      return acc
    }, {})

    // Return comprehensive analytics
    return NextResponse.json({
      period_days: parseInt(periodDays),
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        total_revenue: totalRevenue,
        service_revenue: totalServiceRevenue,
        tips_revenue: totalTips,
        total_appointments: totalAppointments,
        confirmed_appointments: confirmedAppointments,
        cancelled_appointments: cancelledAppointments,
        cancellation_rate: totalAppointments > 0 ? (cancelledAppointments / totalAppointments * 100).toFixed(1) : 0,
        average_appointment_value: totalAppointments > 0 ? (totalRevenue / totalAppointments).toFixed(2) : 0,
        // CRITICAL: Revenue per day for business tracking
        daily_average_revenue: (totalRevenue / parseInt(periodDays)).toFixed(2)
      },
      services: {
        popular_services: Object.entries(serviceStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, booking_count: count })),
        total_services_offered: Object.keys(serviceStats).length
      },
      trends: {
        // Simple trend calculation - could be enhanced with more sophisticated analysis
        revenue_trend: totalRevenue > 0 ? 'stable' : 'low',
        appointment_trend: totalAppointments > parseInt(periodDays) ? 'growing' : 'stable',
        // CRITICAL: Key metrics for barbershop owners
        key_metrics: {
          revenue_per_appointment: totalAppointments > 0 ? (totalRevenue / totalAppointments).toFixed(2) : 0,
          tip_percentage: totalServiceRevenue > 0 ? ((totalTips / totalServiceRevenue) * 100).toFixed(1) : 0,
          appointment_completion_rate: totalAppointments > 0 ? ((confirmedAppointments / totalAppointments) * 100).toFixed(1) : 0
        }
      },
      // CRITICAL: Real-time data timestamp for cache validation
      generated_at: new Date().toISOString(),
      data_source: 'real_time_database'
    })

  } catch (error) {
    console.error('Error in GET /api/shop/analytics/dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}