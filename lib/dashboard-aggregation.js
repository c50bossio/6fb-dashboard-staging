/**
 * Dashboard Data Aggregation Service
 * Handles data filtering and aggregation based on global dashboard context
 */

import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * Aggregate metrics across multiple locations
 */
export async function aggregateLocationMetrics(locationIds, timeRange) {
  try {
    const metrics = {
      totalRevenue: 0,
      totalAppointments: 0,
      totalCustomers: 0,
      averageRating: 0,
      utilizationRate: 0,
      locationBreakdown: []
    }
    
    // Fetch data for each location
    for (const locationId of locationIds) {
      const locationData = await fetchLocationMetrics(locationId, timeRange)
      
      // Aggregate totals
      metrics.totalRevenue += locationData.revenue || 0
      metrics.totalAppointments += locationData.appointments || 0
      metrics.totalCustomers += locationData.customers || 0
      
      // Store individual location data
      metrics.locationBreakdown.push({
        locationId,
        name: locationData.name,
        revenue: locationData.revenue,
        appointments: locationData.appointments,
        customers: locationData.customers,
        rating: locationData.rating,
        utilization: locationData.utilization
      })
    }
    
    // Calculate averages
    if (metrics.locationBreakdown.length > 0) {
      const totalRating = metrics.locationBreakdown.reduce((sum, loc) => sum + (loc.rating || 0), 0)
      const totalUtilization = metrics.locationBreakdown.reduce((sum, loc) => sum + (loc.utilization || 0), 0)
      
      metrics.averageRating = totalRating / metrics.locationBreakdown.length
      metrics.utilizationRate = totalUtilization / metrics.locationBreakdown.length
    }
    
    return metrics
  } catch (error) {
    console.error('Error aggregating location metrics:', error)
    return null
  }
}

/**
 * Fetch metrics for a single location
 */
async function fetchLocationMetrics(locationId, timeRange) {
  try {
    // Get location details
    const { data: location, error: locationError } = await supabase
      .from('barbershops')
      .select('id, name, city, state')
      .eq('id', locationId)
      .single()
    
    if (locationError) throw locationError
    
    // Get appointment count and revenue
    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, price, status, created_at')
      .eq('barbershop_id', locationId)
      .in('status', ['completed', 'confirmed'])
    
    if (timeRange?.start) {
      appointmentsQuery = appointmentsQuery.gte('created_at', timeRange.start)
    }
    if (timeRange?.end) {
      appointmentsQuery = appointmentsQuery.lte('created_at', timeRange.end)
    }
    
    const { data: appointments, error: appointmentsError } = await appointmentsQuery
    
    if (appointmentsError) throw appointmentsError
    
    const revenue = appointments?.reduce((sum, apt) => sum + (apt.price || 0), 0) || 0
    
    // Get unique customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .eq('barbershop_id', locationId)
    
    if (customersError) throw customersError
    
    // Get average rating (if reviews exist)
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('barbershop_id', locationId)
    
    const averageRating = reviews?.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0
    
    // Calculate utilization (simplified - appointments per day)
    const daysInRange = timeRange?.start && timeRange?.end
      ? Math.ceil((new Date(timeRange.end) - new Date(timeRange.start)) / (1000 * 60 * 60 * 24))
      : 30
    
    const utilizationRate = (appointments?.length || 0) / daysInRange
    
    return {
      name: location.name,
      city: location.city,
      state: location.state,
      revenue,
      appointments: appointments?.length || 0,
      customers: customers?.length || 0,
      rating: averageRating,
      utilization: utilizationRate
    }
  } catch (error) {
    console.error(`Error fetching metrics for location ${locationId}:`, error)
    return {
      name: 'Unknown',
      revenue: 0,
      appointments: 0,
      customers: 0,
      rating: 0,
      utilization: 0
    }
  }
}

/**
 * Filter appointments by selected barbers
 */
export async function filterAppointmentsByBarbers(appointments, barberIds) {
  if (!barberIds || barberIds.length === 0) {
    return appointments // Return all if no filter
  }
  
  return appointments.filter(apt => barberIds.includes(apt.barber_id))
}

/**
 * Get calendar events for selected locations and barbers
 */
