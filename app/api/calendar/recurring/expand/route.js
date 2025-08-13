import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const RRuleService = require('../rrule.service');
const TimezoneService = require('../timezone.service');

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
      .from('bookings')
      .select(`
        *,
        barbers (id, name, color, avatar_url),
        customers (id, name, email, phone),
        services (id, name, duration_minutes, price, category)
      `)
      .eq('shop_id', shop_id)
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
    
    for (const appointment of recurringAppointments || []) {
      if (!appointment.recurring_pattern?.rrule) {
        console.warn(`Appointment ${appointment.id} marked as recurring but has no RRule`);
        continue;
      }

      try {
        // Generate occurrences for this appointment
        const occurrences = RRuleService.generateOccurrences(
          appointment.recurring_pattern.rrule,
          startDate,
          endDate,
          appointment.recurring_pattern.timezone || timezone
        );

        // Create event object for each occurrence
        for (const occurrence of occurrences) {
          // Calculate end time based on duration
          const duration = appointment.recurring_pattern.duration || 'PT1H';
          const durationMinutes = parseDuration(duration);
          
          const { end: occurrenceEnd } = TimezoneService.calculateEndTime(
            occurrence.date,
            durationMinutes,
            appointment.recurring_pattern.timezone || timezone
          );

          expandedEvents.push({
            id: `${appointment.id}_${occurrence.date.getTime()}`, // Unique ID for each occurrence
            groupId: appointment.id, // Group ID for the series
            title: `${appointment.customers?.name || 'Customer'} - ${appointment.services?.name || 'Unknown Service'}`,
            start: occurrence.isoString,
            end: occurrenceEnd,
            backgroundColor: appointment.barbers?.color || '#546355',
            borderColor: appointment.barbers?.color || '#546355',
            resourceId: appointment.barber_id, // For resource view
            display: 'block',
            extendedProps: {
              appointmentId: appointment.id,
              occurrenceDate: occurrence.date,
              barber_id: appointment.barber_id,
              barber_name: appointment.barbers?.name,
              barber_avatar: appointment.barbers?.avatar_url,
              customer_id: appointment.customer_id,
              customer_name: appointment.customers?.name,
              customer_email: appointment.customers?.email,
              customer_phone: appointment.customers?.phone,
              service_id: appointment.service_id,
              service_name: appointment.services?.name,
              service_duration: appointment.services?.duration_minutes,
              service_price: appointment.services?.price,
              notes: appointment.notes,
              status: appointment.status,
              is_recurring: true,
              recurring_pattern: appointment.recurring_pattern,
              series_id: appointment.id
            }
          });
        }
      } catch (error) {
        console.error(`Error expanding appointment ${appointment.id}:`, error);
        // Continue with other appointments even if one fails
      }
    }

    // Optionally include single appointments
    let singleEvents = [];
    if (include_single) {
      // Build query for single appointments
      let singleQuery = supabase
        .from('bookings')
        .select(`
          *,
          barbers (id, name, color, avatar_url),
          customers (id, name, email, phone),
          services (id, name, duration_minutes, price, category)
        `)
        .eq('shop_id', shop_id)
        .eq('is_test', false)
        .eq('is_recurring', false)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (barber_id) {
        singleQuery = singleQuery.eq('barber_id', barber_id);
      }

      const { data: singleAppointments, error: singleError } = await singleQuery;

      if (singleError) {
        console.error('Error fetching single appointments:', singleError);
      } else {
        // Format single appointments
        singleEvents = (singleAppointments || []).map(appointment => ({
          id: appointment.id,
          title: `${appointment.customers?.name || 'Customer'} - ${appointment.services?.name || 'Unknown Service'}`,
          start: appointment.start_time,
          end: appointment.end_time,
          backgroundColor: appointment.barbers?.color || '#546355',
          borderColor: appointment.barbers?.color || '#546355',
          resourceId: appointment.barber_id,
          display: 'block',
          extendedProps: {
            appointmentId: appointment.id,
            barber_id: appointment.barber_id,
            barber_name: appointment.barbers?.name,
            barber_avatar: appointment.barbers?.avatar_url,
            customer_id: appointment.customer_id,
            customer_name: appointment.customers?.name,
            customer_email: appointment.customers?.email,
            customer_phone: appointment.customers?.phone,
            service_id: appointment.service_id,
            service_name: appointment.services?.name,
            service_duration: appointment.services?.duration_minutes,
            service_price: appointment.services?.price,
            notes: appointment.notes,
            status: appointment.status,
            is_recurring: false
          }
        }));
      }
    }

    // Combine and sort all events
    const allEvents = [...expandedEvents, ...singleEvents].sort((a, b) => 
      new Date(a.start) - new Date(b.start)
    );

    // Return response
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
        timezone: timezone
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