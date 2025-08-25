const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key to test actual auth
);

async function testSupabaseFixes() {
  console.log('🧪 Testing Supabase Fixes...\n');
  
  const tests = [
    {
      name: 'Barbershops table - is_active column',
      test: async () => {
        const { data, error } = await supabase
          .from('barbershops')
          .select('id, name, is_active')
          .limit(1);
        return { success: !error, error, data };
      }
    },
    {
      name: 'Barbershops table - brand_color column',
      test: async () => {
        const { data, error } = await supabase
          .from('barbershops')
          .select('id, name, brand_color')
          .limit(1);
        return { success: !error, error, data };
      }
    },
    {
      name: 'Barbershops table - full query',
      test: async () => {
        const { data, error } = await supabase
          .from('barbershops')
          .select('name, description, logo_url, brand_color')
          .limit(1);
        return { success: !error, error, data };
      }
    },
    {
      name: 'Appointments table - count query',
      test: async () => {
        const { count, error } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', new Date().toISOString());
        return { success: !error, error, count };
      }
    },
    {
      name: 'Services table - active services',
      test: async () => {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .limit(5);
        return { success: !error, error, data };
      }
    }
  ];

  let passCount = 0;
  let failCount = 0;

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    const result = await test.test();
    
    if (result.success) {
      console.log(`✅ PASS`);
      if (result.data) {
        console.log(`   Data: ${result.data.length} records found`);
      }
      if (result.count !== undefined) {
        console.log(`   Count: ${result.count}`);
      }
      passCount++;
    } else {
      console.log(`❌ FAIL`);
      console.log(`   Error: ${result.error?.message || 'Unknown error'}`);
      failCount++;
    }
    console.log('');
  }

  console.log('━'.repeat(50));
  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount > 0) {
    console.log('⚠️  Some tests are still failing. Please run the SQL migration script:');
    console.log('1. Open Supabase Dashboard (https://app.supabase.com)');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and run the contents of: scripts/URGENT_FIX_SUPABASE_400_ERRORS.sql');
    console.log('4. Run this test again to verify');
  } else {
    console.log('🎉 All tests passed! The 400 errors should be resolved.');
  }
}

// Run the tests
testSupabaseFixes().catch(console.error);