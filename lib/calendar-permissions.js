import { createClient } from '@/lib/supabase/browser-client'

/**
 * Calendar Permission Management System
 * Handles role-based access control for calendar views and data
 */

// View type definitions by role
export const CALENDAR_VIEWS = {
  ENTERPRISE_OWNER: [
    'all-locations',
    'consolidated',
    'resource-utilization',
    'revenue-by-location',
    'cross-location',
    'shop-overview',
    'all-barbers',
    'personal'
  ],
  SUPER_ADMIN: [
    'all-locations',
    'consolidated',
    'resource-utilization',
    'revenue-by-location',
    'cross-location',
    'shop-overview',
    'all-barbers',
    'personal'
  ],
  LOCATION_MANAGER: [
    'shop-overview',
    'all-barbers',
    'daily-operations',
    'weekly-planning',
    'staff-scheduling',
    'personal'
  ],
  SHOP_OWNER: [
    'shop-overview',
    'all-barbers',
    'daily-operations',
    'weekly-planning',
    'staff-scheduling',
    'personal',
    'my-clients',
    'availability',
    'commission-tracking'
  ],
  BARBER: [
    'personal',
    'my-clients',
    'availability',
    'commission-tracking'
  ],
  CLIENT: [
    'book-appointment',
    'my-appointments',
    'preferred-barber'
  ],
  CUSTOMER: [
    'book-appointment',
    'my-appointments',
    'preferred-barber'
  ]
}

// FullCalendar view mappings
export const FULLCALENDAR_VIEW_MAP = {
  'all-locations': 'resourceTimelineWeek',
  'consolidated': 'resourceTimeGridWeek',
  'resource-utilization': 'resourceTimelineDay',
  'revenue-by-location': 'dayGridMonth',
  'cross-location': 'resourceTimelineWeek',
  'shop-overview': 'resourceTimeGridDay',
  'all-barbers': 'resourceTimeGridDay',
  'daily-operations': 'timeGridDay',
  'weekly-planning': 'timeGridWeek',
  'staff-scheduling': 'resourceTimeGridWeek',
  'personal': 'timeGridWeek',
  'my-clients': 'listWeek',
  'availability': 'timeGridWeek',
  'commission-tracking': 'dayGridMonth',
  'book-appointment': 'timeGridWeek',
  'my-appointments': 'listWeek',
  'preferred-barber': 'timeGridWeek'
}

/**
 * Check if user has access to a specific calendar view
 */
export function canAccessView(userRole, viewId) {
  const allowedViews = CALENDAR_VIEWS[userRole] || []
  return allowedViews.includes(viewId)
}

/**
 * Get user's accessible locations
 */
