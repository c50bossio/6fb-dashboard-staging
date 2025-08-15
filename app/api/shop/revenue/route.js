import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // 'day', 'week', 'month', 'year'
    const barber_id = searchParams.get('barber_id')
    
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({
        error: 'No barbershop found',
        message: 'Please create or link a barbershop first',
        period,
        time_series: [],
        summary: {
          total_revenue: 0,
          total_appointments: 0,
          average_ticket: 0,
          commission_paid: 0,
          shop_revenue: 0,
          tips_collected: 0
        },
        breakdown: {
          services: [],
          barbers: []
        },
        trends: {
          revenue_change: 0,
          appointments_change: 0,
          ticket_size_change: 0
        }
      }, { status: 404 })
    }
    
    const today = new Date()
    let startDate, endDate
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0))
        endDate = new Date(today.setHours(23, 59, 59, 999))
        break
      case 'week':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 7)
        endDate = new Date()
        break
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1)
        endDate = new Date(today.getFullYear(), 11, 31)
        break
      default: // month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    }
    
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        status,
        created_at,
        service_id,
        barber_id,
        services(name, price)
      `)
      .eq('barbershop_id', shop.id)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
    
    if (barber_id) {
      query = query.eq('barber_id', barber_id)
    }
    
    const { data: transactions, error: txError } = await query
    
    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json({
        error: 'Failed to fetch revenue data',
        details: txError.message
      }, { status: 500 })
    }
    
    const timeSeriesData = []
    
    if (period === 'day') {
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(today)
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date(today)
        hourEnd.setHours(hour, 59, 59, 999)
        
        const hourTransactions = transactions?.filter(t => {
          const txDate = new Date(t.created_at)
          return txDate >= hourStart && txDate <= hourEnd
        }) || []
        
        const revenue = hourTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
        
        timeSeriesData.push({
          time: `${hour}:00`,
          revenue: revenue,
          appointments: hourTransactions.length
        })
      }
    } else {
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      
      for (let i = 0; i < days; i++) {
        const dayStart = new Date(startDate)
        dayStart.setDate(startDate.getDate() + i)
        dayStart.setHours(0, 0, 0, 0)
        
        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)
        
        const dayTransactions = transactions?.filter(t => {
          const txDate = new Date(t.created_at)
          return txDate >= dayStart && txDate <= dayEnd
        }) || []
        
        const revenue = dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
        
        timeSeriesData.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: revenue,
          appointments: dayTransactions.length,
          barber_commissions: revenue * 0.65, // Assuming 65% commission rate
          shop_revenue: revenue * 0.35
        })
      }
    }
    
    const serviceBreakdown = {}
    transactions?.forEach(t => {
      const serviceName = t.services?.name || 'Unknown Service'
      if (!serviceBreakdown[serviceName]) {
        serviceBreakdown[serviceName] = {
          service_name: serviceName,
          appointments: 0,
          total_revenue: 0,
          prices: []
        }
      }
      serviceBreakdown[serviceName].appointments++
      serviceBreakdown[serviceName].total_revenue += t.amount || 0
      serviceBreakdown[serviceName].prices.push(t.amount || 0)
    })
    
    const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    const serviceBreakdownArray = Object.values(serviceBreakdown).map(service => ({
      ...service,
      average_price: service.appointments > 0 ? service.total_revenue / service.appointments : 0,
      percentage: totalRevenue > 0 ? (service.total_revenue / totalRevenue) * 100 : 0,
      prices: undefined // Remove raw prices array from response
    }))
    
    const { data: barbers } = await supabase
      .from('barbershop_staff')
      .select('user_id, first_name, last_name, commission_rate')
      .eq('barbershop_id', shop.id)
    
    const barberBreakdown = []
    for (const barber of barbers || []) {
      const barberTransactions = transactions?.filter(t => t.barber_id === barber.user_id) || []
      const barberRevenue = barberTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      const commissionRate = barber.commission_rate || 65
      
      if (barberRevenue > 0) {
        barberBreakdown.push({
          barber_id: barber.user_id,
          barber_name: `${barber.first_name} ${barber.last_name}`,
          total_revenue: barberRevenue,
          commission_earned: barberRevenue * (commissionRate / 100),
          appointments_completed: barberTransactions.length,
          average_ticket: barberRevenue / Math.max(1, barberTransactions.length),
          commission_rate: commissionRate
        })
      }
    }
    
    const totalAppointments = transactions?.length || 0
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0
    const totalCommissions = barberBreakdown.reduce((sum, b) => sum + b.commission_earned, 0)
    const totalTips = transactions?.filter(t => t.type === 'tip').reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    
    const previousStartDate = new Date(startDate)
    const previousEndDate = new Date(endDate)
    
    if (period === 'day') {
      previousStartDate.setDate(previousStartDate.getDate() - 1)
      previousEndDate.setDate(previousEndDate.getDate() - 1)
    } else if (period === 'week') {
      previousStartDate.setDate(previousStartDate.getDate() - 7)
      previousEndDate.setDate(previousEndDate.getDate() - 7)
    } else if (period === 'month') {
      previousStartDate.setMonth(previousStartDate.getMonth() - 1)
      previousEndDate.setMonth(previousEndDate.getMonth() - 1)
    } else { // year
      previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
      previousEndDate.setFullYear(previousEndDate.getFullYear() - 1)
    }
    
    const { data: previousTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('barbershop_id', shop.id)
      .eq('status', 'completed')
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString())
    
    const previousRevenue = previousTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    const previousAppointments = previousTransactions?.length || 0
    const previousTicket = previousAppointments > 0 ? previousRevenue / previousAppointments : 0
    
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const appointmentsChange = previousAppointments > 0 ? ((totalAppointments - previousAppointments) / previousAppointments) * 100 : 0
    const ticketSizeChange = previousTicket > 0 ? ((averageTicket - previousTicket) / previousTicket) * 100 : 0
    
    const result = {
      period,
      period_label: period === 'day' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year',
      time_series: timeSeriesData,
      summary: {
        total_revenue: totalRevenue,
        total_appointments: totalAppointments,
        average_ticket: Math.round(averageTicket * 100) / 100,
        commission_paid: totalCommissions,
        shop_revenue: totalRevenue - totalCommissions,
        tips_collected: totalTips
      },
      breakdown: {
        services: serviceBreakdownArray.sort((a, b) => b.total_revenue - a.total_revenue),
        barbers: barberBreakdown.sort((a, b) => b.total_revenue - a.total_revenue)
      },
      trends: {
        revenue_change: Math.round(revenueChange * 10) / 10,
        appointments_change: Math.round(appointmentsChange * 10) / 10,
        ticket_size_change: Math.round(ticketSizeChange * 10) / 10
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error in /api/shop/revenue:', error)
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}