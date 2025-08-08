import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Import backend services
// Note: In production, these would be proper service instances
async function createBookingService(bookingData) {
  // This would call the Python booking_service.py
  // For now, we'll implement a basic version
  
  const booking = {
    id: `booking_${Date.now()}`,
    ...bookingData,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  }
  
  return booking
}

async function sendNotifications(booking) {
  // This would call the notification_service.py
  // For now, we'll simulate sending notifications
  
  console.log('Sending booking confirmation notifications...')
  
  return {
    email: { sent: true },
    sms: { sent: true }
  }
}

async function processPayment(paymentData) {
  // This would call the payment_service.py
  // For now, we'll simulate payment processing
  
  if (paymentData.paymentMethod === 'online') {
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount: paymentData.amountPaid
    }
  }
  
  return {
    success: true,
    pending: true,
    message: 'Payment to be collected at appointment'
  }
}

export async function POST(request) {
  try {
    const bookingData = await request.json()
    
    // Validate required fields
    const requiredFields = ['location', 'barber', 'service', 'dateTime', 'customerInfo']
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Process payment if online
    let paymentResult = null
    if (bookingData.paymentMethod === 'online' && bookingData.amountPaid > 0) {
      paymentResult = await processPayment(bookingData)
      
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: 'Payment processing failed' },
          { status: 400 }
        )
      }
    }
    
    // Create booking
    const booking = await createBookingService({
      ...bookingData,
      paymentResult
    })
    
    // Send notifications
    try {
      await sendNotifications(booking)
    } catch (notificationError) {
      console.error('Notification error:', notificationError)
      // Don't fail the booking if notifications fail
    }
    
    // Store in database (if Supabase is configured)
    const supabase = createClient()
    
    try {
      const { data: dbBooking, error } = await supabase
        .from('appointments')
        .insert([{
          id: booking.id,
          customer_id: booking.customerInfo.email, // In production, use proper customer ID
          barber_id: booking.barber,
          service_id: booking.service,
          location_id: booking.location,
          start_time: booking.dateTime,
          end_time: new Date(new Date(booking.dateTime).getTime() + booking.duration * 60000).toISOString(),
          duration: booking.duration,
          status: 'confirmed',
          total_price: booking.price,
          payment_method: booking.paymentMethod,
          payment_status: booking.paymentMethod === 'online' ? 'paid' : 'pending',
          notes: booking.notes,
          customer_name: booking.customerInfo.name,
          customer_email: booking.customerInfo.email,
          customer_phone: booking.customerInfo.phone,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (!error && dbBooking) {
        booking.id = dbBooking.id
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Continue even if database fails in dev
    }
    
    return NextResponse.json({
      success: true,
      booking,
      message: 'Booking confirmed successfully'
    })
    
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking', details: error.message },
      { status: 500 }
    )
  }
}