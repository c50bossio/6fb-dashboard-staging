const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testNullableClientId() {
  // Get a real service ID first
  const { data: services } = await supabase
    .from('services')
    .select('id')
    .eq('barbershop_id', 'c5a58548-8f23-426c-bedc-49a83d238724')
    .limit(1);

  if (!services || services.length === 0) {
    console.log('No services found');
    return;
  }

  const testId = '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0').slice(-12);

  const testAppointment = {
    id: testId,
    barbershop_id: 'c5a58548-8f23-426c-bedc-49a83d238724',
    barber_id: '5ec6e99c-c639-4529-8953-415213dd0e35',
    service_id: services[0].id,
    client_id: null,  // Explicitly test NULL
    scheduled_at: new Date().toISOString(),
    status: 'PENDING',
    duration_minutes: 30,
    price: 35,
    client_name: 'Test Walk-in Customer',
    client_email: 'test@example.com',
    client_phone: '555-0000'
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(testAppointment)
    .select();

  if (error) {
    console.log('❌ client_id is NOT nullable');
    console.log('   Error:', error.message);
    console.log('   Solution: Must reference profiles table with CLIENT role');
  } else {
    console.log('✅ client_id CAN be NULL!');
    console.log('   Created test appointment:', data[0]?.id);

    // Clean up
    await supabase.from('appointments').delete().eq('id', testId);
    console.log('   Test appointment deleted');
  }
}

testNullableClientId().catch(console.error);
