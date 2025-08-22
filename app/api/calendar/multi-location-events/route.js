import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { 
      locationIds = [], 
      barberIds = [], 
      startDate, 
      endDate,
      viewType = 'all',
      includeRecurring = true,
      includeCancelled = false
    } = body
    
    // Build base query
    let query = supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        updated_at,
        barbershop_id,
        barber_id,
        customer_id,
        service_id,
        is_recurring,
        recurring_pattern,
        series_id,
        customers (
          id,
          name,
          email,
          phone,
          preferred_barber_id
        ),
        services (
          id,
          name,
          duration,
          price,
          description,
          category
        ),
        barbershops (
          id,
          name,
          city,
          state,
          address,
          phone
        )
      `)
    
    // Apply location filter
    if (locationIds && locationIds.length > 0) {
      query = query.in('barbershop_id', locationIds)
    }
    
    // Apply barber filter
    if (barberIds && barberIds.length > 0) {
      query = query.in('barber_id', barberIds)
    }
    
    // Apply date range filter
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }
    
    // Apply status filter
    if (!includeCancelled) {
      query = query.neq('status', 'cancelled')
    }
    
    // Order by start time
    query = query.order('start_time', { ascending: true })
    
    const { data: appointments, error: appointmentsError } = await query
    
    if (appointmentsError) {
      throw appointmentsError
    }
    
    // Fetch barber information separately
    let enrichedAppointments = appointments || []
    if (appointments && appointments.length > 0) {
      // Get unique barber IDs
      const uniqueBarberIds = [...new Set(appointments.map(a => a.barber_id).filter(Boolean))]
      
      if (uniqueBarberIds.length > 0) {
        // Fetch barbershop_staff records
        const { data: staffData } = await supabase
          .from('barbershop_staff')
          .select('id, user_id, role')
          .in('id', uniqueBarberIds)
        
        // Get unique user IDs from staff
        const userIds = staffData ? [...new Set(staffData.map(s => s.user_id))] : []
        
        // Fetch profiles for those users
        let profilesMap = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', userIds)
          
          profilesMap = Object.fromEntries(
            (profilesData || []).map(p => [p.id, p])
          )
        }
        
        // Create staff lookup map with profile data
        const staffMap = Object.fromEntries(
          (staffData || []).map(s => [
            s.id,
            {
              user_id: s.user_id,
              role: s.role,
              profiles: profilesMap[s.user_id] || null
            }
          ])
        )
        
        // Enrich appointments with barber data
        enrichedAppointments = appointments.map(apt => ({
          ...apt,
          barbershop_staff: staffMap[apt.barber_id] || null
        }))
      }
    }
    
    // Format appointments for FullCalendar
    const events = enrichedAppointments?.map(apt => ({
      // FullCalendar properties
      id: apt.id,
      title: formatEventTitle(apt, viewType),
      start: apt.start_time,
      end: apt.end_time,
      resourceId: apt.barber_id, // For resource views
      backgroundColor: getEventColor(apt),
      borderColor: getEventColor(apt),
      textColor: '#FFFFFF',
      display: apt.status === 'cancelled' ? 'background' : 'block',
      classNames: getEventClasses(apt),
      
      // Extended properties for tooltips and modals
      extendedProps: {
        appointmentId: apt.id,
        barbershopId: apt.barbershop_id,
        barbershopName: apt.barbershops?.name,
        barbershopLocation: `${apt.barbershops?.city}, ${apt.barbershops?.state}`,
        barberId: apt.barber_id,
        barberName: apt.barbershop_staff?.profiles?.full_name || 'Unknown Barber',
        barberEmail: apt.barbershop_staff?.profiles?.email,
        barberAvatar: apt.barbershop_staff?.profiles?.avatar_url,
        customerId: apt.customer_id,
        customerName: apt.customers?.name || 'Walk-in',
        customerEmail: apt.customers?.email,
        customerPhone: apt.customers?.phone,
        serviceId: apt.service_id,
        serviceName: apt.services?.name || 'Service',
        serviceDuration: apt.services?.duration,
        servicePrice: apt.services?.price,
        serviceCategory: apt.services?.category,
        status: apt.status,
        notes: apt.notes,
        isRecurring: apt.is_recurring,
        recurringPattern: apt.recurring_pattern,
        seriesId: apt.series_id,
        createdAt: apt.created_at,
        updatedAt: apt.updated_at
      }
    })) || []
    
    // Calculate aggregated statistics if requested
    let statistics = null
    if (viewType === 'consolidated' || viewType === 'resource-utilization') {
      statistics = calculateStatistics(appointments, locationIds)
    }
    
    return NextResponse.json({
      success: true,
      events,
      totalEvents: events.length,
      statistics,
      dateRange: {
        start: startDate,
        end: endDate
      },
      filters: {
        locations: locationIds.length,
        barbers: barberIds.length,
        includeCancelled,
        includeRecurring
      }
    })
    
  } catch (error) {
    console.error('Error fetching multi-location events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Format event title based on view type
 */
function formatEventTitle(appointment, viewType) {
  const customerName = appointment.customers?.name || 'Walk-in'
  const serviceName = appointment.services?.name || 'Service'
  const barberName = appointment.barbershop_staff?.profiles?.full_name || 'Barber'
  const locationName = appointment.barbershops?.name || 'Location'
  
  switch (viewType) {
    case 'all-locations':
      return `[${locationName}] ${customerName} - ${serviceName}`
    case 'consolidated':
      return `${customerName} - ${serviceName} (${barberName})`
    case 'resource-utilization':
      return `${serviceName} - ${appointment.services?.duration || 30}min`
    default:
      return `${customerName} - ${serviceName}`
  }
}

/**
 * Get event color based on status and other factors
 */
function getEventColor(appointment) {
  // Status-based colors
  if (appointment.status === 'cancelled') return '#9CA3AF'
  if (appointment.status === 'completed') return '#10B981'
  if (appointment.status === 'no_show') return '#EF4444'
  if (appointment.status === 'in_progress') return '#3B82F6'
  
  // Generate color based on barber ID for consistency
  const barberId = appointment.barber_id
  if (!barberId) return '#6B7280'
  
  const colors = [
    '#546355', '#7C3AED', '#2563EB', '#059669',
    '#DC2626', '#EA580C', '#CA8A04', '#0891B2',
    '#DB2777', '#7C2D12', '#4F46E5', '#84CC16'
  ]
  
  const hash = barberId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Get CSS classes for event styling
 */
function getEventClasses(appointment) {
  const classes = []
  
  if (appointment.status === 'cancelled') {
    classes.push('event-cancelled')
  }
  if (appointment.status === 'completed') {
    classes.push('event-completed')
  }
  if (appointment.is_recurring) {
    classes.push('event-recurring')
  }
  if (appointment.customers?.preferred_barber_id === appointment.barber_id) {
    classes.push('event-preferred-client')
  }
  
  return classes
}

/**
 * Calculate statistics for dashboard views
 */
function calculateStatistics(appointments, locationIds) {
  const stats = {
    byLocation: {},
    byBarber: {},
    byService: {},
    byTimeSlot: {},
    summary: {
      totalAppointments: appointments.length,
      totalRevenue: 0,
      totalDuration: 0,
      completedCount: 0,
      cancelledCount: 0,
      noShowCount: 0
    }
  }
  
  appointments.forEach(apt => {
    // Location statistics
    const locationId = apt.barbershop_id
    if (!stats.byLocation[locationId]) {
      stats.byLocation[locationId] = {
        id: locationId,
        name: apt.barbershops?.name,
        city: apt.barbershops?.city,
        state: apt.barbershops?.state,
        appointments: 0,
        revenue: 0,
        duration: 0
      }
    }
    stats.byLocation[locationId].appointments++
    stats.byLocation[locationId].revenue += apt.services?.price || 0
    stats.byLocation[locationId].duration += apt.services?.duration || 30
    
    // Barber statistics
    const barberId = apt.barber_id
    if (barberId && !stats.byBarber[barberId]) {
      stats.byBarber[barberId] = {
        id: barberId,
        name: apt.barbershop_staff?.profiles?.full_name,
        appointments: 0,
        revenue: 0,
        duration: 0
      }
    }
    if (barberId) {
      stats.byBarber[barberId].appointments++
      stats.byBarber[barberId].revenue += apt.services?.price || 0
      stats.byBarber[barberId].duration += apt.services?.duration || 30
    }
    
    // Service statistics
    const serviceId = apt.service_id
    if (serviceId && !stats.byService[serviceId]) {
      stats.byService[serviceId] = {
        id: serviceId,
        name: apt.services?.name,
        category: apt.services?.category,
        count: 0,
        revenue: 0
      }
    }
    if (serviceId) {
      stats.byService[serviceId].count++
      stats.byService[serviceId].revenue += apt.services?.price || 0
    }
    
    // Time slot statistics
    const hour = new Date(apt.start_time).getHours()
    if (!stats.byTimeSlot[hour]) {
      stats.byTimeSlot[hour] = {
        hour,
        count: 0,
        locations: new Set()
      }
    }
    stats.byTimeSlot[hour].count++
    stats.byTimeSlot[hour].locations.add(locationId)
    
    // Summary statistics
    stats.summary.totalRevenue += apt.services?.price || 0
    stats.summary.totalDuration += apt.services?.duration || 30
    
    if (apt.status === 'completed') stats.summary.completedCount++
    if (apt.status === 'cancelled') stats.summary.cancelledCount++
    if (apt.status === 'no_show') stats.summary.noShowCount++
  })
  
  // Convert sets to arrays for JSON serialization
  Object.keys(stats.byTimeSlot).forEach(hour => {
    stats.byTimeSlot[hour].locations = Array.from(stats.byTimeSlot[hour].locations)
  })
  
  return stats
}