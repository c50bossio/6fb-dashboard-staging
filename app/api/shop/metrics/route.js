import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }
    
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }
    
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (!shop) {
      return NextResponse.json({
        totalRevenue: 0,
        monthlyRevenue: 0,
        todayRevenue: 0,
        weeklyRevenue: 0,
        revenueChange: 0,
        
        totalBookings: 0,
        todayBookings: 0,
        weeklyBookings: 0,
        monthlyBookings: 0,
        bookingsChange: 0,
        
        activeBarbers: 0,
        totalStaff: 0,
        barbersWorking: 0,
        
        totalClients: 0,
        newClientsThisMonth: 0,
        returningClients: 0,
        clientRetentionRate: 0,
        
        avgRating: 0,
        totalReviews: 0,
        newReviewsThisWeek: 0,
        ratingTrend: 0,
        
        appointmentsCompleted: 0,
        appointmentsUpcoming: 0,
        appointmentsCancelled: 0,
        
        serviceRevenue: 0,
        productRevenue: 0,
        tipRevenue: 0,
        
        totalCommissions: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
        
        averageServiceTime: 0,
        chairUtilization: 0,
        averageTicketValue: 0,
        
        trends: {
          revenue: { value: 0, direction: 'neutral' },
          bookings: { value: 0, direction: 'neutral' },
          newClients: { value: 0, direction: 'neutral' },
          rating: { value: 0, direction: 'neutral' }
        },
        
        alerts: [{
          type: 'info',
          message: 'No barbershop found. Please ensure you have a barbershop associated with your account.'
        }],
        
        currentTime: new Date().toISOString(),
        isOpen: false,
        nextAppointment: null,
        lastUpdate: new Date().toISOString(),
        
        dataAvailable: false,
        message: 'No barbershop data available. Metrics will populate once barbershop is configured.'
      })
    }
    
    const { count: activeBarbers } = await supabase
      .from('barbershop_staff')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shop.id)
      .eq('role', 'BARBER')
      .eq('is_active', true)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString()
    
    const { count: todayBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shop.id)
      .gte('start_time', todayISO)
      .lt('start_time', tomorrowISO)
      .in('status', ['confirmed', 'completed'])
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const firstDayOfMonthISO = firstDayOfMonth.toISOString()
    
    const { count: monthlyBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shop.id)
      .gte('start_time', firstDayOfMonthISO)
      .in('status', ['confirmed', 'completed'])
    
    const { data: revenueData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('barbershop_id', shop.id)
      .gte('created_at', firstDayOfMonthISO)
      .eq('status', 'completed')
    
    const monthlyRevenue = revenueData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    
    const { data: totalRevenueData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('barbershop_id', shop.id)
      .eq('status', 'completed')
    
    const totalRevenue = totalRevenueData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    
    const { count: totalClients } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shop.id)
    
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('barbershop_id', shop.id)
    
    const avgRating = reviews?.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0
    
    const revenueChange = await calculateRevenueChange(supabase, shop.id, monthlyRevenue)
    const bookingsChange = await calculateBookingsChange(supabase, shop.id, monthlyBookings)
    
    return NextResponse.json({
      totalRevenue: totalRevenue || 0,
      monthlyRevenue: monthlyRevenue || 0,
      totalBookings: monthlyBookings || 0,
      todayBookings: todayBookings || 0,
      activeBarbers: activeBarbers || 0,
      totalClients: totalClients || 0,
      avgRating: avgRating || 0,
      revenueChange,
      bookingsChange
    })
    
  } catch (error) {
    console.error('Error in /api/shop/metrics:', error)
    
    return NextResponse.json({
      totalRevenue: 0,
      monthlyRevenue: 0,
      totalBookings: 0,
      todayBookings: 0,
      activeBarbers: 0,
      totalClients: 0,
      avgRating: 0,
      revenueChange: 0,
      bookingsChange: 0
    })
  }
}

async function calculateRevenueChange(supabase, shopId, currentMonthRevenue) {
  try {
    const today = new Date()
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    
    const { data: previousRevenueData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('barbershop_id', shopId)
      .gte('created_at', previousMonth.toISOString())
      .lte('created_at', previousMonthEnd.toISOString())
      .eq('status', 'completed')
    
    const previousRevenue = previousRevenueData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    
    if (previousRevenue === 0) return 0
    
    const change = ((currentMonthRevenue - previousRevenue) / previousRevenue) * 100
    return Math.round(change * 10) / 10 // Round to 1 decimal place
    
  } catch (error) {
    console.error('Error calculating revenue change:', error)
    return 0
  }
}

async function calculateBookingsChange(supabase, shopId, currentMonthBookings) {
  try {
    const today = new Date()
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    
    const { count: previousBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shopId)
      .gte('start_time', previousMonth.toISOString())
      .lte('start_time', previousMonthEnd.toISOString())
      .in('status', ['confirmed', 'completed'])
    
    if (!previousBookings || previousBookings === 0) return 0
    
    const change = ((currentMonthBookings - previousBookings) / previousBookings) * 100
    return Math.round(change * 10) / 10 // Round to 1 decimal place
    
  } catch (error) {
    console.error('Error calculating bookings change:', error)
    return 0
  }
}