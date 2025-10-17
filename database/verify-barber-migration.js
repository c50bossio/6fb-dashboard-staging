#!/usr/bin/env node

/**
 * Verification Script: Barber Migration Results
 *
 * Verifies that the 5 barbers were successfully migrated to:
 * - auth.users (authentication)
 * - profiles (user profiles)
 * - barbershop_staff (staff records)
 *
 * Usage: node database/verify-barber-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Expected barber emails
const EXPECTED_EMAILS = [
  'marcus.rodriguez@tomb45.com',
  'tony.johnson@tomb45.com',
  'deandre.williams@tomb45.com',
  'carlos.martinez@tomb45.com',
  'jordan.smith@tomb45.com'
];

/**
 * Verify auth users exist
 */
async function verifyAuthUsers() {
  console.log('\n📧 Checking Auth Users...');

  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const migratedUsers = data.users.filter(user =>
      EXPECTED_EMAILS.includes(user.email)
    );

    console.log(`   Found ${migratedUsers.length}/${EXPECTED_EMAILS.length} auth users`);

    migratedUsers.forEach(user => {
      console.log(`   ✅ ${user.email} (${user.id})`);
    });

    const missingEmails = EXPECTED_EMAILS.filter(email =>
      !migratedUsers.some(user => user.email === email)
    );

    if (missingEmails.length > 0) {
      console.log(`   ❌ Missing auth users:`);
      missingEmails.forEach(email => console.log(`      - ${email}`));
      return false;
    }

    return true;
  } catch (error) {
    console.error('   ❌ Error checking auth users:', error.message);
    return false;
  }
}

/**
 * Verify profiles exist
 */
async function verifyProfiles() {
  console.log('\n👤 Checking Profiles...');

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, barbershop_id')
      .in('email', EXPECTED_EMAILS);

    if (error) throw error;

    console.log(`   Found ${data.length}/${EXPECTED_EMAILS.length} profiles`);

    data.forEach(profile => {
      const roleIcon = profile.role === 'BARBER' ? '✅' : '⚠️';
      console.log(`   ${roleIcon} ${profile.full_name} (${profile.email})`);
      console.log(`      Role: ${profile.role}`);
      console.log(`      Barbershop: ${profile.barbershop_id}`);
    });

    const missingEmails = EXPECTED_EMAILS.filter(email =>
      !data.some(profile => profile.email === email)
    );

    if (missingEmails.length > 0) {
      console.log(`   ❌ Missing profiles:`);
      missingEmails.forEach(email => console.log(`      - ${email}`));
      return false;
    }

    // Check all have BARBER role
    const wrongRole = data.filter(p => p.role !== 'BARBER');
    if (wrongRole.length > 0) {
      console.log(`   ⚠️  Profiles with wrong role:`);
      wrongRole.forEach(p => console.log(`      - ${p.email}: ${p.role}`));
    }

    return true;
  } catch (error) {
    console.error('   ❌ Error checking profiles:', error.message);
    return false;
  }
}

/**
 * Verify staff records exist
 */
async function verifyStaffRecords() {
  console.log('\n💼 Checking Staff Records...');

  try {
    // Get profiles first to get user IDs
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('email', EXPECTED_EMAILS);

    if (profileError) throw profileError;

    const userIds = profiles.map(p => p.id);

    const { data, error } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        barbershop_id,
        role,
        commission_rate,
        experience_years,
        specialties,
        is_active
      `)
      .in('user_id', userIds);

    if (error) throw error;

    console.log(`   Found ${data.length}/${EXPECTED_EMAILS.length} staff records`);

    data.forEach(staff => {
      const profile = profiles.find(p => p.id === staff.user_id);
      const activeIcon = staff.is_active ? '✅' : '⚠️';
      console.log(`   ${activeIcon} ${profile?.full_name || staff.user_id}`);
      console.log(`      Commission: ${(staff.commission_rate * 100).toFixed(0)}%`);
      console.log(`      Experience: ${staff.experience_years} years`);
      console.log(`      Specialties: ${staff.specialties?.length || 0}`);
      console.log(`      Active: ${staff.is_active}`);
    });

    if (data.length < EXPECTED_EMAILS.length) {
      console.log(`   ❌ Missing staff records`);
      return false;
    }

    // Check commission rates
    const wrongCommission = data.filter(s => s.commission_rate !== 0.60);
    if (wrongCommission.length > 0) {
      console.log(`   ⚠️  Staff with non-standard commission:`);
      wrongCommission.forEach(s => {
        const profile = profiles.find(p => p.id === s.user_id);
        console.log(`      - ${profile?.full_name}: ${(s.commission_rate * 100).toFixed(0)}%`);
      });
    }

    return true;
  } catch (error) {
    console.error('   ❌ Error checking staff records:', error.message);
    return false;
  }
}

/**
 * Verify complete migration integrity
 */
async function verifyIntegrity() {
  console.log('\n🔗 Checking Data Integrity...');

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const migratedAuthUsers = authUsers.users.filter(user =>
      EXPECTED_EMAILS.includes(user.email)
    );

    // Get profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', EXPECTED_EMAILS);

    if (profileError) throw profileError;

    // Get staff records
    const userIds = profiles.map(p => p.id);
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('user_id')
      .in('user_id', userIds);

    if (staffError) throw staffError;

    // Check integrity
    let integrityIssues = 0;

    migratedAuthUsers.forEach(authUser => {
      const hasProfile = profiles.some(p => p.id === authUser.id);
      const hasStaff = staff.some(s => s.user_id === authUser.id);

      if (!hasProfile || !hasStaff) {
        integrityIssues++;
        console.log(`   ❌ ${authUser.email}:`);
        if (!hasProfile) console.log(`      - Missing profile`);
        if (!hasStaff) console.log(`      - Missing staff record`);
      } else {
        console.log(`   ✅ ${authUser.email}: Complete`);
      }
    });

    if (integrityIssues === 0) {
      console.log(`   ✅ All records have complete data across tables`);
      return true;
    } else {
      console.log(`   ❌ Found ${integrityIssues} integrity issues`);
      return false;
    }

  } catch (error) {
    console.error('   ❌ Error checking integrity:', error.message);
    return false;
  }
}

/**
 * Main verification function
 */
async function runVerification() {
  console.log('🔍 Barber Migration Verification');
  console.log('═'.repeat(60));
  console.log(`📊 Checking ${EXPECTED_EMAILS.length} expected barbers`);

  const results = {
    authUsers: await verifyAuthUsers(),
    profiles: await verifyProfiles(),
    staffRecords: await verifyStaffRecords(),
    integrity: await verifyIntegrity()
  };

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Verification Summary');
  console.log('═'.repeat(60));
  console.log(`Auth Users:     ${results.authUsers ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Profiles:       ${results.profiles ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Staff Records:  ${results.staffRecords ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Data Integrity: ${results.integrity ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('\n✨ All verification checks passed! Migration successful.');
  } else {
    console.log('\n⚠️  Some verification checks failed. Review output above.');
  }

  console.log('\n');
  process.exit(allPassed ? 0 : 1);
}

// Run verification
runVerification().catch(error => {
  console.error('\n💥 Fatal error during verification:', error);
  process.exit(1);
});
