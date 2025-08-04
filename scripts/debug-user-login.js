#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase admin client
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

async function debugUserLogin(email) {
  console.log('🔍 Debugging User Login Issue\n');
  console.log('=' .repeat(50));
  console.log(`Email: ${email}\n`);
  
  try {
    // Check if user exists in auth.users
    console.log('1️⃣  Checking Auth User...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (authError) {
      console.log('   ❌ User not found in auth.users');
      console.log('   Error:', authError.message);
      return;
    }
    
    if (authUser?.user) {
      console.log('   ✅ User found in auth.users');
      console.log(`   ID: ${authUser.user.id}`);
      console.log(`   Email Verified: ${authUser.user.email_confirmed_at ? 'Yes ✅' : 'No ❌'}`);
      
      if (authUser.user.email_confirmed_at) {
        console.log(`   Verified At: ${new Date(authUser.user.email_confirmed_at).toLocaleString()}`);
      } else {
        console.log('   ⚠️  EMAIL NOT VERIFIED - User cannot login!');
        console.log('   Solution: User must click verification link in email');
      }
      
      console.log(`   Created: ${new Date(authUser.user.created_at).toLocaleString()}`);
      console.log(`   Last Sign In: ${authUser.user.last_sign_in_at ? new Date(authUser.user.last_sign_in_at).toLocaleString() : 'Never'}`);
      
      // Check metadata
      if (authUser.user.user_metadata && Object.keys(authUser.user.user_metadata).length > 0) {
        console.log('\n   📋 User Metadata:');
        Object.entries(authUser.user.user_metadata).forEach(([key, value]) => {
          console.log(`      ${key}: ${value || 'Not set'}`);
        });
      }
      
      // Check if profile exists
      console.log('\n2️⃣  Checking Profile Record...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.user.id)
        .single();
      
      if (profile) {
        console.log('   ✅ Profile exists');
        console.log(`   Email: ${profile.email}`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Subscription: ${profile.subscription_status}`);
      } else {
        console.log('   ❌ Profile NOT found');
        
        if (!authUser.user.email_confirmed_at) {
          console.log('   ℹ️  Profile is created AFTER email verification');
          console.log('   Solution: Verify email first, profile will be created automatically');
        } else {
          console.log('   ⚠️  Profile should exist but doesn\'t!');
          console.log('\n   🔧 Creating profile manually...');
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.user.id,
              email: authUser.user.email,
              full_name: authUser.user.user_metadata?.full_name || null,
              shop_name: authUser.user.user_metadata?.shop_name || null,
              organization: authUser.user.user_metadata?.organization || null,
              role: 'user',
              subscription_status: 'free'
            })
            .select()
            .single();
          
          if (newProfile) {
            console.log('   ✅ Profile created successfully!');
          } else if (createError) {
            console.log('   ❌ Failed to create profile:', createError.message);
          }
        }
      }
      
      // Test login if email is verified
      if (authUser.user.email_confirmed_at) {
        console.log('\n3️⃣  Testing Login Capability...');
        console.log('   Email is verified, user SHOULD be able to login');
        console.log('   Try logging in with your password at http://localhost:9999/login');
      } else {
        console.log('\n3️⃣  Login Status:');
        console.log('   ❌ CANNOT LOGIN - Email not verified');
        console.log('   ✉️  Check your email for verification link');
      }
      
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📝 Common Issues & Solutions:');
  console.log('─'.repeat(50));
  console.log('1. "Invalid login credentials" error:');
  console.log('   • Email not verified → Click verification link');
  console.log('   • Wrong password → Check caps lock, try reset');
  console.log('   • Profile missing → Will be created after verification');
  console.log('\n2. Clicked verification link but can\'t login:');
  console.log('   • Clear browser cache/cookies');
  console.log('   • Try incognito/private window');
  console.log('   • Wait 10 seconds and try again');
  console.log('\n3. Never received verification email:');
  console.log('   • Check spam/junk folder');
  console.log('   • Supabase free tier: 3 emails/hour limit');
  console.log('   • Try registering with different email');
  console.log('=' .repeat(50) + '\n');
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('Usage: node debug-user-login.js <email>');
  console.log('Example: node debug-user-login.js user@gmail.com\n');
  process.exit(1);
}

// Run debug
debugUserLogin(email).catch(console.error);