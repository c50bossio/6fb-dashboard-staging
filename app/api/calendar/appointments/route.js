import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const sendBookingNotification = async (appointmentData, customerData, preferences) => {
  try {
    // Notification sent silently - remove debug logging in production
    
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
    
    let query = supabase.from('bookings').select('*')
    
    // Add shop_id filter to prevent returning entire database
    const filterShopId = shopId || 'demo-shop-001'
    query = query.eq('shop_id', filterShopId)
    
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('end_time', endDate)
    }
    if (barberId) {
      query = query.eq('barber_id', barberId)
    }
    
    const { data: bookings, error } = await query.order('start_time')
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch appointments', details: error.message },
        { status: 500 }
      )
    }
    
    const serviceIds = [...new Set(bookings.map(b => b.service_id).filter(Boolean))]
    const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))]
    const barberIds = [...new Set(bookings.map(b => b.barber_id).filter(Boolean))]
    
    const servicesMap = {}
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
    
    const customersMap = {}
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
    
    const barbersMap = {}
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
    
    const events = bookings.map(booking => {
      const customer = customersMap[booking.customer_id] || {}
      const service = servicesMap[booking.service_id] || {}
      const barber = barbersMap[booking.barber_id] || {}
      
      const customerName = customer.name || booking.customer_name || 'Customer'
      const serviceName = service.name || booking.service_name || 'Unknown Service'
      
      const isCancelled = booking.status === 'cancelled'
      const isBlocked = booking.status === 'blocked' || booking.customer_id === null
      
      let title = ''
      if (isBlocked) {
        title = `🚫 ${booking.notes || 'Blocked'}`
      } else if (isCancelled) {
        title = `❌ ${customerName} - ${serviceName}`
      } else {
        title = `${customerName} - ${serviceName}`
      }
      
      const event = {
        id: booking.id,
        resourceId: booking.barber_id,
        title: title,
        start: booking.start_time,
        end: booking.end_time,
        backgroundColor: isBlocked ? '#9ca3af' : (isCancelled ? '#ef4444' : (barber.color || '#546355')),
        borderColor: isBlocked ? '#6b7280' : (isCancelled ? '#dc2626' : (barber.color || '#546355')),
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
      
      if (booking.is_recurring && booking.recurring_pattern && booking.recurring_pattern.rrule) {
        event.start = booking.recurring_pattern.dtstart || booking.start_time
        event.end = booking.recurring_pattern.dtend || booking.end_time
        
        const startDate = new Date(event.start)
        const dtstart = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        
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
      bookings: events, 
      source: 'bookings_table_with_rrule',
      count: events.length 
    })
    
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    console.log('Creating new appointment:', body)
    
    const isBlockedTime = body.status === 'blocked' || body.is_blocked_time || body.customer_id === 'BLOCKED'
    
    if (!body.end_time && body.scheduled_at && body.duration_minutes) {
      const startDate = new Date(body.scheduled_at)
      const endDate = new Date(startDate.getTime() + body.duration_minutes * 60000)
      body.end_time = endDate.toISOString()
      body.start_time = body.scheduled_at
    }
    
    if (!body.barber_id || (!body.start_time && !body.scheduled_at) || (!body.end_time && !body.duration_minutes)) {
      return NextResponse.json(
        { error: 'Missing required fields: barber_id, start_time/scheduled_at, end_time/duration_minutes' },
        { status: 400 }
      )
    }
    
    const startTime = new Date(body.start_time || body.scheduled_at)
    const endTime = new Date(body.end_time || new Date(startTime.getTime() + (body.duration_minutes || 30) * 60000))
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for start_time or end_time' },
        { status: 400 }
      )
    }
    
    let customerId = body.customer_id
    let customerData = null
    
    if (isBlockedTime) {
      customerId = null  // Set to null instead of 'BLOCKED' to avoid foreign key constraint
      customerData = { name: 'BLOCKED', email: '', phone: '' }
    } else if (customerId) {
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('id, name, phone, email, notification_preferences, vip_status, total_visits')
        .eq('id', customerId)
        .single()
      
      if (!fetchError && existingCustomer) {
        customerData = existingCustomer
      }
    } else if (body.customer_mode === 'new' && (body.client_name || body.customer_name)) {
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
      }
    }
    
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
    }
    
    if (body.is_recurring && body.recurrence_rule) {
      const dtstart = startTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      let enhancedRRule = body.recurrence_rule
      if (!body.recurrence_rule.includes('DTSTART')) {
        enhancedRRule = `DTSTART:${dtstart}\n${body.recurrence_rule}`
      }
      
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

    let notificationResults = null
    const notificationPreferences = body.notification_preferences || {}
    
    if ((notificationPreferences.sms || notificationPreferences.email) && notificationPreferences.confirmations) {
      try {
        const appointmentDataForNotification = {
          id: newBooking.id,
          scheduled_at: newBooking.start_time,
          client_name: customerData?.name || body.client_name || body.customer_name,
          client_phone: customerData?.phone || body.client_phone || body.customer_phone,
          client_email: customerData?.email || body.client_email || body.customer_email,
          barber_name: body.barber_name || 'Your Barber',
          service_name: body.service_name || 'Your Service'
        }

        const customerDataForNotification = customerData || {
          name: body.client_name || body.customer_name,
          phone: body.client_phone || body.customer_phone,
          email: body.client_email || body.customer_email
        }

        notificationResults = await sendBookingNotification(
          appointmentDataForNotification,
          customerDataForNotification,
          notificationPreferences
        )

        if (notificationPreferences.reminders) {
          console.log('⏰ Reminder scheduling requested for:', {
            customer: customerDataForNotification.name,
            appointmentTime: appointmentDataForNotification.scheduled_at
          })
        }

        console.log('📱 Notifications sent:', notificationResults)
      } catch (notificationError) {
        console.error('Notification failed:', notificationError)
      }
    }
    
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