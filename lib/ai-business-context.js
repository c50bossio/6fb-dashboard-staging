import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * AI Business Context Service
 * Aggregates real business data from Supabase for AI chat responses
 */
export class AIBusinessContextService {
  
  /**
   * Get comprehensive business context for AI responses
   * @param {string} barbershopId - The barbershop ID to get context for
   * @returns {object} Structured business context
   */
  async getBusinessContext(barbershopId = 'default') {
    try {
      const [
        bookingsData,
        analyticsData,
        customersData,
        revenueData,
        staffData
      ] = await Promise.all([
        this.getBookingsContext(barbershopId),
        this.getAnalyticsContext(barbershopId),
        this.getCustomersContext(barbershopId),
        this.getRevenueContext(barbershopId),
        this.getStaffContext(barbershopId)
      ])

      return {
        barbershop_id: barbershopId,
        timestamp: new Date().toISOString(),
        bookings: bookingsData,
        analytics: analyticsData,
        customers: customersData,
        revenue: revenueData,
        staff: staffData,
        summary: this.generateBusinessSummary(bookingsData, analyticsData, revenueData)
      }
    } catch (error) {
      console.error('Error getting business context:', error)
      return this.getFallbackContext(barbershopId)
    }
  }

  /**
   * Get current and upcoming bookings data
   */
  async getBookingsContext(barbershopId) {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      const supabase = getSupabaseClient()
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', today)
        .lt('start_time', today + 'T23:59:59')
        .eq('shop_id', barbershopId)
        .order('start_time')

      const { data: weekBookings } = await supabase
        .from('bookings')
        .select('*, service_name')
        .gte('start_time', today)
        .lte('start_time', nextWeek)
        .eq('shop_id', barbershopId)
        .order('start_time')

      const { data: bookingStats } = await supabase
        .from('bookings')
        .select('status')
        .eq('shop_id', barbershopId)
        .gte('start_time', today + 'T00:00:00')

      const statusCounts = bookingStats?.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1
        return acc
      }, {}) || {}

      return {
        today_bookings: todayBookings || [],
        week_bookings: weekBookings || [],
        total_today: todayBookings?.length || 0,
        total_week: weekBookings?.length || 0,
        status_breakdown: statusCounts,
        next_appointment: todayBookings?.[0] || null
      }
    } catch (error) {
      console.error('Error getting bookings context:', error)
      return { today_bookings: [], week_bookings: [], total_today: 0, total_week: 0 }
    }
  }

  /**
   * Get analytics and business metrics
   */
  async getAnalyticsContext(barbershopId) {
    const today = new Date().toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      const supabase = getSupabaseClient()
      const { data: metrics } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('date', lastMonth)
        .order('date', { ascending: false })
        .limit(30)

      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, properties, created_at')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', lastWeek)
        .limit(100)

      const latestMetrics = metrics?.[0] || {}
      const eventTypes = events?.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1
        return acc
      }, {}) || {}

      return {
        latest_metrics: latestMetrics,
        trends: {
          total_revenue: latestMetrics.total_revenue || 0,
          total_customers: latestMetrics.total_customers || 0,
          total_appointments: latestMetrics.total_appointments || 0,
          avg_satisfaction_score: latestMetrics.avg_satisfaction_score || 0
        },
        activity_summary: eventTypes,
        metrics_history: metrics || []
      }
    } catch (error) {
      console.error('Error getting analytics context:', error)
      return { latest_metrics: {}, trends: {}, activity_summary: {} }
    }
  }

  /**
   * Get customer insights and patterns
   */
  async getCustomersContext(barbershopId) {
    try {
      const supabase = getSupabaseClient()
      const { data: customerData } = await supabase
        .from('bookings')
        .select('customer_name, customer_email, customer_phone, service_name, price, start_time')
        .eq('shop_id', barbershopId)
        .not('customer_email', 'is', null)
        .order('start_time', { ascending: false })
        .limit(50)

      if (!customerData?.length) {
        return { total_customers: 0, recent_customers: [], top_services: [] }
      }

      const uniqueCustomers = new Set(customerData.map(c => c.customer_email)).size
      const serviceTypes = customerData.reduce((acc, booking) => {
        acc[booking.service_name] = (acc[booking.service_name] || 0) + 1
        return acc
      }, {})

      const topServices = Object.entries(serviceTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([service, count]) => ({ service, count }))

      return {
        total_customers: uniqueCustomers,
        recent_customers: customerData.slice(0, 10),
        top_services: topServices,
        service_breakdown: serviceTypes
      }
    } catch (error) {
      console.error('Error getting customers context:', error)
      return { total_customers: 0, recent_customers: [], top_services: [] }
    }
  }

  /**
   * Get revenue and financial insights
   */
  async getRevenueContext(barbershopId) {
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    
    try {
      const supabase = getSupabaseClient()
      const { data: todayRevenue } = await supabase
        .from('bookings')
        .select('price')
        .eq('shop_id', barbershopId)
        .gte('start_time', today)
        .eq('status', 'completed')

      const { data: monthlyRevenue } = await supabase
        .from('business_metrics')
        .select('date, total_revenue, service_revenue, product_revenue')
        .eq('barbershop_id', barbershopId)
        .like('date', `${thisMonth}%`)
        .order('date')

      const todayTotal = todayRevenue?.reduce((sum, booking) => 
        sum + (parseFloat(booking.price) || 0), 0) || 0

      const monthlyTotal = monthlyRevenue?.reduce((sum, day) => 
        sum + (parseFloat(day.total_revenue) || 0), 0) || 0

      return {
        today_revenue: todayTotal,
        monthly_revenue: monthlyTotal,
        revenue_history: monthlyRevenue || [],
        avg_daily_revenue: monthlyRevenue?.length ? (monthlyTotal / monthlyRevenue.length) : 0
      }
    } catch (error) {
      console.error('Error getting revenue context:', error)
      return { today_revenue: 0, monthly_revenue: 0, revenue_history: [] }
    }
  }

  /**
   * Get staff and barber information
   */
  async getStaffContext(barbershopId) {
    try {
      const supabase = getSupabaseClient()
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, shop_id')
        .eq('shop_id', barbershopId)
        .in('role', ['barber', 'shop_owner'])

      return {
        total_staff: staff?.length || 0,
        staff_list: staff || [],
        barbers: staff?.filter(s => s.role === 'barber') || [],
        owners: staff?.filter(s => s.role === 'shop_owner') || []
      }
    } catch (error) {
      console.error('Error getting staff context:', error)
      return { total_staff: 0, staff_list: [], barbers: [], owners: [] }
    }
  }

  /**
   * Generate a business summary for AI context
   */
  generateBusinessSummary(bookings, analytics, revenue) {
    return {
      business_status: bookings.total_today > 0 ? 'active' : 'slow',
      key_metrics: {
        appointments_today: bookings.total_today,
        revenue_today: revenue.today_revenue,
        customers_served: analytics.trends.total_customers,
        satisfaction_score: analytics.trends.avg_satisfaction_score
      },
      recommendations: this.generateQuickRecommendations(bookings, analytics, revenue)
    }
  }

  /**
   * Generate quick AI recommendations based on current data
   */
  generateQuickRecommendations(bookings, analytics, revenue) {
    const recommendations = []

    if (bookings.total_today < 5) {
      recommendations.push("Consider promoting last-minute booking slots to increase today's appointments")
    }
    
    if (revenue.today_revenue < 200) {
      recommendations.push("Focus on higher-value services to boost today's revenue")
    }
    
    if (bookings.week_bookings.length < 20) {
      recommendations.push("Implement a marketing campaign to increase weekly bookings")
    }

    return recommendations
  }

  /**
   * Fallback context when database queries fail
   */
  getFallbackContext(barbershopId) {
    return {
      barbershop_id: barbershopId,
      timestamp: new Date().toISOString(),
      error: 'Unable to fetch live business data',
      bookings: { today_bookings: [], week_bookings: [], total_today: 0, total_week: 0 },
      analytics: { latest_metrics: {}, trends: {}, activity_summary: {} },
      customers: { total_customers: 0, recent_customers: [], top_services: [] },
      revenue: { today_revenue: 0, monthly_revenue: 0, revenue_history: [] },
      staff: { total_staff: 0, staff_list: [], barbers: [], owners: [] },
      summary: {
        business_status: 'unknown',
        key_metrics: {},
        recommendations: ['Please check your database connection and try again']
      }
    }
  }

  /**
   * Generate weekly appointment breakdown by day
   */
  getWeeklyBreakdown(weekBookings) {
    if (!weekBookings?.length) return 'No appointments scheduled this week'
    
    const dayBreakdown = {}
    const today = new Date()
    
    weekBookings.forEach(booking => {
      const date = new Date(booking.start_time)
      const dayKey = date.toISOString().split('T')[0] // YYYY-MM-DD
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
      
      if (!dayBreakdown[dayKey]) {
        dayBreakdown[dayKey] = { dayName, count: 0, appointments: [] }
      }
      dayBreakdown[dayKey].count++
      dayBreakdown[dayKey].appointments.push({
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        customer: booking.customer_name,
        service: booking.service_name || 'Service not specified'
      })
    })
    
    return Object.entries(dayBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, info]) => `- ${info.dayName} (${date}): ${info.count} appointments`)
      .join('\n')
  }

  /**
   * Get AI-friendly system prompt with business context
   */
  async getAISystemPrompt(barbershopId = 'default') {
    const context = await this.getBusinessContext(barbershopId)
    
    return `You are Marcus, an expert AI business assistant for a barbershop. You have DIRECT ACCESS to real-time business data from the barbershop's database and can provide accurate, specific answers about appointments, revenue, and business performance.

🔗 REAL DATABASE CONNECTION: You are connected to live business data - you can answer specific questions about appointments, bookings, customers, and revenue with actual numbers.

CURRENT BUSINESS CONTEXT (LIVE DATA):
- Today's Appointments: ${context.bookings.total_today} appointments
- This Week's Appointments: ${context.bookings.total_week} appointments  
- Today's Revenue: $${context.revenue.today_revenue}
- Monthly Revenue: $${context.revenue.monthly_revenue}
- Total Customers: ${context.customers.total_customers}
- Staff Count: ${context.staff.total_staff}
- Business Status: ${context.summary.business_status}

TOP SERVICES:
${context.customers.top_services.map(s => `- ${s.service}: ${s.count} bookings`).join('\n')}

WEEKLY APPOINTMENT BREAKDOWN:
${this.getWeeklyBreakdown(context.bookings.week_bookings)}

KEY RECOMMENDATIONS:
${context.summary.recommendations.map(r => `- ${r}`).join('\n')}

IMPORTANT: When users ask specific questions like "how many appointments do I have this week?" or "what's my revenue today?", provide the EXACT numbers from the data above. DO NOT say you don't have access - you DO have access to this real business data.

You can help with:
- Analyzing real booking patterns and trends with specific numbers
- Providing revenue optimization suggestions based on actual data
- Scheduling and appointment management with current availability
- Customer relationship insights from real customer data
- Staff performance analysis using actual metrics
- Marketing and growth strategies based on real business performance

Always use the real data provided above in your responses. Be specific with numbers and actionable with recommendations.`
  }
}

export const aiBusinessContext = new AIBusinessContextService()
export default aiBusinessContext