export async function getFilteredCalendarEvents(locationIds, barberIds, timeRange) {
  try {
    let query = supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        status,
        price,
        barber_id,
        customer_id,
        barbershop_id,
        service_id,
        notes,
        created_at,
        customers (
          id,
          name,
          email,
          phone
        ),
        services (
          id,
          name,
          duration,
          price
        ),
        profiles:barber_id (
          id,
          full_name,
          email
        )
      `)
    
    // Filter by locations
    if (locationIds && locationIds.length > 0) {
      query = query.in('barbershop_id', locationIds)
    }
    
    // Filter by barbers
    if (barberIds && barberIds.length > 0) {
      query = query.in('barber_id', barberIds)
    }
    
    // Filter by time range
    if (timeRange?.start) {
      query = query.gte('start_time', timeRange.start)
    }
    if (timeRange?.end) {
      query = query.lte('end_time', timeRange.end)
    }
    
    const { data, error } = await query.order('start_time', { ascending: true })
    
    if (error) throw error
    
    // Transform to calendar event format
    return data?.map(apt => ({
      id: apt.id,
      title: apt.title || `${apt.services?.name || 'Appointment'} - ${apt.customers?.name || 'Customer'}`,
      start: apt.start_time,
      end: apt.end_time,
      backgroundColor: getStatusColor(apt.status),
      borderColor: getStatusColor(apt.status),
      extendedProps: {
        status: apt.status,
        customerName: apt.customers?.name,
        customerEmail: apt.customers?.email,
        customerPhone: apt.customers?.phone,
        barberName: apt.profiles?.full_name,
        serviceName: apt.services?.name,
        price: apt.price,
        notes: apt.notes,
        barbershopId: apt.barbershop_id,
        barberId: apt.barber_id
      }
    })) || []
  } catch (error) {
    console.error('Error fetching filtered calendar events:', error)
    return []
  }
}

/**
 * Get status color for appointments
 */
function getStatusColor(status) {
  const colors = {
    confirmed: '#10b981', // Green
    pending: '#f59e0b',   // Yellow
    completed: '#6b7280', // Gray
    cancelled: '#ef4444', // Red
    no_show: '#dc2626'    // Dark Red
  }
  
  return colors[status] || '#6b7280'
}

/**
 * Compare metrics between locations
 */
export function compareLocationPerformance(locationMetrics) {
  if (!locationMetrics || locationMetrics.length === 0) {
    return null
  }
  
  // Find best performers
  const bestRevenue = locationMetrics.reduce((best, current) => 
    current.revenue > best.revenue ? current : best
  )
  
  const bestAppointments = locationMetrics.reduce((best, current) => 
    current.appointments > best.appointments ? current : best
  )
  
  const bestRating = locationMetrics.reduce((best, current) => 
    current.rating > best.rating ? current : best
  )
  
  // Calculate growth trends (simplified)
  const trends = locationMetrics.map(location => ({
    locationId: location.locationId,
    name: location.name,
    revenueGrowth: Math.random() * 20 - 10, // Placeholder - would calculate actual trend
    appointmentGrowth: Math.random() * 20 - 10,
    customerGrowth: Math.random() * 20 - 10
  }))
  
  return {
    bestPerformers: {
      revenue: bestRevenue,
      appointments: bestAppointments,
      rating: bestRating
    },
    trends,
    summary: {
      totalLocations: locationMetrics.length,
      averageRevenue: locationMetrics.reduce((sum, loc) => sum + loc.revenue, 0) / locationMetrics.length,
      totalRevenue: locationMetrics.reduce((sum, loc) => sum + loc.revenue, 0)
    }
  }
}

/**
 * Get dashboard widgets data based on context
 */
export async function getDashboardData(context) {
  const { selectedLocations, selectedBarbers, viewMode, timeRange, permissions } = context
  
  // Base dashboard data structure
  const dashboardData = {
    metrics: null,
    charts: null,
    appointments: null,
    alerts: [],
    insights: []
  }
  
  try {
    // Get aggregated metrics if multiple locations
    if (selectedLocations.length > 1 && viewMode === 'consolidated') {
      dashboardData.metrics = await aggregateLocationMetrics(selectedLocations, timeRange)
    } else if (selectedLocations.length === 1) {
      // Single location metrics
      const metrics = await fetchLocationMetrics(selectedLocations[0], timeRange)
      dashboardData.metrics = {
        totalRevenue: metrics.revenue,
        totalAppointments: metrics.appointments,
        totalCustomers: metrics.customers,
        averageRating: metrics.rating,
        utilizationRate: metrics.utilization
      }
    }
    
    // Get calendar appointments
    dashboardData.appointments = await getFilteredCalendarEvents(
      selectedLocations,
      selectedBarbers,
      timeRange
    )
    
    // Generate insights based on data
    if (dashboardData.metrics) {
      dashboardData.insights = generateInsights(dashboardData.metrics)
    }
    
    // Generate alerts
    dashboardData.alerts = generateAlerts(dashboardData)
    
    return dashboardData
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    return dashboardData
  }
}

/**
 * Generate insights from metrics
 */
function generateInsights(metrics) {
  const insights = []
  
  if (metrics.totalRevenue > 10000) {
    insights.push({
      type: 'success',
      message: `Strong revenue performance: $${metrics.totalRevenue.toLocaleString()}`,
      icon: 'trending-up'
    })
  }
  
  if (metrics.utilizationRate < 0.5) {
    insights.push({
      type: 'warning',
      message: 'Low utilization rate - consider promotional campaigns',
      icon: 'alert'
    })
  }
  
  if (metrics.averageRating >= 4.5) {
    insights.push({
      type: 'success',
      message: `Excellent customer satisfaction: ${metrics.averageRating.toFixed(1)} stars`,
      icon: 'star'
    })
  }
  
  return insights
}

/**
 * Generate alerts based on dashboard data
 */
function generateAlerts(dashboardData) {
  const alerts = []
  
  // Check for low appointment count
  if (dashboardData.appointments?.length < 5) {
    alerts.push({
      type: 'info',
      message: 'Low appointment count - consider reaching out to customers',
      priority: 'medium'
    })
  }
  
  // Check for upcoming appointments
  const upcomingToday = dashboardData.appointments?.filter(apt => {
    const aptDate = new Date(apt.start)
    const today = new Date()
    return aptDate.toDateString() === today.toDateString()
  })
  
  if (upcomingToday?.length > 0) {
    alerts.push({
      type: 'info',
      message: `${upcomingToday.length} appointments scheduled for today`,
      priority: 'low'
    })
  }
  
  return alerts
}