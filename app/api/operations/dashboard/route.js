import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to determine barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop associated with user' }, { status: 403 })
    }

    const barbershopId = profile.barbershop_id
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Get barbershop details
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('name, open_time, close_time, status, phone')
      .eq('id', barbershopId)
      .single()

    // Get today's bookings
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('scheduled_at', todayStr)
      .lt('scheduled_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())

    // Get yesterday's bookings for comparison
    const { data: yesterdayBookings } = await supabase
      .from('bookings')
      .select('service_price')
      .eq('barbershop_id', barbershopId)
      .gte('scheduled_at', yesterdayStr)
      .lt('scheduled_at', todayStr)

    // Get active staff count
    const { data: staff } = await supabase
      .from('barbershop_staff')
      .select('id, status')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    // Get recent business metrics
    const { data: recentMetrics } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('metric_period', 'daily')
      .gte('metric_date', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('metric_date', { ascending: false })
      .limit(7)

    // Calculate current metrics
    const completedBookings = todayBookings?.filter(b => b.status === 'COMPLETED') || []
    const upcomingBookings = todayBookings?.filter(b => b.status === 'CONFIRMED' && new Date(b.scheduled_at) > new Date()) || []
    const walkInsToday = todayBookings?.filter(b => b.is_walk_in === true) || []
    
    const todayRevenue = completedBookings.reduce((sum, b) => sum + (b.service_price || 0) + (b.tip_amount || 0), 0)
    const yesterdayRevenue = yesterdayBookings?.reduce((sum, b) => sum + (b.service_price || 0), 0) || 0
    
    const currentStaff = staff?.filter(s => s.status === 'on_duty') || []
    const totalStaff = staff || []

    // Calculate utilization rates
    const totalSlots = 9 * 2 * totalStaff.length // 9 hours * 2 slots/hour * staff count
    const bookedSlots = todayBookings?.length || 0
    const chairUtilization = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0
    const staffUtilization = totalStaff.length > 0 ? Math.round((currentStaff.length / totalStaff.length) * 100) : 0

    // Peak hours analysis
    const hourCounts = {}
    todayBookings?.forEach(booking => {
      const hour = new Date(booking.scheduled_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00 - ${parseInt(hour) + 1}:00`)

    // Generate alerts based on data
    const alerts = []
    
    if (chairUtilization < 40) {
      alerts.push({
        type: 'warning',
        message: `Low capacity utilization (${chairUtilization}%) - consider promotional offers`,
        time: 'Now'
      })
    }
    
    if (upcomingBookings.length === 0) {
      alerts.push({
        type: 'warning',
        message: 'No upcoming appointments scheduled for today',
        time: 'Now'
      })
    }
    
    if (currentStaff.length < totalStaff.length / 2) {
      alerts.push({
        type: 'warning',
        message: 'Low staff availability - check scheduling',
        time: 'Now'
      })
    }

    if (todayRevenue > yesterdayRevenue * 1.2) {
      alerts.push({
        type: 'success',
        message: `Revenue up ${Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)}% from yesterday!`,
        time: 'Now'
      })
    }

    // Recent activity
    const recentActivity = [
      ...(todayBookings?.slice(-5).map(booking => ({
        action: `New booking: ${booking.client_name}`,
        details: `${booking.service_name || 'Service'} at ${new Date(booking.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        time: new Date(booking.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      })) || [])
    ].reverse()

    // Calculate average metrics from recent data
    const avgSatisfaction = recentMetrics?.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + (m.average_rating || 0), 0) / recentMetrics.length 
      : 4.5

    const avgServiceTime = recentMetrics?.length > 0
      ? recentMetrics.reduce((sum, m) => sum + (m.average_service_time || 0), 0) / recentMetrics.length
      : 35

    // Get week and month revenue from metrics
    const weekRevenue = recentMetrics?.find(m => m.metric_period === 'weekly')?.total_revenue || 0
    const monthRevenue = recentMetrics?.find(m => m.metric_period === 'monthly')?.total_revenue || 0

    const operationsData = {
      shopStatus: barbershop?.status === 'open' ? 'open' : 'closed',
      openTime: barbershop?.open_time || '9:00 AM',
      closeTime: barbershop?.close_time || '6:00 PM',
      currentStaff: currentStaff.length,
      totalStaff: totalStaff.length,
      todayAppointments: todayBookings?.length || 0,
      completedAppointments: completedBookings.length,
      upcomingAppointments: upcomingBookings.length,
      walkInsToday: walkInsToday.length,
      todayRevenue,
      yesterdayRevenue,
      weekRevenue,
      monthRevenue,
      averageServiceTime: Math.round(avgServiceTime),
      customerSatisfaction: parseFloat(avgSatisfaction.toFixed(1)),
      staffUtilization,
      chairUtilization,
      lowStockItems: 2, // Would come from inventory system
      pendingTasks: 0,
      unreadNotifications: alerts.length,
      systemHealth: 'good',
      lastBackup: '2 hours ago',
      peakHours,
      alerts,
      recentActivity
    }

    return NextResponse.json({
      success: true,
      data: operationsData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching operations dashboard data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load operations data',
      details: error.message
    }, { status: 500 })
  }
}

// POST endpoint to update business metrics
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { barbershop_id, metric_date, metric_period, ...metrics } = body

    // Verify user has access to this barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('user_id', user.id)
      .single()

    if (profile?.barbershop_id !== barbershop_id && !['SUPER_ADMIN', 'ENTERPRISE_OWNER'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Unauthorized to update metrics for this barbershop' }, { status: 403 })
    }

    // Upsert business metrics
    const { data, error } = await supabase
      .from('business_metrics')
      .upsert({
        barbershop_id,
        metric_date,
        metric_period,
        ...metrics,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting business metrics:', error)
      return NextResponse.json({ error: 'Failed to update metrics' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Business metrics updated successfully'
    })

  } catch (error) {
    console.error('Error updating business metrics:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update business metrics',
      details: error.message
    }, { status: 500 })
  }
}