const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key to test actual auth
);

async function testSupabaseFixes() {

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
    
    const result = await test.test();
    
    if (result.success) {
      
      if (result.data) {
        
      }
      if (result.count !== undefined) {
        
      }
      passCount++;
    } else {

      failCount++;
    }
    
  }

  );

  if (failCount > 0) {
    
    ');

  } else {
    
  }
}

// Run the tests
testSupabaseFixes().catch(console.error);