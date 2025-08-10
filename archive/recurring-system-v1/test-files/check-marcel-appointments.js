const fetch = require('node-fetch');

async function checkAllMarcelAppointments() {
  const response = await fetch('http://localhost:9999/api/calendar/appointments');
  const data = await response.json();
  
  // Find all Marcel Gleason appointments
  const marcelAppts = data.appointments.filter(a => 
    a.title && a.title.includes('Marcel Gleason')
  );
  
  console.log('Found', marcelAppts.length, 'Marcel Gleason appointments:\n');
  
  marcelAppts.forEach((appt, index) => {
    console.log('Appointment', index + 1 + ':');
    console.log('Title:', appt.title);
    console.log('Start:', appt.start);
    console.log('Has RRule:', !!appt.rrule);
    if (appt.rrule) {
      console.log('RRule:', appt.rrule);
      console.log('Duration:', appt.duration);
      console.log('Start time:', new Date(appt.start).toLocaleTimeString());
      console.log('✅ Has duration property:', appt.duration ? 'YES - ' + appt.duration : 'NO');
    }
    console.log('---');
  });
  
  // Also check for the recurring one specifically
  const recurringMarcel = marcelAppts.find(a => a.rrule);
  if (recurringMarcel) {
    console.log('\n🔍 RECURRING Marcel Gleason appointment details:');
    console.log('Full event object keys:', Object.keys(recurringMarcel));
  }
}

checkAllMarcelAppointments();