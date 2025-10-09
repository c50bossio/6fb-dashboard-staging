import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'month'

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the shop owned by this user
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Calculate date ranges based on timeRange parameter
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let startDate = new Date(today)

    switch (timeRange) {
      case 'week':
        startDate.setDate(today.getDate() - 7)
        break
      case 'month':
        startDate.setDate(today.getDate() - 30)
        break
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1)
        break
      default:
        startDate.setDate(today.getDate() - 30)
    }

    const startDateISO = startDate.toISOString()
    const todayISO = today.toISOString()

    // 1. OVERVIEW METRICS
    // Get all bookings for the period
    const { data: periodBookings } = await supabase
      .from('appointments')
      .select('id, start_time, service_price, status, created_at')
      .eq('barbershop_id', shop.id)
      .gte('start_time', startDateISO)
      .in('status', ['confirmed', 'completed'])

    // Get all transactions for revenue
    const { data: periodTransactions } = await supabase
      .from('transactions')
      .select('id, total_amount, created_at, type')
      .eq('barbershop_id', shop.id)
      .gte('created_at', startDateISO)
      .eq('status', 'completed')

    // Get total clients
    const { count: totalClients } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shop.id)

    // Get average rating from reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('barbershop_id', shop.id)

    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    const totalRevenue = periodTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
    const totalBookings = periodBookings?.length || 0

    // Calculate previous period for comparison
    const previousStartDate = new Date(startDate)
    switch (timeRange) {
      case 'week':
        previousStartDate.setDate(previousStartDate.getDate() - 7)
        break
      case 'month':
        previousStartDate.setDate(previousStartDate.getDate() - 30)
        break
      case 'quarter':
        previousStartDate.setMonth(previousStartDate.getMonth() - 3)
        break
      case 'year':
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
        break
    }

    const { data: previousBookings } = await supabase
      .from('appointments')
      .select('id')
      .eq('barbershop_id', shop.id)
      .gte('start_time', previousStartDate.toISOString())
      .lt('start_time', startDateISO)
      .in('status', ['confirmed', 'completed'])

    const { data: previousTransactions } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('barbershop_id', shop.id)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDateISO)
      .eq('status', 'completed')

    const previousRevenue = previousTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
    const previousBookingsCount = previousBookings?.length || 0

    const revenueChange = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue * 100)
      : 0

    const bookingsChange = previousBookingsCount > 0
      ? ((totalBookings - previousBookingsCount) / previousBookingsCount * 100)
      : 0

    const overview = {
      totalRevenue: Math.round(totalRevenue),
      revenueChange: Math.round(revenueChange * 10) / 10,
      totalBookings,
      bookingsChange: Math.round(bookingsChange * 10) / 10,
      totalClients: totalClients || 0,
      clientsChange: 15.2, // TODO: Calculate from actual data
      averageRating: Math.round(avgRating * 10) / 10,
      ratingChange: 0.2 // TODO: Calculate from previous period
    }

    // 2. REVENUE TREND DATA (daily breakdown)
    const revenueData = []
    const daysToShow = timeRange === 'week' ? 7 : timeRange === 'month' ? 10 : 10

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + 1)
      const nextDateStr = nextDate.toISOString().split('T')[0]

      const dayRevenue = periodTransactions?.filter(t => {
        const tDate = new Date(t.created_at).toISOString().split('T')[0]
        return tDate === dateStr
      }).reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0

      const dayBookings = periodBookings?.filter(b => {
        const bDate = new Date(b.start_time).toISOString().split('T')[0]
        return bDate === dateStr
      }).length || 0

      revenueData.push({
        date: dateStr,
        revenue: Math.round(dayRevenue),
        bookings: dayBookings
      })
    }

    // 3. BARBER PERFORMANCE
    const { data: barbers } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        commission_rate,
        users:user_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('barbershop_id', shop.id)
      .eq('role', 'BARBER')
      .eq('is_active', true)

    const barberPerformance = []

    for (const barber of barbers || []) {
      // Get barber's bookings
      const { data: barberBookings } = await supabase
        .from('appointments')
        .select('id, service_price, status')
        .eq('barbershop_id', shop.id)
        .eq('barber_id', barber.id)
        .gte('start_time', startDateISO)
        .in('status', ['confirmed', 'completed'])

      // Get barber's transactions
      const { data: barberTransactions } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('barbershop_id', shop.id)
        .eq('barber_id', barber.id)
        .gte('created_at', startDateISO)
        .eq('status', 'completed')

      const revenue = barberTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
      const bookings = barberBookings?.length || 0
      const commission = Math.round(revenue * ((barber.commission_rate || 60) / 100))

      // Get unique clients for this barber
      const { count: clients } = await supabase
        .from('appointments')
        .select('customer_id', { count: 'exact', head: true })
        .eq('barbershop_id', shop.id)
        .eq('barber_id', barber.id)

      barberPerformance.push({
        id: barber.id,
        name: barber.users?.full_name || 'Unnamed Barber',
        revenue: Math.round(revenue),
        bookings,
        rating: 4.8, // TODO: Get from reviews
        retention: 85, // TODO: Calculate retention rate
        commission,
        clients: clients || 0,
        avatar: barber.users?.avatar_url || null
      })
    }

    // Sort by revenue
    barberPerformance.sort((a, b) => b.revenue - a.revenue)

    // 4. SERVICE ANALYTICS
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('barbershop_id', shop.id)
      .eq('is_active', true)

    const serviceAnalytics = []
    const totalServiceBookings = periodBookings?.length || 1 // Avoid division by zero

    for (const service of services || []) {
      const { data: serviceBookings } = await supabase
        .from('appointments')
        .select('id, service_price')
        .eq('barbershop_id', shop.id)
        .eq('service_id', service.id)
        .gte('start_time', startDateISO)
        .in('status', ['confirmed', 'completed'])

      const bookings = serviceBookings?.length || 0
      const revenue = serviceBookings?.reduce((sum, b) => sum + (b.service_price || 0), 0) || 0
      const percentage = Math.round((bookings / totalServiceBookings) * 1000) / 10

      if (bookings > 0) {
        serviceAnalytics.push({
          name: service.name,
          bookings,
          revenue: Math.round(revenue),
          percentage
        })
      }
    }

    // Sort by bookings
    serviceAnalytics.sort((a, b) => b.bookings - a.bookings)

    // 5. TIME ANALYTICS (hourly breakdown)
    const timeAnalytics = []

    for (let hour = 9; hour <= 18; hour++) {
      const hourStr = `${hour}:00`

      const hourBookings = periodBookings?.filter(b => {
        const bookingHour = new Date(b.start_time).getHours()
        return bookingHour === hour
      })

      const bookings = hourBookings?.length || 0
      const revenue = hourBookings?.reduce((sum, b) => sum + (b.service_price || 0), 0) || 0

      timeAnalytics.push({
        hour: hourStr,
        bookings,
        revenue: Math.round(revenue)
      })
    }

    // 6. CUSTOMER METRICS
    // Get customers created in this period (new clients)
    const { count: newClients } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shop.id)
      .gte('created_at', startDateISO)

    // Get returning clients (customers with more than 1 booking)
    const { data: customerBookingCounts } = await supabase
      .from('appointments')
      .select('customer_id')
      .eq('barbershop_id', shop.id)
      .gte('start_time', startDateISO)
      .in('status', ['confirmed', 'completed'])

    const customerMap = {}
    customerBookingCounts?.forEach(b => {
      customerMap[b.customer_id] = (customerMap[b.customer_id] || 0) + 1
    })

    const returningClients = Object.values(customerMap).filter(count => count > 1).length

    // Get top clients by spending
    const { data: topCustomers } = await supabase
      .from('customers')
      .select(`
        id,
        full_name,
        total_spent,
        total_visits,
        last_visit_date
      `)
      .eq('barbershop_id', shop.id)
      .order('total_spent', { ascending: false })
      .limit(3)

    const topClients = topCustomers?.map(c => ({
      name: c.full_name || 'Customer',
      visits: c.total_visits || 0,
      spent: Math.round(c.total_spent || 0),
      lastVisit: c.last_visit_date || new Date().toISOString()
    })) || []

    const customerMetrics = {
      newClients: newClients || 0,
      returningClients,
      retentionRate: totalClients > 0
        ? Math.round((returningClients / totalClients) * 1000) / 10
        : 0,
      averageLifetimeValue: totalClients > 0
        ? Math.round(totalRevenue / totalClients)
        : 0,
      averageVisitFrequency: 6.2, // TODO: Calculate from actual visit frequency
      topClients
    }

    // Return all analytics data
    return NextResponse.json({
      overview,
      revenueData,
      barberPerformance,
      serviceAnalytics,
      timeAnalytics,
      customerMetrics
    })

  } catch (error) {
    console.error('Error in /api/shop/analytics:', error)

    return NextResponse.json(
      { error: 'Failed to load analytics data' },
      { status: 500 }
    )
  }
}
