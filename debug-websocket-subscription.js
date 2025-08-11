const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugWebSocketSubscription() {
  console.log('🔍 Debugging WebSocket Subscription Setup\n');
  
  // 1. Check if Realtime is enabled on the bookings table
  console.log('1️⃣ Checking Realtime configuration...');
  
  // Create a test channel to see if it connects
  const testChannel = supabase
    .channel('test-channel')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'bookings' 
      }, 
      (payload) => {
        console.log('📡 Received event (no filter):', {
          eventType: payload.eventType,
          table: payload.table,
          new: payload.new?.id,
          old: payload.old?.id
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Test channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to test channel');
        testWithFilter();
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error - Realtime may not be enabled on the table');
        process.exit(1);
      }
    });
}

async function testWithFilter() {
  console.log('\n2️⃣ Testing with shop_id filter...');
  
  const filteredChannel = supabase
    .channel('filtered-channel')
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: 'shop_id=eq.demo-shop-001'
      },
      (payload) => {
        console.log('📡 Received filtered UPDATE:', {
          id: payload.new?.id,
          shop_id: payload.new?.shop_id,
          status: payload.new?.status
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Filtered channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed with filter');
        triggerTestUpdate();
      }
    });
}

async function triggerTestUpdate() {
  console.log('\n3️⃣ Triggering test UPDATE...');
  
  // Get an appointment to update
  const { data: appointments } = await supabase
    .from('bookings')
    .select('id, notes, shop_id, status')
    .eq('shop_id', 'demo-shop-001')
    .limit(1);
  
  if (!appointments || appointments.length === 0) {
    console.log('❌ No appointments found');
    return;
  }
  
  const apt = appointments[0];
  console.log('Updating appointment:', apt.id);
  console.log('Shop ID:', apt.shop_id);
  
  // Update it
  const { error } = await supabase
    .from('bookings')
    .update({ 
      notes: 'WebSocket debug test at ' + new Date().toISOString()
    })
    .eq('id', apt.id);
  
  if (error) {
    console.error('❌ Update error:', error);
  } else {
    console.log('✅ Update sent - waiting for WebSocket event...');
    console.log('⏳ If no event appears in 5 seconds, WebSocket is not working');
  }
  
  // Wait for events
  setTimeout(() => {
    console.log('\n📊 Test complete. If no events were received, check:');
    console.log('   1. Realtime is enabled on the bookings table in Supabase dashboard');
    console.log('   2. RLS policies allow SELECT on the bookings table');
    console.log('   3. The filter syntax matches Supabase requirements');
    process.exit(0);
  }, 5000);
}

debugWebSocketSubscription().catch(console.error);