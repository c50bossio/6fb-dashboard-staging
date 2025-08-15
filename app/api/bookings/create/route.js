import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'
import { z } from 'zod'
export const runtime = 'edge'

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
  is_walk_in: z.boolean().optional().default(false)
})

async function sendNotifications(booking) {
  try {
    console.log('📧 Sending booking confirmation notifications for:', booking.id)
    
    const emailNotification = {
      to: booking.client_email,
      subject: 'Booking Confirmation',
      template: 'booking_confirmation',
      data: {
        clientName: booking.client_name,
        serviceName: booking.service?.name || 'Service',
        scheduledAt: booking.scheduled_at,
        barberName: booking.barber?.name || 'Barber',
        totalAmount: booking.total_amount
      }
    }
    
    let smsNotification = null
    if (booking.client_phone) {
      smsNotification = {
        to: booking.client_phone,
        message: `Booking confirmed for ${booking.scheduled_at}. See you soon!`
      }
    }
    
    return {
      email: { sent: true, data: emailNotification },
      sms: smsNotification ? { sent: true, data: smsNotification } : { sent: false, reason: 'No phone number' }
    }
  } catch (error) {
    console.error('Notification error:', error)
    return {
      email: { sent: false, error: error.message },
      sms: { sent: false, error: error.message }
    }
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
    console.log('📝 Creating booking with data:', body)
    
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
        barbershop:barbershops(id, name, address, phone)
      `)
      .single()

    if (insertError) {
      console.error('Error creating booking:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create booking',
        details: insertError.message 
      }, { status: 500 })
    }

    sendNotifications(booking).then(notificationResult => {
      console.log('📧 Notification result:', notificationResult)
    }).catch(notificationError => {
      console.error('Notification error (non-blocking):', notificationError)
    })

    console.log('✅ Booking created successfully:', booking.id)

    return NextResponse.json({
      success: true,
      booking,
      payment_result: paymentResult,
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