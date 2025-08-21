import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET - Get barber performance metrics
export async function GET(request, { params }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const barberId = params.barberId
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly' // daily, weekly, monthly, quarterly
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify access
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Build query for performance data
    let query = supabase
      .from('barber_performance')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barbershop_id', shop.id)
      .eq('period_type', period)
      .order('period_start', { ascending: false })
    
    if (startDate) query = query.gte('period_start', startDate)
    if (endDate) query = query.lte('period_end', endDate)
    
    const { data: performance, error } = await query.limit(12) // Last 12 periods
    
    if (error) {
      console.error('Performance query error:', error)
      return NextResponse.json({ error: 'Failed to fetch performance' }, { status: 500 })
    }
    
    // If no performance data exists, generate from appointments
    if (!performance || performance.length === 0) {
      const generatedMetrics = await generatePerformanceMetrics(supabase, barberId, shop.id, period)
      return NextResponse.json({ 
        performance: generatedMetrics,
        generated: true,
        message: 'Generated metrics from appointment data'
      })
    }
    
    // Calculate trends and insights
    const trends = calculateTrends(performance)
    const insights = generateInsights(performance, trends)
    
    // Get current goals
    const { data: goals } = await supabase
      .from('barber_goals')
      .select('*')
      .eq('barber_id', barberId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    // Get ranking within shop
    const { data: shopRankings } = await supabase
      .from('barber_performance')
      .select('barber_id, total_revenue')
      .eq('barbershop_id', shop.id)
      .eq('period_type', period)
      .order('total_revenue', { ascending: false })
    
    const rank = shopRankings?.findIndex(r => r.barber_id === barberId) + 1 || null
    
    return NextResponse.json({ 
      performance,
      trends,
      insights,
      goals: goals || [],
      shop_rank: rank,
      shop_total_barbers: shopRankings?.length || 1
    })
    
  } catch (error) {
    console.error('Error fetching performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate performance metrics from raw data
async function generatePerformanceMetrics(supabase, barberId, shopId, period) {
  const now = new Date()
  const periods = []
  
  // Generate last 6 periods based on type
  for (let i = 0; i < 6; i++) {
    let startDate, endDate
    
    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    } else if (period === 'weekly') {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i))
      startDate = weekStart
      endDate = new Date(weekStart)
      endDate.setDate(weekStart.getDate() + 6)
    } else { // daily
      startDate = new Date(now)
      startDate.setDate(now.getDate() - i)
      endDate = new Date(startDate)
    }
    
    // Get appointments for this period
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barbershop_id', shopId)
      .gte('appointment_date', startDate.toISOString())
      .lte('appointment_date', endDate.toISOString())
    
    // Calculate metrics
    const completed = appointments?.filter(a => a.status === 'completed') || []
    const cancelled = appointments?.filter(a => a.status === 'cancelled') || []
    const noShow = appointments?.filter(a => a.status === 'no_show') || []
    
    const serviceRevenue = completed.reduce((sum, apt) => sum + (apt.price || 0), 0)
    const tipRevenue = completed.reduce((sum, apt) => sum + (apt.tip_amount || 0), 0)
    
    // Get unique clients
    const uniqueClients = new Set(completed.map(a => a.client_id)).size
    
    // Calculate average rating
    const ratingsSum = completed.reduce((sum, apt) => sum + (apt.rating || 0), 0)
    const avgRating = completed.length > 0 ? ratingsSum / completed.length : 0
    
    periods.push({
      period_type: period,
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      total_appointments: appointments?.length || 0,
      completed_appointments: completed.length,
      cancelled_appointments: cancelled.length,
      no_show_appointments: noShow.length,
      service_revenue: serviceRevenue,
      tip_revenue: tipRevenue,
      total_revenue: serviceRevenue + tipRevenue,
      total_unique_clients: uniqueClients,
      average_rating: Number(avgRating.toFixed(2))
    })
  }
  
  return periods.reverse() // Show oldest first
}

// Helper function to calculate trends
function calculateTrends(performance) {
  if (performance.length < 2) return {}
  
  const latest = performance[0]
  const previous = performance[1]
  
  return {
    revenue: {
      current: latest.total_revenue,
      previous: previous.total_revenue,
      change: latest.total_revenue - previous.total_revenue,
      percentage: previous.total_revenue > 0 
        ? ((latest.total_revenue - previous.total_revenue) / previous.total_revenue * 100).toFixed(1)
        : 0
    },
    appointments: {
      current: latest.total_appointments,
      previous: previous.total_appointments,
      change: latest.total_appointments - previous.total_appointments,
      percentage: previous.total_appointments > 0 
        ? ((latest.total_appointments - previous.total_appointments) / previous.total_appointments * 100).toFixed(1)
        : 0
    },
    rating: {
      current: latest.average_rating,
      previous: previous.average_rating,
      change: latest.average_rating - previous.average_rating,
      percentage: previous.average_rating > 0 
        ? ((latest.average_rating - previous.average_rating) / previous.average_rating * 100).toFixed(1)
        : 0
    }
  }
}

// Helper function to generate insights
function generateInsights(performance, trends) {
  const insights = []
  
  // Revenue insights
  if (trends.revenue?.percentage > 10) {
    insights.push({
      type: 'positive',
      category: 'revenue',
      message: `Revenue increased by ${trends.revenue.percentage}% this period`,
      action: 'Keep up the great work!'
    })
  } else if (trends.revenue?.percentage < -10) {
    insights.push({
      type: 'warning',
      category: 'revenue',
      message: `Revenue decreased by ${Math.abs(trends.revenue.percentage)}% this period`,
      action: 'Consider reviewing pricing or marketing strategies'
    })
  }
  
  // Appointment trends
  if (trends.appointments?.percentage > 15) {
    insights.push({
      type: 'positive',
      category: 'bookings',
      message: `Appointments increased by ${trends.appointments.percentage}%`,
      action: 'Consider extending hours to accommodate demand'
    })
  }
  
  // Rating insights
  const avgRating = performance.reduce((sum, p) => sum + p.average_rating, 0) / performance.length
  if (avgRating >= 4.5) {
    insights.push({
      type: 'positive',
      category: 'quality',
      message: `Excellent average rating of ${avgRating.toFixed(1)}`,
      action: 'Use this in marketing and social media'
    })
  } else if (avgRating < 4.0) {
    insights.push({
      type: 'warning',
      category: 'quality',
      message: `Average rating is ${avgRating.toFixed(1)} - room for improvement`,
      action: 'Focus on client satisfaction and service quality'
    })
  }
  
  return insights
}