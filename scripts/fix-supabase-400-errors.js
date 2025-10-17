const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
);

async function fixSupabaseIssues() {

  try {
    // 1. Test if is_active column exists in barbershops
    
    const { data: testData, error: testError } = await supabase
      .from('barbershops')
      .select('id, name, is_active')
      .limit(1);

    if (testError) {

      // If column doesn't exist, add it
      if (testError.message.includes('is_active')) {

        const { error: alterError } = await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE barbershops 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
          `
        });

        if (alterError) {

        } else {
          
        }
      }
    } else {
      
    }

    // 2. Update RLS policies to be more permissive for authenticated users

    const policiesSQL = `
      -- Drop existing restrictive policies
      DROP POLICY IF EXISTS "Public read access" ON barbershops;
      DROP POLICY IF EXISTS "Authenticated users can read" ON barbershops;
      DROP POLICY IF EXISTS "Users can update own barbershops" ON barbershops;
      
      -- Create more permissive policies for barbershops
      CREATE POLICY "Anyone can read active barbershops" 
        ON barbershops FOR SELECT 
        USING (true);
      
      CREATE POLICY "Authenticated users can update their barbershops" 
        ON barbershops FOR UPDATE 
        USING (auth.uid() = owner_id OR auth.uid() IN (
          SELECT user_id FROM barbershop_staff 
          WHERE barbershop_id = barbershops.id 
          AND role IN ('OWNER', 'MANAGER')
        ));
      
      -- Fix appointments policies
      DROP POLICY IF EXISTS "Users can view appointments" ON appointments;
      
      CREATE POLICY "Authenticated users can view appointments" 
        ON appointments FOR SELECT 
        USING (auth.uid() IS NOT NULL);
      
      -- Fix services policies  
      DROP POLICY IF EXISTS "Public can view active services" ON services;
      
      CREATE POLICY "Anyone can view services" 
        ON services FOR SELECT 
        USING (true);
    `;

    const { error: policyError } = await supabase.rpc('exec_sql', {
      query: policiesSQL
    });

    if (policyError) {

    } else {
      
    }

    // 3. Test queries that were failing

    // Test barbershop query
    const { data: barbershopData, error: barbershopError } = await supabase
      .from('barbershops')
      .select('name, description, logo_url, brand_color')
      .limit(1);

    if (barbershopError) {
      
    } else {
      
    }

    // Test appointments query
    const { count: appointmentCount, error: appointmentError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('appointment_date', new Date().toISOString());

    if (appointmentError) {
      
    } else {
      
    }

    // Test services query
    const { count: servicesCount, error: servicesError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (servicesError) {
      
    } else {
      
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixSupabaseIssues();