const fetch = require('node-fetch');

async function checkRRuleOnly() {
  const response = await fetch('http://localhost:9999/api/calendar/appointments');
  const data = await response.json();
  
  // Find recurring appointments (they now have rrule but no start)
  const recurring = data.appointments.filter(a => a.rrule);
  
  console.log('Found', recurring.length, 'recurring appointments:\n');
  
  recurring.forEach((appt, i) => {
    console.log('Appointment', i + 1 + ':');
    console.log('Title:', appt.title);
    console.log('Has start?:', !!appt.start);
    console.log('Has end?:', !!appt.end);
    console.log('Has rrule?:', !!appt.rrule);
    console.log('Has duration?:', !!appt.duration, appt.duration || '');
    
    // Parse DTSTART from RRule
    const dtstartMatch = appt.rrule.match(/DTSTART:([^\n]+)/);
    if (dtstartMatch) {
      const dtstr = dtstartMatch[1];
      const hour = dtstr.substring(9, 11);
      const minute = dtstr.substring(11, 13);
      console.log('Time from DTSTART:', hour + ':' + minute);
      
      if (hour === '14' && minute === '30') {
        console.log('✅ This is a 2:30 PM appointment');
      }
    }
    console.log('---');
  });
}

checkRRuleOnly();