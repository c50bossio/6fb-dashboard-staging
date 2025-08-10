#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestRecurringAppointment() {
  // Get a barber, service, and customer
  const { data: barbers } = await supabase.from('barbers').select('id').limit(1);
  const { data: services } = await supabase.from('services').select('id').limit(1);
  const { data: customers } = await supabase.from('customers').select('id').limit(1);
  
  if (!barbers?.length || !services?.length || !customers?.length) {
    console.error('Missing required data');
    return;
  }
  
  // Create a weekly recurring appointment for testing
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + ((5 - startDate.getDay() + 7) % 7)); // Next Friday
  startDate.setHours(14, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setHours(15, 0, 0, 0);
  
  const appointment = {
    shop_id: 'demo-shop-001',
    barber_id: barbers[0].id,
    customer_id: customers[0].id,
    service_id: services[0].id,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    status: 'confirmed',
    price: 45,
    notes: 'TEST RECURRING - Weekly Friday appointment',
    is_recurring: true,
    recurring_pattern: {
      rrule: 'FREQ=WEEKLY;BYDAY=FR;COUNT=6',
      frequency: 'weekly',
      interval: 1,
      count: 6,
      byweekday: 'FR',
      cancelled_dates: []
    },
    is_test: true
  };
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(appointment)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating appointment:', error);
  } else {
    console.log('✅ Created test recurring appointment');
    console.log('ID:', data.id);
    console.log('Start:', data.start_time);
    console.log('Pattern:', data.recurring_pattern.rrule);
  }
}

createTestRecurringAppointment();