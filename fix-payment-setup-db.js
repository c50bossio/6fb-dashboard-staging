const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixDatabase() {
  console.log('🔍 Checking database schema...\n');
  
  // Check if profiles table exists
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', 'profile%');
  
  if (tablesError) {
    console.log('⚠️  Could not query tables, trying alternative approach...');
    
    // Try to query profiles directly
    const { error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.log('❌ Profiles table does not exist or has issues:', profileError.message);
      
      // Create profiles table
      console.log('\n📦 Creating profiles table...');
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            shop_id TEXT,
            role TEXT DEFAULT 'barber',
            barbershop_name TEXT,
            full_name TEXT,
            email TEXT,
            phone TEXT,
            onboarding_completed BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create RLS policies
          ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
          
          -- Allow users to read their own profile
          CREATE POLICY "Users can read own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
          
          -- Allow users to update their own profile
          CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
          
          -- Allow service role full access
          CREATE POLICY "Service role has full access" ON public.profiles
            FOR ALL USING (auth.role() = 'service_role');
        `
      });
      
      if (createError) {
        console.log('⚠️  Could not create via RPC, trying direct approach...');
        
        // For dev/demo, ensure demo user has profile
        const demoUserId = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';
        
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert({
            id: demoUserId,
            shop_id: 'demo-shop-001',
            role: 'shop_owner',
            barbershop_name: 'Demo Barbershop',
            full_name: 'Demo User',
            email: 'demo@bookedbarber.com',
            onboarding_completed: false
          }, {
            onConflict: 'id'
          });
        
        if (insertError) {
          console.log('❌ Could not create demo profile:', insertError.message);
        } else {
          console.log('✅ Demo profile created/updated successfully!');
        }
      } else {
        console.log('✅ Profiles table created successfully!');
      }
    } else {
      console.log('✅ Profiles table exists!');
    }
  } else {
    console.log('📊 Found tables:', tables?.map(t => t.table_name).join(', '));
  }
  
  // Check stripe_connected_accounts table
  console.log('\n🔍 Checking stripe_connected_accounts table...');
  
  const { error: stripeError } = await supabase
    .from('stripe_connected_accounts')
    .select('*')
    .limit(1);
  
  if (stripeError) {
    console.log('❌ stripe_connected_accounts table missing:', stripeError.message);
    console.log('📦 Creating stripe_connected_accounts table...');
    
    // Try to create the table
    const { data, error: createStripeError } = await supabase
      .from('stripe_connected_accounts')
      .insert({
        user_id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
        stripe_account_id: 'acct_test_' + Date.now(),
        account_type: 'express',
        business_type: 'individual',
        onboarding_completed: false,
        charges_enabled: false,
        payouts_enabled: false
      });
    
    if (createStripeError && createStripeError.code === '42P01') {
      console.log('⚠️  Table does not exist. Please create it in Supabase dashboard.');
      console.log('\nSQL to create table:');
      console.log(`
CREATE TABLE public.stripe_connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT DEFAULT 'express',
  business_type TEXT,
  business_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending',
  requirements JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
      `);
    } else if (!createStripeError) {
      console.log('✅ stripe_connected_accounts table exists and test record created!');
    }
  } else {
    console.log('✅ stripe_connected_accounts table exists!');
  }
  
  console.log('\n✨ Database check complete!');
}

checkAndFixDatabase().catch(console.error);