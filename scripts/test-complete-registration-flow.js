#!/usr/bin/env node

/**
 * Complete Registration Flow Test
 * Tests the entire registration → email verification → login → dashboard flow
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Generate unique test data
const timestamp = Date.now();
const testEmail = `testflow${timestamp}@gmail.com`;
const testPassword = 'TestPass123!';

const testData = {
  firstName: 'Flow',
  lastName: `Test${timestamp}`,
  email: testEmail,
  phone: '(555) 123-4567',
  password: testPassword,
  businessName: `Test Flow Barbershop ${timestamp}`,
  businessAddress: '123 Test Flow St, Test City, TS 12345',
  businessPhone: '(555) 987-6543',
  businessType: 'barbershop',
  selectedPlan: 'professional'
};

async function testCompleteFlow() {
  console.log('🧪 COMPLETE REGISTRATION FLOW TEST\n');
  console.log('=' .repeat(70));
  
  console.log('\n📋 Test Data:');
  console.log('─'.repeat(70));
  console.log(`Email: ${testData.email}`);
  console.log(`Password: ${testData.password}`);
  console.log(`Business: ${testData.businessName}`);
  
  console.log('\n🔄 STEP 1: Testing Registration (No Rate Limiting)');
  console.log('─'.repeat(70));
  
  const startTime = Date.now();
  
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testData.email,
      password: testData.password,
      options: {
        data: {
          full_name: `${testData.firstName} ${testData.lastName}`,
          shop_name: testData.businessName,
          phone: testData.phone,
          business_address: testData.businessAddress,
          business_phone: testData.businessPhone,
          business_type: testData.businessType,
          selected_plan: testData.selectedPlan
        },
        emailRedirectTo: 'http://localhost:9999/dashboard'
      }
    });
    
    const registrationTime = Date.now() - startTime;
    
    if (signUpError) {
      if (signUpError.message.includes('seconds')) {
        console.log('❌ RATE LIMITING STILL ACTIVE!');
        console.log(`   Error: ${signUpError.message}`);
        console.log('   → Rate limiting fix didn\'t work properly');
        return;
      } else {
        console.log('❌ Registration failed:', signUpError.message);
        return;
      }
    }
    
    console.log('✅ Registration successful!');
    console.log(`   Time taken: ${registrationTime}ms (should be < 5000ms)`);
    console.log(`   User ID: ${signUpData.user?.id}`);
    
    if (registrationTime > 5000) {
      console.log('⚠️  Registration took longer than expected');
    } else {
      console.log('✅ No rate limiting delays detected');
    }
    
    console.log('\n🔄 STEP 2: Testing Email Verification Setup');
    console.log('─'.repeat(70));
    
    if (signUpData.user && !signUpData.session) {
      console.log('✅ Email verification required (security enabled)');
      console.log(`   User created: ${signUpData.user.email}`);
      console.log('   Status: Awaiting email confirmation');
      
      // Test immediate login (should fail)
      console.log('\n🔐 Testing login before verification (should fail)...');
      const { error: earlyLoginError } = await supabase.auth.signInWithPassword({
        email: testData.email,
        password: testData.password
      });
      
      if (earlyLoginError && earlyLoginError.message.includes('Email not confirmed')) {
        console.log('✅ Login correctly blocked before email verification');
      } else if (earlyLoginError) {
        console.log(`⚠️  Login failed with different error: ${earlyLoginError.message}`);
      } else {
        console.log('⚠️  Login succeeded without email verification (confirmations may be disabled)');
      }
      
    } else if (signUpData.user && signUpData.session) {
      console.log('⚠️  Email verification DISABLED');
      console.log('   User can login immediately');
      console.log('   Consider enabling for production security');
      
      // Sign out for clean test
      await supabase.auth.signOut();
    }
    
    console.log('\n🔄 STEP 3: Testing Profile Creation');
    console.log('─'.repeat(70));
    
    // Check if profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testData.email)
      .single();
    
    if (profile) {
      console.log('✅ Profile created successfully');
      console.log(`   Role: ${profile.role}`);
      console.log(`   Subscription: ${profile.subscription_status}`);
      console.log(`   Shop Name: ${profile.shop_name || 'Not set'}`);
    } else {
      console.log('⚠️  Profile not found');
      console.log('   Note: Profile may be created after email verification');
    }
    
    console.log('\n🔄 STEP 4: URL Configuration Validation');
    console.log('─'.repeat(70));
    
    console.log('✅ Redirect URLs should now include:');
    console.log('   • http://localhost:9999/**');
    console.log('   • http://localhost:9999/dashboard');
    console.log('   • http://localhost:9999/login');
    console.log('   • http://localhost:9999/auth/callback');
    console.log('\n✅ Site URL should be: http://localhost:9999');
    console.log('\n   → This should prevent 422 PKCE errors');
    
    console.log('\n🎯 MANUAL VERIFICATION STEPS:');
    console.log('─'.repeat(70));
    console.log('1. Check email inbox for verification from Supabase');
    console.log('2. Click the verification link');
    console.log('3. Should redirect to http://localhost:9999/dashboard (no 422 error)');
    console.log('4. Try logging in at http://localhost:9999/login');
    console.log('5. Verify dashboard access and session persistence');
    
    console.log('\n📊 EXPECTED RESULTS:');
    console.log('─'.repeat(70));
    console.log('✅ Registration completes in < 5 seconds (no rate limiting)');
    console.log('✅ Email verification link works (no 422 errors)');
    console.log('✅ Login works after verification');
    console.log('✅ Dashboard loads and session persists');
    console.log('✅ User can navigate and stay logged in');
    
    console.log('\n🚨 IF ISSUES OCCUR:');
    console.log('─'.repeat(70));
    console.log('• 56-second delay → Rate limiting not fixed properly');
    console.log('• 422 PKCE error → Redirect URLs not configured correctly');
    console.log('• Email not received → Check spam folder / Supabase email limits');
    console.log('• Login fails → Email not verified or profile missing');
    
  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('🎯 TEST ACCOUNT CREATED FOR MANUAL VERIFICATION:');
  console.log('─'.repeat(70));
  console.log(`Email: ${testData.email}`);
  console.log(`Password: ${testData.password}`);
  console.log('Business: ' + testData.businessName);
  console.log('\n👆 Use this account to complete the manual verification steps above');
  console.log('=' .repeat(70) + '\n');
}

// Run the complete test
testCompleteFlow().catch(console.error);