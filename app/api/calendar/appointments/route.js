import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const shopId = searchParams.get('shop_id')

    // // Debug log removed for production
// Get user's profile to find their barbershop - try both ID and email approaches
    let profile, profileError
    
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

    if (profileError || !profile) {
      console.error('Profile lookup failed:', { 
        userId: user.id, 
        userEmail: user.email, 
        profileError 
      })
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // // Debug log removed for production
// Get barbershop ID from profile or parameter
    let barbershopId = shopId || profile.shop_id || profile.barbershop_id

    if (!barbershopId) {
      // Check if user owns a barbershop
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)

      if (!ownedShops || ownedShops.length === 0) {
        return NextResponse.json({
          success: true,
          appointments: [],
          message: 'No barbershop found - setup required'
        })
      }
      
      barbershopId = ownedShops[0].id
    }

    // Build query for appointments
    let appointmentsQuery = supabase
      .from('appointments')
      .select(`
        id,
        customer_id,
        service_id,
        barber_id,
        appointment_date,
        start_time,
        end_time,
        status,
        total_price,
        notes,
        created_at,
        updated_at
      `)
      .eq('barbershop_id', barbershopId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Add date filters if provided
    if (startDate) {
      const startDateOnly = startDate.split('T')[0]
      appointmentsQuery = appointmentsQuery.gte('appointment_date', startDateOnly)
    }
    if (endDate) {
      const endDateOnly = endDate.split('T')[0]
      appointmentsQuery = appointmentsQuery.lte('appointment_date', endDateOnly)
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      // // Debug log removed for production
return NextResponse.json({
        success: true,
        appointments: [],
        barbershop_id: barbershopId,
        message: 'No appointments found for the specified period'
      })
    }
    
    // // Debug log removed for production
// Get unique customer IDs, service IDs, and barber IDs for additional data
    const customerIds = [...new Set(appointments.map(apt => apt.customer_id).filter(Boolean))]
    const serviceIds = [...new Set(appointments.map(apt => apt.service_id).filter(Boolean))]
    const barberIds = [...new Set(appointments.map(apt => apt.barber_id).filter(Boolean))]

    // Fetch customer data from profiles table
    let customers = []
    if (customerIds.length > 0) {
      // // Debug log removed for production
const { data: customerData, error: customerError } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, phone')
        .in('id', customerIds)
      
      if (customerError) {
        console.error('Error fetching customers:', customerError)
        // Continue without customer data rather than failing completely
      }
      customers = customerData || []
      // // Debug log removed for production
}

    // Fetch services data
    let services = []
    if (serviceIds.length > 0) {
      // // Debug log removed for production
const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price, description')
        .in('id', serviceIds)
      
      if (serviceError) {
        console.error('Error fetching services:', serviceError)
        // Continue without service data rather than failing completely
      }
      services = serviceData || []
      // // Debug log removed for production
}

    // Fetch barber data (from profiles)
    let barbers = []
    if (barberIds.length > 0) {
      // // Debug log removed for production
const { data: barberData, error: barberError } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email')
        .in('id', barberIds)
      
      if (barberError) {
        console.error('Error fetching barbers:', barberError)
        // Continue without barber data rather than failing completely
      }
      barbers = barberData || []
      // // Debug log removed for production
}

    // Transform appointments to include related data and calendar format
    // // Debug log removed for production
const transformedAppointments = appointments.map((appointment, index) => {
      try {
      const customer = customers.find(c => c.id === appointment.customer_id)
      const service = services.find(s => s.id === appointment.service_id)
      const barber = barbers.find(b => b.id === appointment.barber_id)

      // Create customer display name
      const customerName = customer ? 
        customer.full_name ||
        `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
        customer.email?.split('@')[0] || 
        'Customer' 
        : 'Walk-in'

      // Create barber display name
      const barberName = barber ?
        barber.full_name || 
        `${barber.first_name || ''} ${barber.last_name || ''}`.trim() ||
        barber.email?.split('@')[0] ||
        'Barber'
        : 'Staff'

      // Create start and end datetime strings for calendar with validation
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
      
      if (!startDateTime || !endDateTime) {
        console.error('Invalid appointment date/time:', { appointmentDate, startTime, endTime })
        return null // Skip this appointment
      }
      
      if (startDateTime >= endDateTime) {
        console.warn('Invalid appointment: start time must be before end time', { startTime, endTime })
        return null // Skip invalid appointments
      }
      
      // Format dates for calendar
      const startISOString = startDateTime.toISOString()
      const endISOString = endDateTime.toISOString()

      return {
        // Original appointment data
        id: appointment.id,
        customer_id: appointment.customer_id,
        service_id: appointment.service_id,
        barber_id: appointment.barber_id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status || 'PENDING',
        total_price: appointment.total_price || service?.price || 0,
        notes: appointment.notes || '',
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,

        // Related data
        customer_name: customerName,
        customer_email: customer?.email || '',
        customer_phone: customer?.phone || '',
        service_name: service?.name || 'Service',
        service_description: service?.description || '',
        barber_name: barberName,
        barber_email: barber?.email || '',

        // Calendar-specific fields for FullCalendar
        title: `${customerName} - ${service?.name || 'Service'}`,
        start: startISOString,
        end: endISOString,
        backgroundColor: getStatusColor(appointment.status || 'PENDING'),
        borderColor: getStatusColor(appointment.status || 'PENDING'),
        textColor: '#ffffff',
        extendedProps: {
          customerName,
          serviceName: service?.name || 'Service',
          barberName,
          status: appointment.status || 'PENDING',
          price: appointment.total_price || service?.price || 0,
          notes: appointment.notes || '',
          phone: customer?.phone || '',
          email: customer?.email || ''
        }
      }
      } catch (error) {
        console.error(`Error transforming appointment ${index}:`, error, 'Appointment data:', appointment)
        return null  // Skip this appointment
      }
    }).filter(appointment => appointment !== null)  // Filter out invalid appointments
    
    // // Debug log removed for production
return NextResponse.json({
      success: true,
      appointments: transformedAppointments,
      barbershop_id: barbershopId,
      count: transformedAppointments.length,
      date_range: {
        start: startDate,
        end: endDate
      }
    })

  } catch (error) {
    console.error('Calendar appointments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to get status colors for calendar
function getStatusColor(status) {
  const colors = {
    'PENDING': '#3b82f6',      // blue
    'CONFIRMED': '#10b981',    // green
    'COMPLETED': '#6b7280',    // gray
    'CANCELLED': '#ef4444',    // red
    'NO_SHOW': '#f59e0b'       // amber
  }
  return colors[status] || colors['PENDING']
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      customer_id,
      service_id,
      barber_id,
      appointment_date,
      start_time,
      end_time,
      total_price,
      notes
    } = body

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get shop ID
    let shopId = profile.shop_id || profile.barbershop_id

    if (!shopId) {
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)

      if (!ownedShops || ownedShops.length === 0) {
        return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
      }
      
      shopId = ownedShops[0].id
    }

    // Create appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        barbershop_id: shopId,
        customer_id,
        service_id,
        barber_id,
        appointment_date,
        start_time,
        end_time,
        status: 'PENDING',
        total_price: total_price || 0,
        notes: notes || ''
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating appointment:', createError)
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      appointment: appointment,
      message: 'Appointment created successfully'
    })

  } catch (error) {
    console.error('Create appointment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}