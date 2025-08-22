import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

// Rate limiting helper (in production, use Redis or similar)
const recentBookings = new Map()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_BOOKINGS_PER_IP = 3

function checkRateLimit(ip) {
  const now = Date.now()
  const bookings = recentBookings.get(ip) || []
  
  // Clean old entries
  const recentValid = bookings.filter(time => now - time < RATE_LIMIT_WINDOW)
  
  if (recentValid.length >= MAX_BOOKINGS_PER_IP) {
    return false
  }
  
  recentValid.push(now)
  recentBookings.set(ip, recentValid)
  return true
}

export async function POST(request) {
  try {
    // Get IP for rate limiting
    const headersList = headers()
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               'unknown'
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Too many booking attempts. Please wait a minute and try again.'
      }, { status: 429 })
    }

    const body = await request.json()
    const {
      barbershop_id,
      service_id,
      service_name,
      scheduled_at,
      duration_minutes,
      price,
      customer_name,
      customer_phone,
      customer_email,
      customer_notes,
      source
    } = body

    // Validate required fields
    if (!barbershop_id || !service_id || !scheduled_at || !customer_name || !customer_phone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (customer_email && !emailRegex.test(customer_email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    if (!phoneRegex.test(customer_phone)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone format'
      }, { status: 400 })
    }

    // Use service role key for public bookings to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if the barbershop exists and is accepting bookings
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, booking_settings, business_hours')
      .eq('id', barbershop_id)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found'
      }, { status: 404 })
    }

    // Check if public booking is enabled (from booking_settings)
    const bookingSettings = barbershop.booking_settings || {}
    if (bookingSettings.requireAuth === true) {
      return NextResponse.json({
        success: false,
        error: 'This barbershop requires account registration to book'
      }, { status: 403 })
    }

    // Check if the time slot is available
    const scheduledDate = new Date(scheduled_at)
    const endTime = new Date(scheduledDate.getTime() + duration_minutes * 60000)

    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('shop_id', barbershop_id)
      .eq('status', 'confirmed')
      .gte('start_time', scheduledDate.toISOString())
      .lt('start_time', endTime.toISOString())

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'This time slot is no longer available'
      }, { status: 409 })
    }

    // Create the booking - only include fields that exist in the database
    const bookingData = {
      shop_id: barbershop_id,
      service_id: service_id,
      service_name: service_name || 'Service',
      start_time: scheduledDate.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: duration_minutes || 30,
      price: price || 0,
      status: 'confirmed',
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_email: customer_email?.trim() || null,
      notes: customer_notes || null,
      // No customer_id or barber_id for public bookings initially
      customer_id: null,
      barber_id: null,
      barber_name: null,
      is_test: false,
      is_recurring: false
      // Don't set timestamps - let database defaults handle them
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      console.error('Booking data attempted:', bookingData)
      return NextResponse.json({
        success: false,
        error: 'Failed to create booking',
        details: bookingError.message
      }, { status: 500 })
    }

    // Send confirmation email (async, don't wait)
    sendConfirmationEmail(booking, barbershop).catch(console.error)

    // Return success with booking details
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        service: booking.service_name,
        datetime: booking.start_time,
        duration: booking.duration_minutes,
        price: booking.price,
        customer_name: booking.customer_name,
        confirmation_sent_to: booking.customer_email
      },
      message: 'Booking confirmed successfully'
    })

  } catch (error) {
    console.error('Public booking API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to send confirmation emails
async function sendConfirmationEmail(booking, barbershop) {
  if (!booking.customer_email) return

  try {
    // In production, integrate with email service (SendGrid, etc.)
    console.log('Sending confirmation email to:', booking.customer_email)
    
    // For now, just log the email content
    const emailContent = {
      to: booking.customer_email,
      subject: `Booking Confirmation - ${barbershop.name}`,
      html: `
        <h2>Booking Confirmed!</h2>
        <p>Hi ${booking.customer_name},</p>
        <p>Your appointment has been confirmed:</p>
        <ul>
          <li><strong>Service:</strong> ${booking.service_name}</li>
          <li><strong>Date & Time:</strong> ${new Date(booking.start_time).toLocaleString()}</li>
          <li><strong>Duration:</strong> ${booking.duration_minutes} minutes</li>
          <li><strong>Price:</strong> $${booking.price}</li>
        </ul>
        <p>Location: ${barbershop.name}</p>
        <p>Booking ID: ${booking.id}</p>
        <p>We'll send you a reminder 24 hours before your appointment.</p>
        <p>Thank you for booking with us!</p>
      `
    }
    
    // TODO: Integrate with actual email service
    console.log('Email content:', emailContent)
    
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
  }
}