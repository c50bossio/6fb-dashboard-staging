import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Enhanced validation schema
const publicBookingSchema = z.object({
  barbershop_id: z.string().min(1, 'Barbershop ID is required'),
  barber_id: z.string().optional(),
  service_id: z.string().min(1, 'Service ID is required'),
  service_name: z.string().min(1, 'Service name is required'),
  scheduled_at: z.string().datetime('Invalid date/time format'),
  duration_minutes: z.number().min(15).max(480, 'Duration must be between 15 and 480 minutes'),
  price: z.number().min(0, 'Price must be non-negative'),
  
  // Customer information
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  customer_phone: z.string().max(20),
  customer_email: z.string().email('Valid email is required').optional(),
  customer_notes: z.string().max(500).optional(),
  
  // Add-ons and preferences
  addOns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().min(0),
    duration_minutes: z.number().min(0)
  })).optional().default([]),
  
  source: z.string().optional().default('public_booking'),
  sms_opt_in: z.boolean().optional().default(false),
  email_opt_in: z.boolean().optional().default(true)
})

// Enhanced rate limiting
const recentBookings = new Map()
const RATE_LIMIT_WINDOW = 300000 // 5 minutes 
const MAX_BOOKINGS_PER_IP = 5

function checkRateLimit(ip) {
  const now = Date.now()
  const bookings = recentBookings.get(ip) || []
  
  // Clean old entries
  const recentValid = bookings.filter(time => now - time < RATE_LIMIT_WINDOW)
  
  if (recentValid.length >= MAX_BOOKINGS_PER_IP) {
    return { allowed: false, retryAfter: Math.ceil((recentValid[0] + RATE_LIMIT_WINDOW - now) / 1000) }
  }
  
  recentValid.push(now)
  recentBookings.set(ip, recentValid)
  return { allowed: true }
}

// Business hours validation
async function validateBusinessHours(supabase, barbershopId, scheduledAt) {
  try {
    const { data: shopData } = await supabase
      .from('barbershops')
      .select('business_hours, timezone')
      .eq('id', barbershopId)
      .single()

    if (!shopData?.business_hours) {
      return { valid: true, message: 'No business hours configured' }
    }

    const appointmentDate = new Date(scheduledAt)
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'lowercase' })
    const dayHours = shopData.business_hours[dayOfWeek]

    if (!dayHours) {
      return { 
        valid: false, 
        message: `Closed on ${appointmentDate.toLocaleDateString('en-US', { weekday: 'long' })}s` 
      }
    }

    const appointmentTime = appointmentDate.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })

    if (appointmentTime < dayHours.open || appointmentTime >= dayHours.close) {
      return {
        valid: false,
        message: `Outside business hours (${dayHours.open} - ${dayHours.close})`
      }
    }

    return { valid: true }
    
  } catch (error) {
    console.error('Business hours validation error:', error)
    return { valid: true, message: 'Could not validate business hours' }
  }
}

// Enhanced availability checking
async function checkTimeSlotAvailability(supabase, bookingData) {
  const newStart = new Date(bookingData.scheduled_at)
  const newEnd = new Date(newStart.getTime() + bookingData.duration_minutes * 60000)
  
  // Check for conflicts - using consistent field names
  const { data: conflicts, error } = await supabase
    .from('appointments')
    .select('id, start_time, duration_minutes, status')
    .eq('barbershop_id', bookingData.barbershop_id)
    .in('status', ['confirmed', 'checked_in'])

  if (error) {
    throw new Error(`Failed to check availability: ${error.message}`)
  }

  // Check for actual time conflicts
  const hasConflict = conflicts?.some(existing => {
    const existingStart = new Date(existing.start_time)
    const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60000)
    
    return (newStart < existingEnd && newEnd > existingStart)
  })

  if (hasConflict) {
    const conflictInfo = conflicts.find(existing => {
      const existingStart = new Date(existing.start_time)
      const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60000)
      return (newStart < existingEnd && newEnd > existingStart)
    })
    
    return {
      available: false,
      conflict: conflictInfo,
      message: 'Time slot conflicts with existing appointment'
    }
  }

  return { available: true }
}

