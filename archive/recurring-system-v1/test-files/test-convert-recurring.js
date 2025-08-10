#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConvertToRecurring() {
  // First, create a regular appointment
  const { data: barbers } = await supabase.from('barbers').select('id').limit(1);
  const { data: services } = await supabase.from('services').select('id').limit(1);
  const { data: customers } = await supabase.from('customers').select('id').limit(1);
  
  if (!barbers?.length || !services?.length || !customers?.length) {
    console.error('Missing required data');
    return;
  }
  
  // Create a regular appointment
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 2); // Day after tomorrow
  startDate.setHours(15, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setHours(16, 0, 0, 0);
  
  const appointment = {
    shop_id: 'demo-shop-001',
    barber_id: barbers[0].id,
    customer_id: customers[0].id,
    service_id: services[0].id,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    status: 'confirmed',
    price: 50,
    notes: 'Test appointment for conversion',
    is_recurring: false,
    is_test: true
  };
  
  const { data: created, error: createError } = await supabase
    .from('bookings')
    .insert(appointment)
    .select()
    .single();
    
  if (createError) {
    console.error('Error creating appointment:', createError);
    return;
  }
  
  console.log('✅ Created regular appointment');
  console.log('ID:', created.id);
  
  // Now test the convert-recurring API
  console.log('\n📝 Testing convert-recurring API...');
  
  const convertData = {
    recurrence_rule: 'FREQ=WEEKLY;INTERVAL=1;COUNT=4;BYDAY=MO,WE,FR'
  };
  
  const response = await fetch(`http://localhost:9999/api/calendar/appointments/${created.id}/convert-recurring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(convertData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Convert failed:', error);
    return;
  }
  
  const result = await response.json();
  console.log('✅ Successfully converted to recurring!');
  console.log('Response:', JSON.stringify(result, null, 2));
  
  // The fix should handle this without "client_name" error
  console.log('\n✅ Test completed successfully!');
  console.log('The appointment data returned has:');
  console.log('- id:', result.appointment?.id);
  console.log('- is_recurring:', result.appointment?.is_recurring);
  console.log('- recurring_pattern:', result.appointment?.recurring_pattern);
}

testConvertToRecurring().catch(console.error);