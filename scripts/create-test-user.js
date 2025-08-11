#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

async function createTestUser() {
  console.log('🚀 Creating test user account...\n');

  const testUser = {
    email: 'test@barbershop.com',
    password: 'TestPass123!',
    full_name: await getTestUserFromDatabase(),
    shop_name: 'Test Barbershop'
  };

  try {
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: testUser.full_name,
        shop_name: testUser.shop_name
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, skipping creation');
        
        // Try to get existing user
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(testUser.email);
        if (existingUser) {
          console.log(`✅ Found existing user: ${testUser.email}`);
        }
      } else {
        throw authError;
      }
    } else {
      console.log(`✅ Created user: ${testUser.email}`);
      console.log(`   ID: ${authData.user.id}`);
    }

    console.log('\n📝 Test User Credentials:');
    console.log('─'.repeat(40));
    console.log(`Email:    ${testUser.email}`);
    console.log(`Password: ${testUser.password}`);
    console.log('─'.repeat(40));
    
    console.log('\n🎯 You can now:');
    console.log('1. Go to http://localhost:9999/login');
    console.log('2. Sign in with the test credentials above');
    console.log('3. Access the dashboard at http://localhost:9999/dashboard');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  }
}

// Run the script
createTestUser();