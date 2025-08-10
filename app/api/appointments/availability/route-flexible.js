/**
 * Flexible availability endpoint that works in both development and production
 * Automatically adapts based on environment configuration
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { getConfig, isDevelopment } from '@/lib/config/environment'

// Get environment config
const config = getConfig()

/**
 * Create Supabase client based on environment
 */
function createSupabaseClient(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  // In production, use authenticated client
  if (config.requireAuth) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token && !isDevelopment()) {
      throw new Error('Authentication required')
    }
    
    return createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
  }
  
  // In development, use service role for easier testing
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

// Validation schema
const availabilitySchema = z.object({
  barber_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.coerce.number().min(15).max(240).default(60),
  service_id: z.string().optional(),
  exclude_appointment_id: z.string().optional()
})

/**
 * GET /api/appointments/availability
 */
export async function GET(request) {
  try {
    // Create client based on environment
    let supabase
    try {
      supabase = createSupabaseClient(request)
    } catch (authError) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authError.message
      }, { status: 401 })
    }
    
    // Parse parameters
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    // Convert duration to number if string
    if (params.duration_minutes) {
      params.duration_minutes = parseInt(params.duration_minutes)
    }
    
    // Validate
    const validation = availabilitySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: validation.error.format()
      }, { status: 400 })
    }
    
    const { barber_id, date, duration_minutes, exclude_appointment_id } = validation.data
    
    // Get barber info - try both tables for compatibility
    let barber = null
    
    // Try barbers table first (test data)
    const { data: barberData, error: barberError } = await supabase
      .from('barbers')
      .select('*')
      .eq('id', barber_id)
      .single()
    
    if (!barberError && barberData) {
      barber = barberData
    } else {
      // Try profiles table (production data)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', barber_id)
        .eq('role', 'barber')
        .single()
      
      if (profileData) {
        barber = {
          id: profileData.id,
          name: profileData.full_name || profileData.email,
          working_hours: profileData.working_hours
        }
      }
    }
    
    if (!barber) {
      return NextResponse.json({
        error: 'Barber not found',
        barber_id
      }, { status: 404 })
    }
    
    // Get business hours
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
    const defaultHours = {
      start: '09:00',
      end: '18:00',
      isOpen: true
    }
    
    const businessHours = barber.working_hours?.[dayOfWeek] || defaultHours
    
    if (!businessHours.isOpen) {
      return NextResponse.json({
        available_slots: [],
        is_business_day: false,
        message: `Barber not available on ${dayOfWeek}s`
      })
    }
    
    // Get existing appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, status')
      .eq('barber_id', barber_id)
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
      .in('status', ['confirmed', 'in_progress'])
    
    if (appointmentsError && config.enableLogging) {
      console.error('Error fetching appointments:', appointmentsError)
    }
    
    // Generate time slots
    const slots = generateTimeSlots({
      date,
      businessHours,
      duration: duration_minutes,
      appointments: appointments || [],
      excludeId: exclude_appointment_id
    })
    
    return NextResponse.json({
      date,
      barber: {
        id: barber.id,
        name: barber.name
      },
      business_hours: businessHours,
      duration_minutes,
      available_slots: slots.filter(s => s.available),
      all_slots: isDevelopment() ? slots : undefined, // Include all slots in dev
      total_slots: slots.length,
      available_count: slots.filter(s => s.available).length,
      environment: isDevelopment() ? 'development' : 'production'
    })
    
  } catch (error) {
    if (config.enableLogging) {
      console.error('Availability endpoint error:', error)
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      message: isDevelopment() ? error.message : 'An error occurred'
    }, { status: 500 })
  }
}

/**
 * POST /api/appointments/availability
 * Check specific time slot
 */
export async function POST(request) {
  try {
    // Create client
    let supabase
    try {
      supabase = createSupabaseClient(request)
    } catch (authError) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authError.message
      }, { status: 401 })
    }
    
    const body = await request.json()
    const { barber_id, start_time, end_time } = body
    
    // Check for conflicts
    const { data: conflicts, error } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('barber_id', barber_id)
      .in('status', ['confirmed', 'in_progress'])
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)
    
    if (error && config.enableLogging) {
      console.error('Conflict check error:', error)
    }
    
    const isAvailable = !conflicts || conflicts.length === 0
    
    return NextResponse.json({
      available: isAvailable,
      conflicts: conflicts || [],
      checked_at: new Date().toISOString()
    })
    
  } catch (error) {
    if (config.enableLogging) {
      console.error('Slot check error:', error)
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      message: isDevelopment() ? error.message : 'An error occurred'
    }, { status: 500 })
  }
}

/**
 * Generate time slots helper
 */
function generateTimeSlots({ date, businessHours, duration, appointments, excludeId }) {
  const slots = []
  const interval = 15 // 15-minute intervals
  
  // Parse times
  const [startHour, startMin] = businessHours.start.split(':').map(Number)
  const [endHour, endMin] = businessHours.end.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  // Generate slots
  for (let minutes = startMinutes; minutes <= endMinutes - duration; minutes += interval) {
    const slotStart = new Date(`${date}T${formatTime(minutes)}:00`)
    const slotEnd = new Date(`${date}T${formatTime(minutes + duration)}:00`)
    
    // Check conflicts
    const hasConflict = appointments.some(apt => {
      if (excludeId && apt.id === excludeId) return false
      
      const aptStart = new Date(apt.start_time)
      const aptEnd = new Date(apt.end_time)
      
      return slotStart < aptEnd && slotEnd > aptStart
    })
    
    slots.push({
      start_time: formatTime(minutes),
      end_time: formatTime(minutes + duration),
      start_datetime: slotStart.toISOString(),
      end_datetime: slotEnd.toISOString(),
      available: !hasConflict,
      duration_minutes: duration
    })
  }
  
  return slots
}

/**
 * Format minutes to HH:MM
 */
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export default {
  GET,
  POST
}