import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

// Validation schema
const availabilitySchema = z.object({
  barber_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().min(15).max(480).optional().default(60),
  exclude_appointment_id: z.string().uuid().optional()
})

// Time slot interface
interface TimeSlot {
  start_time: string
  end_time: string
  available: boolean
  reason?: string
}

// Helper to generate time slots
function generateTimeSlots(
  date: string,
  startHour = 9,
  endHour = 18,
  intervalMinutes = 30
): TimeSlot[] {
  const slots: TimeSlot[] = []
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      const endMinute = minute + intervalMinutes
      const endHour = hour + Math.floor(endMinute / 60)
      const adjustedEndMinute = endMinute % 60
      
      if (endHour <= 18) { // Don't go past business hours
        const endTime = `${endHour.toString().padStart(2, '0')}:${adjustedEndMinute.toString().padStart(2, '0')}`
        
        slots.push({
          start_time: startTime,
          end_time: endTime,
          available: true
        })
      }
    }
  }
  
  return slots
}

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const barber_id = searchParams.get('barber_id')
    const date = searchParams.get('date')
    const duration_minutes = parseInt(searchParams.get('duration_minutes') || '60')
    const exclude_appointment_id = searchParams.get('exclude_appointment_id')

    // Validate parameters
    const validationData: any = {
      barber_id,
      date,
      duration_minutes
    }
    
    if (exclude_appointment_id) {
      validationData.exclude_appointment_id = exclude_appointment_id
    }
    
    const validationResult = availabilitySchema.safeParse(validationData)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { 
      barber_id: validBarberId, 
      date: validDate, 
      duration_minutes: validDuration,
      exclude_appointment_id: excludeId 
    } = validationResult.data

    // Check if barber exists in profiles
    const { data: barberProfile, error: barberError } = await supabase
      .from('profiles')
      .select('id, full_name, role, barbershop_id, barberbarbershop_id')
      .eq('id', validBarberId)
      .single()

    // For now, continue even if barber not found - could be a staff member
    const barberName = barberProfile?.full_name || 'Staff Member'
    const barbershopId = barberProfile?.barbershop_id || barberProfile?.barberbarbershop_id

    // Get business hours (default for now)
    const businessHours = {
      start_time: '09:00',
      end_time: '18:00'
    }

    // Generate all possible time slots
    const startHour = parseInt(businessHours.start_time.split(':')[0])
    const endHour = parseInt(businessHours.end_time.split(':')[0])
    const allSlots = generateTimeSlots(validDate, startHour, endHour, 30)

    // Get existing bookings for this barber and date
    const startOfDay = `${validDate}T00:00:00.000Z`
    const endOfDay = `${validDate}T23:59:59.999Z`

    let bookingsQuery = supabase
      .from('bookings')
      .select('start_time, end_time, status, id')
      .eq('barber_id', validBarberId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .neq('status', 'cancelled') // Don't count cancelled bookings

    // Exclude specific appointment if provided (for rescheduling)
    if (excludeId) {
      bookingsQuery = bookingsQuery.neq('id', excludeId)
    }

    const { data: existingBookings, error: bookingsError } = await bookingsQuery

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      // Continue with empty bookings array rather than failing
    }

    // Mark slots as unavailable based on existing bookings
    const bookedSlots = existingBookings || []
    const availableSlots = allSlots.map(slot => {
      // Convert slot time to full datetime for comparison
      const slotDateTime = `${validDate}T${slot.start_time}:00.000Z`
      const slotEndTime = `${validDate}T${slot.end_time}:00.000Z`

      // Check if this slot conflicts with any booking
      const isBlocked = bookedSlots.some(booking => {
        const bookingStart = new Date(booking.start_time).getTime()
        const bookingEnd = new Date(booking.end_time).getTime()
        const slotStart = new Date(slotDateTime).getTime()
        const slotEnd = new Date(slotEndTime).getTime()

        // Check for overlap
        return (slotStart < bookingEnd && slotEnd > bookingStart)
      })

      if (isBlocked) {
        return { ...slot, available: false, reason: 'Already booked' }
      }

      // Check if there's enough consecutive time for the requested duration
      if (validDuration > 30) { // Only check for longer appointments
        const slotStartMinutes = parseInt(slot.start_time.split(':')[0]) * 60 + 
                                parseInt(slot.start_time.split(':')[1])
        const requiredEndMinutes = slotStartMinutes + validDuration
        const requiredEndHour = Math.floor(requiredEndMinutes / 60)
        const requiredEndMinute = requiredEndMinutes % 60
        const requiredEndTime = `${requiredEndHour.toString().padStart(2, '0')}:${requiredEndMinute.toString().padStart(2, '0')}`

        // Check if all slots until required end time are available
        let canAccommodate = true
        for (const checkSlot of allSlots) {
          if (checkSlot.start_time >= slot.start_time && checkSlot.start_time < requiredEndTime) {
            const checkDateTime = `${validDate}T${checkSlot.start_time}:00.000Z`
            const checkEndTime = `${validDate}T${checkSlot.end_time}:00.000Z`
            
            const isCheckBlocked = bookedSlots.some(booking => {
              const bookingStart = new Date(booking.start_time).getTime()
              const bookingEnd = new Date(booking.end_time).getTime()
              const checkStart = new Date(checkDateTime).getTime()
              const checkEnd = new Date(checkEndTime).getTime()

              return (checkStart < bookingEnd && checkEnd > bookingStart)
            })

            if (isCheckBlocked) {
              canAccommodate = false
              break
            }
          }
        }

        if (!canAccommodate) {
          return { ...slot, available: false, reason: 'Insufficient consecutive time' }
        }
      }

      return slot
    })

    const totalBookings = bookedSlots.length
    const availableCount = availableSlots.filter(slot => slot.available).length

    return NextResponse.json({
      success: true,
      barber_id: validBarberId,
      barber_name: barberName,
      date: validDate,
      duration_minutes: validDuration,
      available_slots: availableSlots,
      business_hours: businessHours,
      total_bookings: totalBookings,
      available_count: availableCount,
      message: `Found ${totalBookings} existing bookings, ${availableCount} slots available`
    })

  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}