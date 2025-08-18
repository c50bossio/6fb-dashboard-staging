import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { RRule } from 'rrule'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      appointment_id,
      barber_id, 
      start_time, 
      end_time, 
      rrule: rruleString,
      check_count = 12 // Check first 12 occurrences by default
    } = body
    
    console.log('Conflict check request:', {
      appointment_id,
      barber_id,
      rrule: rruleString,
      check_count
    });
    
    if (!barber_id || !start_time || !rruleString) {
      return NextResponse.json(
        { error: 'Missing required fields: barber_id, start_time, and rrule are required' },
        { status: 400 }
      )
    }
    
    let occurrences = []
    try {
      const rule = RRule.fromString(rruleString)
      
      const startDate = new Date(start_time)
      const endDate = new Date(end_time || start_time)
      const duration = endDate.getTime() - startDate.getTime()
      
      const ruleWithStart = new RRule({
        ...rule.origOptions,
        dtstart: startDate
      })
      
      const allOccurrences = ruleWithStart.all((date, i) => i < check_count)
      
      occurrences = allOccurrences.map(date => ({
        start: date.toISOString(),
        end: new Date(date.getTime() + duration).toISOString()
      }))
      
      
    } catch (error) {
      console.error('Error parsing RRule:', error)
      return NextResponse.json(
        { error: 'Invalid RRule format', details: error.message },
        { status: 400 }
      )
    }
    
    const conflicts = []
    
    for (const occurrence of occurrences) {
      // - It starts before this occurrence ends AND
      // - It ends after this occurrence starts
      const { data: overlappingAppointments, error } = await supabase
        .from('bookings')
        .select('id, customer_name, service_type, start_time, end_time, status')
        .eq('barber_id', barber_id)
        .neq('status', 'cancelled')
        .lt('start_time', occurrence.end)
        .gt('end_time', occurrence.start)
      
      if (error) {
        console.error('Error checking conflicts:', error)
        continue // Skip this occurrence if there's an error
      }
      
      const actualConflicts = appointment_id 
        ? overlappingAppointments.filter(apt => apt.id !== appointment_id)
        : overlappingAppointments
      
      if (actualConflicts.length > 0) {
        conflicts.push({
          date: occurrence.start,
          occurrence_number: occurrences.indexOf(occurrence) + 1,
          conflicting_appointments: actualConflicts.map(apt => ({
            id: apt.id,
            customer_name: apt.customer_name,
            service: apt.service_type,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status
          }))
        })
      }
    }
    
    const response = {
      total_occurrences_checked: occurrences.length,
      conflicts_found: conflicts.length,
      conflicts: conflicts,
      has_conflicts: conflicts.length > 0,
      conflict_dates: conflicts.map(c => c.date),
      available_slots: occurrences.length - conflicts.length,
      resolution_options: conflicts.length > 0 ? [
        {
          id: 'skip',
          label: 'Skip Conflicting Dates',
          description: `Create recurring series but skip ${conflicts.length} conflicting date(s)`
        },
        {
          id: 'overwrite',
          label: 'Overwrite Conflicts',
          description: 'Replace existing appointments with new recurring series (requires confirmation)'
        },
        {
          id: 'cancel',
          label: 'Cancel Conversion',
          description: 'Do not convert to recurring appointment'
        }
      ] : []
    }
    
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error checking conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to check conflicts', details: error.message },
      { status: 500 }
    )
  }
}

function timeRangesOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1).getTime()
  const e1 = new Date(end1).getTime()
  const s2 = new Date(start2).getTime()
  const e2 = new Date(end2).getTime()
  
  return s1 < e2 && e1 > s2
}