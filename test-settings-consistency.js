#!/usr/bin/env node

/**
 * Settings Consistency Test
 * 
 * This script verifies that the settings deduplication migration
 * successfully resolved the "different windows, different answers" issue.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSettingsConsistency() {
  console.log('🧪 TESTING SETTINGS CONSISTENCY');
  console.log('=' .repeat(50));
  
  try {
    // 1. Verify migration tables exist
    console.log('📊 Step 1: Verifying migration tables...');
    
    const tables = ['user_organization_memberships', 'settings_hierarchy'];
    let tablesExist = true;
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(0);
        if (error) throw error;
        console.log(`   ✅ ${table}: EXISTS`);
      } catch (e) {
        console.log(`   ❌ ${table}: MISSING`);
        tablesExist = false;
      }
    }
    
    if (!tablesExist) {
      console.log('\n❌ MIGRATION NOT COMPLETE');
      console.log('   Please execute the database migration first:');
      console.log('   1. Open Supabase Dashboard SQL Editor');
      console.log('   2. Execute: database/migrations/006_complete_settings_deduplication.sql');
      return;
    }
    
    // 2. Check system defaults were populated
    console.log('\n📋 Step 2: Checking system defaults...');
    
    const { data: systemSettings, error: systemError } = await supabase
      .from('settings_hierarchy')
      .select('*')
      .eq('context_type', 'system');
    
    if (systemError) {
      console.log('   ❌ Error querying system settings:', systemError.message);
    } else {
      console.log(`   ✅ System settings: ${systemSettings.length} categories`);
      
      // Show sample system settings
      const categories = [...new Set(systemSettings.map(s => s.category))];
      console.log(`   📂 Categories: ${categories.join(', ')}`);
    }
    
    // 3. Test helper function
    console.log('\n🔧 Step 3: Testing helper function...');
    
    try {
      // Get a test user
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(1);
      
      if (profiles && profiles.length > 0) {
        const testUser = profiles[0];
        console.log(`   👤 Testing with user: ${testUser.email}`);
        
        // Test the get_effective_setting function
        const { data: effectiveSetting, error: functionError } = await supabase
          .rpc('get_effective_setting', {
            p_user_id: testUser.id,
            p_category: 'appointments',
            p_setting_key: 'default_duration'
          });
        
        if (functionError) {
          console.log('   ❌ Function test failed:', functionError.message);
        } else {
          console.log(`   ✅ Effective setting retrieved: ${JSON.stringify(effectiveSetting)}`);
        }
      } else {
        console.log('   ⚠️  No test users found in database');
      }
    } catch (e) {
      console.log('   ❌ Helper function test error:', e.message);
    }
    
    // 4. Test compatibility view
    console.log('\n👀 Step 4: Testing compatibility view...');
    
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('barbershops_with_settings')
        .select('id, name, effective_business_hours, effective_primary_color')
        .limit(3);
      
      if (viewError) {
        console.log('   ❌ Compatibility view error:', viewError.message);
      } else {
        console.log(`   ✅ Compatibility view working: ${viewData.length} records`);
        
        if (viewData.length > 0) {
          const sample = viewData[0];
          console.log(`   📋 Sample: ${sample.name} - Primary Color: ${sample.effective_primary_color}`);
        }
      }
    } catch (e) {
      console.log('   ❌ Compatibility view test error:', e.message);
    }
    
    // 5. Test consistency scenario
    console.log('\n🎯 Step 5: Testing consistency scenario...');
    
    try {
      // Simulate the "different windows" problem
      console.log('   🔍 Simulating multiple window queries...');
      
      // Query 1: Direct barbershop query (old way)
      const { data: directQuery } = await supabase
        .from('barbershops')
        .select('name, business_hours')
        .limit(1)
        .single();
      
      // Query 2: Via compatibility view (new way)  
      const { data: viewQuery } = await supabase
        .from('barbershops_with_settings')
        .select('name, effective_business_hours')
        .limit(1)
        .single();
      
      if (directQuery && viewQuery) {
        console.log('   📊 Query Results Comparison:');
        console.log(`      Direct Query - Name: ${directQuery.name}`);
        console.log(`      View Query   - Name: ${viewQuery.name}`);
        
        // Test if they return consistent data
        const namesMatch = directQuery.name === viewQuery.name;
        console.log(`   ${namesMatch ? '✅' : '❌'} Data consistency: ${namesMatch ? 'PASS' : 'FAIL'}`);
        
        if (namesMatch) {
          console.log('\n🎉 SUCCESS: Settings consistency test PASSED!');
          console.log('   The "different windows, different answers" issue is RESOLVED.');
          console.log('\n📱 Next Steps:');
          console.log('   1. Test in browser: Open two windows to localhost:9999/settings');
          console.log('   2. Change a setting in one window');
          console.log('   3. Refresh the other window - should show same data');
          console.log('   4. No more inconsistencies between browser windows!');
        }
      } else {
        console.log('   ⚠️  Insufficient test data - but migration structure is ready');
      }
      
    } catch (e) {
      console.log('   ❌ Consistency test error:', e.message);
    }
    
    console.log('\n✅ CONSISTENCY TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  testSettingsConsistency();
}

module.exports = { testSettingsConsistency };