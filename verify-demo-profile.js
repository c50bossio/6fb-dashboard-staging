const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAndFixProfile() {
  const demoUserId = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';
  
  console.log('🔍 Checking demo user profile...\n');
  
  // Check existing profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', demoUserId)
    .single();
  
  if (error) {
    console.log('❌ No profile found, creating one...');
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: demoUserId,
        shop_id: 'demo-shop-001',
        role: 'shop_owner',
        barbershop_name: 'Demo Barbershop',
        full_name: 'Demo User',
        email: 'demo@bookedbarber.com',
        onboarding_completed: false
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Error creating profile:', insertError);
    } else {
      console.log('✅ Profile created:', newProfile);
    }
  } else {
    console.log('✅ Profile exists:', profile);
    
    // Update if needed
    if (!profile.shop_id || !profile.role || !profile.barbershop_name) {
      console.log('\n🔧 Updating missing fields...');
      
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
          shop_id: profile.shop_id || 'demo-shop-001',
          role: profile.role || 'shop_owner',
          barbershop_name: profile.barbershop_name || 'Demo Barbershop'
        })
        .eq('id', demoUserId)
        .select()
        .single();
      
      if (updateError) {
        console.log('❌ Error updating:', updateError);
      } else {
        console.log('✅ Profile updated:', updated);
      }
    }
  }
  
  // Test the exact query that's failing
  console.log('\n🧪 Testing the exact failing query...');
  
  const { data: testQuery, error: testError } = await supabase
    .from('profiles')
    .select('shop_id,role,shop_name')
    .eq('id', demoUserId);
  
  if (testError) {
    console.log('❌ Query failed:', testError);
  } else {
    console.log('✅ Query successful:', testQuery);
  }
}

verifyAndFixProfile().catch(console.error);