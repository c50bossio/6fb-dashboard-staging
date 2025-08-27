import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request) {
  try {
    // Try to create authenticated client first
    let supabase = await createClient()
    let user = null
    let usingServiceClient = false
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      // // Debug log removed for production
// Use service client as fallback for development (similar to public barbers API)
      supabase = createServiceClient()
      usingServiceClient = true
      
      if (!supabase) {
        return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
      }
      
      // For development, find Chris Bossio or any available profile
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
      
      if (profiles && profiles.length > 0) {
        user = profiles[0]  // Use first profile for development
        // // Debug log removed for production
} else {
        // // Debug log removed for production
return NextResponse.json({ error: 'No user profiles available' }, { status: 404 })
      }
    } else {
      user = authUser
      // // Debug log removed for production
}

    // Parse FullCalendar.io standard parameters
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') // FullCalendar.io standard parameter
    const end = searchParams.get('end')     // FullCalendar.io standard parameter
    const shopId = searchParams.get('shop_id')
    const locationIds = searchParams.get('location_ids')?.split(',').filter(Boolean) || []

    // // Debug log removed for production
// Get user's profile to find their barbershop - try both ID and email approaches
    let profile, profileError
    
    if (usingServiceClient && user) {
      // When using service client, the user is already the profile from database
      profile = user
      profileError = null
      // // Debug log removed for production
} else {
      // First try with user.id (more reliable)
      const profileByIdResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileByIdResult.data) {
        profile = profileByIdResult.data
        profileError = profileByIdResult.error
      } else {
        // // Debug log removed for production
// Fallback to email lookup
        const profileByEmailResult = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .single()
        
        profile = profileByEmailResult.data
        profileError = profileByEmailResult.error
      }
    }

    if (profileError || !profile) {
      console.error('Profile lookup failed:', { 
        userId: user.id, 
        userEmail: user.email, 
        profileError,
        usingServiceClient 
      })
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Determine which locations to query
    let targetLocationIds = []

    if (locationIds.length > 0) {
      // Multi-location request - verify access to all requested locations
      for (const locationId of locationIds) {
        const hasAccess = await checkLocationAccess(supabase, profile, locationId)
        if (hasAccess) {
          targetLocationIds.push(locationId)
        }
      }
    } else if (shopId) {
      // Single shop request - for now, just use the shopId directly for Tomb45
      // This is a workaround for Chris Bossio not having proper shop association
      targetLocationIds.push(shopId)
      // // Debug log removed for production
} else {
      // Default - get user's primary shop
      const primaryShopId = await getUserPrimaryShop(supabase, profile)
      if (primaryShopId) {
        targetLocationIds.push(primaryShopId)
      }
    }

    if (targetLocationIds.length === 0) {
      // // Debug log removed for production
// Return empty array (FullCalendar.io standard)
      return NextResponse.json([])
    }

    // Build appointments query
    let appointmentsQuery = supabase
      .from('appointments')
      .select(`
        id,
        shop_id,
        customer_id,
        service_id,
        barber_id,
        appointment_date,
        start_time,
        end_time,
        status,
        notes,
        total_price,
        created_at,
        updated_at
      `)
      .in('shop_id', targetLocationIds)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Handle FullCalendar.io date filtering
    if (start) {
      const startDate = new Date(start).toISOString().split('T')[0]
      appointmentsQuery = appointmentsQuery.gte('appointment_date', startDate)
    }
    if (end) {
      const endDate = new Date(end).toISOString().split('T')[0]
      appointmentsQuery = appointmentsQuery.lte('appointment_date', endDate)
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      // // Debug log removed for production
// Return empty array instead of error (FullCalendar.io expects this)
      return NextResponse.json([])
    }

    if (!appointments || appointments.length === 0) {
      // Return empty array (FullCalendar.io standard)
      return NextResponse.json([])
    }

    // Get related data for appointments
    const { customers, services, barbers, locations } = await fetchRelatedData(supabase, appointments, targetLocationIds)

    // Transform to FullCalendar.io event format
    const events = appointments.map(appointment => {
      return transformAppointmentToEvent(appointment, { customers, services, barbers, locations, targetLocationIds })
    }).filter(event => event !== null)

    // // Debug log removed for production
// Return simple events array (FullCalendar.io standard)
    return NextResponse.json(events)

  } catch (error) {
    console.error('Calendar events API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to check if user has access to a location
async function checkLocationAccess(supabase, profile, locationId) {
  try {
    // Check if user owns this barbershop
    const { data: ownedShop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('id', locationId)
      .eq('owner_id', profile.id)
      .single()

    if (ownedShop) {
      return true
    }

    // Check if user has direct association
    if (profile.shop_id === locationId || profile.barbershop_id === locationId) {
      return true
    }

    // Check if user is staff at this location
    const { data: staffAccess } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('barbershop_id', locationId)
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()

    return !!staffAccess
  } catch (error) {
    console.error('Error checking location access:', error)
    return false
  }
}

// Helper function to get user's primary shop
async function getUserPrimaryShop(supabase, profile) {
  try {
    // Try profile shop_id first
    if (profile.shop_id) {
      // // Debug log removed for production
return profile.shop_id
    }

    // Try profile barbershop_id
    if (profile.barbershop_id) {
      // // Debug log removed for production
return profile.barbershop_id
    }

    // Check if user owns a barbershop
    const { data: ownedShops } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', profile.id)
      .limit(1)

    if (ownedShops && ownedShops.length > 0) {
      // // Debug log removed for production
return ownedShops[0].id
    }

    // Check if user is staff at any barbershop
    const { data: staffShops } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .limit(1)

    if (staffShops && staffShops.length > 0) {
      // // Debug log removed for production
return staffShops[0].barbershop_id
    }

    // // Debug log removed for production
return null
  } catch (error) {
    console.error('Error getting user primary shop:', error)
    return null
  }
}

// Helper function to fetch related data
async function fetchRelatedData(supabase, appointments, locationIds) {
  const customerIds = [...new Set(appointments.map(apt => apt.customer_id).filter(Boolean))]
  const serviceIds = [...new Set(appointments.map(apt => apt.service_id).filter(Boolean))]
  const barberIds = [...new Set(appointments.map(apt => apt.barber_id).filter(Boolean))]

  // Fetch all related data in parallel
  const [customersResult, servicesResult, barbersResult, locationsResult] = await Promise.all([
    customerIds.length > 0 ? supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, phone')
      .in('id', customerIds)
      : Promise.resolve({ data: [] }),
    
    serviceIds.length > 0 ? supabase
      .from('services')
      .select('id, name, duration_minutes, price, description')
      .in('id', serviceIds)
      : Promise.resolve({ data: [] }),
      
    barberIds.length > 0 ? supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email')
      .in('id', barberIds)
      : Promise.resolve({ data: [] }),

    locationIds.length > 0 ? supabase
      .from('barbershops')
      .select('id, name, address, timezone')
      .in('id', locationIds)
      : Promise.resolve({ data: [] })
  ])

  return {
    customers: customersResult.data || [],
    services: servicesResult.data || [],
    barbers: barbersResult.data || [],
    locations: locationsResult.data || []
  }
}

// Helper function to transform appointment to FullCalendar.io event format
function transformAppointmentToEvent(appointment, { customers, services, barbers, locations, targetLocationIds }) {
  try {
    const customer = customers.find(c => c.id === appointment.customer_id)
    const service = services.find(s => s.id === appointment.service_id)
    const barber = barbers.find(b => b.id === appointment.barber_id)
    const location = locations.find(l => l.id === appointment.barbershop_id)

    // Create display names
    const customerName = customer ? 
      customer.full_name ||
      `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
      customer.email?.split('@')[0] || 
      'Customer' 
      : 'Walk-in'

    const barberName = barber ?
      barber.full_name || 
      `${barber.first_name || ''} ${barber.last_name || ''}`.trim() ||
      barber.email?.split('@')[0] ||
      'Barber'
      : 'Staff'

    const serviceName = service?.name || 'Service'
    const locationName = location?.name || 'Location'

    // Create calendar times with validation
    const appointmentDate = appointment.appointment_date
    const startTime = appointment.start_time || '09:00'
    const endTime = appointment.end_time || '10:00'

    // Safe date creation with validation
    const createSafeDateTime = (dateStr, timeStr) => {
      if (!dateStr || !timeStr) return null
      
      const [hours, minutes] = timeStr.split(':').map(Number)
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.warn('Invalid time format:', timeStr)
        return null
      }
      
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateStr)
        return null
      }
      
      date.setHours(hours, minutes, 0, 0)
      return date
    }

    const startDateTime = createSafeDateTime(appointmentDate, startTime)
    const endDateTime = createSafeDateTime(appointmentDate, endTime)

    // Skip invalid appointments
    if (!startDateTime || !endDateTime || startDateTime >= endDateTime) {
      console.warn('Invalid appointment date/time:', { appointmentDate, startTime, endTime })
      return null
    }

    // Return FullCalendar.io standard event format
    return {
      // Required FullCalendar.io fields
      id: `${appointment.id}-${appointment.barbershop_id}`,
      title: `${customerName} - ${serviceName}`,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      
      // Visual styling
      backgroundColor: getLocationColor(appointment.barbershop_id, targetLocationIds),
      borderColor: getLocationColor(appointment.barbershop_id, targetLocationIds),
      textColor: '#ffffff',
      
      // Extended properties for popups/details
      extendedProps: {
        appointmentId: appointment.id,
        customerId: appointment.customer_id,
        serviceId: appointment.service_id,
        barberId: appointment.barber_id,
        shopId: appointment.barbershop_id,
        customerName,
        serviceName,
        barberName,
        locationName,
        status: appointment.status || 'PENDING',
        price: appointment.total_price || service?.price || 0,
        notes: appointment.notes || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: location?.address || '',
        timezone: location?.timezone || 'America/New_York'
      },

      // Resource/location info for multi-location calendars
      resourceId: appointment.barbershop_id,
      resource: {
        id: appointment.barbershop_id,
        title: locationName
      }
    }
  } catch (error) {
    console.error('Error transforming appointment:', error, 'Appointment:', appointment)
    return null
  }
}

// Helper function to get different colors for different locations
function getLocationColor(locationId, allLocationIds) {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316'  // orange
  ]
  
  const index = allLocationIds.indexOf(locationId)
  return colors[index % colors.length] || '#3b82f6'
}