import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const RRuleService = require('../rrule.service');
const TimezoneService = require('../timezone.service');
const { parseRecurrenceRule } = require('../../../../../lib/recurring-format-parser');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/calendar/recurring/expand
 * Expand recurring appointments into individual occurrences for a date range
 * This provides server-side expansion for better performance
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      start_date,
      end_date,
      barber_id,
      shop_id = 'shop_001',
      include_single = true,
      timezone = 'America/New_York'
    } = body;

    // Validate date range
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Prevent excessive date ranges (max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (endDate - startDate > maxRange) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 1 year' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        barber:profiles!appointments_barber_id_fkey (id, full_name, avatar_url),
        service:services (id, name, duration_minutes, price, category)
      `)
      .eq('barbershop_id', shop_id)
      .eq('is_test', false);

    // Add barber filter if specified
    if (barber_id) {
      query = query.eq('barber_id', barber_id);
    }

    // Fetch recurring appointments
    const { data: recurringAppointments, error: recurringError } = await query
      .eq('is_recurring', true);

    if (recurringError) {
      console.error('Error fetching recurring appointments:', recurringError);
      return NextResponse.json(
        { error: 'Failed to fetch recurring appointments' },
        { status: 500 }
      );
    }

    // Expand each recurring appointment
    const expandedEvents = [];
    const expansionErrors = []; // Track errors for API response

    for (const appointment of recurringAppointments || []) {
      // Parse recurrence_rule using backward-compatible parser
      const parseResult = parseRecurrenceRule(appointment.recurrence_rule, {
        defaultTimezone: timezone,
        defaultDuration: appointment.duration_minutes || 60
      });

      // Handle parse failures
      if (!parseResult.success) {
        const error = {
          appointmentId: appointment.id,
          clientName: appointment.client_name,
          error: parseResult.error,
          format: parseResult.format,
          rawRule: parseResult.raw
        };
        expansionErrors.push(error);
        console.error(`[EXPANSION ERROR] Appointment ${appointment.id}:`, error);
        continue;
      }

      // Log migration warnings
      if (parseResult.migrationNeeded) {
        console.warn(`[MIGRATION NEEDED] Appointment ${appointment.id} using legacy format`);
      }

      // Extract parsed data
      const recurrenceData = parseResult.data;

      if (!recurrenceData.rrule) {
        const error = {
          appointmentId: appointment.id,
          clientName: appointment.client_name,
          error: 'Parsed data missing rrule field',
          format: parseResult.format
        };
        expansionErrors.push(error);
        console.error(`[EXPANSION ERROR] Appointment ${appointment.id}:`, error);
        continue;
      }

      try {
        // Generate occurrences for this appointment
        const occurrences = RRuleService.generateOccurrences(
          recurrenceData.rrule,
          startDate,
          endDate,
          recurrenceData.timezone || timezone
        );

        // Check if expansion produced any occurrences
        if (occurrences.length === 0) {
          const warning = {
            appointmentId: appointment.id,
            clientName: appointment.client_name,
            warning: 'RRule expansion produced 0 occurrences',
            rrule: recurrenceData.rrule,
            dateRange: { start: startDate, end: endDate }
          };
          expansionErrors.push(warning);
          console.warn(`[EXPANSION WARNING] Appointment ${appointment.id}:`, warning);
        }

        // Create event object for each occurrence
        for (const occurrence of occurrences) {
          // Calculate end time based on duration
          const duration = recurrenceData.duration || 'PT1H';
          const durationMinutes = parseDuration(duration);

          const { end: occurrenceEnd } = TimezoneService.calculateEndTime(
            occurrence.date,
            durationMinutes,
            recurrenceData.timezone || timezone
          );

          expandedEvents.push({
            id: `${appointment.id}_${occurrence.date.getTime()}`, // Unique ID for each occurrence
            groupId: appointment.id, // Group ID for the series
            title: `${appointment.client_name || 'Customer'} - ${appointment.service?.name || 'Unknown Service'}`,
            start: occurrence.isoString,
            end: occurrenceEnd,
            backgroundColor: appointment.barber?.color || '#546355',
            borderColor: appointment.barber?.color || '#546355',
            resourceId: appointment.barber_id, // For resource view
            display: 'block',
            extendedProps: {
              appointmentId: appointment.id,
              occurrenceDate: occurrence.date,
              barber_id: appointment.barber_id,
              barber_name: appointment.barber?.full_name,
              barber_avatar: appointment.barber?.avatar_url,
              client_id: appointment.client_id,
              customer_name: appointment.client_name,
              customer_email: appointment.client_email,
              customer_phone: appointment.client_phone,
              service_id: appointment.service_id,
              service_name: appointment.service?.name,
              service_duration: appointment.service?.duration_minutes,
              service_price: appointment.service?.price,
              notes: appointment.client_notes,
              status: appointment.status,
              is_recurring: true,
              recurring_pattern: recurrenceData,
              series_id: appointment.id
            }
          });
        }
      } catch (error) {
        const errorDetail = {
          appointmentId: appointment.id,
          clientName: appointment.client_name,
          error: error.message,
          stack: error.stack,
          rrule: recurrenceData.rrule
        };
        expansionErrors.push(errorDetail);
        console.error(`[EXPANSION ERROR] Appointment ${appointment.id}:`, errorDetail);
        // Continue with other appointments even if one fails
      }
    }

    // Optionally include single appointments
    let singleEvents = [];
    if (include_single) {
      // Build query for single appointments
      let singleQuery = supabase
        .from('appointments')
        .select(`
          *,
          barber:profiles!appointments_barber_id_fkey (id, full_name, avatar_url),
          service:services (id, name, duration_minutes, price, category)
        `)
        .eq('barbershop_id', shop_id)
        .eq('is_test', false)
        .eq('is_recurring', false)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());

      if (barber_id) {
        singleQuery = singleQuery.eq('barber_id', barber_id);
      }

      const { data: singleAppointments, error: singleError } = await singleQuery;

      if (singleError) {
        console.error('Error fetching single appointments:', singleError);
      } else {
        // Format single appointments
        singleEvents = (singleAppointments || []).map(appointment => {
          // Calculate end time from scheduled_at and duration_minutes
          const startTime = new Date(appointment.scheduled_at);
          const endTime = new Date(startTime.getTime() + (appointment.duration_minutes * 60 * 1000));

          return {
            id: appointment.id,
            title: `${appointment.client_name || 'Customer'} - ${appointment.service?.name || 'Unknown Service'}`,
            start: appointment.scheduled_at,
            end: endTime.toISOString(),
            backgroundColor: appointment.barber?.color || '#546355',
            borderColor: appointment.barber?.color || '#546355',
            resourceId: appointment.barber_id,
            display: 'block',
            extendedProps: {
              appointmentId: appointment.id,
              barber_id: appointment.barber_id,
              barber_name: appointment.barber?.full_name,
              barber_avatar: appointment.barber?.avatar_url,
              client_id: appointment.client_id,
              customer_name: appointment.client_name,
              customer_email: appointment.client_email,
              customer_phone: appointment.client_phone,
              service_id: appointment.service_id,
              service_name: appointment.service?.name,
              service_duration: appointment.service?.duration_minutes,
              service_price: appointment.service?.price,
              notes: appointment.client_notes,
              status: appointment.status,
              is_recurring: false
            }
          };
        });
      }
    }

    // Combine and sort all events
    const allEvents = [...expandedEvents, ...singleEvents].sort((a, b) => 
      new Date(a.start) - new Date(b.start)
    );

    // Return response with error details
    return NextResponse.json({
      events: allEvents,
      meta: {
        total: allEvents.length,
        recurring_count: expandedEvents.length,
        single_count: singleEvents.length,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        timezone: timezone,
        expansion_errors: expansionErrors.length,
        errors: expansionErrors.length > 0 ? expansionErrors : undefined
      }
    });

  } catch (error) {
    console.error('Unexpected error in recurring appointment expansion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Parse ISO 8601 duration to minutes
 * @param {string} duration - ISO 8601 duration string (e.g., 'PT1H30M')
 * @returns {number} Duration in minutes
 */
function parseDuration(duration) {
  if (!duration) return 60; // Default to 1 hour
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 60;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  
  return hours * 60 + minutes;
}