const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testRealtimePolicies() {
  console.log('🔍 Testing Realtime and RLS Policies\n');
  console.log('================================\n');
  
  // Test 1: Service Role (bypasses RLS)
  console.log('Test 1: Service Role Connection (bypasses RLS)');
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  let serviceReceived = false;
  const serviceChannel = serviceClient
    .channel('service-test')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'bookings' }, 
      (payload) => {
        console.log('✅ Service role received:', payload.eventType);
        serviceReceived = true;
      }
    )
    .subscribe((status) => {
      console.log('Service role status:', status);
    });
  
  // Test 2: Anon Key (subject to RLS)
  console.log('\nTest 2: Anon Key Connection (subject to RLS)');
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  let anonReceived = false;
  const anonChannel = anonClient
    .channel('anon-test')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'bookings' }, 
      (payload) => {
        console.log('✅ Anon key received:', payload.eventType);
        anonReceived = true;
      }
    )
    .subscribe((status) => {
      console.log('Anon key status:', status);
    });
  
  // Wait for subscriptions
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Trigger an event
  console.log('\n📝 Creating test appointment...');
  const { data, error } = await serviceClient
    .from('bookings')
    .insert({
      shop_id: 'demo-shop-001',
      barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e',
      customer_name: 'RLS Test Customer',
      customer_phone: '555-RLS',
      customer_email: 'rls@test.com',
      service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65',
      service_name: 'RLS Test',
      start_time: new Date(Date.now() + 86400000).toISOString(),
      end_time: new Date(Date.now() + 88200000).toISOString(),
      duration_minutes: 30,
      price: 0,
      status: 'confirmed',
      notes: 'Testing RLS policies'
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating test:', error);
  } else {
    console.log('✅ Test appointment created:', data.id);
    
    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📊 Results:');
    console.log('================');
    console.log('Service role received event:', serviceReceived ? '✅ YES' : '❌ NO');
    console.log('Anon key received event:', anonReceived ? '✅ YES' : '❌ NO');
    
    if (!anonReceived && serviceReceived) {
      console.log('\n⚠️ RLS Policy Issue Detected!');
      console.log('The anon key cannot receive realtime events.');
      console.log('This is likely due to Row Level Security policies.');
      console.log('\nSolution:');
      console.log('1. Go to Supabase Dashboard > Authentication > Policies');
      console.log('2. Check the bookings table policies');
      console.log('3. Ensure SELECT policy allows anon or authenticated users');
    }
    
    // Cleanup
    await serviceClient.from('bookings').delete().eq('id', data.id);
    console.log('\n🧹 Test record cleaned up');
  }
  
  // Cleanup channels
  serviceClient.removeChannel(serviceChannel);
  anonClient.removeChannel(anonChannel);
  
  // Test 4: Check if we can SELECT with anon key
  console.log('\n📊 Testing SELECT permission with anon key:');
  const { data: selectData, error: selectError } = await anonClient
    .from('bookings')
    .select('id')
    .limit(1);
  
  if (selectError) {
    console.log('❌ Anon key CANNOT select from bookings:', selectError.message);
    console.log('This explains why realtime is not working!');
  } else {
    console.log('✅ Anon key CAN select from bookings');
  }
  
  process.exit(0);
}

testRealtimePolicies().catch(console.error);