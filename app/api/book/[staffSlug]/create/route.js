import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/book/[staffSlug]/create
 * Create new booking via public booking link
 * No authentication required (public endpoint)
 */
export async function POST(request, { params }) {
  try {
    const { staffSlug } = params
    const supabase = createClient()

    // Parse request body
    const body = await request.json()
    const {
      staff_id,
      service_id,
      scheduled_at,
      duration_minutes,
      price,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      booking_source = 'staff_link',
    } = body

    // Validate required fields
    if (!staff_id || !service_id || !scheduled_at || !customer_name || !customer_email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify staff member exists and slug matches
    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .select('id, barbershop_id, first_name, last_name')
      .eq('id', staff_id)
      .eq('booking_slug', staffSlug)
      .eq('role', 'BARBER')
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Check if time slot is still available
    const { data: existingBooking } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', staff_id)
      .eq('scheduled_at', scheduled_at)
      .eq('status', 'confirmed')
      .single()

    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    // Generate confirmation number
    const confirmationNumber = generateConfirmationNumber()

    // Create booking
    const bookingData = {
      barbershop_id: staff.barbershop_id,
      barber_id: staff_id,
      service_id,
      scheduled_at,
      duration_minutes: duration_minutes || 30,
      price: price || 0,
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      notes: notes || null,
      status: 'confirmed',
      booking_source,
      confirmation_number: confirmationNumber,
      created_at: new Date().toISOString(),
    }

    const { data: booking, error: bookingError } = await supabase
      .from('appointments')
      .insert([bookingData])
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json(
        { success: false, error: `Failed to create booking: ${bookingError.message}` },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email (implement later with notification service)
    // await sendBookingConfirmationEmail(customer_email, booking, staff)

    // Return success response
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        confirmation_number: confirmationNumber,
        scheduled_at: booking.scheduled_at,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
      },
    })
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate confirmation number
function generateConfirmationNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing characters
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
