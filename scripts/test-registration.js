#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testRegistration() {
  console.log('🧪 Testing Registration & Email Flow...\n');
  console.log('=' .repeat(50));
  
  // Generate a test email with valid domain
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  const testEmail = `testuser${randomNum}@gmail.com`;  // Using a valid domain
  const testPassword = 'TestPass123!';
  
  console.log('📝 Test Registration Details:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword}\n`);
  
  try {
    console.log('🚀 Attempting registration...');
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          shop_name: 'Test Shop'
        }
      }
    });
    
    if (error) {
      console.log('❌ Registration failed:', error.message);
      return;
    }
    
    console.log('\n📊 Registration Results:');
    console.log('─'.repeat(50));
    
    if (data.user && !data.session) {
      console.log('✅ Registration successful!');
      console.log('📧 Email confirmation is REQUIRED');
      console.log('\nStatus:');
      console.log('   • User created: Yes');
      console.log('   • Session created: No (awaiting email verification)');
      console.log('   • User ID:', data.user.id);
      console.log('   • Email verified:', data.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('\n⚠️  Important:');
      console.log('   • User must click verification link in email');
      console.log('   • Cannot login until email is verified');
      console.log('   • Verification link expires in 24 hours');
      
    } else if (data.user && data.session) {
      console.log('✅ Registration successful!');
      console.log('⚠️  Email confirmation is DISABLED');
      console.log('\nStatus:');
      console.log('   • User created: Yes');
      console.log('   • Session created: Yes (immediate access)');
      console.log('   • User ID:', data.user.id);
      console.log('   • Can login immediately: Yes');
      console.log('\n💡 Note: This is less secure but convenient for development');
    }
    
    // Try to sign in immediately to confirm email requirement
    console.log('\n🔐 Testing immediate login...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        console.log('   ✅ Email verification is working correctly');
        console.log('   ℹ️  Login blocked until email is verified');
      } else {
        console.log('   ⚠️  Login error:', signInError.message);
      }
    } else {
      console.log('   ✅ Login successful without email verification');
      console.log('   ⚠️  Email confirmations are disabled');
      
      // Sign out if we successfully signed in
      await supabase.auth.signOut();
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
  
  console.log('\n📚 Summary:');
  console.log('─'.repeat(50));
  console.log('To check or change email settings, visit:');
  console.log('https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/settings');
  console.log('\nLook for: "Enable email confirmations" toggle');
  console.log('   • ON = Emails required (secure, production)');
  console.log('   • OFF = No emails (convenient, development)');
}

// Run the test
testRegistration().catch(console.error);