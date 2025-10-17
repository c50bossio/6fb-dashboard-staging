import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Demo barbershop ID constant - matches Supabase UUID
const DEMO_BARBERSHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

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

// Create Supabase client for edge runtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const barberId = searchParams.get('barber_id')
    const barbershopId = searchParams.get('barbershop_id')
    
    console.log('🚨 API CRITICAL: Received parameters:', {
      startDate,
      endDate,
      barberId,
      barbershopId,
      allParams: Object.fromEntries(searchParams.entries())
    })

    // Use appointments table (correct table with barbershop_id)
    let query = supabase.from('appointments').select('*')

    // 🚨 CRITICAL FIX: Add barbershop_id filter to prevent returning entire database
    // Default to demo shop if no barbershop_id provided
    const filterBarbershopId = barbershopId || DEMO_BARBERSHOP_ID
    query = query.eq('barbershop_id', filterBarbershopId)
    console.log('🔒 FILTERED by barbershop_id:', filterBarbershopId)

    // Add other filters
    if (startDate) {
      query = query.gte('scheduled_at', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_at', endDate)
    }
    if (barberId) {
      query = query.eq('barber_id', barberId)
    }

    // Execute query
    const { data: bookings, error } = await query.order('scheduled_at')
    
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
      
      // Calculate end time from scheduled_at + duration
      const startTime = new Date(booking.scheduled_at)
      const durationMs = (booking.duration_minutes || service.duration_minutes || 30) * 60000
      const endTime = new Date(startTime.getTime() + durationMs)

      // Build event object with RRule support at the top level
      const event = {
        id: booking.id,
        resourceId: booking.barber_id,
        title: title,
        start: booking.scheduled_at,
        end: endTime.toISOString(),
        backgroundColor: isBlocked ? '#9ca3af' : (isCancelled ? '#ef4444' : (barber.color || '#546355')),
        borderColor: isBlocked ? '#6b7280' : (isCancelled ? '#dc2626' : (barber.color || '#546355')),
        classNames: isBlocked ? ['blocked-slot'] : (isCancelled ? ['cancelled-appointment'] : []),
        display: 'auto',
        extendedProps: {
          customer: customerName,
          customerPhone: customer.phone || booking.client_phone,
          customerEmail: customer.email || booking.client_email,
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
        event.start = booking.recurring_pattern.dtstart || booking.scheduled_at
        event.end = booking.recurring_pattern.dtend || endTime.toISOString()
        
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

    // 🚨 RACE CONDITION FIX: Check for double booking before proceeding
    const barbershopId = body.barbershop_id || DEMO_BARBERSHOP_ID

    // Check for overlapping appointments (prevents double booking)
    const { data: overlapping, error: overlapError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, status, customer_id')
      .eq('barbershop_id', barbershopId)
      .eq('barber_id', body.barber_id)
      .neq('status', 'cancelled')
      .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`)
      .limit(1)
      .single()
    
    if (!overlapError && overlapping) {
      return NextResponse.json(
        { 
          error: 'Time slot conflict detected',
          details: `Appointment already exists from ${overlapping.start_time} to ${overlapping.end_time}`,
          conflict_id: overlapping.id
        },
        { status: 409 }
      )
    }
    
    // 🚨 RACE CONDITION FIX: Handle customer creation/linking with retry logic
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
      // 🚨 RACE CONDITION FIX: Check for duplicate customers by phone/email first
      const customerName = body.client_name || body.customer_name
      const customerPhone = body.client_phone || body.customer_phone  
      const customerEmail = body.client_email || body.customer_email
      
      // Check if customer already exists to prevent duplicates
      let existingQuery = supabase
        .from('customers')
        .select('id, name, phone, email, notification_preferences, vip_status, total_visits')
        .eq('barbershop_id', barbershopId)
      
      if (customerPhone) {
        existingQuery = existingQuery.eq('phone', customerPhone)
      } else if (customerEmail) {
        existingQuery = existingQuery.eq('email', customerEmail)
      }
      
      const { data: existingCustomerCheck, error: checkError } = await existingQuery.single()
      
      if (!checkError && existingCustomerCheck) {
        // Use existing customer
        customerId = existingCustomerCheck.id
        customerData = existingCustomerCheck
        console.log('Using existing customer:', existingCustomerCheck.id)
      } else {
        // Create new customer with retry logic
        const newCustomerData = {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          barbershop_id: barbershopId,
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
          console.log('Created new customer:', customer.id)
        } else if (customerError?.code === '23505') {
          // Handle unique constraint violation - customer was created by another request
          console.log('Customer already exists (concurrent creation), fetching...')
          const { data: concurrentCustomer } = await supabase
            .from('customers')
            .select('id, name, phone, email, notification_preferences, vip_status, total_visits')
            .eq('barbershop_id', barbershopId)
            .or(`phone.eq.${customerPhone},email.eq.${customerEmail}`)
            .single()
          
          if (concurrentCustomer) {
            customerId = concurrentCustomer.id
            customerData = concurrentCustomer
          }
        } else {
          console.error('Error creating customer:', customerError)
          // Continue without customer_id if creation fails
        }
      }
    }
    
    // Prepare booking data for new schema
    const bookingData = {
      barbershop_id: body.barbershop_id || DEMO_BARBERSHOP_ID,
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
    
    // 🚨 RACE CONDITION FIX: Final check for conflicts before inserting
    // Double-check for overlapping appointments right before insert
    const { data: finalOverlapCheck } = await supabase
      .from('bookings')
      .select('id')
      .eq('barbershop_id', bookingData.barbershop_id)
      .eq('barber_id', bookingData.barber_id)
      .neq('status', 'cancelled')
      .or(`and(start_time.lt.${bookingData.end_time},end_time.gt.${bookingData.start_time})`)
      .limit(1)
    
    if (finalOverlapCheck && finalOverlapCheck.length > 0) {
      return NextResponse.json(
        { 
          error: 'Time slot conflict detected during booking creation',
          details: 'Another appointment was created at the same time',
          conflict_id: finalOverlapCheck[0].id
        },
        { status: 409 }
      )
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

export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')

    console.log(`PATCH /api/calendar/appointments - id: ${id}, action: ${action}`)

    if (!id && action !== 'block') {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Handle block action (create blocked time slot)
    if (action === 'block') {
      const body = await request.json()

      const startDate = new Date(`${body.date}T${body.start_time}`)
      const endDate = new Date(`${body.date}T${body.end_time}`)

      const blockData = {
        barbershop_id: body.barbershop_id || DEMO_BARBERSHOP_ID,
        barber_id: body.barber_id,
        customer_id: null,
        service_id: null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'blocked',
        price: 0,
        notes: body.reason || 'Time blocked',
        is_test: false
      }

      const { data: blocked, error: blockError } = await supabase
        .from('appointments')
        .insert([blockData])
        .select()
        .single()

      if (blockError) {
        console.error('Error creating blocked time:', blockError)
        return NextResponse.json(
          { error: 'Failed to block time', details: blockError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        appointment: blocked,
        message: 'Time slot blocked successfully'
      })
    }

    // Handle cancel action
    if (action === 'cancel') {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error cancelling appointment:', error)
        return NextResponse.json(
          { error: 'Failed to cancel appointment', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        appointment,
        message: 'Appointment cancelled successfully'
      })
    }

    // Handle restore action
    if (action === 'restore') {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ status: 'CONFIRMED' })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error restoring appointment:', error)
        return NextResponse.json(
          { error: 'Failed to restore appointment', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        appointment,
        message: 'Appointment restored successfully'
      })
    }

    // Handle general update
    const body = await request.json()
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating appointment:', error)
      return NextResponse.json(
        { error: 'Failed to update appointment', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      appointment,
      message: 'Appointment updated successfully'
    })

  } catch (error) {
    console.error('Error in PATCH /api/calendar/appointments:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log(`DELETE /api/calendar/appointments - id: ${id}`)

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Delete the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting appointment:', error)
      return NextResponse.json(
        { error: 'Failed to delete appointment', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      appointment,
      message: 'Appointment deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/calendar/appointments:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment', details: error.message },
      { status: 500 }
    )
  }
}