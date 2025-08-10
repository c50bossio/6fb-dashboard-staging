const fetch = require('node-fetch');

async function check230PMAppointment() {
  const response = await fetch('http://localhost:9999/api/calendar/appointments');
  const data = await response.json();
  
  // Find appointments that should be at 2:30 PM (18:30 UTC)
  const recurring230 = data.appointments.filter(a => {
    if (!a.rrule) return false;
    const startDate = new Date(a.start);
    const utcHours = startDate.getUTCHours();
    const utcMinutes = startDate.getUTCMinutes();
    return utcHours === 18 && utcMinutes === 30; // 2:30 PM EDT is 18:30 UTC
  });
  
  console.log('Found', recurring230.length, 'recurring appointments at 2:30 PM (18:30 UTC):\n');
  
  recurring230.forEach((appt, index) => {
    const startDate = new Date(appt.start);
    console.log('Appointment', index + 1 + ':');
    console.log('Title:', appt.title);
    console.log('Start (raw):', appt.start);
    console.log('Local time:', startDate.toLocaleTimeString());
    console.log('Local hours:', startDate.getHours(), '(should be 14 for 2:30 PM)');
    console.log('Local minutes:', startDate.getMinutes(), '(should be 30)');
    
    // Check DTSTART
    const dtstartMatch = appt.rrule.match(/DTSTART:([^\n]+)/);
    if (dtstartMatch) {
      const dtstr = dtstartMatch[1];
      const hour = dtstr.substring(9, 11);
      const minute = dtstr.substring(11, 13);
      console.log('DTSTART time:', hour + ':' + minute);
      
      if (hour === '14' && minute === '30') {
        console.log('✅ DTSTART is correct for 2:30 PM');
      } else {
        console.log('❌ DTSTART is wrong! Should be 14:30 but is', hour + ':' + minute);
      }
    }
    console.log('---');
  });
}

check230PMAppointment();