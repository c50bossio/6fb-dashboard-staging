#!/usr/bin/env node

/**
 * Test script to verify Supabase email verification functionality
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Registration with Email Verification');
console.log('=================================================');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key: ${supabaseKey ? 'Present' : 'Missing'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegistration() {
  const testEmail = `test.verification.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`\n🧪 Testing registration for: ${testEmail}`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          shop_name: 'Test Barbershop'
        },
        emailRedirectTo: 'http://localhost:9999/dashboard'
      }
    });
    
    if (error) {
      console.error('❌ Registration failed:', error.message);
      
      // Check for specific SMTP-related errors
      if (error.message.includes('SMTP') || error.message.includes('email')) {
        console.error('🚨 Email/SMTP related error detected!');
        console.error('This indicates the verified domain fix may not be working.');
      }
      
      return false;
    }
    
    console.log('✅ Registration API call successful');
    console.log('Data received:', JSON.stringify(data, null, 2));
    
    // Check if email verification is required
    if (data.user && !data.session) {
      console.log('📧 Email verification required - this is expected');
      console.log('✅ User created but not confirmed - verification email should be sent');
      console.log(`User ID: ${data.user.id}`);
      console.log(`Email: ${data.user.email}`);
      console.log(`Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
      
      return true;
    } else if (data.session) {
      console.log('⚠️  User immediately logged in - email verification might be disabled');
      return true;
    } else {
      console.log('❓ Unexpected response structure');
      return false;
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

async function main() {
  const success = await testRegistration();
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  if (success) {
    console.log('✅ Registration test passed');
    console.log('✅ Supabase integration is working');
    console.log('📧 Check the test email inbox for verification email');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check Gmail inbox for verification email from noreply@6fbmentorship.com');
    console.log('2. If no email received, check Supabase SMTP configuration');
    console.log('3. Verify the domain noreply@6fbmentorship.com is properly authenticated');
  } else {
    console.log('❌ Registration test failed');
    console.log('🔍 Check Supabase configuration and SMTP settings');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error);