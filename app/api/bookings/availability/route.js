import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'
import { z } from 'zod'

export const runtime = 'edge'

// Validation schema
const availabilitySchema = z.object({
  barberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  duration: z.number().min(15).max(480).optional().default(60)
})

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const date = searchParams.get('date')
    const duration = parseInt(searchParams.get('duration') || '60')

    // Validate parameters
    const validationResult = availabilitySchema.safeParse({
      barberId,
      date,
      duration
    })

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const supabase = createClient()

    // Get barber data
    const { data: barberData, error: barberError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        title,
        image_url,
        bio,
        rating,
        review_count,
        specialties,
        location:barbershops(
          name,
          address,
          phone,
          business_hours
        )
      `)
      .eq('id', barberId)
      .single()

    if (barberError || !barberData) {
      return NextResponse.json({
        error: 'Barber not found'
      }, { status: 404 })
    }

    // Get existing bookings for the date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, scheduled_at, duration_minutes, status')
      .eq('barber_id', barberId)
      .gte('scheduled_at', `${date}T00:00:00`)
      .lt('scheduled_at', `${date}T23:59:59`)
      .in('status', ['PENDING', 'CONFIRMED'])

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({
        error: 'Failed to fetch availability'
      }, { status: 500 })
    }

    // Generate time slots
    const dayOfWeek = new Date(date).getDay()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const businessHours = barberData.location?.business_hours || {
      Monday: { start: '09:00', end: '18:00' },
      Tuesday: { start: '09:00', end: '18:00' },
      Wednesday: { start: '09:00', end: '18:00' },
      Thursday: { start: '09:00', end: '18:00' },
      Friday: { start: '09:00', end: '18:00' },
      Saturday: { start: '09:00', end: '18:00' },
      Sunday: { start: '10:00', end: '16:00' }
    }

    const currentDayHours = businessHours[dayNames[dayOfWeek]]
    if (!currentDayHours) {
      return NextResponse.json({
        barber: barberData,
        availableSlots: [],
        isBusinessDay: false
      })
    }

    const slots = generateTimeSlots(currentDayHours, duration, bookings, date)

    return NextResponse.json({
      barber: {
        id: barberData.id,
        name: barberData.name,
        title: barberData.title,
        image: barberData.image_url,
        rating: barberData.rating || 4.8,
        reviewCount: barberData.review_count || 125,
        bio: barberData.bio,
        specialties: barberData.specialties || [],
        location: {
          name: barberData.location?.name,
          address: barberData.location?.address,
          phone: barberData.location?.phone
        }
      },
      availableSlots: slots,
      isBusinessDay: true,
      businessHours: currentDayHours
    })

  } catch (error) {
    console.error('Error in availability API:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function generateTimeSlots(businessHours, duration, bookings, date) {
  const slots = []
  const startTime = parseTime(businessHours.start)
  const endTime = parseTime(businessHours.end)
  
  for (let minutes = startTime; minutes <= endTime - duration; minutes += 30) {
    const slotStart = minutesToTime(minutes)
    const slotEnd = minutesToTime(minutes + duration)
    
    // Check if slot conflicts with existing bookings
    const slotStartDate = new Date(`${date}T${slotStart}:00`)
    const slotEndDate = new Date(`${date}T${slotEnd}:00`)
    
    const hasConflict = bookings?.some(booking => {
      const bookingStart = new Date(booking.scheduled_at)
      const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60000)
      
      return (slotStartDate < bookingEnd && slotEndDate > bookingStart)
    })

    if (!hasConflict) {
      slots.push({
        time: slotStart,
        endTime: slotEnd,
        datetime: `${date}T${slotStart}:00`,
        available: true
      })
    }
  }

  return slots
}

function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}