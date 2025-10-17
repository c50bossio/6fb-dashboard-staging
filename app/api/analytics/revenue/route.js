import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const period = searchParams.get('period') || 'today'
    const live = searchParams.get('live') === 'true'

    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate date ranges based on period
    const now = new Date()
    let currentStart, currentEnd, previousStart, previousEnd

    switch (period) {
      case 'today':
        currentStart = startOfDay(now)
        currentEnd = endOfDay(now)
        previousStart = startOfDay(subDays(now, 1))
        previousEnd = endOfDay(subDays(now, 1))
        break
        
      case 'yesterday':
        const yesterday = subDays(now, 1)
        currentStart = startOfDay(yesterday)
        currentEnd = endOfDay(yesterday)
        previousStart = startOfDay(subDays(yesterday, 1))
        previousEnd = endOfDay(subDays(yesterday, 1))
        break
        
      case 'week':
        currentStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
        currentEnd = endOfWeek(now, { weekStartsOn: 1 })
        previousStart = startOfWeek(subDays(currentStart, 1), { weekStartsOn: 1 })
        previousEnd = endOfWeek(subDays(currentStart, 1), { weekStartsOn: 1 })
        break
        
      case 'month':
        currentStart = startOfMonth(now)
        currentEnd = endOfMonth(now)
        previousStart = startOfMonth(subDays(currentStart, 1))
        previousEnd = endOfMonth(subDays(currentStart, 1))
        break
        
      default:
        currentStart = startOfDay(now)
        currentEnd = endOfDay(now)
        previousStart = startOfDay(subDays(now, 1))
        previousEnd = endOfDay(subDays(now, 1))
    }

    // Format dates for SQL queries
    const currentStartStr = format(currentStart, 'yyyy-MM-dd HH:mm:ss')
    const currentEndStr = format(currentEnd, 'yyyy-MM-dd HH:mm:ss')
    const previousStartStr = format(previousStart, 'yyyy-MM-dd HH:mm:ss')
    const previousEndStr = format(previousEnd, 'yyyy-MM-dd HH:mm:ss')

    // Get current period revenue data
    const { data: currentRevenue, error: currentError } = await supabase
      .from('appointments')
      .select(`
        amount_paid_cents,
        payment_status,
        payment_method,
        status,
        service_price,
        completed_at,
        start_time,
        date
      `)
      .eq('barbershop_id', barbershopId)
      .eq('status', 'completed')
      .gte('completed_at', currentStartStr)
      .lte('completed_at', currentEndStr)

    if (currentError) {
      console.error('Error fetching current revenue:', currentError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch revenue data'
      }, { status: 500 })
    }

    // Get previous period revenue data for comparison
    const { data: previousRevenue, error: previousError } = await supabase
      .from('appointments')
      .select(`
        amount_paid_cents,
        service_price,
        status
      `)
      .eq('barbershop_id', barbershopId)
      .eq('status', 'completed')
      .gte('completed_at', previousStartStr)
      .lte('completed_at', previousEndStr)

    if (previousError) {
      console.error('Error fetching previous revenue:', previousError)
    }

    // Get projected revenue from confirmed but not completed appointments
    const { data: projectedAppointments, error: projectedError } = await supabase
      .from('appointments')
      .select('service_price, amount_paid_cents')
      .eq('barbershop_id', barbershopId)
      .in('status', ['confirmed', 'checked_in'])
      .gte('date', format(currentStart, 'yyyy-MM-dd'))
      .lte('date', format(currentEnd, 'yyyy-MM-dd'))

    if (projectedError) {
      console.error('Error fetching projected appointments:', projectedError)
    }

    // Calculate current revenue metrics
    const currentRevenueTotal = (currentRevenue || []).reduce((sum, apt) => {
      const paidAmount = apt.amount_paid_cents ? apt.amount_paid_cents / 100 : 0
      const servicePrice = apt.service_price || 0
      return sum + Math.max(paidAmount, servicePrice)
    }, 0)

    const previousRevenueTotal = (previousRevenue || []).reduce((sum, apt) => {
      const paidAmount = apt.amount_paid_cents ? apt.amount_paid_cents / 100 : 0
      const servicePrice = apt.service_price || 0
      return sum + Math.max(paidAmount, servicePrice)
    }, 0)

    const projectedRevenueTotal = currentRevenueTotal + (projectedAppointments || []).reduce((sum, apt) => {
      const servicePrice = apt.service_price || 0
      return sum + servicePrice
    }, 0)

    // Calculate payment method breakdown
    const paymentMethods = {}
    ;(currentRevenue || []).forEach(apt => {
      const method = apt.payment_method || 'cash'
      const amount = apt.amount_paid_cents ? apt.amount_paid_cents / 100 : apt.service_price || 0
      paymentMethods[method] = (paymentMethods[method] || 0) + amount
    })

    // Calculate hourly breakdown for today/yesterday periods
    let hourlyBreakdown = []
    if (period === 'today' || period === 'yesterday') {
      const hourlyData = {}
      
      ;(currentRevenue || []).forEach(apt => {
        if (apt.completed_at) {
          const hour = new Date(apt.completed_at).getHours()
          const amount = apt.amount_paid_cents ? apt.amount_paid_cents / 100 : apt.service_price || 0
          hourlyData[hour] = (hourlyData[hour] || 0) + amount
        }
      })

      // Fill in all hours (9 AM to 7 PM typical business hours)
      for (let hour = 9; hour <= 19; hour++) {
        hourlyBreakdown.push({
          hour: hour.toString().padStart(2, '0') + ':00',
          revenue: hourlyData[hour] || 0
        })
      }
    }

    // Get appointment counts for completion rate
    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId)
      .gte('date', format(currentStart, 'yyyy-MM-dd'))
      .lte('date', format(currentEnd, 'yyyy-MM-dd'))
      .neq('status', 'cancelled')

    const completedAppointments = (currentRevenue || []).length

    // Calculate average service price
    const averageServicePrice = completedAppointments > 0 
      ? currentRevenueTotal / completedAppointments 
      : 0

    // Prepare response data
    const responseData = {
      current_revenue: Math.round(currentRevenueTotal * 100) / 100,
      previous_revenue: Math.round(previousRevenueTotal * 100) / 100,
      projected_revenue: Math.round(projectedRevenueTotal * 100) / 100,
      completed_appointments: completedAppointments,
      total_appointments: totalAppointments || 0,
      average_service_price: Math.round(averageServicePrice * 100) / 100,
      payment_methods: Object.fromEntries(
        Object.entries(paymentMethods).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      hourly_breakdown: hourlyBreakdown,
      period,
      period_start: format(currentStart, 'yyyy-MM-dd HH:mm:ss'),
      period_end: format(currentEnd, 'yyyy-MM-dd HH:mm:ss'),
      last_updated: new Date().toISOString()
    }

    // Cache revenue data for performance (if live tracking is enabled)
    if (live && period === 'today') {
      try {
        await supabase
          .from('daily_metrics')
          .upsert({
            barbershop_id: barbershopId,
            date: format(now, 'yyyy-MM-dd'),
            total_revenue: responseData.current_revenue,
            completed_appointments: responseData.completed_appointments,
            projected_revenue: responseData.projected_revenue,
            average_service_price: responseData.average_service_price,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'barbershop_id,date'
          })
      } catch (error) {
        console.warn('Failed to cache daily metrics:', error)
        // Don't fail the request if caching fails
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Revenue analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}