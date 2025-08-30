import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

/**
 * Calendar Permission Management System
 * Handles role-based access control for calendar views and data
 */

// Simplified view definitions for booking calendar
export const CALENDAR_VIEWS = {
  // All users can access core booking views
  GUEST: [
    'book-appointment',
    'choose-barber',
    'choose-time'
  ],
  CLIENT: [
    'book-appointment',
    'choose-barber',
    'choose-time',
    'my-appointments',
    'my-schedule'
  ],
  CUSTOMER: [
    'book-appointment',
    'choose-barber', 
    'choose-time',
    'my-appointments',
    'my-schedule'
  ],
  BARBER: [
    'book-appointment',
    'choose-barber',
    'choose-time',
    'my-appointments',
    'my-schedule',
    'my-clients',
    'availability'
  ],
  'BARBER & MANAGER': [
    'book-appointment',
    'choose-barber',
    'choose-time',
    'my-appointments',
    'my-schedule',
    'my-clients',
    'availability',
    'all-barbers',
    'shop-calendar'
  ],
  SHOP_OWNER: [
    'book-appointment',
    'choose-barber',
    'choose-time',
    'my-appointments',
    'my-schedule',
    'my-clients',
    'availability',
    'all-barbers',
    'shop-calendar'
  ],
  LOCATION_MANAGER: [
    'book-appointment',
    'choose-barber',
    'choose-time',
    'my-appointments',
    'my-schedule',
    'all-barbers',
    'shop-calendar'
  ],
  ENTERPRISE_OWNER: [
    'book-appointment',
    'choose-barber',
    'choose-time',
    'my-appointments',
    'my-schedule',
    'all-barbers',
    'shop-calendar'
  ],
  SUPER_ADMIN: [
    'book-appointment',
    'choose-barber',
    'choose-time',
    'my-appointments',
    'my-schedule',
    'my-clients',
    'availability',
    'all-barbers',
    'shop-calendar'
  ]
}

// Simplified FullCalendar view mappings for booking flow
export const FULLCALENDAR_VIEW_MAP = {
  // Core booking views
  'book-appointment': 'timeGridWeek',    // Main booking view - week grid
  'choose-barber': 'timeGridWeek',       // Choose barber - week view to see availability
  'choose-time': 'timeGridDay',          // Choose time slot - day view for precision
  
  // Personal appointment views
  'my-appointments': 'listWeek',         // List view for personal appointments
  'my-schedule': 'timeGridWeek',         // Week view for personal schedule
  'my-clients': 'listWeek',              // List view for barber's clients
  
  // Availability and staff views
  'availability': 'timeGridWeek',        // Week view to set availability
  'all-barbers': 'timeGridDay',          // Day view to see all staff
  'shop-calendar': 'timeGridWeek'        // Shop overview - week view
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
        .select('barberbarbershop_id, barbershops(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      return staffRecords?.map(r => r.barbershops).filter(Boolean) || []
    }
    
    // Barber & Manager - get their work location with management access
    if (userRole === 'BARBER & MANAGER') {
      const { data: staffRecords } = await supabase
        .from('barbershop_staff')
        .select('barberbarbershop_id, barbershops(*)')
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
    // First fetch staff records
    const { data: staffRecords } = await supabase
      .from('barbershop_staff')
      .select('*')
      .in('barberbarbershop_id', locationIds)
      .eq('is_active', true)
      .in('role', ['barber', 'barber & manager', 'senior_barber', 'master_barber', 'shop_owner'])
    
    if (!staffRecords || staffRecords.length === 0) {
      return []
    }
    
    // Get unique user and barbershop IDs
    const userIds = [...new Set(staffRecords.map(s => s.user_id).filter(Boolean))]
    const barbershopIds = [...new Set(staffRecords.map(s => s.barberbarbershop_id).filter(Boolean))]
    
    // Fetch profiles and barbershops separately
    const [profilesResult, barbershopsResult] = await Promise.all([
      userIds.length > 0 ? supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds) : { data: [] },
      barbershopIds.length > 0 ? supabase
        .from('barbershops')
        .select('id, name')
        .in('id', barbershopIds) : { data: [] }
    ])
    
    const profiles = profilesResult.data || []
    const barbershops = barbershopsResult.data || []
    
    // Merge data and format barber data
    const barbers = staffRecords.map(staff => {
      const profile = profiles.find(p => p.id === staff.user_id)
      const barbershop = barbershops.find(b => b.id === staff.barberbarbershop_id)
      
      return {
        id: staff.user_id,
        name: profile?.full_name || profile?.email || 'Unknown Barber',
        email: profile?.email,
        avatar: profile?.avatar_url,
        location: barbershop?.name,
        locationId: staff.barberbarbershop_id,
        role: staff.role,
        color: generateBarberColor(staff.user_id)
      }
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    
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
    // Use separate queries to avoid PostgREST foreign key syntax issues
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
        )
      `)
    
    // Apply location filter if specified
    if (locationIds && locationIds.length > 0) {
      query = query.in('barberbarbershop_id', locationIds)
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
    
    if (!appointments || appointments.length === 0) {
      return []
    }
    
    // Fetch barber information separately to avoid PostgREST issues
    const barberIds = [...new Set(appointments.map(a => a.barber_id).filter(Boolean))]
    const barberProfiles = new Map()
    
    if (barberIds.length > 0) {
      // First get barbershop_staff records
      const { data: staffRecords } = await supabase
        .from('barbershop_staff')
        .select('id, user_id')
        .in('id', barberIds)
      
      if (staffRecords && staffRecords.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(staffRecords.map(s => s.user_id).filter(Boolean))]
        
        if (userIds.length > 0) {
          // Fetch profiles for those users
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          
          // Create a map for quick lookup
          if (profiles) {
            staffRecords.forEach(staff => {
              const profile = profiles.find(p => p.id === staff.user_id)
              if (profile) {
                barberProfiles.set(staff.id, profile)
              }
            })
          }
        }
      }
    }
    
    // Format appointments for FullCalendar
    return appointments.map(apt => {
      const barberProfile = barberProfiles.get(apt.barber_id)
      
      return {
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
          barberName: barberProfile?.full_name || 'Unknown Barber',
          status: apt.status,
          notes: apt.notes,
          barberbarbershopId: apt.barberbarbershop_id
        }
      }
    }) || []
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
  
  // Barber & Manager can modify appointments in their location
  if (userRole === 'BARBER & MANAGER') {
    // Can modify their own appointments plus manage others in their location
    return true // Would need location check in real implementation
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
        barberbarbershop_id,
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
      .in('barberbarbershop_id', locationIds)
      .gte('start_time', dateRange.start)
      .lte('start_time', dateRange.end)
      .neq('status', 'cancelled')
    
    // Aggregate based on type
    if (aggregationType === 'revenue') {
      const revenueByLocation = {}
      appointments?.forEach(apt => {
        const locationId = apt.barberbarbershop_id
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
        const key = `${apt.barberbarbershop_id}-${startHour}`
        if (!utilizationByHour[key]) {
          utilizationByHour[key] = {
            locationId: apt.barberbarbershop_id,
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