const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWebSocket() {
  // Get a non-cancelled appointment
  const { data: appointments, error: fetchError } = await supabase
    .from('bookings')
    .select('id, customer_name, service_name, status')
    .eq('shop_id', 'demo-shop-001')
    .neq('status', 'cancelled')
    .limit(1);
  
  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  
  if (!appointments || appointments.length === 0) {
    console.log('No active appointments to test');
    return;
  }
  
  const apt = appointments[0];
  console.log('🔍 Testing WebSocket UPDATE with appointment:', apt.id);
  console.log('   Customer:', apt.customer_name);
  console.log('   Service:', apt.service_name);
  console.log('   Current status:', apt.status);
  
  // Cancel it
  console.log('\n⚡ Cancelling appointment to trigger WebSocket UPDATE event...');
  const { error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      notes: 'WebSocket test cancellation at ' + new Date().toISOString()
    })
    .eq('id', apt.id);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Appointment cancelled successfully!');
    console.log('\n📡 CHECK THE BROWSER NOW:');
    console.log('   - If the appointment shows ❌ immediately = WebSocket UPDATE works');
    console.log('   - If it takes 5+ seconds = Only AutoRefresh works');
    console.log('   - If it never updates = Both are broken');
  }
  
  process.exit(0);
}

testWebSocket().catch(console.error);