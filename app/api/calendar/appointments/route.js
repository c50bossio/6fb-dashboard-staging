import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const barberId = searchParams.get('barber_id')
    
    // Use bookings table with new recurring fields
    let query = supabase.from('bookings').select('*')
    
    // Add filters
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('end_time', endDate)
    }
    if (barberId) {
      query = query.eq('barber_id', barberId)
    }
    
    // Execute query
    const { data: bookings, error } = await query.order('start_time')
    
    if (error) {
      console.log('Error fetching from bookings table:', error.message)
      return NextResponse.json(
        { error: 'Failed to fetch appointments', details: error.message },
        { status: 500 }
      )
    }
    
    // Fetch related data for better display
    const serviceIds = [...new Set(bookings.map(b => b.service_id).filter(Boolean))]
    const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))]
    const barberIds = [...new Set(bookings.map(b => b.barber_id).filter(Boolean))]
    
    // Fetch services
    let servicesMap = {}
    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .in('id', serviceIds)
      
      if (services) {
        services.forEach(s => {
          servicesMap[s.id] = s
        })
      }
    }
    
    // Fetch customers
    let customersMap = {}
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .in('id', customerIds)
      
      if (customers) {
        customers.forEach(c => {
          customersMap[c.id] = c
        })
      }
    }
    
    // Fetch barbers
    let barbersMap = {}
    if (barberIds.length > 0) {
      const { data: barbers } = await supabase
        .from('barbers')
        .select('id, name, color')
        .in('id', barberIds)
      
      if (barbers) {
        barbers.forEach(b => {
          barbersMap[b.id] = b
        })
      }
    }
    
    // Transform bookings to FullCalendar event format with RRule support
    const events = bookings.map(booking => {
      // Get related data
      const customer = customersMap[booking.customer_id] || {}
      const service = servicesMap[booking.service_id] || {}
      const barber = barbersMap[booking.barber_id] || {}
      
      // Build title with actual names
      const customerName = customer.name || booking.customer_name || 'Customer'
      const serviceName = service.name || booking.service_name || 'Service'
      
      // Build event object with RRule support at the top level
      const event = {
        id: booking.id,
        resourceId: booking.barber_id,
        title: `${customerName} - ${serviceName}`,
        start: booking.start_time,
        end: booking.end_time,
        backgroundColor: barber.color || '#3b82f6',
        borderColor: barber.color || '#3b82f6',
        display: 'auto',
        extendedProps: {
          customer: customerName,
          customerPhone: customer.phone || booking.customer_phone,
          customerEmail: customer.email || booking.customer_email,
          service: serviceName,
          service_id: booking.service_id,
          barber_id: booking.barber_id,
          duration: booking.duration_minutes || service.duration_minutes,
          price: booking.price || service.price,
          status: booking.status,
          notes: booking.notes,
          isRecurring: booking.is_recurring,
          isTest: booking.is_test,
          recurring_pattern: booking.recurring_pattern
        }
      }
      
      // Add RRule at the top level for FullCalendar native support
      if (booking.is_recurring && booking.recurring_pattern && booking.recurring_pattern.rrule) {
        // Keep the original start and end times
        event.start = booking.recurring_pattern.dtstart || booking.start_time
        event.end = booking.recurring_pattern.dtend || booking.end_time
        
        // Parse the RRule and add explicit DTSTART for FullCalendar compatibility
        // This ensures the time is preserved in recurring instances
        const startDate = new Date(event.start)
        const dtstart = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        
        // If RRule doesn't have DTSTART, add it as a separate line (RFC 5545 format)
        if (!booking.recurring_pattern.rrule.includes('DTSTART')) {
          event.rrule = `DTSTART:${dtstart}\n${booking.recurring_pattern.rrule}`
        } else {
          event.rrule = booking.recurring_pattern.rrule
        }
        
        console.log('🔧 Recurring event configured:', {
          title: event.title,
          start: event.start,
          end: event.end,
          rrule: event.rrule,
          startTime: new Date(event.start).toLocaleTimeString(),
          endTime: new Date(event.end).toLocaleTimeString()
        })
      }
      
      return event
    })
    
    return NextResponse.json({ 
      appointments: events, 
      source: 'bookings_table_with_rrule',
      count: events.length 
    })
    
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    console.log('Creating new appointment:', body)
    
    // Calculate end_time from scheduled_at and duration_minutes if not provided
    if (!body.end_time && body.scheduled_at && body.duration_minutes) {
      const startDate = new Date(body.scheduled_at)
      const endDate = new Date(startDate.getTime() + body.duration_minutes * 60000)
      body.end_time = endDate.toISOString()
      body.start_time = body.scheduled_at
    }
    
    // Validate required fields
    if (!body.barber_id || (!body.start_time && !body.scheduled_at) || (!body.end_time && !body.duration_minutes)) {
      return NextResponse.json(
        { error: 'Missing required fields: barber_id, start_time/scheduled_at, end_time/duration_minutes' },
        { status: 400 }
      )
    }
    
    // Validate date format
    const startTime = new Date(body.start_time || body.scheduled_at)
    const endTime = new Date(body.end_time || new Date(startTime.getTime() + (body.duration_minutes || 30) * 60000))
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for start_time or end_time' },
        { status: 400 }
      )
    }
    
    // Create customer if needed (for the new schema)
    let customerId = body.customer_id
    
    if (!customerId && (body.client_name || body.customer_name)) {
      // Try to create customer in customers table if it exists
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          name: body.client_name || body.customer_name,
          email: body.client_email || body.customer_email,
          phone: body.client_phone || body.customer_phone,
          shop_id: body.shop_id || body.barbershop_id || '1'
        }])
        .select()
        .single()
      
      if (!customerError && customer) {
        customerId = customer.id
      }
    }
    
    // Prepare booking data for new schema
    const bookingData = {
      shop_id: body.shop_id || body.barbershop_id || '1',
      barber_id: body.barber_id,
      customer_id: customerId,
      service_id: body.service_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: body.status || 'confirmed',
      price: body.service_price || body.price,
      notes: body.client_notes || body.notes,
      is_test: body.is_test || false
    }
    
    // Handle recurring appointments with native RRule support
    if (body.is_recurring && body.recurrence_rule) {
      // Add DTSTART to RRule for FullCalendar compatibility
      const dtstart = startTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      let enhancedRRule = body.recurrence_rule
      if (!body.recurrence_rule.includes('DTSTART')) {
        enhancedRRule = `DTSTART:${dtstart}\n${body.recurrence_rule}`
      }
      
      // Build the recurring pattern object
      const recurringPattern = {
        rrule: enhancedRRule,
        dtstart: startTime.toISOString(),
        dtend: endTime.toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'booking_api'
      }
      
      bookingData.is_recurring = true
      bookingData.recurring_pattern = recurringPattern
    }
    
    // Insert the single booking record (FullCalendar will handle recurring instances)
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single()
    
    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create appointment', details: bookingError.message },
        { status: 500 }
      )
    }
    
    // Return success response
    const response = {
      appointment: newBooking,
      message: bookingData.is_recurring 
        ? 'Recurring appointment created with RRule pattern' 
        : 'Single appointment created successfully',
      is_recurring: bookingData.is_recurring || false
    }
    
    if (bookingData.is_recurring) {
      response.rrule = body.recurrence_rule
      response.recurring_pattern = bookingData.recurring_pattern
    }
    
    console.log('Successfully created appointment:', response)
    
    return NextResponse.json(response, { status: 201 })
    
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment', details: error.message },
      { status: 500 }
    )
  }
}