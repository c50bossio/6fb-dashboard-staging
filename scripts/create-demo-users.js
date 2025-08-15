#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

const demoUsers = [
  {
    email: 'demo@barbershop.com',
    password: 'demo123',
    full_name: 'Demo User',
    shop_name: 'Demo Barbershop'
  },
  {
    email: 'c50bossio@gmail.com',
    password: 'test123',
    full_name: 'Carlos Bossio',
    shop_name: 'Bossio VIP Shop'
  }
];

async function createDemoUsers() {
  console.log('🚀 Creating demo users for testing...\n');

  for (const testUser of demoUsers) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true, // Skip email confirmation for demo
        user_metadata: {
          full_name: testUser.full_name,
          shop_name: testUser.shop_name
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  User ${testUser.email} already exists, skipping creation`);
        } else {
          throw authError;
        }
      } else {
        console.log(`✅ Created user: ${testUser.email}`);
        console.log(`   ID: ${authData.user.id}`);
      }

    } catch (error) {
      console.error(`❌ Error creating user ${testUser.email}:`, error.message);
    }
  }

  console.log('\n📝 Demo User Credentials:');
  console.log('─'.repeat(50));
  demoUsers.forEach(user => {
    console.log(`Email:    ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log('─'.repeat(30));
  });
  
  console.log('\n🎯 You can now:');
  console.log('1. Go to http://localhost:9999/login');
  console.log('2. Sign in with any of the demo credentials above');
  console.log('3. Access the dashboard at http://localhost:9999/dashboard');
}

createDemoUsers();