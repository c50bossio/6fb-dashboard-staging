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

async function createTestUser() {

  const testUser = {
    email: 'test@barbershop.com',
    password: 'TestPass123!',
    full_name: await getTestUserFromDatabase(),
    shop_name: 'Test Barbershop'
  };

  try {
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

        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(testUser.email);
        if (existingUser) {
          
        }
      } else {
        throw authError;
      }
    } else {

    }

    );

    );

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser();