import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { locationIds, startDate, endDate } = body

    console.log('Calendar multi-location-events request:', {
      locationIds,
      startDate,
      endDate,
      userEmail: user.email
    })
    
    // Validate date parameters
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return NextResponse.json({ 
        error: 'Invalid startDate format. Use YYYY-MM-DD' 
      }, { status: 400 })
    }
    
    if (endDate && isNaN(new Date(endDate).getTime())) {
      return NextResponse.json({ 
        error: 'Invalid endDate format. Use YYYY-MM-DD' 
      }, { status: 400 })
    }

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ 
        error: 'locationIds array is required and must not be empty' 
      }, { status: 400 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user has access to all requested locations
    const accessibleLocations = []

    for (const locationId of locationIds) {
      // Check if user owns this barbershop
      const { data: ownedShop } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('id', locationId)
        .eq('owner_id', profile.id)
        .single()

      if (ownedShop) {
        accessibleLocations.push(locationId)
        continue
      }

      // Check if user has direct association
      if (profile.shop_id === locationId || profile.barbershop_id === locationId) {
        accessibleLocations.push(locationId)
        continue
      }

      // Check if user is staff at this location
      const { data: staffAccess } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('barbershop_id', locationId)
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .single()

      if (staffAccess) {
        accessibleLocations.push(locationId)
      }
    }

    if (accessibleLocations.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        locations: [],
        message: 'No accessible locations found'
      })
    }

    // Build appointments query for all accessible locations
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
      .in('shop_id', accessibleLocations)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Add date filters if provided
    if (startDate) {
      appointmentsQuery = appointmentsQuery.gte('appointment_date', startDate)
    }
    if (endDate) {
      appointmentsQuery = appointmentsQuery.lte('appointment_date', endDate)
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      console.error('Error fetching multi-location appointments:', appointmentsError)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        locations: accessibleLocations,
        message: 'No appointments found for the specified locations and period'
      })
    }

    // Get location details
    const { data: locations, error: locationsError } = await supabase
      .from('barbershops')
      .select('id, name, address, timezone')
      .in('id', accessibleLocations)

    if (locationsError) {
      console.error('Error fetching location details:', locationsError)
    }

    // Get unique IDs for related data
    const customerIds = [...new Set(appointments.map(apt => apt.customer_id).filter(Boolean))]
    const serviceIds = [...new Set(appointments.map(apt => apt.service_id).filter(Boolean))]
    const barberIds = [...new Set(appointments.map(apt => apt.barber_id).filter(Boolean))]

    // Fetch related data in parallel
    const [customersResult, servicesResult, barbersResult] = await Promise.all([
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
        : Promise.resolve({ data: [] })
    ])

    const customers = customersResult.data || []
    const services = servicesResult.data || []
    const barbers = barbersResult.data || []

    // Transform appointments to events format
    const events = appointments.map(appointment => {
      const location = locations?.find(l => l.id === appointment.barbershop_id)
      const customer = customers.find(c => c.id === appointment.customer_id)
      const service = services.find(s => s.id === appointment.service_id)
      const barber = barbers.find(b => b.id === appointment.barber_id)

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
      const duration = service?.duration_minutes || 60

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
      if (!startDateTime || !endDateTime) {
        console.error('Invalid appointment date/time:', { appointmentDate, startTime, endTime })
        return null
      }
      
      if (startDateTime >= endDateTime) {
        console.warn('Invalid appointment: start time must be before end time', { startTime, endTime })
        return null
      }

      return {
        // Event ID and basic info
        id: `${appointment.id}-${appointment.barbershop_id}`,
        appointment_id: appointment.id,
        location_id: appointment.barbershop_id,
        
        // Calendar display
        title: `${customerName} - ${serviceName}`,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        
        // Visual styling
        backgroundColor: getLocationColor(appointment.barbershop_id, accessibleLocations),
        borderColor: getLocationColor(appointment.barbershop_id, accessibleLocations),
        textColor: '#ffffff',
        
        // Extended properties
        extendedProps: {
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
          timezone: location?.timezone || 'America/New_York',
          duration: duration,
          // Multi-location specific
          isMultiLocation: true,
          locationId: appointment.barbershop_id
        },

        // Resource/location info for calendar grouping
        resourceId: appointment.barbershop_id,
        resource: {
          id: appointment.barbershop_id,
          title: locationName,
          businessHours: {
            startTime: '09:00',
            endTime: '18:00'
          }
        }
      }
    }).filter(event => event !== null)  // Filter out invalid appointments

    // Group events by location for summary
    const eventsByLocation = {}
    events.forEach(event => {
      const locationId = event.location_id
      if (!eventsByLocation[locationId]) {
        eventsByLocation[locationId] = {
          location_id: locationId,
          location_name: event.extendedProps.locationName,
          count: 0,
          events: []
        }
      }
      eventsByLocation[locationId].count++
      eventsByLocation[locationId].events.push(event)
    })

    return NextResponse.json({
      success: true,
      events: events,
      locations: accessibleLocations,
      location_details: locations || [],
      events_by_location: eventsByLocation,
      summary: {
        total_events: events.length,
        total_locations: accessibleLocations.length,
        date_range: {
          start: startDate,
          end: endDate
        }
      }
    })

  } catch (error) {
    console.error('Calendar multi-location-events API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
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

export async function GET(request) {
  // Support GET method by extracting params from query string
  try {
    const { searchParams } = new URL(request.url)
    const locationIds = searchParams.get('location_ids')?.split(',') || []
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Create a mock request body for the POST handler
    const mockRequest = {
      json: async () => ({
        locationIds,
        startDate,
        endDate
      })
    }

    return await POST(mockRequest)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
  }
}