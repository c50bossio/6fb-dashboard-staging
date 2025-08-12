import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const RRuleService = require('../../../../../services/rrule.service');
const TimezoneService = require('../../../../../services/timezone.service');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/calendar/recurring/create
 * Create a new recurring appointment series with proper time handling
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      barber_id,
      customer_id,
      service_id,
      start_time,
      duration_minutes = 60,
      client_name,
      client_email,
      client_phone,
      notes,
      recurrence_pattern,
      timezone = 'America/New_York',
      shop_id = 'shop_001'
    } = body;

    console.log('Creating recurring appointment with pattern:', recurrence_pattern);

    // Validate required fields
    if (!barber_id || !start_time || !recurrence_pattern) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate end time
    const { start, end, startUTC, endUTC, duration } = TimezoneService.calculateEndTime(
      start_time,
      duration_minutes,
      timezone
    );

    // Create RRule from pattern
    const rrule = RRuleService.createRRuleString(recurrence_pattern);
    
    // Validate the RRule
    const validation = RRuleService.validateRRule(rrule);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid recurrence pattern: ${validation.error}` },
        { status: 400 }
      );
    }

    // Convert to FullCalendar format
    const fullCalendarFormat = RRuleService.toFullCalendarFormat(
      rrule,
      start,
      end
    );

    // Create customer if needed
    let customerId = customer_id;
    if (!customerId && client_name) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          shop_id,
          name: client_name,
          email: client_email || null,
          phone: client_phone || null,
          is_test: false
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        );
      }
      customerId = customerData.id;
    }

    // Create recurring appointment record
    const appointmentData = {
      shop_id,
      barber_id,
      customer_id: customerId,
      service_id: service_id || null,
      start_time: startUTC,
      end_time: endUTC,
      status: 'confirmed',
      notes: notes || null,
      is_recurring: true,
      recurring_pattern: {
        rrule: fullCalendarFormat.rrule,
        duration: fullCalendarFormat.duration,
        timezone: timezone,
        frequency: recurrence_pattern.frequency,
        interval: recurrence_pattern.interval || 1,
        count: recurrence_pattern.count || null,
        until: recurrence_pattern.until || null,
        created_at: new Date().toISOString(),
        created_by: 'recurring_api',
        original_start: start,
        original_end: end
      },
      is_test: false
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert(appointmentData)
      .select(`
        *,
        barbers (name, color),
        customers (name, email, phone),
        services (name, duration_minutes, price)
      `)
      .single();

    if (error) {
      console.error('Error creating recurring appointment:', error);
      return NextResponse.json(
        { error: 'Failed to create recurring appointment' },
        { status: 500 }
      );
    }

    // Generate preview of first 5 occurrences
    const previewStart = new Date();
    const previewEnd = new Date();
    previewEnd.setMonth(previewEnd.getMonth() + 3);
    
    const occurrences = RRuleService.generateOccurrences(
      fullCalendarFormat.rrule,
      previewStart,
      previewEnd,
      timezone
    ).slice(0, 5);

    // Format response
    const response = {
      appointment: {
        id: data.id,
        title: `${data.customers?.name || 'Customer'} - ${data.services?.name || 'Unknown Service'}`,
        start: data.start_time,
        end: data.end_time,
        rrule: fullCalendarFormat.rrule,
        duration: fullCalendarFormat.duration,
        backgroundColor: data.barbers?.color || '#3b82f6',
        extendedProps: {
          barber_id: data.barber_id,
          barber_name: data.barbers?.name,
          customer_id: data.customer_id,
          customer_name: data.customers?.name,
          service_id: data.service_id,
          service_name: data.services?.name,
          notes: data.notes,
          status: data.status,
          is_recurring: true,
          recurring_pattern: data.recurring_pattern
        }
      },
      preview: occurrences.map(occ => ({
        date: occ.localDate,
        display: occ.displayTime
      })),
      validation: {
        valid: true,
        humanReadable: RRuleService.toHumanReadable(fullCalendarFormat.rrule)
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in recurring appointment creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}