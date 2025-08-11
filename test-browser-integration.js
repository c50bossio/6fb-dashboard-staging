const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBrowserIntegration() {
  console.log('🌐 Browser Integration Test\n');
  console.log('================================\n');
  
  // Update an appointment to trigger WebSocket
  const { data: appointments } = await supabase
    .from('bookings')
    .select('id, status, customer_name')
    .eq('shop_id', 'demo-shop-001')
    .eq('status', 'confirmed')
    .limit(1);
  
  if (appointments && appointments.length > 0) {
    const apt = appointments[0];
    console.log('📝 Cancelling appointment for:', apt.customer_name);
    
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        notes: 'Browser integration test - cancelled at ' + new Date().toISOString()
      })
      .eq('id', apt.id);
    
    if (!error) {
      console.log('✅ Appointment cancelled successfully');
      console.log('');
      console.log('🔍 Check Browser Now:');
      console.log('   1. The appointment should turn RED immediately');
      console.log('   2. A ❌ should appear in the title');
      console.log('   3. No page refresh needed');
      console.log('');
      console.log('📊 Browser Console Commands:');
      console.log('   window.websocketV2Connected  // Should be true');
      console.log('   window.websocketLogs         // View all events');
      console.log('');
      console.log('✅ If the change appears instantly, WebSocket V2 is working!');
    }
  }
}

testBrowserIntegration().catch(console.error);