import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDeleteBlock() {
  // First, get today's blocked time
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  console.log('Looking for blocked times today...');
  
  const { data: blocks, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'blocked')
    .eq('barbershop_id', '1ca6138d-eae8-46ed-abff-5d6e52fbd21b')
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString());
    
  if (fetchError) {
    console.error('Error fetching blocks:', fetchError);
    return;
  }
  
  console.log(`Found ${blocks.length} blocked time(s) for today`);
  
  if (blocks.length === 0) {
    console.log('No blocked times to test delete with');
    return;
  }
  
  // Show the blocks
  blocks.forEach(block => {
    const startTime = new Date(block.start_time);
    console.log(`\nBlock ID: ${block.id}`);
    console.log(`  Time: ${startTime.toLocaleTimeString()}`);
    console.log(`  Notes: ${block.notes}`);
  });
  
  // Test deleting the first block
  const blockToDelete = blocks[0];
  console.log(`\n🧪 Testing DELETE for block: ${blockToDelete.id}`);
  
  // Simulate the API delete call
  try {
    const response = await fetch(`http://localhost:9999/api/calendar/appointments?id=${blockToDelete.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would have auth cookies
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Delete API returned error:', response.status, error);
      console.log('This is expected without authentication - the endpoint requires login');
    } else {
      const result = await response.json();
      console.log('✅ Delete API response:', result);
    }
  } catch (error) {
    console.log('❌ Could not call delete API:', error.message);
  }
  
  // Test direct database delete to verify the logic
  console.log('\n🧪 Testing direct database delete...');
  
  // First verify it exists
  const { data: verifyBefore } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', blockToDelete.id)
    .single();
    
  if (verifyBefore) {
    console.log('✅ Block exists before delete');
    
    // Delete it
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', blockToDelete.id);
      
    if (deleteError) {
      console.error('❌ Delete failed:', deleteError);
    } else {
      console.log('✅ Block deleted successfully');
      
      // Verify it's gone
      const { data: verifyAfter } = await supabase
        .from('bookings')
        .select('id')
        .eq('id', blockToDelete.id)
        .single();
        
      if (!verifyAfter) {
        console.log('✅ Confirmed: Block is removed from database');
      } else {
        console.log('❌ Block still exists after delete!');
      }
    }
  }
  
  // Check remaining blocks
  const { data: remaining } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'blocked')
    .eq('barbershop_id', '1ca6138d-eae8-46ed-abff-5d6e52fbd21b')
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString());
    
  console.log(`\n📊 Remaining blocked times for today: ${remaining?.length || 0}`);
}

testDeleteBlock();