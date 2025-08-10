const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAndConvertAppointment() {
  // Find our test appointment
  const { data: appointments, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('is_recurring', false)
    .eq('is_test', true)
    .like('notes', '%2:30 PM%')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (!appointments || appointments.length === 0) {
    console.log('No test appointment found');
    return;
  }
  
  const appt = appointments[0];
  console.log('Found test appointment:');
  console.log('ID:', appt.id);
  console.log('Start time:', appt.start_time);
  console.log('Day:', new Date(appt.start_time).toLocaleDateString('en-US', { weekday: 'long' }));
  console.log('Time:', new Date(appt.start_time).toLocaleTimeString('en-US'));
  
  // Now convert it to recurring using the API
  console.log('\nConverting to recurring with WEEKLY recurrence...');
  
  const response = await fetch('http://localhost:9999/api/calendar/appointments/' + appt.id + '/convert-recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recurrence_rule: 'FREQ=WEEKLY;INTERVAL=1;COUNT=4;BYDAY=MO'
    })
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Successfully converted to recurring!');
    console.log('Original time:', appt.start_time);
    console.log('Preserved in pattern:', result.recurring_pattern.dtstart);
    console.log('Times match:', appt.start_time === result.recurring_pattern.dtstart);
    
    // Now fetch the calendar appointments to see if they appear at the right time
    console.log('\nFetching calendar events...');
    const calResponse = await fetch('http://localhost:9999/api/calendar/appointments');
    const calData = await calResponse.json();
    
    const recurringAppt = calData.appointments.find(a => a.id === appt.id);
    if (recurringAppt) {
      console.log('\n📅 Calendar event found:');
      console.log('Start time from calendar:', recurringAppt.start);
      console.log('Has RRule:', !!recurringAppt.rrule);
      console.log('RRule:', recurringAppt.rrule);
      
      console.log('\n✅ TIME PRESERVATION VERIFICATION:');
      console.log('Original appointment time:', new Date(appt.start_time).toLocaleTimeString());
      console.log('Calendar event time:', new Date(recurringAppt.start).toLocaleTimeString());
      
      const originalTime = new Date(appt.start_time).toLocaleTimeString();
      const calendarTime = new Date(recurringAppt.start).toLocaleTimeString();
      
      if (originalTime === calendarTime) {
        console.log('\n🎉 SUCCESS: Times are preserved correctly!');
        console.log('The recurring appointment is set at the same time (2:30 PM) as the original.');
      } else {
        console.log('\n⚠️ WARNING: Times do not match!');
        console.log('Expected:', originalTime);
        console.log('Got:', calendarTime);
      }
      
      // Parse the RRule to verify it includes the correct day
      if (recurringAppt.rrule) {
        console.log('\n📋 RRule Details:');
        const rruleParts = recurringAppt.rrule.split(';');
        rruleParts.forEach(part => {
          console.log('  -', part);
        });
      }
    } else {
      console.log('\n⚠️ Appointment not found in calendar response');
    }
  } else {
    console.error('Conversion failed:', result);
  }
}

findAndConvertAppointment();