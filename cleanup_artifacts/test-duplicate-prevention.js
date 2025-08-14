const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDuplicatePrevention() {
  console.log('🧪 Duplicate Prevention Test\n');
  console.log('================================\n');
  
  const shopId = 'demo-shop-001';
  const barberId = '56ddbef1-fc3b-4f86-b841-88a8e72e166e'; // John Smith
  const serviceId = 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65'; // Haircut
  
  console.log('📊 Test 1: Rapid Sequential Creation (5 appointments in 100ms)\n');
  
  const appointments = [];
  const errors = [];
  
  // Create 5 appointments rapidly
  for (let i = 0; i < 5; i++) {
    const startTime = new Date(Date.now() + 86400000 + (i * 1800000)); // Tomorrow + i*30min
    const endTime = new Date(startTime.getTime() + 1800000); // +30min
    
    const promise = supabase
      .from('bookings')
      .insert({
        shop_id: shopId,
        barber_id: barberId,
        customer_name: `Test Customer ${i + 1}`,
        customer_phone: `555-010${i}`,
        customer_email: `test${i}@example.com`,
        service_id: serviceId,
        service_name: 'Haircut',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: 30,
        price: 35,
        status: 'confirmed',
        notes: `Rapid test ${i + 1}`
      })
      .select()
      .single()
      .then(result => {
        if (result.error) {
          errors.push({ index: i, error: result.error });
          console.log(`  ❌ Appointment ${i + 1}: Failed - ${result.error.message}`);
        } else {
          appointments.push(result.data);
          console.log(`  ✅ Appointment ${i + 1}: Created - ${result.data.id}`);
        }
      });
    
    // Don't await - fire them all rapidly
    if (i < 4) {
      await new Promise(resolve => setTimeout(resolve, 20)); // 20ms delay between requests
    }
  }
  
  // Wait for all to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`\n📊 Results: ${appointments.length} created, ${errors.length} failed\n`);
  
  // Test 2: Check for duplicates in database
  console.log('📊 Test 2: Checking for duplicates in database\n');
  
  const { data: allAppts } = await supabase
    .from('bookings')
    .select('id, customer_name, start_time')
    .eq('shop_id', shopId)
    .gte('start_time', new Date(Date.now() + 86400000).toISOString())
    .lte('start_time', new Date(Date.now() + 100000000).toISOString())
    .order('start_time');
  
  // Check for duplicate IDs
  const idSet = new Set();
  const duplicateIds = [];
  
  allAppts.forEach(apt => {
    if (idSet.has(apt.id)) {
      duplicateIds.push(apt.id);
    }
    idSet.add(apt.id);
  });
  
  if (duplicateIds.length > 0) {
    console.log(`  ❌ Found ${duplicateIds.length} duplicate IDs!`);
    duplicateIds.forEach(id => console.log(`     - ${id}`));
  } else {
    console.log(`  ✅ No duplicate IDs found (${allAppts.length} unique appointments)`);
  }
  
  // Test 3: Check WebSocket event deduplication
  console.log('\n📊 Test 3: WebSocket Event Deduplication\n');
  
  let eventsReceived = [];
  const channel = supabase
    .channel(`test-duplicates-${shopId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'bookings',
        filter: `shop_id=eq.${shopId}`
      }, 
      (payload) => {
        eventsReceived.push({
          id: payload.new?.id,
          customer: payload.new?.customer_name,
          timestamp: new Date().toISOString()
        });
      }
    )
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('  📡 WebSocket connected, creating test appointment...\n');
        
        // Create one more appointment
        const { data: finalAppt } = await supabase
          .from('bookings')
          .insert({
            shop_id: shopId,
            barber_id: barberId,
            customer_name: 'WebSocket Dedup Test',
            customer_phone: '555-9999',
            customer_email: 'websocket.test@example.com',
            service_id: serviceId,
            service_name: 'Haircut',
            start_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
            end_time: new Date(Date.now() + 174600000).toISOString(),
            duration_minutes: 30,
            price: 35,
            status: 'confirmed',
            notes: 'WebSocket deduplication test'
          })
          .select()
          .single();
        
        if (finalAppt) {
          console.log(`  ✅ Created test appointment: ${finalAppt.id}`);
          
          // Wait for events
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check for duplicate events
          const eventIds = eventsReceived.map(e => e.id);
          const uniqueEventIds = new Set(eventIds);
          
          if (eventIds.length === uniqueEventIds.size) {
            console.log(`  ✅ No duplicate WebSocket events (${eventIds.length} unique events)`);
          } else {
            console.log(`  ⚠️ Duplicate events detected: ${eventIds.length} events, ${uniqueEventIds.size} unique`);
          }
        }
        
        // Cleanup test appointments
        console.log('\n🧹 Cleaning up test appointments...');
        
        for (const apt of appointments) {
          await supabase
            .from('bookings')
            .delete()
            .eq('id', apt.id);
        }
        
        if (finalAppt) {
          await supabase
            .from('bookings')
            .delete()
            .eq('id', finalAppt.id);
        }
        
        console.log('✅ Cleanup complete');
        
        supabase.removeChannel(channel);
        process.exit(0);
      }
    });
}

testDuplicatePrevention().catch(console.error);