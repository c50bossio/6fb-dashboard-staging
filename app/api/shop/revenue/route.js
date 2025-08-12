import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // 'day', 'week', 'month', 'year'
    const barber_id = searchParams.get('barber_id')
    
    const today = new Date()
    const currentHour = today.getHours()
    
    // Generate realistic revenue data
    const generateRevenueData = (days = 30) => {
      const data = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        // Simulate higher revenue on weekends and evenings
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const baseRevenue = isWeekend ? 800 : 600
        const variation = (Math.random() - 0.5) * 200
        const dailyRevenue = Math.max(200, baseRevenue + variation)
        
        data.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.round(dailyRevenue * 100) / 100,
          appointments: Math.floor(dailyRevenue / 50), // Roughly $50 per appointment
          barber_commissions: Math.round(dailyRevenue * 0.65 * 100) / 100,
          shop_revenue: Math.round(dailyRevenue * 0.35 * 100) / 100
        })
      }
      return data
    }
    
    // Mock revenue breakdown by service
    const serviceBreakdown = [
      {
        service_name: 'Classic Haircut',
        appointments: 89,
        total_revenue: 3115.00,
        average_price: 35.00,
        percentage: 35.2
      },
      {
        service_name: 'Fade Cut',
        total_revenue: 2680.00,
        appointments: 67,
        average_price: 40.00,
        percentage: 30.3
      },
      {
        service_name: 'Full Service Package',
        total_revenue: 1725.00,
        appointments: 23,
        average_price: 75.00,
        percentage: 19.5
      },
      {
        service_name: 'Beard Trim',
        total_revenue: 1125.00,
        appointments: 45,
        average_price: 25.00,
        percentage: 12.7
      },
      {
        service_name: 'Hot Towel Shave',
        total_revenue: 225.00,
        appointments: 5,
        average_price: 45.00,
        percentage: 2.3
      }
    ]
    
    // Mock barber revenue breakdown
    const barberBreakdown = [
      {
        barber_id: 'barber-alex-123',
        barber_name: 'Alex Rodriguez',
        total_revenue: 3280.00,
        commission_earned: 2132.00,
        appointments_completed: 94,
        average_ticket: 34.89,
        commission_rate: 65.0
      },
      {
        barber_id: 'barber-jamie-123',
        barber_name: 'Jamie Chen',
        total_revenue: 2890.00,
        commission_earned: 1965.20,
        appointments_completed: 78,
        average_ticket: 37.05,
        commission_rate: 68.0
      },
      {
        barber_id: 'barber-mike-123',
        barber_name: 'Mike Thompson',
        total_revenue: 3700.00,
        commission_earned: 2590.00,
        appointments_completed: 67,
        average_ticket: 55.22,
        commission_rate: 70.0
      }
    ]
    
    let timeSeriesData
    let periodLabel
    
    switch (period) {
      case 'day':
        // Hourly data for today
        timeSeriesData = Array.from({ length: 24 }, (_, hour) => {
          const isBusinessHours = hour >= 9 && hour <= 19
          const isPeak = hour >= 14 && hour <= 18
          let revenue = 0
          
          if (isBusinessHours) {
            revenue = isPeak ? 120 + Math.random() * 80 : 60 + Math.random() * 40
          }
          
          return {
            time: `${hour}:00`,
            revenue: Math.round(revenue * 100) / 100,
            appointments: isBusinessHours ? Math.floor(revenue / 50) : 0
          }
        })
        periodLabel = 'Today'
        break
        
      case 'week':
        timeSeriesData = generateRevenueData(7)
        periodLabel = 'This Week'
        break
        
      case 'year':
        // Monthly data for the year
        timeSeriesData = Array.from({ length: 12 }, (_, month) => {
          const date = new Date(today.getFullYear(), month, 1)
          const monthlyRevenue = 15000 + (Math.random() - 0.5) * 5000
          
          return {
            date: date.toISOString().split('T')[0],
            revenue: Math.round(monthlyRevenue * 100) / 100,
            appointments: Math.floor(monthlyRevenue / 50)
          }
        })
        periodLabel = 'This Year'
        break
        
      default: // month
        timeSeriesData = generateRevenueData(30)
        periodLabel = 'This Month'
    }
    
    // Calculate totals
    const totalRevenue = timeSeriesData.reduce((sum, item) => sum + item.revenue, 0)
    const totalAppointments = timeSeriesData.reduce((sum, item) => sum + item.appointments, 0)
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0
    
    // Filter by barber if specified
    let filteredData = { serviceBreakdown, barberBreakdown }
    if (barber_id) {
      const barber = barberBreakdown.find(b => b.barber_id === barber_id)
      if (barber) {
        filteredData.barberBreakdown = [barber]
        // Adjust time series for single barber (roughly 1/3 of total)
        timeSeriesData = timeSeriesData.map(item => ({
          ...item,
          revenue: Math.round(item.revenue * 0.33 * 100) / 100,
          appointments: Math.floor(item.appointments * 0.33)
        }))
      }
    }
    
    const result = {
      period,
      period_label: periodLabel,
      time_series: timeSeriesData,
      summary: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_appointments: totalAppointments,
        average_ticket: Math.round(averageTicket * 100) / 100,
        commission_paid: Math.round(totalRevenue * 0.67 * 100) / 100,
        shop_revenue: Math.round(totalRevenue * 0.33 * 100) / 100,
        tips_collected: Math.round(totalRevenue * 0.15 * 100) / 100
      },
      breakdown: {
        services: serviceBreakdown,
        barbers: filteredData.barberBreakdown
      },
      trends: {
        revenue_change: 12.5, // % change from previous period
        appointments_change: 8.3,
        ticket_size_change: 3.7
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error in /api/shop/revenue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}