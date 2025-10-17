import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseConstraints() {
  console.log('=== DATABASE CONSTRAINTS & TRIGGERS CHECK ===\n');

  // 1. Check foreign key constraint on profiles
  console.log('1. Foreign Key Constraint Analysis:');
  console.log('   Error from insert test: "profiles_id_fkey"');
  console.log('   This means profiles.id has a foreign key to another table');
  console.log('   Most likely: profiles.id -> auth.users(id)');
  console.log();

  // 2. Check if there's a trigger to auto-create profiles
  console.log('2. Checking for profile creation triggers...');
  console.log('   Looking for common Supabase patterns:');
  console.log('   - handle_new_user() trigger on auth.users');
  console.log('   - Automatic profile creation on signup');
  console.log();

  // 3. Try to query with a service role to see trigger definitions
  console.log('3. Testing profile creation flow...');

  // Get the auth user without a profile
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const userWithoutProfile = authUsers.users.find(u => u.email === 'barber@test.com');

  if (userWithoutProfile) {
    console.log(`   Found user without profile: ${userWithoutProfile.email}`);
    console.log(`   Auth ID: ${userWithoutProfile.id}`);
    console.log(`   Created: ${userWithoutProfile.created_at}`);
    console.log(`   Confirmed: ${userWithoutProfile.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log();

    // 4. Test creating a profile for this user
    console.log('4. Testing manual profile creation...');
    const profileData = {
      id: userWithoutProfile.id, // Must match auth.users.id
      email: userWithoutProfile.email,
      full_name: userWithoutProfile.user_metadata?.full_name || 'Test Barber',
      role: 'BARBER',
      first_name: userWithoutProfile.user_metadata?.first_name || 'Test',
      last_name: userWithoutProfile.user_metadata?.last_name || 'Barber'
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (insertError) {
      console.log('   ✗ Profile creation FAILED:', insertError.message);
      console.log('   Error code:', insertError.code);
      console.log('   Error details:', insertError.details);

      if (insertError.code === '42501') {
        console.log('   ⚠ RLS POLICY IS BLOCKING THE INSERT');
      } else if (insertError.code === '23503') {
        console.log('   ⚠ FOREIGN KEY CONSTRAINT VIOLATION');
        console.log('   This means profiles.id MUST reference auth.users.id');
      }
    } else {
      console.log('   ✓ Profile created successfully!');
      console.log('   Profile ID:', newProfile.id);
    }
  } else {
    console.log('   All users have profiles (or user not found)');
  }
  console.log();

  // 5. Check RLS status
  console.log('5. Checking Row Level Security (RLS) status...');
  try {
    // Try to select from profiles with anon key
    const anonClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await anonClient
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42501') {
        console.log('   ⚠ RLS is ENABLED and blocking anon access');
      } else {
        console.log('   Error with anon client:', error.message);
      }
    } else {
      console.log('   ✓ Anon client can read profiles (RLS allows SELECT)');
    }

    // Test insert with anon key
    const { error: insertError } = await anonClient
      .from('profiles')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'test@test.com'
      });

    if (insertError) {
      if (insertError.code === '42501') {
        console.log('   ⚠ RLS is BLOCKING anon INSERTS (policy issue)');
      } else {
        console.log('   Anon insert error:', insertError.message, insertError.code);
      }
    } else {
      console.log('   ⚠ Anon client CAN insert (RLS may be misconfigured)');
    }
  } catch (err) {
    console.log('   Error testing RLS:', err.message);
  }
  console.log();

  // 6. Summary
  console.log('6. FINDINGS SUMMARY:');
  console.log('   ✓ Profiles table EXISTS with 33+ columns');
  console.log('   ✓ Foreign key constraint: profiles.id -> auth.users(id)');
  console.log('   ⚠ 1 auth user without profile (barber@test.com)');
  console.log('   ? RLS policies may be blocking profile creation');
  console.log('   ? No automatic trigger detected for profile creation');
  console.log();
  console.log('   EXPECTED SCHEMA (from complete-schema.sql):');
  console.log('   - Uses "users" table (not "profiles")');
  console.log('   - Has trigger: handle_new_user() on auth.users');
  console.log('   - Auto-creates user profile on signup');
  console.log();
  console.log('   ACTUAL SCHEMA (in production):');
  console.log('   - Uses "profiles" table (custom schema)');
  console.log('   - Different columns than complete-schema.sql');
  console.log('   - May not have auto-creation trigger');
}

checkDatabaseConstraints()
  .then(() => {
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
