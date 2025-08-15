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

async function checkEmailSettings() {
  console.log('🔍 Checking Supabase Email Configuration...\n');
  console.log('=' .repeat(50));
  
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];
  
  console.log('📊 Project Information:');
  console.log(`   Project ID: ${projectRef}`);
  console.log(`   Project URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);
  
  console.log('📧 Email Configuration Status:');
  console.log('─'.repeat(50));
  
  try {
    console.log('\n1. Testing Email Service:');
    const testEmail = `test_${Date.now()}@example.com`;
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });
    
    if (signUpError) {
      console.log('   ❌ Email service error:', signUpError.message);
    } else if (signUpData.user && !signUpData.session) {
      console.log('   ✅ Email confirmations are ENABLED');
      console.log('   📨 Verification email would be sent to real email addresses');
    } else if (signUpData.session) {
      console.log('   ⚠️  Email confirmations are DISABLED');
      console.log('   💡 Users can login immediately without email verification');
    }
    
    if (signUpData?.user) {
      await supabase.auth.admin.deleteUser(signUpData.user.id).catch(() => {});
    }
  } catch (error) {
    console.log('   ⚠️  Could not determine email settings:', error.message);
  }
  
  console.log('\n2. Email Provider Information:');
  console.log('   📮 Default Provider: Supabase (Built-in)');
  console.log('   📧 Rate Limits: 3 emails/hour (free tier)');
  console.log('   ⏰ Email Expiry: Confirmation links expire in 24 hours');
  
  console.log('\n3. Dashboard Links:');
  console.log('─'.repeat(50));
  console.log('   🔧 Email Settings:');
  console.log(`      https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
  console.log('\n   📝 Email Templates:');
  console.log(`      https://supabase.com/dashboard/project/${projectRef}/auth/templates`);
  console.log('\n   📊 Auth Logs:');
  console.log(`      https://supabase.com/dashboard/project/${projectRef}/auth/users`);
  
  console.log('\n4. Current Configuration:');
  console.log('─'.repeat(50));
  
  try {
    const { data: testUser } = await supabase.auth.admin.getUserByEmail('test@barbershop.com');
    
    if (testUser?.user) {
      console.log('   ✅ Admin API access working');
      console.log(`   👤 Test user verified: ${testUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
    }
  } catch (error) {
    console.log('   ℹ️  Cannot access admin API from client');
  }
  
  console.log('\n📋 Recommendations:');
  console.log('─'.repeat(50));
  console.log('   For Development:');
  console.log('   • Consider disabling email confirmations for easier testing');
  console.log('   • Use test email addresses that you control');
  console.log('\n   For Production:');
  console.log('   • Keep email confirmations enabled for security');
  console.log('   • Configure custom SMTP for better deliverability');
  console.log('   • Customize email templates for branding');
  
  console.log('\n💡 Quick Actions:');
  console.log('─'.repeat(50));
  console.log('   1. To disable email confirmation (development):');
  console.log('      Go to Auth Settings → Toggle OFF "Enable email confirmations"');
  console.log('\n   2. To test email delivery:');
  console.log('      Register with a real email address you control');
  console.log('\n   3. To customize emails:');
  console.log('      Go to Email Templates → Edit templates as needed');
  
  console.log('\n✅ Email configuration check complete!\n');
}

checkEmailSettings().catch(console.error);