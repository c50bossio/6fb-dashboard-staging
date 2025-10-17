// Test script to check if saving works
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSave() {
  // Get a test user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1)
    .single();
  
  if (!profiles) {
    console.log('No user found');
    return;
  }
  
  console.log('Testing save for user:', profiles.email);
  
  // Try to save booking rules
  const testRules = {
    booking_rules: {
      cancellation_window: 24,
      cancellation_fee: 25,
      cancellation_fee_type: 'percentage',
      no_show_fee: 50,
      no_show_fee_type: 'percentage'
    }
  };
  
  // Check if settings exist
  const { data: existing } = await supabase
    .from('business_settings')
    .select('id')
    .eq('user_id', profiles.id)
    .single();
  
  let result;
  if (existing) {
    console.log('Updating existing settings...');
    result = await supabase
      .from('business_settings')
      .update({
        booking_rules: testRules.booking_rules,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profiles.id);
  } else {
    console.log('Creating new settings...');
    result = await supabase
      .from('business_settings')
      .insert({
        user_id: profiles.id,
        booking_rules: testRules.booking_rules
      });
  }
  
  if (result.error) {
    console.log('Save failed:', result.error);
  } else {
    console.log('Save successful!');
    
    // Verify the save
    const { data: verify } = await supabase
      .from('business_settings')
      .select('booking_rules')
      .eq('user_id', profiles.id)
      .single();
    
    console.log('Verified data:', verify?.booking_rules);
  }
}

testSave();
