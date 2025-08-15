import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    
    console.log('Convert recurring request for ID:', id)
    console.log('Request body:', body)
    
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      console.error('Error fetching appointment:', fetchError)
      return NextResponse.json(
        { error: 'Appointment not found', details: fetchError.message },
        { status: 404 }
      )
    }
    
    if (!existingAppointment) {
      console.error('No appointment found with ID:', id)
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }
    
    console.log('Found existing appointment:', existingAppointment)
    
    // 🔍 DEBUG: Log the time values we're working with
    console.log('  - existingAppointment.start_time (raw):', existingAppointment.start_time)
    console.log('  - existingAppointment.end_time (raw):', existingAppointment.end_time)
    
    if (existingAppointment.start_time) {
      const startDate = new Date(existingAppointment.start_time)
      console.log('  - start_time as Date object:', startDate)
      console.log('  - start_time local time:', startDate.toLocaleString())
      console.log('  - start_time UTC:', startDate.toUTCString())
      console.log('  - start_time ISO:', startDate.toISOString())
    }
    
    if (existingAppointment.end_time) {
      const endDate = new Date(existingAppointment.end_time)
      console.log('  - end_time as Date object:', endDate)
      console.log('  - end_time local time:', endDate.toLocaleString())
    }
    
    if (existingAppointment.is_recurring) {
      return NextResponse.json(
        { error: 'Appointment is already recurring' },
        { status: 400 }
      )
    }
    
    if (!body.recurrence_rule) {
      return NextResponse.json(
        { error: 'Recurrence rule is required' },
        { status: 400 }
      )
    }
    
    const rrule = body.recurrence_rule
    if (!rrule.includes('FREQ=')) {
      return NextResponse.json(
        { error: 'Invalid RRule format - must include FREQ parameter' },
        { status: 400 }
      )
    }
    
    const startDate = new Date(existingAppointment.start_time)
    const dtstart = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    
    let enhancedRRule = rrule
    if (!rrule.includes('DTSTART')) {
      enhancedRRule = `DTSTART:${dtstart}\n${rrule}`
    }
    
    console.log('🔍 STORING ENHANCED RRULE:')
    console.log('  - Original RRule:', rrule)
    console.log('  - Enhanced RRule:', enhancedRRule)
    console.log('  - Start time (dtstart):', existingAppointment.start_time)
    console.log('  - End time (dtend):', existingAppointment.end_time)
    
    const recurringPattern = {
      rrule: enhancedRRule,  // Store the enhanced RRule with DTSTART
      dtstart: existingAppointment.start_time,
      dtend: existingAppointment.end_time,
      frequency: extractFrequency(rrule),
      interval: extractInterval(rrule),
      count: extractCount(rrule),
      until: extractUntil(rrule),
      created_at: new Date().toISOString(),
      created_by: 'calendar_api',
      conflict_resolution: body.conflict_resolution || 'none',
      skip_dates: body.skip_dates || []
    }
    
    console.log('Generated recurring pattern:', recurringPattern)
    
    // 🔍 DEBUG: Log what we're storing in the recurring pattern
    console.log('🔍 RECURRING PATTERN TIME VALUES:')
    console.log('  - dtstart (raw):', recurringPattern.dtstart)
    console.log('  - dtend (raw):', recurringPattern.dtend)
    
    if (recurringPattern.dtstart) {
      const dtstart = new Date(recurringPattern.dtstart)
      console.log('  - dtstart as Date:', dtstart)
      console.log('  - dtstart local time:', dtstart.toLocaleString())
      console.log('  - dtstart UTC:', dtstart.toUTCString())
    }
    
    if (recurringPattern.dtend) {
      const dtend = new Date(recurringPattern.dtend)  
      console.log('  - dtend as Date:', dtend)
      console.log('  - dtend local time:', dtend.toLocaleString())
    }
    
    const updateData = {
      is_recurring: true,
      recurring_pattern: recurringPattern,
      ...(body.service_price && { price: body.service_price }),
      updated_at: new Date().toISOString()
    }
    
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()
    
    if (updateError) {
      console.error('Error updating appointment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update appointment', details: updateError.message },
        { status: 500 }
      )
    }
    
    console.log('Updated appointment with recurring pattern:', updatedAppointment)
    
    const expectedOccurrences = calculateOccurrences(rrule, existingAppointment.start_time)
    
    const responseData = {
      appointment: updatedAppointment,
      message: `Appointment converted to recurring series with RRule pattern`,
      recurring_pattern: recurringPattern,
      expected_occurrences: expectedOccurrences.length,
      is_recurring: true,
      rrule: rrule,
      next_occurrences: expectedOccurrences.slice(0, 5) // Show first 5 upcoming dates
    }
    
    console.log('Returning response:', responseData)
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('Error converting appointment to recurring:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { error: 'Failed to convert appointment', details: error.message },
      { status: 500 }
    )
  }
}

function extractFrequency(rrule) {
  const freqMatch = rrule.match(/FREQ=([^;]+)/)
  return freqMatch ? freqMatch[1] : 'WEEKLY'
}

function extractInterval(rrule) {
  const intervalMatch = rrule.match(/INTERVAL=([^;]+)/)
  return intervalMatch ? parseInt(intervalMatch[1]) : 1
}

function extractCount(rrule) {
  const countMatch = rrule.match(/COUNT=([^;]+)/)
  return countMatch ? parseInt(countMatch[1]) : null
}

function extractUntil(rrule) {
  const untilMatch = rrule.match(/UNTIL=([^;]+)/)
  return untilMatch ? untilMatch[1] : null
}

function calculateOccurrences(rruleString, startDate) {
  try {
    const rules = rruleString.split(';').reduce((acc, rule) => {
      const [key, value] = rule.split('=')
      acc[key] = value
      return acc
    }, {})
    
    const freq = rules.FREQ || 'WEEKLY'
    const interval = parseInt(rules.INTERVAL || '1')
    const count = parseInt(rules.COUNT || '10') // Default to 10 occurrences for calculation
    
    const occurrences = []
    const start = new Date(startDate)
    let current = new Date(start)
    
    for (let i = 0; i < count && occurrences.length < 52; i++) { // Safety limit of 52
      if (i > 0) {
        if (freq === 'DAILY') {
          current.setDate(current.getDate() + interval)
        } else if (freq === 'WEEKLY') {
          current.setDate(current.getDate() + (7 * interval))
        } else if (freq === 'MONTHLY') {
          current.setMonth(current.getMonth() + interval)
        } else if (freq === 'YEARLY') {
          current.setFullYear(current.getFullYear() + interval)
        }
      }
      
      occurrences.push(new Date(current).toISOString())
    }
    
    return occurrences
    
  } catch (error) {
    console.error('Error calculating occurrences:', error)
    return [startDate] // Return at least the original date
  }
}

function transformBookingToEvent(booking) {
  const event = {
    id: booking.id,
    resourceId: booking.barber_id,
    title: `${booking.customer_name || 'Customer'} - ${booking.service_type || 'Unknown Service'}`,
    start: booking.start_time,
    end: booking.end_time,
    backgroundColor: '#546355',
    borderColor: '#546355',
    extendedProps: {
      customer: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      service: booking.service_type,
      service_id: booking.service_id,
      barber_id: booking.barber_id,
      price: booking.price,
      status: booking.status,
      notes: booking.notes,
      isRecurring: booking.is_recurring,
      recurring_pattern: booking.recurring_pattern
    }
  }
  
  if (booking.is_recurring && booking.recurring_pattern && booking.recurring_pattern.rrule) {
    event.rrule = booking.recurring_pattern.rrule
  }
  
  return event
}