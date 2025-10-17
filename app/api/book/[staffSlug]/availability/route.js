import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/book/[staffSlug]/availability
 * Get available time slots for a specific date
 * Public endpoint - no authentication required
 */
export async function GET(request, { params }) {
  try {
    const { staffSlug } = params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // Format: YYYY-MM-DD
    const serviceId = searchParams.get('service_id')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get staff member
    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .select('id, barbershop_id')
      .eq('booking_slug', staffSlug)
      .eq('role', 'BARBER')
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Get service duration if provided
    let serviceDuration = 30 // Default duration
    if (serviceId) {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .single()

      if (service) {
        serviceDuration = service.duration_minutes
      }
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const requestDate = new Date(date)
    const dayOfWeek = requestDate.getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]

    // Get barbershop business hours
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('business_hours')
      .eq('id', staff.barbershop_id)
      .single()

    // Default business hours if not set
    const defaultHours = {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '09:00', close: '16:00' },
      sunday: null, // Closed
    }

    const businessHours = barbershop?.business_hours || defaultHours
    const dayHours = businessHours[dayName]

    // If closed on this day
    if (!dayHours) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: 'Closed on this day',
      })
    }

    // Get existing bookings for this day
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const { data: existingBookings } = await supabase
      .from('appointments')
      .select('scheduled_at, duration_minutes')
      .eq('barber_id', staff.id)
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay)
      .eq('status', 'confirmed')

    // Generate time slots
    const slots = generateTimeSlots(
      date,
      dayHours.open,
      dayHours.close,
      serviceDuration,
      existingBookings || []
    )

    return NextResponse.json({
      success: true,
      slots,
      date,
      business_hours: dayHours,
    })
  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate available time slots
 */
function generateTimeSlots(date, openTime, closeTime, duration, existingBookings) {
  const slots = []
  const now = new Date()

  // Parse open and close times
  const [openHour, openMinute] = openTime.split(':').map(Number)
  const [closeHour, closeMinute] = closeTime.split(':').map(Number)

  // Create date objects for start and end of business hours
  const startTime = new Date(date)
  startTime.setHours(openHour, openMinute, 0, 0)

  const endTime = new Date(date)
  endTime.setHours(closeHour, closeMinute, 0, 0)

  // Generate slots in 30-minute intervals
  const slotInterval = 30 // minutes
  let currentTime = new Date(startTime)

  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000)

    // Check if slot end time is within business hours
    if (slotEnd <= endTime) {
      // Check if slot is in the future
      if (currentTime > now) {
        // Check if slot conflicts with existing booking
        const isBooked = existingBookings.some(booking => {
          const bookingStart = new Date(booking.scheduled_at)
          const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60000)

          // Check for overlap
          return (
            (currentTime >= bookingStart && currentTime < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (currentTime <= bookingStart && slotEnd >= bookingEnd)
          )
        })

        if (!isBooked) {
          slots.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            available: true,
          })
        }
      }
    }

    // Move to next slot
    currentTime = new Date(currentTime.getTime() + slotInterval * 60000)
  }

  return slots
}
