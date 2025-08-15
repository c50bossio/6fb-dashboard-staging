import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const RRuleService = require('../rrule.service');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * PUT /api/calendar/recurring/modify
 * Modify a recurring appointment series or single occurrence
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      appointment_id,
      modification_type = 'this_only', // 'this_only', 'this_and_future', 'all'
      occurrence_date, // Required for 'this_only' and 'this_and_future'
      changes,
      timezone = 'America/New_York'
    } = body;

    if (!appointment_id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    if ((modification_type === 'this_only' || modification_type === 'this_and_future') && !occurrence_date) {
      return NextResponse.json(
        { error: 'Occurrence date is required for this modification type' },
        { status: 400 }
      );
    }

    const { data: appointment, error: fetchError } = await supabase
      .from('bookings')
      .select('*, barbers(*), customers(*), services(*)')
      .eq('id', appointment_id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (!appointment.is_recurring) {
      return NextResponse.json(
        { error: 'This is not a recurring appointment' },
        { status: 400 }
      );
    }

    let result;

    switch (modification_type) {
      case 'this_only':
        result = await modifyThisOnly(appointment, occurrence_date, changes, timezone);
        break;
      
      case 'this_and_future':
        result = await modifyThisAndFuture(appointment, occurrence_date, changes, timezone);
        break;
      
      case 'all':
        result = await modifyAll(appointment, changes, timezone);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid modification type' },
          { status: 400 }
        );
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Unexpected error in recurring appointment modification:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Modify only a single occurrence
 */
async function modifyThisOnly(appointment, occurrenceDate, changes, timezone) {
  try {
    const exceptions = appointment.recurring_pattern.exceptions || [];
    const modifications = appointment.recurring_pattern.modifications || {};
    
    const occurrenceKey = new Date(occurrenceDate).toISOString().split('T')[0];
    
    if (!exceptions.includes(occurrenceKey)) {
      exceptions.push(occurrenceKey);
    }
    
    modifications[occurrenceKey] = {
      ...changes,
      modified_at: new Date().toISOString(),
      original_time: occurrenceDate
    };

    const updatedPattern = {
      ...appointment.recurring_pattern,
      exceptions,
      modifications
    };

    if (changes.start_time || changes.end_time) {
      const newAppointmentData = {
        shop_id: appointment.shop_id,
        barber_id: changes.barber_id || appointment.barber_id,
        customer_id: appointment.customer_id,
        service_id: changes.service_id || appointment.service_id,
        start_time: changes.start_time || occurrenceDate,
        end_time: changes.end_time || calculateEndTime(changes.start_time || occurrenceDate, appointment.services?.duration_minutes || 60),
        status: changes.status || appointment.status,
        notes: changes.notes !== undefined ? changes.notes : appointment.notes,
        is_recurring: false,
        parent_id: appointment.id, // Reference to parent series
        occurrence_date: occurrenceKey,
        modification_type: 'exception',
        is_test: false
      };

      const { data: newAppointment, error: createError } = await supabase
        .from('bookings')
        .insert(newAppointmentData)
        .select()
        .single();

      if (createError) {
        return { error: 'Failed to create exception appointment', status: 500 };
      }

      modifications[occurrenceKey].exception_id = newAppointment.id;
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ recurring_pattern: updatedPattern })
      .eq('id', appointment.id)
      .select()
      .single();

    if (error) {
      return { error: 'Failed to update recurring pattern', status: 500 };
    }

    return {
      data: {
        message: 'Single occurrence modified successfully',
        appointment: data,
        modification_type: 'this_only',
        occurrence_date: occurrenceKey
      }
    };

  } catch (error) {
    console.error('Error in modifyThisOnly:', error);
    return { error: 'Failed to modify occurrence', status: 500 };
  }
}

/**
 * Modify this and all future occurrences
 */
async function modifyThisAndFuture(appointment, occurrenceDate, changes, timezone) {
  try {
    const originalRRule = appointment.recurring_pattern.rrule;
    const untilDate = new Date(occurrenceDate);
    untilDate.setDate(untilDate.getDate() - 1); // End the day before
    
    const updatedOriginalRRule = updateRRuleUntil(originalRRule, untilDate);
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        recurring_pattern: {
          ...appointment.recurring_pattern,
          rrule: updatedOriginalRRule,
          until: untilDate.toISOString(),
          modified_at: new Date().toISOString()
        }
      })
      .eq('id', appointment.id);

    if (updateError) {
      return { error: 'Failed to update original series', status: 500 };
    }

    const newStartTime = changes.start_time || occurrenceDate;
    const newPattern = { ...appointment.recurring_pattern };
    
    if (changes.recurrence_pattern) {
      Object.assign(newPattern, changes.recurrence_pattern);
    }

    const newRRule = createRRuleFromDate(newPattern, newStartTime, timezone);

    const newAppointmentData = {
      shop_id: appointment.shop_id,
      barber_id: changes.barber_id || appointment.barber_id,
      customer_id: appointment.customer_id,
      service_id: changes.service_id || appointment.service_id,
      start_time: newStartTime,
      end_time: changes.end_time || calculateEndTime(newStartTime, appointment.services?.duration_minutes || 60),
      status: changes.status || appointment.status,
      notes: changes.notes !== undefined ? changes.notes : appointment.notes,
      is_recurring: true,
      recurring_pattern: {
        ...newPattern,
        rrule: newRRule,
        original_series_id: appointment.id,
        split_date: occurrenceDate,
        created_at: new Date().toISOString()
      },
      parent_id: appointment.id,
      modification_type: 'future_split',
      is_test: false
    };

    const { data: newSeries, error: createError } = await supabase
      .from('bookings')
      .insert(newAppointmentData)
      .select()
      .single();

    if (createError) {
      return { error: 'Failed to create new series', status: 500 };
    }

    return {
      data: {
        message: 'This and future occurrences modified successfully',
        original_series: { id: appointment.id, ends: untilDate.toISOString() },
        new_series: newSeries,
        modification_type: 'this_and_future',
        split_date: occurrenceDate
      }
    };

  } catch (error) {
    console.error('Error in modifyThisAndFuture:', error);
    return { error: 'Failed to modify future occurrences', status: 500 };
  }
}

