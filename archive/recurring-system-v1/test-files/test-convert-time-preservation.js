#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTimePreservation() {
  // Get a regular appointment
  const { data: appointments } = await supabase
    .from('bookings')
    .select('*')
    .eq('is_recurring', false)
    .limit(1);
  
  if (!appointments || appointments.length === 0) {
    console.log('No regular appointments found. Creating one...');
    
    // Create a test appointment at a specific time
    const { data: barbers } = await supabase.from('barbers').select('id').limit(1);
    const { data: services } = await supabase.from('services').select('id').limit(1);
    const { data: customers } = await supabase.from('customers').select('id').limit(1);
    
    const testDate = new Date('2025-08-15T14:30:00'); // 2:30 PM on Friday
    const endDate = new Date('2025-08-15T15:30:00');  // 3:30 PM
    
    const { data: created } = await supabase
      .from('bookings')
      .insert({
        shop_id: 'demo-shop-001',
        barber_id: barbers[0].id,
        customer_id: customers[0].id,
        service_id: services[0].id,
        start_time: testDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        price: 50,
        notes: 'Test appointment at 2:30 PM Friday',
        is_recurring: false,
        is_test: true
      })
      .select()
      .single();
    
    appointments = [created];
  }
  
  const appointment = appointments[0];
  console.log('Original appointment:');
  console.log('- ID:', appointment.id);
  console.log('- Start time:', appointment.start_time);
  console.log('- Day of week:', new Date(appointment.start_time).toLocaleDateString('en-US', { weekday: 'long' }));
  console.log('- Time:', new Date(appointment.start_time).toLocaleTimeString('en-US'));
  
  // Convert to recurring
  console.log('\nConverting to recurring...');
  const dayOfWeek = new Date(appointment.start_time).getDay();
  const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const rrule = `FREQ=WEEKLY;INTERVAL=1;COUNT=6;BYDAY=${weekdays[dayOfWeek]}`;
  
  console.log('RRule:', rrule);
  
  // Update the appointment
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      is_recurring: true,
      recurring_pattern: {
        rrule: rrule,
        dtstart: appointment.start_time,  // Preserve original start time
        dtend: appointment.end_time,       // Preserve original end time
        frequency: 'WEEKLY',
        interval: 1,
        count: 6,
        byweekday: weekdays[dayOfWeek],
        cancelled_dates: []
      }
    })
    .eq('id', appointment.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n✅ Converted to recurring!');
  console.log('Recurring pattern:', JSON.stringify(updated.recurring_pattern, null, 2));
  console.log('\n⏰ Time preservation check:');
  console.log('- Original start:', appointment.start_time);
  console.log('- After conversion:', updated.start_time);
  console.log('- DTSTART in pattern:', updated.recurring_pattern.dtstart);
  console.log('- Times match:', appointment.start_time === updated.start_time);
}

testTimePreservation().catch(console.error);