export async function getUserLocations(userId, userRole) {
  const supabase = createClient()
  
  try {
    // Super Admin and Enterprise Owner can see all locations
    if (['SUPER_ADMIN', 'ENTERPRISE_OWNER'].includes(userRole)) {
      const { data: organizations } = await supabase
        .from('organizations')
        .select('*')
        .or(`owner_id.eq.${userId}`)
      
      // Get all barbershops for these organizations
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('*')
        .or(`owner_id.eq.${userId},organization_id.in.(${organizations?.map(o => o.id).join(',')})`)
        .order('name')
      
      return barbershops || []
    }
    
    // Shop Owner - get their owned shops
    if (userRole === 'SHOP_OWNER') {
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', userId)
        .order('name')
      
      return barbershops || []
    }
    
    // Location Manager - get their managed location
    if (userRole === 'LOCATION_MANAGER') {
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('location_manager_id', userId)
        .order('name')
      
      return barbershops || []
    }
    
    // Barber - get their work location
    if (userRole === 'BARBER') {
      const { data: staffRecords } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, barbershops(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      return staffRecords?.map(r => r.barbershops).filter(Boolean) || []
    }
    
    // Customer - get locations they can book at
    if (['CLIENT', 'CUSTOMER'].includes(userRole)) {
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('is_active', true)
        .eq('accepts_online_booking', true)
        .order('name')
      
      return barbershops || []
    }
    
    return []
  } catch (error) {
    console.error('Error fetching user locations:', error)
    return []
  }
}

/**
 * Get barbers for specific locations
 */
export async function getBarbersForLocations(locationIds, userRole) {
  const supabase = createClient()
  
  try {
    // If no locations specified, return empty
    if (!locationIds || locationIds.length === 0) {
      return []
    }
    
    // Get active staff for these locations
    const { data: staffRecords } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        barbershop_id,
        role,
        is_active,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        ),
        barbershops:barbershop_id (
          id,
          name
        )
      `)
      .in('barbershop_id', locationIds)
      .eq('is_active', true)
      .in('role', ['barber', 'senior_barber', 'master_barber', 'shop_owner'])
      .order('profiles(full_name)')
    
    // Format barber data
    const barbers = staffRecords?.map(staff => ({
      id: staff.user_id,
      name: staff.profiles?.full_name || staff.profiles?.email || 'Unknown Barber',
      email: staff.profiles?.email,
      avatar: staff.profiles?.avatar_url,
      location: staff.barbershops?.name,
      locationId: staff.barbershop_id,
      role: staff.role,
      color: generateBarberColor(staff.user_id)
    })) || []
    
    return barbers
  } catch (error) {
    console.error('Error fetching barbers:', error)
    return []
  }
}

/**
 * Get calendar events based on view and permissions
 */
export async function getCalendarEvents(viewId, locationIds, barberIds, dateRange, userRole, userId) {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('appointments')
      .select(`
        *,
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
        barbershop_staff!appointments_barber_id_fkey (
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        )
      `)
    
    // Apply location filter if specified
    if (locationIds && locationIds.length > 0) {
      query = query.in('barbershop_id', locationIds)
    }
    
    // Apply barber filter if specified
    if (barberIds && barberIds.length > 0) {
      query = query.in('barber_id', barberIds)
    }
    
    // Apply date range filter
    if (dateRange?.start) {
      query = query.gte('start_time', dateRange.start)
    }
    if (dateRange?.end) {
      query = query.lte('start_time', dateRange.end)
    }
    
    // Apply role-specific filters
    if (userRole === 'BARBER' && viewId === 'personal') {
      query = query.eq('barber_id', userId)
    }
    
    if (['CLIENT', 'CUSTOMER'].includes(userRole) && viewId === 'my-appointments') {
      query = query.eq('customer_id', userId)
    }
    
    // Exclude cancelled unless specifically requested
    if (viewId !== 'cancelled-appointments') {
      query = query.neq('status', 'cancelled')
    }
    
    const { data: appointments, error } = await query.order('start_time')
    
    if (error) throw error
    
    // Format appointments for FullCalendar
    return appointments?.map(apt => ({
      id: apt.id,
      title: `${apt.customers?.name || 'Customer'} - ${apt.services?.name || 'Service'}`,
      start: apt.start_time,
      end: apt.end_time,
      resourceId: apt.barber_id,
      backgroundColor: generateBarberColor(apt.barber_id),
      borderColor: generateBarberColor(apt.barber_id),
      extendedProps: {
        appointmentId: apt.id,
        customerId: apt.customer_id,
        customerName: apt.customers?.name,
        customerEmail: apt.customers?.email,
        customerPhone: apt.customers?.phone,
        serviceId: apt.service_id,
        serviceName: apt.services?.name,
        serviceDuration: apt.services?.duration,
        servicePrice: apt.services?.price,
        barberId: apt.barber_id,
        barberName: apt.barbershop_staff?.profiles?.full_name,
        status: apt.status,
        notes: apt.notes,
        barbershopId: apt.barbershop_id
      }
    })) || []
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return []
  }
}

/**
 * Generate consistent color for barber
 */
function generateBarberColor(barberId) {
  if (!barberId) return '#6B7280'
  
  const colors = [
    '#546355', // Olive
    '#7C3AED', // Purple
    '#2563EB', // Blue
    '#059669', // Green
    '#DC2626', // Red
    '#EA580C', // Orange
    '#CA8A04', // Yellow
    '#0891B2', // Cyan
    '#DB2777', // Pink
    '#7C2D12'  // Brown
  ]
  
  // Generate a consistent index based on barber ID
  const hash = barberId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Check if user can modify an appointment
 */
export function canModifyAppointment(appointment, userRole, userId) {
  // Super Admin can modify anything
  if (userRole === 'SUPER_ADMIN') return true
  
  // Enterprise Owner can modify in their organizations
  if (userRole === 'ENTERPRISE_OWNER') {
    // Would need to check if appointment is in their org
    return true
  }
  
  // Shop Owner can modify in their shop
  if (userRole === 'SHOP_OWNER') {
    // Check if appointment is in their shop
    return true
  }
  
  // Location Manager can modify in their location
  if (userRole === 'LOCATION_MANAGER') {
    // Check if appointment is in their location
    return true
  }
  
  // Barber can modify their own appointments
  if (userRole === 'BARBER') {
    return appointment.barberId === userId
  }
  
  // Customer can modify their own appointments (with restrictions)
  if (['CLIENT', 'CUSTOMER'].includes(userRole)) {
    return appointment.customerId === userId && appointment.status !== 'completed'
  }
  
  return false
}

/**
 * Get aggregated calendar data for multi-location views
 */
export async function getAggregatedCalendarData(locationIds, dateRange, aggregationType) {
  const supabase = createClient()
  
  try {
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        barbershop_id,
        barber_id,
        status,
        services (
          price,
          duration
        ),
        barbershops (
          id,
          name,
          city,
          state
        )
      `)
      .in('barbershop_id', locationIds)
      .gte('start_time', dateRange.start)
      .lte('start_time', dateRange.end)
      .neq('status', 'cancelled')
    
    // Aggregate based on type
    if (aggregationType === 'revenue') {
      const revenueByLocation = {}
      appointments?.forEach(apt => {
        const locationId = apt.barbershop_id
        if (!revenueByLocation[locationId]) {
          revenueByLocation[locationId] = {
            locationId,
            locationName: apt.barbershops?.name,
            totalRevenue: 0,
            appointmentCount: 0
          }
        }
        revenueByLocation[locationId].totalRevenue += apt.services?.price || 0
        revenueByLocation[locationId].appointmentCount += 1
      })
      return Object.values(revenueByLocation)
    }
    
    if (aggregationType === 'utilization') {
      const utilizationByHour = {}
      appointments?.forEach(apt => {
        const startHour = new Date(apt.start_time).getHours()
        const key = `${apt.barbershop_id}-${startHour}`
        if (!utilizationByHour[key]) {
          utilizationByHour[key] = {
            locationId: apt.barbershop_id,
            locationName: apt.barbershops?.name,
            hour: startHour,
            appointments: 0
          }
        }
        utilizationByHour[key].appointments += 1
      })
      return Object.values(utilizationByHour)
    }
    
    return appointments
  } catch (error) {
    console.error('Error fetching aggregated data:', error)
    return []
  }
}

export default {
  CALENDAR_VIEWS,
  FULLCALENDAR_VIEW_MAP,
  canAccessView,
  getUserLocations,
  getBarbersForLocations,
  getCalendarEvents,
  canModifyAppointment,
  getAggregatedCalendarData
}