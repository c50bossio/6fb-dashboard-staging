/**
 * Production-ready availability endpoint
 * Handles barber availability checks with proper authentication and error handling
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, withRateLimit, createAuthenticatedClient } from '@/middleware/auth'
import { DateTime } from 'luxon'
export const runtime = 'edge'

const availabilityQuerySchema = z.object({
  barber_id: z.string().uuid('Invalid barber ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  duration_minutes: z.coerce.number().min(15).max(240).multipleOf(15).default(60),
  service_id: z.string().uuid().optional(),
  timezone: z.string().default('America/New_York')
})

const timeSlotCheckSchema = z.object({
  barber_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  exclude_appointment_id: z.string().uuid().optional(),
  check_recurring: z.boolean().default(true)
})

/**
 * GET /api/appointments/availability
 * Get available time slots for a barber on a specific date
 */
async function handleGet(request) {
  try {
    const supabase = await createAuthenticatedClient()
    const { searchParams } = new URL(request.url)
    
    const params = {
      barber_id: searchParams.get('barber_id'),
      date: searchParams.get('date'),
      duration_minutes: searchParams.get('duration_minutes'),
      service_id: searchParams.get('service_id'),
      timezone: searchParams.get('timezone')
    }
    
    const validation = availabilityQuerySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: validation.error.format()
      }, { status: 400 })
    }
    
    const { barber_id, date, duration_minutes, service_id, timezone } = validation.data
    
    let actualDuration = duration_minutes
    if (service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .single()
      
      if (service) {
        actualDuration = service.duration_minutes
      }
    }
    
    const { data: barber, error: barberError } = await supabase
      .from('barbers')
      .select(`
        id,
        name,
        working_hours,
        break_times,
        shops!inner(
          id,
          name,
          business_hours,
          timezone
        )
      `)
      .eq('id', barber_id)
      .single()
    
    if (barberError || !barber) {
      return NextResponse.json({
        error: 'Barber not found',
        barber_id
      }, { status: 404 })
    }
    
    const shopTimezone = barber.shops?.timezone || timezone
    const requestedDate = DateTime.fromISO(date, { zone: shopTimezone })
    const dayOfWeek = requestedDate.toFormat('EEEE')
    
    const businessHours = barber.working_hours?.[dayOfWeek] || 
                          barber.shops?.business_hours?.[dayOfWeek] ||
                          { start: '09:00', end: '18:00', isOpen: true }
    
    if (!businessHours.isOpen) {
      return NextResponse.json({
        available_slots: [],
        is_business_day: false,
        message: `${barber.name} is not available on ${dayOfWeek}s`
      })
    }
    
    const startOfDay = requestedDate.startOf('day').toUTC().toISO()
    const endOfDay = requestedDate.endOf('day').toUTC().toISO()
    
    const { data: appointments, error: appointmentsError } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        is_recurring,
        recurring_pattern
      `)
      .eq('barber_id', barber_id)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .in('status', ['confirmed', 'in_progress'])
    
    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return NextResponse.json({
        error: 'Failed to fetch appointments'
      }, { status: 500 })
    }
    
    const slots = generateTimeSlots({
      date: requestedDate,
      businessHours,
      breakTimes: barber.break_times || [],
      duration: actualDuration,
      appointments: appointments || [],
      timezone: shopTimezone
    })
    
    const availableCount = slots.filter(s => s.available).length
    const totalSlots = slots.length
    const utilizationRate = totalSlots > 0 ? 
      ((totalSlots - availableCount) / totalSlots * 100).toFixed(1) : 0
    
    return NextResponse.json({
      date,
      barber: {
        id: barber.id,
        name: barber.name,
        shop: barber.shops?.name
      },
      timezone: shopTimezone,
      business_hours: businessHours,
      duration_minutes: actualDuration,
      slots,
      statistics: {
        total_slots: totalSlots,
        available_slots: availableCount,
        booked_slots: totalSlots - availableCount,
        utilization_rate: `${utilizationRate}%`
      }
    })
    
  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

/**
 * POST /api/appointments/availability
 * Check if a specific time slot is available
 */
async function handlePost(request) {
  try {
    const supabase = await createAuthenticatedClient()
    const body = await request.json()
    
    const validation = timeSlotCheckSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: validation.error.format()
      }, { status: 400 })
    }
    
    const { 
      barber_id, 
      start_time, 
      end_time, 
      exclude_appointment_id,
      check_recurring 
    } = validation.data
    
    let query = supabase
      .from('bookings')
      .select('id, start_time, end_time, customer_id, service_id')
      .eq('barber_id', barber_id)
      .in('status', ['confirmed', 'in_progress'])
    
    if (exclude_appointment_id) {
      query = query.neq('id', exclude_appointment_id)
    }
    
    const { data: appointments, error } = await query
    
    if (error) {
      console.error('Conflict check error:', error)
      return NextResponse.json({
        error: 'Failed to check conflicts'
      }, { status: 500 })
    }
    
    const requestedStart = new Date(start_time)
    const requestedEnd = new Date(end_time)
    
    const conflicts = appointments.filter(apt => {
      const aptStart = new Date(apt.start_time)
      const aptEnd = new Date(apt.end_time)
      
      return (requestedStart < aptEnd && requestedEnd > aptStart)
    })
    
    const requestedDateTime = DateTime.fromISO(start_time)
    const dayOfWeek = requestedDateTime.toFormat('EEEE')
    
    const { data: barber } = await supabase
      .from('barbers')
      .select('working_hours')
      .eq('id', barber_id)
      .single()
    
    const workingHours = barber?.working_hours?.[dayOfWeek]
    if (workingHours && !workingHours.isOpen) {
      return NextResponse.json({
        available: false,
        reason: 'Outside working hours',
        working_hours: workingHours
      })
    }
    
    const isAvailable = conflicts.length === 0
    
    return NextResponse.json({
      available: isAvailable,
      requested_slot: {
        start: start_time,
        end: end_time,
        barber_id
      },
      conflicts: isAvailable ? [] : conflicts.map(c => ({
        id: c.id,
        start: c.start_time,
        end: c.end_time
      })),
      checked_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Time slot check error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

/**
 * Generate time slots for a given date
 */
function generateTimeSlots(options) {
  const {
    date,
    businessHours,
    breakTimes,
    duration,
    appointments,
    timezone
  } = options
  
  const slots = []
  const slotInterval = 15 // 15-minute intervals
  
  const [startHour, startMin] = businessHours.start.split(':').map(Number)
  const [endHour, endMin] = businessHours.end.split(':').map(Number)
  
  const dayStart = date.set({ hour: startHour, minute: startMin, second: 0 })
  const dayEnd = date.set({ hour: endHour, minute: endMin, second: 0 })
  
  let currentSlot = dayStart
  
  while (currentSlot.plus({ minutes: duration }) <= dayEnd) {
    const slotEnd = currentSlot.plus({ minutes: duration })
    
    const isDuringBreak = breakTimes.some(breakTime => {
      const [breakStartHour, breakStartMin] = breakTime.start.split(':').map(Number)
      const [breakEndHour, breakEndMin] = breakTime.end.split(':').map(Number)
      
      const breakStart = date.set({ hour: breakStartHour, minute: breakStartMin })
      const breakEnd = date.set({ hour: breakEndHour, minute: breakEndMin })
      
      return currentSlot < breakEnd && slotEnd > breakStart
    })
    
    const hasConflict = appointments.some(apt => {
      const aptStart = DateTime.fromISO(apt.start_time, { zone: 'utc' }).setZone(timezone)
      const aptEnd = DateTime.fromISO(apt.end_time, { zone: 'utc' }).setZone(timezone)
      
      return currentSlot < aptEnd && slotEnd > aptStart
    })
    
    slots.push({
      start: currentSlot.toISO(),
      end: slotEnd.toISO(),
      start_display: currentSlot.toFormat('h:mm a'),
      end_display: slotEnd.toFormat('h:mm a'),
      available: !isDuringBreak && !hasConflict,
      reason: isDuringBreak ? 'break_time' : hasConflict ? 'booked' : null
    })
    
    currentSlot = currentSlot.plus({ minutes: slotInterval })
  }
  
  return slots
}

export const GET = withRateLimit(
  withAuth(handleGet, {
    requiredRoles: [], // Allow any authenticated user
    allowService: true
  }),
  {
    windowMs: 60000,
    maxRequests: 100 // 100 requests per minute
  }
)

export const POST = withRateLimit(
  withAuth(handlePost, {
    requiredRoles: [], // Allow any authenticated user
    allowService: true
  }),
  {
    windowMs: 60000,
    maxRequests: 200 // 200 requests per minute for conflict checks
  }
)