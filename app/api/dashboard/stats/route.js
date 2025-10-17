import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenant } from '@/lib/tenant-resolver'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Calculate date ranges
    const today = new Date(date)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    
    const lastWeekStart = new Date(startOfWeek)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(startOfWeek)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

    // Get today's stats in parallel
    const [
      todayAppointments,
      todayPayments,
      totalCustomers,
      weeklyPayments,
      lastWeekPayments,
      yesterdayPayments,
      newCustomersToday
    ] = await Promise.all([
      // Today's appointments
      supabase
        .from('appointments')
        .select('id, status, price')
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', date)
        .lt('scheduled_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

      // Today's payments
      supabase
        .from('payments')
        .select('total_amount')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', date)
        .lt('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .eq('status', 'completed'),

      // Total customers
      supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true),

      // Weekly payments
      supabase
        .from('payments')
        .select('total_amount')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', startOfWeek.toISOString().split('T')[0])
        .eq('status', 'completed'),

      // Last week's payments
      supabase
        .from('payments')
        .select('total_amount')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', lastWeekStart.toISOString().split('T')[0])
        .lt('created_at', lastWeekEnd.toISOString().split('T')[0])
        .eq('status', 'completed'),

      // Yesterday's payments
      supabase
        .from('payments')
        .select('total_amount')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', yesterday.toISOString().split('T')[0])
        .lt('created_at', date)
        .eq('status', 'completed'),

      // New customers today
      supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .eq('barbershop_id', barbershopId)
        .gte('created_at', date)
        .lt('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .eq('is_active', true)
    ])

    // Process appointments data
    const appointmentStats = {
      total: todayAppointments.data?.length || 0,
      completed: todayAppointments.data?.filter(apt => apt.status === 'completed').length || 0,
      cancelled: todayAppointments.data?.filter(apt => apt.status === 'cancelled').length || 0,
      noShow: todayAppointments.data?.filter(apt => apt.status === 'no_show').length || 0
    }

    // Calculate revenue stats
    const todayRevenue = todayPayments.data?.reduce((sum, payment) => sum + (payment.total_amount || 0), 0) || 0
    const yesterdayRevenue = yesterdayPayments.data?.reduce((sum, payment) => sum + (payment.total_amount || 0), 0) || 0
    const weeklyRevenue = weeklyPayments.data?.reduce((sum, payment) => sum + (payment.total_amount || 0), 0) || 0
    const lastWeekRevenue = lastWeekPayments.data?.reduce((sum, payment) => sum + (payment.total_amount || 0), 0) || 0

    // Calculate growth percentages
    const revenueGrowth = yesterdayRevenue > 0 
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : todayRevenue > 0 ? 100 : 0

    const weeklyGrowth = lastWeekRevenue > 0
      ? Math.round(((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
      : weeklyRevenue > 0 ? 100 : 0

    // Calculate completion rate
    const completionRate = appointmentStats.total > 0
      ? Math.round((appointmentStats.completed / appointmentStats.total) * 100)
      : 0

    // Calculate average transaction value
    const totalTransactions = todayPayments.data?.length || 0
    const avgTransactionValue = totalTransactions > 0 ? todayRevenue / totalTransactions : 0

    const stats = {
      // Today's stats
      todayRevenue,
      todayAppointments: appointmentStats.total,
      completedAppointments: appointmentStats.completed,
      todayTransactions: totalTransactions,
      avgTransactionValue,
      
      // Growth metrics
      revenueGrowth,
      weeklyGrowth,
      
      // Customer stats
      totalCustomers: totalCustomers.count || 0,
      newCustomersToday: newCustomersToday.count || 0,
      
      // Performance metrics
      weeklyRevenue,
      completionRate,
      totalCompletedAppointments: appointmentStats.completed,
      
      // Additional stats for UI
      cancelledAppointments: appointmentStats.cancelled,
      noShowAppointments: appointmentStats.noShow,
      customerSatisfaction: 95, // Placeholder - would come from reviews table
      totalReviews: 0 // Placeholder - would come from reviews table
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    )
  }
}