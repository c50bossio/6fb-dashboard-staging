#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('🔐 Testing Login After Email Verification\n');
  console.log('=' .repeat(50));
  
  // Get email from command line or use a default
  const email = process.argv[2] || 'test@barbershop.com';
  const password = process.argv[3] || 'TestPass123!';
  
  console.log('📧 Login Credentials:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password.replace(/./g, '*')}\n`);
  
  try {
    console.log('🚀 Attempting login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      console.log('\n❌ Login Failed:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.status || 'Unknown'}`);
      
      // Common error explanations
      if (error.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Email Verification Required:');
        console.log('   • Check your email inbox for verification link');
        console.log('   • Click the link to verify your account');
        console.log('   • Try logging in again after verification');
      } else if (error.message.includes('Invalid login credentials')) {
        console.log('\n⚠️  Invalid Credentials:');
        console.log('   • Check email and password are correct');
        console.log('   • Password is case-sensitive');
        console.log('   • Make sure you\'re using the right account');
      } else if (error.message.includes('User not found')) {
        console.log('\n⚠️  Account Not Found:');
        console.log('   • This email is not registered');
        console.log('   • Check for typos in the email');
        console.log('   • You may need to register first');
      }
      
      return;
    }
    
    console.log('\n✅ Login Successful!');
    console.log('\n📊 Session Details:');
    console.log('─'.repeat(50));
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Email Verified: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Verified At: ${data.user.email_confirmed_at ? new Date(data.user.email_confirmed_at).toLocaleString() : 'Not verified'}`);
    console.log(`   Created: ${new Date(data.user.created_at).toLocaleString()}`);
    console.log(`   Last Sign In: ${data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at).toLocaleString() : 'First login'}`);
    
    // Check for user metadata
    if (data.user.user_metadata) {
      console.log('\n👤 User Metadata:');
      console.log(`   Full Name: ${data.user.user_metadata.full_name || 'Not set'}`);
      console.log(`   Shop Name: ${data.user.user_metadata.shop_name || 'Not set'}`);
      console.log(`   Phone: ${data.user.user_metadata.phone || 'Not set'}`);
    }
    
    // Check profile
    console.log('\n🔍 Checking Profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profile) {
      console.log('   ✅ Profile Found:');
      console.log(`      Role: ${profile.role}`);
      console.log(`      Subscription: ${profile.subscription_status}`);
      console.log(`      Organization: ${profile.organization || 'Not set'}`);
    } else if (profileError) {
      console.log('   ⚠️  Profile Error:', profileError.message);
      
      // Try to create profile if it doesn't exist
      console.log('\n🔧 Attempting to create profile...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || null,
          shop_name: data.user.user_metadata?.shop_name || null,
          role: 'user',
          subscription_status: 'free'
        })
        .select()
        .single();
      
      if (newProfile) {
        console.log('   ✅ Profile created successfully');
      } else if (createError) {
        console.log('   ❌ Could not create profile:', createError.message);
      }
    }
    
    // Test session persistence
    console.log('\n🔄 Testing Session Persistence...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('   ✅ Session is active');
      console.log(`   Access Token: ${session.access_token.substring(0, 20)}...`);
      console.log(`   Expires At: ${new Date(session.expires_at * 1000).toLocaleString()}`);
    } else {
      console.log('   ⚠️  No active session found');
    }
    
    // Sign out
    console.log('\n🚪 Signing out...');
    await supabase.auth.signOut();
    console.log('   ✅ Signed out successfully');
    
  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📝 Troubleshooting Tips:');
  console.log('─'.repeat(50));
  console.log('1. If login fails after verification:');
  console.log('   • Wait a few seconds after clicking verification link');
  console.log('   • Try refreshing the login page');
  console.log('   • Clear browser cookies and try again');
  console.log('\n2. If "Invalid credentials" error:');
  console.log('   • Double-check email and password');
  console.log('   • Password is case-sensitive');
  console.log('   • Try resetting password if unsure');
  console.log('\n3. If profile is missing:');
  console.log('   • Profile should be created automatically');
  console.log('   • Check database triggers are enabled');
  console.log('   • May need to manually create profile record');
  console.log('=' .repeat(50) + '\n');
}

// Show usage if no email provided
if (process.argv.length < 3) {
  console.log('Usage: node test-login-after-verification.js <email> <password>');
  console.log('Example: node test-login-after-verification.js user@gmail.com MyPass123!');
  console.log('\nUsing default test account...\n');
}

// Run the test
testLogin().catch(console.error);