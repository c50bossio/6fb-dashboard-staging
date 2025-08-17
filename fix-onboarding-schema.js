const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOnboardingSchema() {
  console.log('🔧 Fixing onboarding schema...\n');
  
  // Add missing onboarding_data column to profiles table
  console.log('📦 Adding onboarding_data column to profiles table...');
  
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `
      -- Add onboarding_data column if it doesn't exist
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;
      
      -- Add other potentially missing columns
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
      
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS payment_setup_completed BOOLEAN DEFAULT false;
      
      -- Update demo user with default onboarding data
      UPDATE public.profiles 
      SET onboarding_data = '{
        "currentStep": 5,
        "completedSteps": ["role", "goals", "business", "services", "schedule"],
        "paymentSetupCompleted": false,
        "stripeConnected": false
      }'::jsonb
      WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';
    `
  });
  
  if (alterError) {
    console.log('⚠️  Could not alter via RPC, trying direct approach...');
    
    // Try a simpler update to test
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        payment_setup_completed: false
      })
      .eq('id', 'befcd3e1-8722-449b-8dd3-cdf7e1f59483')
      .select();
    
    if (updateError) {
      console.log('❌ Update error:', updateError);
      console.log('\n📝 Please run this SQL in your Supabase dashboard:');
      console.log(`
-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payment_setup_completed BOOLEAN DEFAULT false;

-- Update demo user
UPDATE public.profiles 
SET onboarding_data = '{
  "currentStep": 5,
  "completedSteps": ["role", "goals", "business", "services", "schedule"],
  "paymentSetupCompleted": false,
  "stripeConnected": false
}'::jsonb
WHERE id = 'befcd3e1-8722-449b-8dd3-cdf7e1f59483';
      `);
    } else {
      console.log('✅ Basic update successful:', data);
    }
  } else {
    console.log('✅ Schema updated successfully!');
  }
  
  // Verify the schema
  console.log('\n🔍 Verifying schema...');
  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'befcd3e1-8722-449b-8dd3-cdf7e1f59483')
    .single();
  
  if (selectError) {
    console.log('❌ Select error:', selectError);
  } else {
    console.log('✅ Profile columns:', Object.keys(profile));
    console.log('   Has onboarding_data:', 'onboarding_data' in profile);
    console.log('   Has stripe_account_id:', 'stripe_account_id' in profile);
    console.log('   Has payment_setup_completed:', 'payment_setup_completed' in profile);
  }
  
  // Create auth.users entry if missing
  console.log('\n🔐 Ensuring auth.users entry exists...');
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
    'befcd3e1-8722-449b-8dd3-cdf7e1f59483'
  );
  
  if (authError || !authUser) {
    console.log('⚠️  No auth.users entry found. Creating one...');
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
      email: 'demo@bookedbarber.com',
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo User'
      }
    });
    
    if (createError) {
      console.log('❌ Could not create auth user:', createError);
      console.log('   This is normal if the user already exists in auth.users');
    } else {
      console.log('✅ Auth user created:', newUser?.email);
    }
  } else {
    console.log('✅ Auth user exists:', authUser.user?.email);
  }
  
  console.log('\n✨ Schema fix complete!');
}

fixOnboardingSchema().catch(console.error);