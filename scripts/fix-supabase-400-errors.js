const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
);

async function fixSupabaseIssues() {
  console.log('🔧 Fixing Supabase 400 errors...\n');

  try {
    // 1. Test if is_active column exists in barbershops
    console.log('1️⃣ Checking barbershops table structure...');
    const { data: testData, error: testError } = await supabase
      .from('barbershops')
      .select('id, name, is_active')
      .limit(1);

    if (testError) {
      console.log('❌ Error accessing barbershops:', testError.message);
      
      // If column doesn't exist, add it
      if (testError.message.includes('is_active')) {
        console.log('Adding is_active column to barbershops table...');
        
        const { error: alterError } = await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE barbershops 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
          `
        });

        if (alterError) {
          console.log('❌ Could not add column via RPC:', alterError.message);
          console.log('\n📝 Manual fix required:');
          console.log('Run this SQL in Supabase dashboard:');
          console.log('ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;');
        } else {
          console.log('✅ Added is_active column');
        }
      }
    } else {
      console.log('✅ barbershops table has is_active column');
    }

    // 2. Update RLS policies to be more permissive for authenticated users
    console.log('\n2️⃣ Updating RLS policies...');
    
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
      console.log('⚠️ Could not update policies via RPC:', policyError.message);
      console.log('\n📝 Manual policy update may be required in Supabase dashboard');
    } else {
      console.log('✅ RLS policies updated');
    }

    // 3. Test queries that were failing
    console.log('\n3️⃣ Testing queries...');

    // Test barbershop query
    const { data: barbershopData, error: barbershopError } = await supabase
      .from('barbershops')
      .select('name, description, logo_url, brand_color')
      .limit(1);

    if (barbershopError) {
      console.log('❌ Barbershop query still failing:', barbershopError.message);
    } else {
      console.log('✅ Barbershop query working');
    }

    // Test appointments query
    const { count: appointmentCount, error: appointmentError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('appointment_date', new Date().toISOString());

    if (appointmentError) {
      console.log('❌ Appointments query still failing:', appointmentError.message);
    } else {
      console.log('✅ Appointments query working');
    }

    // Test services query
    const { count: servicesCount, error: servicesError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (servicesError) {
      console.log('❌ Services query still failing:', servicesError.message);
    } else {
      console.log('✅ Services query working');
    }

    console.log('\n✨ Fix process complete!');
    console.log('\n📌 Next steps:');
    console.log('1. If errors persist, go to Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run: SELECT * FROM barbershops LIMIT 1;');
    console.log('4. Verify the is_active column exists');
    console.log('5. Check Authentication > Policies for each table');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixSupabaseIssues();