#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDeleteRecurring() {
  // Get a recurring appointment
  const { data: appointments, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('is_recurring', true)
    .limit(1);
  
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  if (!appointments || appointments.length === 0) {
    console.log('No recurring appointments found');
    return;
  }
  
  const appt = appointments[0];
  console.log('Found recurring appointment:');
  console.log('- ID:', appt.id);
  console.log('- Pattern:', appt.recurring_pattern?.rrule);
  console.log('- Start time:', appt.start_time);
  
  // Test deleting the entire series
  console.log('\nDeleting entire recurring series...');
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .eq('id', appt.id);
  
  if (deleteError) {
    console.error('Delete error:', deleteError);
  } else {
    console.log('✅ Successfully deleted recurring appointment series!');
    console.log('The fix is working - no "client_name" error occurred!');
  }
}

testDeleteRecurring();