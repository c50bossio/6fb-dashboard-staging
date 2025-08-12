#!/usr/bin/env node
/**
 * Setup Test Authentication Users
 * Creates test users in Supabase for authentication testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase Admin Client
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

async function setupTestUsers() {
  console.log('🔐 Setting up test authentication users...\n');
  
  const testUsers = [
    {
      email: 'demo@bookedbarber.com',
      password: 'Demo123!@#',
      userData: {
        full_name: 'Demo User',
        role: 'user',
        phone: '+1-555-0100'
      }
    },
    {
      email: 'barber@bookedbarber.com',
      password: 'Barber123!@#',
      userData: {
        full_name: 'Test Barber',
        role: 'barber',
        phone: '+1-555-0101'
      }
    },
    {
      email: 'owner@bookedbarber.com',
      password: 'Owner123!@#',
      userData: {
        full_name: 'Shop Owner',
        role: 'shop_owner',
        phone: '+1-555-0102'
      }
    }
  ];

  console.log('📊 Creating test users in Supabase Auth...\n');
  
  for (const user of testUsers) {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email for testing
        user_metadata: user.userData
      });

      if (authError) {
        if (authError.message.includes('already exists')) {
          console.log(`⚠️  User ${user.email} already exists`);
          
          // Update existing user's password
          const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            authData?.id || '', 
            { 
              password: user.password,
              email_confirm: true
            }
          );
          
          if (updateError && !updateError.message.includes('not found')) {
            console.log(`   ❌ Failed to update password: ${updateError.message}`);
          } else {
            console.log(`   ✅ Password updated successfully`);
          }
        } else {
          console.log(`❌ Failed to create ${user.email}: ${authError.message}`);
          continue;
        }
      } else {
        console.log(`✅ Created auth user: ${user.email}`);
      }

      // Check if profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const profileToInsert = {
          id: authData?.id || crypto.randomUUID(),
          email: user.email,
          full_name: user.userData.full_name,
          role: user.userData.role,
          phone: user.userData.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileToInsert);

        if (insertError) {
          console.log(`   ⚠️  Failed to create profile: ${insertError.message}`);
        } else {
          console.log(`   ✅ Created profile record`);
        }
      } else if (!profileError) {
        console.log(`   ℹ️  Profile already exists`);
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Error processing ${user.email}:`, error.message);
    }
  }

  console.log('\n📝 Test Credentials for Authentication:\n');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ Email                    │ Password      │ Role         │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ demo@bookedbarber.com    │ Demo123!@#    │ User         │');
  console.log('│ barber@bookedbarber.com  │ Barber123!@# │ Barber       │');
  console.log('│ owner@bookedbarber.com   │ Owner123!@#   │ Shop Owner   │');
  console.log('└─────────────────────────────────────────────────────────┘');
  
  console.log('\n🌐 Test URLs:');
  console.log('   Login: https://bookedbarber.com/login');
  console.log('   Register: https://bookedbarber.com/register');
  console.log('   Dashboard: https://bookedbarber.com/dashboard (after login)');
  
  console.log('\n✅ Test users setup complete!');
}

// Check Supabase Auth settings
async function checkAuthSettings() {
  console.log('\n🔍 Checking Supabase Auth Configuration...\n');
  
  try {
    // Test connection
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {
      console.log('❌ Cannot access Supabase Admin API');
      console.log('   Make sure SUPABASE_SERVICE_ROLE_KEY is correctly configured');
      return false;
    }
    
    console.log('✅ Supabase Admin API connection successful');
    console.log(`   Total users in Auth: ${users?.length || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check auth settings:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Supabase Authentication Setup\n');
  console.log('Project:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');
  
  // Check connection first
  const isConnected = await checkAuthSettings();
  
  if (!isConnected) {
    console.log('\n⚠️  Please check your Supabase configuration and try again.');
    process.exit(1);
  }
  
  // Setup test users
  await setupTestUsers();
}

// Run the setup
main().catch(console.error);