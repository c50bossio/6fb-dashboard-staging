const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key to test actual auth
);

async function testSupabaseFixesCorrected() {

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
      name: 'Barbershops table - full customization query',
      test: async () => {
        const { data, error } = await supabase
          .from('barbershops')
          .select('name, description, logo_url, brand_color, business_hours')
          .eq('is_active', true)
          .limit(1);
        return { success: !error, error, data };
      }
    },
    {
      name: 'Appointments table - count query (CORRECTED)',
      test: async () => {
        const { count, error } = await supabase
          .from('appointments')
          .select('*', { count: 'planned', head: true })
          .gte('start_time', new Date().toISOString()); // Use correct column name
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
    },
    {
      name: 'PRODUCTION SCENARIO - Barbershop details with all new columns',
      test: async () => {
        const { data, error } = await supabase
          .from('barbershops')
          .select('id, name, brand_color, business_hours, cancellation_policy, booking_buffer_time, max_advance_booking_days')
          .eq('is_active', true)
          .limit(1);
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
        
        // Show sample data for key tests
        if (test.name.includes('PRODUCTION SCENARIO') && result.data.length > 0) {
          const sample = result.data[0];
          
        }
      }
      if (result.count !== undefined) {
        
      }
      passCount++;
    } else {

      failCount++;
    }
    
  }

  );

  if (failCount === 0) {

  } else {

  }
}

// Run the corrected tests
testSupabaseFixesCorrected().catch(console.error);