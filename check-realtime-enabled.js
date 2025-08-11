const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRealtimeEnabled() {
  console.log('🔍 Checking if Realtime is enabled on bookings table\n');
  
  // Try to subscribe and immediately test
  let received = false;
  
  const channel = supabase
    .channel('realtime-test')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'bookings' }, 
      (payload) => {
        console.log('✅ Realtime is ENABLED - Event received:', payload.eventType);
        received = true;
      }
    )
    .subscribe(async (status) => {
      console.log('Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('\n📝 Creating test appointment to trigger event...');
        
        // Create a test record
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            shop_id: 'demo-shop-001',
            barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e',
            customer_name: 'Realtime Test',
            customer_phone: '555-TEST',
            customer_email: 'test@realtime.com',
            service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65',
            service_name: 'Test Service',
            start_time: new Date(Date.now() + 86400000).toISOString(),
            end_time: new Date(Date.now() + 88200000).toISOString(),
            duration_minutes: 30,
            price: 0,
            status: 'confirmed',
            notes: 'Testing if realtime is enabled'
          })
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error creating test record:', error);
        } else {
          console.log('✅ Test record created:', data.id);
          
          // Wait for event
          setTimeout(async () => {
            if (!received) {
              console.log('\n⚠️ No realtime event received after 3 seconds');
              console.log('Possible issues:');
              console.log('1. Realtime may not be enabled on the bookings table');
              console.log('2. Check Supabase Dashboard > Database > Replication');
              console.log('3. Enable realtime for the bookings table');
            }
            
            // Clean up
            if (data) {
              await supabase.from('bookings').delete().eq('id', data.id);
              console.log('🧹 Test record cleaned up');
            }
            
            supabase.removeChannel(channel);
            process.exit(0);
          }, 3000);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error - Realtime may not be configured');
        process.exit(1);
      }
    });
}

checkRealtimeEnabled().catch(console.error);