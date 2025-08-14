const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWebSocketV2() {
  console.log('🚀 WebSocket V2 End-to-End Test\n');
  console.log('================================\n');
  
  const shopId = 'demo-shop-001';
  
  // 1. Get current appointment count
  const { data: initialAppts, error: countError } = await supabase
    .from('bookings')
    .select('id', { count: 'exact' })
    .eq('shop_id', shopId);
  
  if (countError) {
    console.error('❌ Error getting appointment count:', countError);
    return;
  }
  
  console.log(`📊 Current appointments in ${shopId}: ${initialAppts.length}`);
  
  // 2. Set up subscription to monitor events
  console.log('\n📡 Setting up WebSocket subscription...');
  
  let eventsReceived = {
    INSERT: 0,
    UPDATE: 0,
    DELETE: 0
  };
  
  const channel = supabase
    .channel(`test-v2-${shopId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `shop_id=eq.${shopId}`
      }, 
      (payload) => {
        const eventType = payload.eventType;
        eventsReceived[eventType]++;
        
        console.log(`\n✅ ${eventType} event received!`);
        console.log(`   ID: ${payload.new?.id || payload.old?.id}`);
        
        if (eventType === 'UPDATE') {
          console.log(`   Old status: ${payload.old?.status}`);
          console.log(`   New status: ${payload.new?.status}`);
        }
      }
    )
    .subscribe((status) => {
      console.log(`📡 Subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('✅ WebSocket connected successfully!\n');
        runTests();
      }
    });
  
  async function runTests() {
    console.log('🧪 Running WebSocket V2 Tests...\n');
    
    // Test 1: INSERT
    console.log('Test 1: INSERT new appointment');
    const { data: newAppt, error: insertError } = await supabase
      .from('bookings')
      .insert({
        shop_id: shopId,
        barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e', // John Smith
        customer_name: 'WebSocket V2 Test Customer',
        customer_phone: '555-0123',
        customer_email: 'websocket.test@example.com',
        service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65', // Haircut
        service_name: 'WebSocket Test Cut',
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 88200000).toISOString(), // Tomorrow + 30min
        duration_minutes: 30,
        price: 35,
        status: 'confirmed',
        notes: 'WebSocket V2 INSERT test'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ INSERT error:', insertError);
    } else {
      console.log(`✅ Created appointment: ${newAppt.id}`);
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: UPDATE
      console.log('\nTest 2: UPDATE appointment status');
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          notes: 'WebSocket V2 UPDATE test - cancelled'
        })
        .eq('id', newAppt.id);
      
      if (updateError) {
        console.error('❌ UPDATE error:', updateError);
      } else {
        console.log('✅ Updated appointment to cancelled');
      }
      
      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 3: DELETE
      console.log('\nTest 3: DELETE appointment');
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', newAppt.id);
      
      if (deleteError) {
        console.error('❌ DELETE error:', deleteError);
      } else {
        console.log('✅ Deleted appointment');
      }
      
      // Wait for events to arrive
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Show results
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`INSERT events received: ${eventsReceived.INSERT} (expected: 1)`);
    console.log(`UPDATE events received: ${eventsReceived.UPDATE} (expected: 1)`);
    console.log(`DELETE events received: ${eventsReceived.DELETE} (expected: 1)`);
    
    const allPassed = eventsReceived.INSERT === 1 && 
                     eventsReceived.UPDATE === 1 && 
                     eventsReceived.DELETE === 1;
    
    if (allPassed) {
      console.log('\n🎉 All WebSocket V2 tests PASSED!');
      console.log('✅ Real-time updates are working correctly');
    } else {
      console.log('\n⚠️ Some tests failed - WebSocket may not be fully functional');
      console.log('Check Supabase dashboard to ensure Realtime is enabled on bookings table');
    }
    
    // Cleanup
    supabase.removeChannel(channel);
    process.exit(0);
  }
}

testWebSocketV2().catch(console.error);