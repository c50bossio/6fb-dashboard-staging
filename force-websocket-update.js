const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceUpdate() {
  console.log('🔄 Forcing a WebSocket update to test connection\n');
  
  const { data: appointments } = await supabase
    .from('bookings')
    .select('id, status, customer_name')
    .eq('shop_id', 'demo-shop-001')
    .eq('status', 'confirmed')
    .limit(1);
  
  if (appointments && appointments.length > 0) {
    const apt = appointments[0];
    
    const { error } = await supabase
      .from('bookings')
      .update({ 
        notes: 'WebSocket test forced at ' + new Date().toISOString()
      })
      .eq('id', apt.id);
    
    if (!error) {
      console.log('✅ Updated appointment:', apt.id);
      console.log('   Customer:', apt.customer_name);
      console.log('');
      console.log('🔍 NOW CHECK THE BROWSER:');
      console.log('   1. If WebSocket is connected, the appointment should update instantly');
      console.log('   2. The status indicator should turn green');
      console.log('   3. Check browser console for V2 logs');
      console.log('');
      console.log('📊 Browser Console Commands:');
      console.log('   window.v2LastStatus         // Current status');
      console.log('   window.v2SubscriptionHistory // All status changes');
      console.log('   window.websocketV2Connected  // Connection status');
      console.log('');
      console.log('If nothing happens, WebSocket is not connecting in the browser.');
    }
  }
}

forceUpdate().catch(console.error);