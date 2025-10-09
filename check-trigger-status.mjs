import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTriggerStatus() {
  console.log('=== CHECKING DATABASE TRIGGER STATUS ===\n');

  // 1. Test if trigger function exists by trying to create a test user
  console.log('1. Testing trigger by creating a test OAuth user...');

  const testEmail = `test-oauth-${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';

  // Create a test user using admin API
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test OAuth User',
      given_name: 'Test',
      family_name: 'User',
      avatar_url: 'https://example.com/avatar.jpg'
    }
  });

  if (createError) {
    console.log('   ✗ Failed to create test user:', createError.message);
    return;
  }

  console.log(`   ✓ Test user created: ${testEmail}`);
  console.log(`   User ID: ${newUser.user.id}`);
  console.log();

  // 2. Wait a moment for trigger to fire
  console.log('2. Waiting for trigger to create profile...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Check if profile was created
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', newUser.user.id)
    .single();

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      console.log('   ✗ TRIGGER DID NOT CREATE PROFILE');
      console.log('   Error: Profile does not exist');
      console.log();
      console.log('   DIAGNOSIS: handle_new_user() trigger is NOT installed or NOT working');
    } else {
      console.log('   ✗ Error checking profile:', profileError.message);
    }
  } else {
    console.log('   ✓ TRIGGER SUCCESSFULLY CREATED PROFILE');
    console.log('   Profile data:');
    console.log(`     - ID: ${profile.id}`);
    console.log(`     - Email: ${profile.email}`);
    console.log(`     - Full Name: ${profile.full_name}`);
    console.log(`     - First Name: ${profile.first_name}`);
    console.log(`     - Last Name: ${profile.last_name}`);
    console.log(`     - Avatar URL: ${profile.avatar_url}`);
    console.log(`     - Role: ${profile.role}`);
    console.log(`     - Subscription: ${profile.subscription_tier} (${profile.subscription_status})`);
    console.log();
    console.log('   DIAGNOSIS: Trigger is working correctly!');
  }
  console.log();

  // 4. Clean up test user
  console.log('3. Cleaning up test user...');

  // Delete profile first (if it exists)
  if (profile) {
    await supabase
      .from('profiles')
      .delete()
      .eq('id', newUser.user.id);
  }

  // Delete auth user
  const { error: deleteError } = await supabase.auth.admin.deleteUser(newUser.user.id);

  if (deleteError) {
    console.log('   ⚠ Failed to delete test user:', deleteError.message);
  } else {
    console.log('   ✓ Test user cleaned up');
  }
  console.log();

  // 5. Check RLS policies
  console.log('4. RLS Policy Status:');
  console.log('   (Cannot query pg_policies without database owner permissions)');
  console.log('   Expected policies from migration:');
  console.log('     - "Users can view own profile" (SELECT)');
  console.log('     - "Users can update own profile" (UPDATE)');
  console.log('     - "Service role can manage profiles" (ALL)');
  console.log();

  // 6. Final diagnosis
  console.log('5. FINAL DIAGNOSIS:');
  console.log('   Based on test results, the issue is:');
  if (profile) {
    console.log('   ✓ Trigger IS working - profiles are auto-created');
    console.log('   ✓ OAuth callback manual creation is a good fallback');
    console.log('   → No action needed, system is working correctly');
  } else {
    console.log('   ✗ Trigger NOT working - profiles are NOT auto-created');
    console.log('   ✓ OAuth callback has manual fallback (GOOD)');
    console.log('   → RECOMMENDED: Apply migration 004_supabase_auth_trigger.sql');
    console.log();
    console.log('   TO FIX:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Run: database/migrations/004_supabase_auth_trigger.sql');
    console.log('   3. Verify trigger is created with this test script');
  }
}

checkTriggerStatus()
  .then(() => {
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
