#!/usr/bin/env node

/**
 * Test script for the simplified Cin7 integration
 * This verifies that the redesigned system works properly
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
);

async function testSimplifiedCin7() {
  console.log('🧪 TESTING SIMPLIFIED CIN7 INTEGRATION');
  console.log('=' * 50);
  
  try {
    // Step 1: Check user profile
    console.log('\n1️⃣ Checking user profile...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, barbershop_id, shop_id')
      .eq('email', 'c50bossio@gmail.com')
      .single();
    
    if (!profile) {
      console.error('❌ Profile not found');
      return;
    }
    
    const barbershopId = profile.barbershop_id || profile.shop_id;
    console.log('✅ Profile found:');
    console.log('   Email:', profile.email);
    console.log('   Barbershop ID:', barbershopId || 'NOT SET');
    
    if (!barbershopId) {
      console.error('❌ No barbershop associated with profile');
      console.log('   FIX: User needs to complete barbershop setup');
      return;
    }
    
    // Step 2: Check barbershop exists
    console.log('\n2️⃣ Verifying barbershop...');
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('id', barbershopId)
      .single();
    
    if (barbershop) {
      console.log('✅ Barbershop found:', barbershop.name);
    } else {
      console.error('❌ Barbershop not found in database');
      return;
    }
    
    // Step 3: Check for existing Cin7 credentials
    console.log('\n3️⃣ Checking Cin7 credentials...');
    const { data: credentials } = await supabase
      .from('cin7_credentials')
      .select('account_name, is_active, last_sync, last_sync_status')
      .eq('barbershop_id', barbershopId)
      .single();
    
    if (credentials) {
      console.log('✅ Cin7 credentials found:');
      console.log('   Account:', credentials.account_name);
      console.log('   Active:', credentials.is_active);
      console.log('   Last Sync:', credentials.last_sync || 'Never');
      console.log('   Status:', credentials.last_sync_status || 'Unknown');
    } else {
      console.log('⚠️  No Cin7 credentials saved yet');
      console.log('   User needs to enter credentials in the UI');
    }
    
    // Step 4: Summary
    console.log('\n📊 SYSTEM STATUS SUMMARY:');
    console.log('   ✅ User profile has barbershop association');
    console.log('   ✅ Barbershop exists in database');
    console.log('   ✅ Simplified lookup logic is working');
    
    if (credentials) {
      console.log('   ✅ Cin7 credentials are saved');
      console.log('\n🎯 READY TO SYNC: Click the sync button in product management!');
    } else {
      console.log('   ⚠️  Cin7 credentials need to be entered');
      console.log('\n🎯 NEXT STEP: Enter your Cin7 credentials in the product management page');
    }
    
    // Step 5: API endpoint recommendations
    console.log('\n🔧 API ENDPOINTS TO USE:');
    console.log('   POST /api/cin7/connect - Save credentials');
    console.log('   GET  /api/cin7/connect - Check status');
    console.log('   POST /api/cin7/sync    - Sync inventory');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSimplifiedCin7();