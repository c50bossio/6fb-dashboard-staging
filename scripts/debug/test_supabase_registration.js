#!/usr/bin/env node

/**
 * Test script to verify Supabase email verification functionality
 */

const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegistration() {
  const testEmail = `test.verification.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: await getTestUserFromDatabase(),
          shop_name: 'Test Barbershop'
        },
        emailRedirectTo: 'http://localhost:9999/dashboard'
      }
    });
    
    if (error) {
      console.error('❌ Registration failed:', error.message);
      
      if (error.message.includes('SMTP') || error.message.includes('email')) {
        console.error('🚨 Email/SMTP related error detected!');
        console.error('This indicates the verified domain fix may not be working.');
      }
      
      return false;
    }

    );
    
    if (data.user && !data.session) {

      return true;
    } else if (data.session) {
      
      return true;
    } else {
      
      return false;
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function main() {
  const success = await testRegistration();

  if (success) {

  } else {

  }
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error);