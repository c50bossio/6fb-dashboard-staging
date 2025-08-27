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
    email: null /* hardcoded ID removed for production */,
    password: 'test123',
    full_name: 'Carlos Bossio',
    shop_name: 'Bossio VIP Shop'
  }
];

async function createDemoUsers() {

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
          
        } else {
          throw authError;
        }
      } else {

      }

    } catch (error) {
      console.error(`❌ Error creating user ${testUser.email}:`, error.message);
    }
  }

  );
  demoUsers.forEach(user => {

    );
  });

}

createDemoUsers();