/**
 * Modify all occurrences in the series
 */
async function modifyAll(appointment, changes, timezone) {
  try {
    const updateData = {};
    
    if (changes.barber_id) updateData.barber_id = changes.barber_id;
    if (changes.service_id) updateData.service_id = changes.service_id;
    if (changes.status) updateData.status = changes.status;
    if (changes.notes !== undefined) updateData.notes = changes.notes;
    
    if (changes.start_time) {
      updateData.start_time = TimezoneService.toUTC(changes.start_time, timezone);
    }
    if (changes.end_time) {
      updateData.end_time = TimezoneService.toUTC(changes.end_time, timezone);
    } else if (changes.start_time && changes.duration_minutes) {
      const { endUTC } = TimezoneService.calculateEndTime(
        changes.start_time,
        changes.duration_minutes,
        timezone
      );
      updateData.end_time = endUTC;
    }
    
    if (changes.recurrence_pattern) {
      const newRRule = RRuleService.createRRuleString(changes.recurrence_pattern);
      const validation = RRuleService.validateRRule(newRRule);
      
      if (!validation.valid) {
        return { error: `Invalid recurrence pattern: ${validation.error}`, status: 400 };
      }
      
      updateData.recurring_pattern = {
        ...appointment.recurring_pattern,
        ...changes.recurrence_pattern,
        rrule: newRRule,
        modified_at: new Date().toISOString()
      };
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', appointment.id)
      .select()
      .single();

    if (error) {
      return { error: 'Failed to update appointment series', status: 500 };
    }

    return {
      data: {
        message: 'All occurrences modified successfully',
        appointment: data,
        modification_type: 'all'
      }
    };

  } catch (error) {
    console.error('Error in modifyAll:', error);
    return { error: 'Failed to modify all occurrences', status: 500 };
  }
}

/**
 * Helper function to update RRule with UNTIL date
 */
function updateRRuleUntil(rruleString, untilDate) {
  let cleanedRRule = rruleString.replace(/UNTIL=[^;\\n]+[;\\n]?/, '');
  
  const untilStr = untilDate.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\\.\\d{3}/, '');
  
  if (cleanedRRule.includes(';')) {
    cleanedRRule += `;UNTIL=${untilStr}`;
  } else {
    cleanedRRule += `\\nUNTIL=${untilStr}`;
  }
  
  return cleanedRRule;
}

/**
 * Helper function to create RRule from a specific date
 */
function createRRuleFromDate(pattern, startDate, timezone) {
  const dt = TimezoneService.parseDateTime(startDate, timezone);
  const dtstart = dt.iso.replace(/[-:]/g, '').replace(/\\.\\d{3}/, '');
  
  let rrule = pattern.rrule;
  
  if (rrule.includes('DTSTART')) {
    rrule = rrule.replace(/DTSTART[^\\n]+/, `DTSTART:${dtstart}`);
  } else {
    rrule = `DTSTART:${dtstart}\\n${rrule}`;
  }
  
  return rrule;
}

/**
 * Helper function to calculate end time
 */
function calculateEndTime(startTime, durationMinutes) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toISOString();
}