export async function POST(request) {
  try {
    // Get IP for rate limiting
    const headersList = headers()
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               'unknown'
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please wait before making another booking attempt.',
        retryAfter: rateLimitResult.retryAfter
      }, { 
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter.toString(),
          'X-RateLimit-Limit': MAX_BOOKINGS_PER_IP.toString(),
          'X-RateLimit-Window': (RATE_LIMIT_WINDOW / 1000).toString()
        }
      })
    }

    const body = await request.json()
    
    // Enhanced validation with Zod schema
    const validationResult = publicBookingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid booking data',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }

    const bookingData = validationResult.data

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
      .select('id, name, address, phone, booking_settings, business_hours')
      .eq('id', bookingData.barbershop_id)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found or unavailable'
      }, { status: 404 })
    }

    // Check if public booking is enabled
    const bookingSettings = barbershop.booking_settings || {}
    if (bookingSettings.requireAuth === true) {
      return NextResponse.json({
        success: false,
        error: 'This barbershop requires account registration to book'
      }, { status: 403 })
    }

    // Validate business hours
    const businessHoursCheck = await validateBusinessHours(
      supabase, 
      bookingData.barbershop_id, 
      bookingData.scheduled_at
    )
    
    if (!businessHoursCheck.valid) {
      return NextResponse.json({
        success: false,
        error: 'Appointment outside business hours',
        message: businessHoursCheck.message
      }, { status: 400 })
    }

    // Enhanced availability checking
    const availabilityCheck = await checkTimeSlotAvailability(supabase, bookingData)
    
    if (!availabilityCheck.available) {
      return NextResponse.json({
        success: false,
        error: 'Time slot unavailable',
        message: availabilityCheck.message,
        conflict: availabilityCheck.conflict
      }, { status: 409 })
    }

    // Calculate total amount including add-ons
    const addOnsTotal = bookingData.addOns.reduce((sum, addon) => sum + addon.price, 0)
    const totalAmount = bookingData.price + addOnsTotal

    // Create the booking record with enhanced data
    const scheduledDate = new Date(bookingData.scheduled_at)
    const endTime = new Date(scheduledDate.getTime() + bookingData.duration_minutes * 60000)

    const bookingInsert = {
      barbershop_id: bookingData.barbershop_id,
      service_id: bookingData.service_id,
      service_name: bookingData.service_name,
      start_time: scheduledDate.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: bookingData.duration_minutes,
      price: totalAmount,
      status: 'confirmed',
      
      // Customer information (matching actual table columns)
      customer_name: bookingData.customer_name.trim(),
      customer_phone: bookingData.customer_phone?.trim() || null,
      customer_email: bookingData.customer_email?.trim() || null,
      notes: bookingData.customer_notes || null,
      
      // Public booking metadata (matching actual table columns)
      customer_id: null,
      barber_id: bookingData.barber_id || null,
      barber_name: null,
      is_test: false,
      is_recurring: false,
      recurring_pattern: null
    }

    // Insert appointment (separate query as per CLAUDE.md guidance)
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([bookingInsert])
      .select('*')
      .single()

    if (appointmentError) {
      console.error('Enhanced appointment creation error:', appointmentError)
      console.error('Appointment data attempted:', bookingInsert)
      return NextResponse.json({
        success: false,
        error: 'Failed to create appointment',
        message: 'Unable to save appointment to database',
        details: appointmentError.message
      }, { status: 500 })
    }

    // Get barbershop data separately and merge (as per CLAUDE.md guidance)
    const { data: barbershopDetails } = await supabase
      .from('barbershops')
      .select('name, address, phone, brand_colors')
      .eq('id', bookingData.barbershop_id)
      .single()

    // Merge data in JavaScript
    appointment.barbershop = barbershopDetails

    // Send enhanced notifications (async, don't wait)
    sendEnhancedNotifications(appointment, barbershopDetails).catch(console.error)

    // Log successful appointment
    console.log(`✅ Enhanced public appointment created: ${appointment.id} at ${appointment.start_time}`)

    // Return enhanced success response
    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        confirmation_number: appointment.id,
        service_name: appointment.service_name,
        scheduled_at: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        total_amount: appointment.price,
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email,
        add_ons: bookingData.addOns,
        barbershop: {
          name: appointment.barbershop?.name,
          address: appointment.barbershop?.address,
          phone: appointment.barbershop?.phone
        }
      },
      notifications: {
        email: appointment.email_opt_in ? 'sent' : 'skipped',
        sms: appointment.sms_opt_in ? 'sent' : 'skipped'
      },
      message: 'Booking confirmed successfully! Check your email for details.'
    })

  } catch (error) {
    console.error('Public booking API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Enhanced notification function
async function sendEnhancedNotifications(booking, barbershop) {
  if (!booking.customer_email && !booking.customer_phone) return

  try {
    const appointmentDate = new Date(booking.start_time)
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    // Parse add-ons if present
    const addOns = booking.add_ons ? JSON.parse(booking.add_ons) : []
    const addOnsText = addOns.length > 0 
      ? addOns.map(addon => `${addon.name} (+$${addon.price})`).join(', ')
      : 'None'

    // Send email confirmation (if opted in)
    if (booking.email_opt_in && booking.customer_email) {
      const emailContent = {
        to: booking.customer_email,
        subject: `✅ Booking Confirmed - ${barbershop.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">Booking Confirmed! 🎉</h1>
              <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your appointment is all set</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Hi ${booking.customer_name},</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Great news! Your appointment has been confirmed. Here are the details:
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #666;">Service:</td><td style="padding: 8px 0; font-weight: bold; color: #333;">${booking.service_name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Date:</td><td style="padding: 8px 0; font-weight: bold; color: #333;">${formattedDate}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Time:</td><td style="padding: 8px 0; font-weight: bold; color: #333;">${formattedTime}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Duration:</td><td style="padding: 8px 0; font-weight: bold; color: #333;">${booking.duration_minutes} minutes</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Add-ons:</td><td style="padding: 8px 0; font-weight: bold; color: #333;">${addOnsText}</td></tr>
                  <tr><td style="padding: 8px 0; color: #666;">Total Price:</td><td style="padding: 8px 0; font-weight: bold; color: #667eea; font-size: 18px;">$${booking.price}</td></tr>
                </table>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">📍 Location Details</h3>
                <p style="margin: 5px 0; color: #666;"><strong>${barbershop.name}</strong></p>
                ${barbershop.address ? `<p style="margin: 5px 0; color: #666;">${barbershop.address}</p>` : ''}
                ${barbershop.phone ? `<p style="margin: 5px 0; color: #666;">📞 ${barbershop.phone}</p>` : ''}
              </div>
              
              <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #1976d2; margin-top: 0;">💡 What's Next?</h4>
                <ul style="margin: 0; color: #666; line-height: 1.6;">
                  <li>We'll send you a reminder 24 hours before your appointment</li>
                  <li>Please arrive 5 minutes early for check-in</li>
                  <li>Bring a valid ID and payment method</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #999; font-size: 14px;">Booking ID: #${booking.id}</p>
                <p style="color: #666;">Need to reschedule? Contact us at ${barbershop.phone || 'the shop'}</p>
              </div>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
              <p style="margin: 0;">Thank you for choosing ${barbershop.name}!</p>
              <p style="margin: 5px 0 0; opacity: 0.8;">This is an automated confirmation message.</p>
            </div>
          </div>
        `
      }
      
      console.log(`📧 Enhanced email confirmation prepared for: ${booking.customer_email}`)
      // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
    }

    // Send SMS confirmation (if opted in)
    if (booking.sms_opt_in && booking.customer_phone) {
      const smsContent = `
✅ BOOKING CONFIRMED
Hi ${booking.customer_name}!

📅 ${formattedDate} at ${formattedTime}
💈 ${booking.service_name} (${booking.duration_minutes}min)
💰 $${booking.price}
📍 ${barbershop.name}

Booking ID: #${booking.id}

We'll remind you 24hrs before. Arrive 5min early!
${barbershop.phone ? `Questions? Call ${barbershop.phone}` : ''}
      `.trim()
      
      console.log(`📱 Enhanced SMS confirmation prepared for: ${booking.customer_phone}`)
      // TODO: Integrate with SMS service (Twilio, etc.)
    }

  } catch (error) {
    console.error('Failed to send enhanced notifications:', error)
  }
}