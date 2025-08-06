'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for availability check
const availabilitySchema = z.object({
  barber_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  duration_minutes: z.number().min(15).max(480).optional().default(60),
  exclude_appointment_id: z.string().uuid().optional()
})

// GET /api/appointments/availability - Check barber availability
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    const date = searchParams.get('date')
    const duration_minutes = parseInt(searchParams.get('duration_minutes') || '60')
    const exclude_appointment_id = searchParams.get('exclude_appointment_id')

    // Validate parameters
    const validationResult = availabilitySchema.safeParse({
      barber_id,
      date,
      duration_minutes,
      exclude_appointment_id
    })

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { barber_id: validBarberId, date: validDate, duration_minutes: validDuration } = validationResult.data

    // Get barber's business hours and existing appointments
    const [barberResult, appointmentsResult] = await Promise.all([
      supabase
        .from('barbershop_staff')
        .select(`
          *,
          user:users(id, name),
          barbershop:barbershops(business_hours)
        `)
        .eq('user_id', validBarberId)
        .single(),
      
      supabase
        .from('appointments')
        .select('id, scheduled_at, duration_minutes, status')
        .eq('barber_id', validBarberId)
        .gte('scheduled_at', `${validDate}T00:00:00`)
        .lt('scheduled_at', `${validDate}T23:59:59`)
        .in('status', ['PENDING', 'CONFIRMED'])
        .neq('id', exclude_appointment_id || 'none')
    ])

    if (barberResult.error) {
      console.error('Error fetching barber:', barberResult.error)
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    if (appointmentsResult.error) {
      console.error('Error fetching appointments:', appointmentsResult.error)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    // Get business hours for the specific day
    const dayOfWeek = new Date(validDate).getDay()
    const businessHours = barberResult.data.barbershop?.business_hours || {
      Monday: { start: '09:00', end: '18:00' },
      Tuesday: { start: '09:00', end: '18:00' },
      Wednesday: { start: '09:00', end: '18:00' },
      Thursday: { start: '09:00', end: '18:00' },
      Friday: { start: '09:00', end: '18:00' },
      Saturday: { start: '09:00', end: '18:00' },
      Sunday: { start: '10:00', end: '16:00' }
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const currentDayHours = businessHours[dayNames[dayOfWeek]]

    if (!currentDayHours) {
      return NextResponse.json({
        available_slots: [],
        is_business_day: false,
        message: 'Barber not available on this day'
      })
    }

    // Generate time slots (15-minute intervals)
    const slots = []
    const startTime = parseTime(currentDayHours.start)
    const endTime = parseTime(currentDayHours.end)
    
    for (let minutes = startTime; minutes <= endTime - validDuration; minutes += 15) {
      const slotStart = minutesToTime(minutes)
      const slotEnd = minutesToTime(minutes + validDuration)
      
      // Check if slot conflicts with existing appointments
      const slotStartDate = new Date(`${validDate}T${slotStart}:00`)
      const slotEndDate = new Date(`${validDate}T${slotEnd}:00`)
      
      const hasConflict = appointmentsResult.data.some(appointment => {
        const appointmentStart = new Date(appointment.scheduled_at)
        const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60000)
        
        return (slotStartDate < appointmentEnd && slotEndDate > appointmentStart)
      })

      slots.push({
        start_time: slotStart,
        end_time: slotEnd,
        available: !hasConflict,
        duration_minutes: validDuration
      })
    }

    return NextResponse.json({
      available_slots: slots,
      is_business_day: true,
      business_hours: currentDayHours,
      existing_appointments: appointmentsResult.data.length,
      barber: {
        id: barberResult.data.user.id,
        name: barberResult.data.user.name
      }
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/appointments/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/appointments/availability - Check specific time slot availability
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const checkSchema = z.object({
      barber_id: z.string().uuid(),
      scheduled_at: z.string().datetime(),
      duration_minutes: z.number().min(15).max(480),
      exclude_appointment_id: z.string().uuid().optional()
    })

    const validationResult = checkSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { barber_id, scheduled_at, duration_minutes, exclude_appointment_id } = validationResult.data

    // Check for conflicts
    let conflictQuery = supabase
      .from('appointments')
      .select('id, scheduled_at, duration_minutes, status')
      .eq('barber_id', barber_id)
      .in('status', ['PENDING', 'CONFIRMED'])

    if (exclude_appointment_id) {
      conflictQuery = conflictQuery.neq('id', exclude_appointment_id)
    }

    const { data: appointments, error: conflictError } = await conflictQuery

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    const newStart = new Date(scheduled_at)
    const newEnd = new Date(newStart.getTime() + duration_minutes * 60000)

    const conflicts = appointments.filter(appointment => {
      const existingStart = new Date(appointment.scheduled_at)
      const existingEnd = new Date(existingStart.getTime() + appointment.duration_minutes * 60000)
      
      return (newStart < existingEnd && newEnd > existingStart)
    })

    const isAvailable = conflicts.length === 0

    return NextResponse.json({
      available: isAvailable,
      conflicts: conflicts.map(conflict => ({
        id: conflict.id,
        scheduled_at: conflict.scheduled_at,
        duration_minutes: conflict.duration_minutes,
        status: conflict.status
      })),
      requested_slot: {
        start: scheduled_at,
        end: newEnd.toISOString(),
        duration_minutes
      }
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/appointments/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}