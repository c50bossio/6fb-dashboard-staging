import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for full access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
      // Today's bookings
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', today)
        .lt('start_time', today + 'T23:59:59')
        .eq('shop_id', barbershopId)
        .order('start_time')

      // This week's bookings
      const { data: weekBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', today)
        .lte('start_time', nextWeek)
        .eq('shop_id', barbershopId)
        .order('start_time')

      // Booking statistics
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
      // Get recent business metrics
      const { data: metrics } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('date', lastMonth)
        .order('date', { ascending: false })
        .limit(30)

      // Get analytics events for trend analysis
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
      // Get customer data from bookings
      const { data: customerData } = await supabase
        .from('bookings')
        .select('customer_name, customer_email, customer_phone, service_type, price, start_time')
        .eq('shop_id', barbershopId)
        .not('customer_email', 'is', null)
        .order('start_time', { ascending: false })
        .limit(50)

      if (!customerData?.length) {
        return { total_customers: 0, recent_customers: [], top_services: [] }
      }

      // Analyze customer patterns
      const uniqueCustomers = new Set(customerData.map(c => c.customer_email)).size
      const serviceTypes = customerData.reduce((acc, booking) => {
        acc[booking.service_type] = (acc[booking.service_type] || 0) + 1
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
      // Today's revenue
      const { data: todayRevenue } = await supabase
        .from('bookings')
        .select('price')
        .eq('shop_id', barbershopId)
        .gte('start_time', today)
        .eq('status', 'completed')

      // Monthly revenue
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
      // Get barber info from profiles
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
   * Get AI-friendly system prompt with business context
   */
  async getAISystemPrompt(barbershopId = 'default') {
    const context = await this.getBusinessContext(barbershopId)
    
    return `You are Marcus, an expert AI business assistant for a barbershop. You have access to real-time business data and can provide accurate insights and recommendations.

CURRENT BUSINESS CONTEXT:
- Today's Appointments: ${context.bookings.total_today}
- This Week's Appointments: ${context.bookings.total_week}  
- Today's Revenue: $${context.revenue.today_revenue}
- Monthly Revenue: $${context.revenue.monthly_revenue}
- Total Customers: ${context.customers.total_customers}
- Staff Count: ${context.staff.total_staff}
- Business Status: ${context.summary.business_status}

TOP SERVICES:
${context.customers.top_services.map(s => `- ${s.service}: ${s.count} bookings`).join('\n')}

KEY RECOMMENDATIONS:
${context.summary.recommendations.map(r => `- ${r}`).join('\n')}

You can help with:
- Analyzing real booking patterns and trends
- Providing revenue optimization suggestions
- Scheduling and appointment management
- Customer relationship insights
- Staff performance analysis
- Marketing and growth strategies

Always use the real data provided above in your responses. Be specific with numbers and actionable with recommendations.`
  }
}

// Export singleton instance
export const aiBusinessContext = new AIBusinessContextService()
export default aiBusinessContext