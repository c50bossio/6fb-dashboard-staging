const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBookingLinks() {
  console.log('🔍 Testing booking_links table access...\n');
  
  // Test if we can access the table
  const { data, error } = await supabase
    .from('booking_links')
    .select('*');
  
  if (error) {
    console.log('❌ Table is NOT accessible');
    console.log('Error:', error.message);
    console.log('\n⚠️ ACTION REQUIRED:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run the SQL script again');
    console.log('3. Make sure it says "Success"');
  } else {
    console.log('✅ Table IS accessible!');
    console.log('📊 Number of records:', data.length);
    
    if (data.length === 0) {
      console.log('\n🎯 Table exists but is empty - perfect!');
      console.log('Now creating real data...\n');
      
      // Add a test link
      const testLink = {
        barber_id: 'test-barber',
        name: 'Real Booking Link (Not Mock!)',
        url: 'http://localhost:9999/book/real',
        services: JSON.stringify([{id: '1', name: 'Haircut', price: 35}]),
        time_slots: ['9:00 AM', '10:00 AM'],
        duration: 45,
        custom_price: 35.00,
        active: true
      };
      
      const { data: newLink, error: insertError } = await supabase
        .from('booking_links')
        .insert(testLink)
        .select()
        .single();
      
      if (insertError) {
        console.log('❌ Insert failed:', insertError.message || 'Unknown error');
      } else {
        console.log('✅ Created real booking link!');
        console.log('Link name:', newLink.name);
        console.log('\n🎉 NO MORE MOCK DATA!');
      }
    } else {
      console.log('\n✅ Table has data!');
      console.log('First link:', data[0].name);
    }
  }
}

testBookingLinks().catch(console.error);