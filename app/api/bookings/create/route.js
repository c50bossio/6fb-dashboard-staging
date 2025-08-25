import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '../../../../lib/supabase/client'

// Import the existing services
const { calendarIntegrationService } = require('../../../../services/calendar-integration-service')
const { integrationConfigService } = require('../../../../services/integration-config-service')
const { notificationService } = require('../../../../services/notification-service')

export const runtime = 'nodejs'

const bookingSchema = z.object({
  barbershop_id: z.string().min(1),
  barber_id: z.string().min(1),
  service_id: z.string().min(1),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().min(15).max(480),
  service_price: z.number().min(0),
  tip_amount: z.number().min(0).optional().default(0),
  client_name: z.string().min(1).max(255),
  client_phone: z.string().max(20).optional(),
  client_email: z.string().email(),
  client_notes: z.string().max(500).optional(),
  payment_method: z.enum(['online', 'cash', 'card']).optional().default('cash'),
  is_walk_in: z.boolean().optional().default(false),
  // New fields for customer preferences
  sms_opt_in: z.boolean().optional().default(false),
  email_opt_in: z.boolean().optional().default(true),
  marketing_opt_in: z.boolean().optional().default(false)
})

async function sendNotificationsAndSync(booking, barbershopData, barberData) {
  const results = {
    notifications: { success: false, results: [] },
    calendar_sync: { success: false, message: 'Not attempted' }
  }

  try {
    console.log('🔔 Starting notification and calendar sync process...')

    // Prepare notification data structure
    const notificationData = {
      booking: {
        id: booking.id,
        appointment_date: booking.scheduled_at.split('T')[0],
        appointment_time: new Date(booking.scheduled_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        service_name: booking.service?.name || 'Service',
        total_amount: booking.total_amount,
        notes: booking.client_notes
      },
      customer: {
        id: booking.id, // Using booking ID as customer identifier
        first_name: booking.client_name.split(' ')[0] || booking.client_name,
        last_name: booking.client_name.split(' ').slice(1).join(' ') || '',
        name: booking.client_name,
        email: booking.client_email,
        phone: booking.client_phone,
        sms_opt_in: booking.sms_opt_in || false,
        email_opt_in: booking.email_opt_in !== false
      },
      barbershop: {
        id: booking.barbershop_id,
        name: barbershopData?.name || 'Barbershop',
        phone: barbershopData?.phone || '',
        address: barbershopData?.address || ''
      },
      barber: {
        first_name: barberData?.name?.split(' ')[0] || barberData?.name || 'Barber',
        last_name: barberData?.name?.split(' ').slice(1).join(' ') || '',
        name: barberData?.name || 'Barber'
      }
    }

    // Send notifications via notification service
    try {
      const notificationResult = await notificationService.sendAppointmentConfirmation(notificationData)
      results.notifications = notificationResult
      console.log('📧 Notifications sent:', notificationResult)
    } catch (error) {
      console.error('❌ Notification service error:', error)
      results.notifications = {
        success: false,
        error: error.message,
        results: []
      }
    }

    // Try calendar sync if configured for the barbershop
    try {
      // Get the barber's user ID to check for calendar integration
      const { data: barberUser } = await createClient()
        .from('profiles')
        .select('id')
        .eq('id', booking.barber_id)
        .single()

      if (barberUser) {
        // Check if Google Calendar is configured for this user
        const calendarStatus = await integrationConfigService.checkIntegrationStatus(
          'google_calendar',
          booking.barbershop_id,
          barberUser.id
        )

        if (calendarStatus.enabled && calendarStatus.healthy) {
          // Prepare calendar appointment data
          const appointmentData = {
            title: `${booking.service?.name || 'Appointment'} - ${booking.client_name}`,
            description: booking.client_notes || '',
            startDateTime: booking.scheduled_at,
            endDateTime: new Date(new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60000).toISOString(),
            customerName: booking.client_name,
            customerEmail: booking.client_email,
            customerPhone: booking.client_phone,
            barbershopName: barbershopData?.name || 'Barbershop',
            barbershopAddress: barbershopData?.address || '',
            barberName: barberData?.name || 'Barber',
            serviceName: booking.service?.name || 'Service',
            bookingId: booking.id,
            timeZone: barbershopData?.timezone || 'America/New_York'
          }

          const calendarResult = await calendarIntegrationService.createAppointmentEvent(
            barberUser.id,
            appointmentData
          )
          
          results.calendar_sync = calendarResult
          console.log('📅 Calendar sync result:', calendarResult)
        } else {
          results.calendar_sync = {
            success: false,
            message: 'Google Calendar not configured or not healthy for this barber'
          }
          console.log('📅 Calendar sync skipped - not configured')
        }
      }
    } catch (error) {
      console.error('❌ Calendar sync error:', error)
      results.calendar_sync = {
        success: false,
        error: error.message,
        message: 'Calendar sync failed'
      }
    }

    return results

  } catch (error) {
    console.error('❌ Overall notification/sync error:', error)
    results.notifications = {
      success: false,
      error: error.message,
      results: []
    }
    return results
  }
}

async function processPayment(paymentData, bookingAmount) {
  try {
    if (paymentData.payment_method === 'online') {
      return {
        success: true,
        transaction_id: `txn_${Date.now()}`,
        amount: bookingAmount,
        payment_method: 'online',
        status: 'completed'
      }
    }
    
    return {
      success: true,
      pending: true,
      payment_method: paymentData.payment_method,
      message: 'Payment to be collected at appointment',
      status: 'pending'
    }
  } catch (error) {
    console.error('Payment processing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const validationResult = bookingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const bookingData = validationResult.data

    const total_amount = bookingData.service_price + (bookingData.tip_amount || 0)

    const conflictCheck = await supabase
      .from('bookings')
      .select('id, scheduled_at, duration_minutes')
      .eq('barber_id', bookingData.barber_id)
      .eq('status', 'CONFIRMED')

    if (conflictCheck.error) {
      console.error('Error checking conflicts:', conflictCheck.error)
      return NextResponse.json({ error: 'Failed to check time conflicts' }, { status: 500 })
    }

    const newStart = new Date(bookingData.scheduled_at)
    const newEnd = new Date(newStart.getTime() + bookingData.duration_minutes * 60000)

    const hasConflict = conflictCheck.data?.some(existing => {
      const existingStart = new Date(existing.scheduled_at)
      const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60000)
      
      return (newStart < existingEnd && newEnd > existingStart)
    })

    if (hasConflict) {
      return NextResponse.json({
        error: 'Time conflict detected',
        message: 'The selected time slot conflicts with an existing appointment'
      }, { status: 409 })
    }

    let paymentResult = null
    if (bookingData.payment_method === 'online' && total_amount > 0) {
      paymentResult = await processPayment(bookingData, total_amount)
      
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: 'Payment processing failed', details: paymentResult.error },
          { status: 400 }
        )
      }
    }

    const bookingInsert = {
      barbershop_id: bookingData.barbershop_id,
      barber_id: bookingData.barber_id,
      service_id: bookingData.service_id,
      scheduled_at: bookingData.scheduled_at,
      duration_minutes: bookingData.duration_minutes,
      service_price: bookingData.service_price,
      tip_amount: bookingData.tip_amount || 0,
      total_amount,
      client_name: bookingData.client_name,
      client_email: bookingData.client_email,
      client_phone: bookingData.client_phone,
      client_notes: bookingData.client_notes,
      payment_method: bookingData.payment_method,
      payment_status: paymentResult?.status || 'pending',
      transaction_id: paymentResult?.transaction_id,
      is_walk_in: bookingData.is_walk_in,
      sms_opt_in: bookingData.sms_opt_in || false,
      email_opt_in: bookingData.email_opt_in !== false,
      marketing_opt_in: bookingData.marketing_opt_in || false,
      status: 'CONFIRMED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingInsert)
      .select(`
        *,
        barber:profiles!bookings_barber_id_fkey(id, name, email),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone, brand_colors)
      `)
      .single()

    if (insertError) {
      console.error('Error creating booking:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create booking',
        details: insertError.message 
      }, { status: 500 })
    }

    // Send notifications and sync to calendar asynchronously but capture results
    let integrationResults = {
      notifications: { success: false, message: 'Not attempted' },
      calendar_sync: { success: false, message: 'Not attempted' }
    }

    try {
      integrationResults = await sendNotificationsAndSync(
        booking, 
        booking.barbershop, 
        booking.barber
      )
      console.log('✅ Integration results:', integrationResults)
    } catch (error) {
      console.error('❌ Integration error (non-blocking):', error)
      integrationResults = {
        notifications: { success: false, error: error.message },
        calendar_sync: { success: false, error: error.message }
      }
    }

    return NextResponse.json({
      success: true,
      booking,
      payment_result: paymentResult,
      integrations: integrationResults,
      message: 'Booking confirmed successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}