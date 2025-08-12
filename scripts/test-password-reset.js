#!/usr/bin/env node
/**
 * Test Password Reset Functionality
 */

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

async function testPasswordReset() {
  console.log('🔐 Testing Password Reset Functionality...\n');
  
  const testEmail = 'test@bookedbarber.com';
  
  try {
    console.log('📧 Step 1: Requesting password reset for:', testEmail);
    
    // Request password reset
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'http://localhost:9999/reset-password',
    });
    
    if (error) {
      console.error('❌ Password reset request failed:', error.message);
      return;
    }
    
    console.log('✅ Password reset email sent successfully!');
    console.log('   Check email for reset link');
    console.log('   Redirect URL: http://localhost:9999/reset-password');
    
    console.log('\n📝 How Password Reset Works:');
    console.log('1. User receives email with reset link');
    console.log('2. Link contains a secure token');
    console.log('3. User clicks link and is redirected to reset page');
    console.log('4. User enters new password');
    console.log('5. Password is updated in Supabase');
    
    console.log('\n✅ Password reset functionality is configured!');
    
    // Check if reset password page exists
    const fs = require('fs');
    const resetPagePath = './app/(public)/reset-password/page.js';
    
    if (fs.existsSync(resetPagePath)) {
      console.log('\n✅ Reset password page exists at /reset-password');
    } else {
      console.log('\n⚠️  Reset password page not found at', resetPagePath);
      console.log('   You may need to create this page');
    }
    
  } catch (error) {
    console.error('❌ Error testing password reset:', error.message);
  }
}

testPasswordReset();