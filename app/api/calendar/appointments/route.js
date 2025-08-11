import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Inline notification handler (can be moved to external service later)
const sendBookingNotification = async (appointmentData, customerData, preferences) => {
  try {
    console.log('📱 Booking notification would be sent:', {
      customer: customerData.name,
      appointment: appointmentData.scheduled_at,
      channels: Object.entries(preferences).filter(([k, v]) => v && ['sms', 'email'].includes(k)).map(([k]) => k)
    })
    
    return {
      success: true,
      notifications: [],
      summary: { sent: 0, total: 0, success_rate: '0%' }
    }
  } catch (error) {
    console.error('Notification error:', error)
    return { success: false, error: error.message, notifications: [] }
  }
}

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
    const shopId = searchParams.get('shop_id')
    
    console.log('🚨 API CRITICAL: Received parameters:', {
      startDate,
      endDate,
      barberId,
      shopId,
      allParams: Object.fromEntries(searchParams.entries())
    })
    
    // Use bookings table with new recurring fields
    let query = supabase.from('bookings').select('*')
    
    // 🚨 CRITICAL FIX: Add shop_id filter to prevent returning entire database
    // Default to demo shop if no shop_id provided
    const filterShopId = shopId || 'demo-shop-001'
    query = query.eq('shop_id', filterShopId)
    console.log('🔒 FILTERED by shop_id:', filterShopId)
    
    // Add other filters
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
      const serviceName = service.name || booking.service_name || 'Unknown Service'
      
      // Check if appointment is cancelled or blocked for proper styling
      const isCancelled = booking.status === 'cancelled'
      const isBlocked = booking.status === 'blocked' || booking.customer_id === null
      
      // Build title based on appointment type
      let title = ''
      if (isBlocked) {
        title = `🚫 ${booking.notes || 'Blocked'}`
      } else if (isCancelled) {
        title = `❌ ${customerName} - ${serviceName}`
      } else {
        title = `${customerName} - ${serviceName}`
      }
      
      // Build event object with RRule support at the top level
      const event = {
        id: booking.id,
        resourceId: booking.barber_id,
        title: title,
        start: booking.start_time,
        end: booking.end_time,
        backgroundColor: isBlocked ? '#9ca3af' : (isCancelled ? '#ef4444' : (barber.color || '#3b82f6')),
        borderColor: isBlocked ? '#6b7280' : (isCancelled ? '#dc2626' : (barber.color || '#3b82f6')),
        classNames: isBlocked ? ['blocked-slot'] : (isCancelled ? ['cancelled-appointment'] : []),
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
          isBlocked: isBlocked,
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
    
    // Check if this is a blocked time slot
    const isBlockedTime = body.status === 'blocked' || body.is_blocked_time || body.customer_id === 'BLOCKED'
    
    // Calculate end_time from scheduled_at and duration_minutes if not provided
    if (!body.end_time && body.scheduled_at && body.duration_minutes) {
      const startDate = new Date(body.scheduled_at)
      const endDate = new Date(startDate.getTime() + body.duration_minutes * 60000)
      body.end_time = endDate.toISOString()
      body.start_time = body.scheduled_at
    }
    
    // Validate required fields (relaxed for blocked time)
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
    
    // Handle customer creation/linking
    let customerId = body.customer_id
    let customerData = null
    
    // Skip customer handling for blocked time slots
    if (isBlockedTime) {
      customerId = null  // Set to null instead of 'BLOCKED' to avoid foreign key constraint
      customerData = { name: 'BLOCKED', email: '', phone: '' }
    } else if (customerId) {
      // If customer_id provided, fetch existing customer data
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('id, name, phone, email, notification_preferences, vip_status, total_visits')
        .eq('id', customerId)
        .single()
      
      if (!fetchError && existingCustomer) {
        customerData = existingCustomer
      }
    } else if (body.customer_mode === 'new' && (body.client_name || body.customer_name)) {
      // Create new customer for new customer mode
      const newCustomerData = {
        name: body.client_name || body.customer_name,
        email: body.client_email || body.customer_email,
        phone: body.client_phone || body.customer_phone,
        shop_id: body.shop_id || body.barbershop_id || 'demo-shop-001',
        notification_preferences: body.notification_preferences || {
          sms: true,
          email: true,
          confirmations: true,
          reminders: true
        }
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([newCustomerData])
        .select('id, name, phone, email, notification_preferences, vip_status, total_visits')
        .single()
      
      if (!customerError && customer) {
        customerId = customer.id
        customerData = customer
      } else {
        console.error('Error creating customer:', customerError)
        // Continue without customer_id if creation fails
      }
    }
    
    // Prepare booking data for new schema
    const bookingData = {
      shop_id: body.shop_id || body.barbershop_id || 'demo-shop-001',
      barber_id: body.barber_id,
      customer_id: customerId,
      service_id: isBlockedTime ? null : body.service_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: isBlockedTime ? 'blocked' : (body.status || 'confirmed'),
      price: isBlockedTime ? 0 : (body.service_price || body.price),
      notes: isBlockedTime ? (body.notes || 'Time blocked') : (body.client_notes || body.notes),
      is_test: body.is_test || false
      // Note: customer_name, customer_phone, customer_email columns don't exist in bookings table
      // Customer data is stored in the customers table and linked via customer_id
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

    // Handle notifications if requested
    let notificationResults = null
    const notificationPreferences = body.notification_preferences || {}
    
    if ((notificationPreferences.sms || notificationPreferences.email) && notificationPreferences.confirmations) {
      try {
        // Prepare appointment data for notifications
        const appointmentDataForNotification = {
          id: newBooking.id,
          scheduled_at: newBooking.start_time,
          client_name: customerData?.name || body.client_name || body.customer_name,
          client_phone: customerData?.phone || body.client_phone || body.customer_phone,
          client_email: customerData?.email || body.client_email || body.customer_email,
          barber_name: body.barber_name || 'Your Barber',
          service_name: body.service_name || 'Your Service'
        }

        // Use customer data if available, otherwise use data from request body
        const customerDataForNotification = customerData || {
          name: body.client_name || body.customer_name,
          phone: body.client_phone || body.customer_phone,
          email: body.client_email || body.customer_email
        }

        // Send booking confirmation
        notificationResults = await sendBookingNotification(
          appointmentDataForNotification,
          customerDataForNotification,
          notificationPreferences
        )

        // Schedule reminder if enabled (placeholder for now)
        if (notificationPreferences.reminders) {
          console.log('⏰ Reminder scheduling requested for:', {
            customer: customerDataForNotification.name,
            appointmentTime: appointmentDataForNotification.scheduled_at
          })
        }

        console.log('📱 Notifications sent:', notificationResults)
      } catch (notificationError) {
        console.error('Notification failed:', notificationError)
        // Don't fail the appointment creation if notifications fail
      }
    }
    
    // Return success response
    const response = {
      appointment: newBooking,
      message: bookingData.is_recurring 
        ? 'Recurring appointment created with RRule pattern' 
        : 'Single appointment created successfully',
      is_recurring: bookingData.is_recurring || false,
      customer_id: customerId,
      customer_created: !body.customer_id && customerId ? true : false
    }
    
    if (bookingData.is_recurring) {
      response.rrule = body.recurrence_rule
      response.recurring_pattern = bookingData.recurring_pattern
    }

    // Include notification results if applicable
    if (notificationResults) {
      response.notifications = {
        success: notificationResults.success,
        summary: notificationResults.summary,
        channels_attempted: notificationResults.notifications?.map(n => n.channel) || []
      }
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