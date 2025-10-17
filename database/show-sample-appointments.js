const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showSampleAppointments() {
  console.log('=== SAMPLE APPOINTMENTS WITH FULL DETAILS ===\n');

  const locations = {
    'c5a58548-8f23-426c-bedc-49a83d238724': 'Tomb45 Channelside',
    '9306d931-7ab0-45b7-88d5-599678085526': 'Tomb45 GasWorx',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890': 'Elite Cuts LA'
  };

  for (const [locationId, locationName] of Object.entries(locations)) {
    console.log(`${locationName}:`);
    console.log('='.repeat(60));

    // Get sample appointments with barber and service details
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        scheduled_at,
        status,
        client_name,
        client_phone,
        duration_minutes,
        service_price,
        notes,
        barber_id,
        service_id
      `)
      .eq('barbershop_id', locationId)
      .order('scheduled_at', { ascending: false })
      .limit(3);

    if (!appointments || appointments.length === 0) continue;

    for (const apt of appointments) {
      // Get barber name
      const { data: barber } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', apt.barber_id)
        .single();

      // Get service name
      const { data: service } = await supabase
        .from('services')
        .select('name')
        .eq('id', apt.service_id)
        .single();

      const date = new Date(apt.scheduled_at);
      console.log(`
Date/Time: ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
Client: ${apt.client_name} (${apt.client_phone})
Barber: ${barber?.full_name || 'Unknown'}
Service: ${service?.name || 'Unknown'}
Duration: ${apt.duration_minutes} minutes
Price: $${apt.service_price}
Status: ${apt.status}
${apt.notes ? 'Notes: ' + apt.notes : 'No notes'}
`);
      console.log('-'.repeat(60));
    }
    console.log();
  }

  // Final statistics
  console.log('=== FINAL STATISTICS ===');
  const { data: allAppointments } = await supabase
    .from('appointments')
    .select('status, scheduled_at, service_price')
    .in('barbershop_id', Object.keys(locations));

  if (allAppointments) {
    const totalRevenue = allAppointments
      .filter(a => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + parseFloat(a.service_price || 0), 0);

    const upcomingRevenue = allAppointments
      .filter(a => a.status === 'CONFIRMED' && new Date(a.scheduled_at) > new Date())
      .reduce((sum, a) => sum + parseFloat(a.service_price || 0), 0);

    const completedCount = allAppointments.filter(a => a.status === 'COMPLETED').length;

    console.log(`Total appointments: ${allAppointments.length}`);
    console.log(`Completed appointments: ${completedCount}`);
    console.log(`Revenue from completed appointments: $${totalRevenue.toFixed(2)}`);
    console.log(`Projected revenue from confirmed appointments: $${upcomingRevenue.toFixed(2)}`);
    console.log(`Average appointment value: $${(totalRevenue / completedCount).toFixed(2)}`);
  }
}

showSampleAppointments().catch(console.error);
