#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Fixing Authentication Callback Issues\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('📋 Environment Configuration:');
console.log('─'.repeat(60));
console.log(`SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...`);

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];

console.log('\n🔍 Diagnosing PKCE Token Error (422):');
console.log('─'.repeat(60));
console.log('This error typically means:');
console.log('1. Callback URL mismatch');
console.log('2. PKCE flow interruption');
console.log('3. Cookie/session issues');

console.log('\n✅ SOLUTION STEPS:');
console.log('─'.repeat(60));

console.log('\n1️⃣  Update Supabase Redirect URLs:');
console.log(`   Go to: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
console.log('   \n   Add these URLs to "Redirect URLs" (one per line):');
console.log('   • http://localhost:9999/**');
console.log('   • http://localhost:9999/dashboard');
console.log('   • http://localhost:9999/login');
console.log('   • http://localhost:9999/auth/callback');

console.log('\n2️⃣  Clear Browser State:');
console.log('   • Clear all cookies for localhost:9999');
console.log('   • Clear localStorage for localhost:9999');
console.log('   • Or use Incognito/Private window');

console.log('\n3️⃣  Verify Email Settings:');
console.log(`   Go to: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
console.log('   Check: "Enable email confirmations" is ON');

console.log('\n4️⃣  Update Email Templates (if needed):');
console.log(`   Go to: https://supabase.com/dashboard/project/${projectRef}/auth/templates`);
console.log('   In "Confirm signup" template, ensure the link is:');
console.log('   {{ .ConfirmationURL }}');

console.log('\n' + '=' .repeat(60));
console.log('🚀 Quick Fix Actions:');
console.log('─'.repeat(60));
console.log('1. Add redirect URLs in Supabase dashboard (see above)');
console.log('2. Clear browser data or use incognito window');
console.log('3. Try registering/logging in again');

console.log('\n📝 Testing After Fix:');
console.log('─'.repeat(60));
console.log('1. Register new account: http://localhost:9999/register');
console.log('2. Check email and click verification link');
console.log('3. You should be redirected to dashboard or login');
console.log('4. Login at: http://localhost:9999/login');

console.log('\n⚠️  Important Notes:');
console.log('─'.repeat(60));
console.log('• Verification links expire in 24 hours');
console.log('• Free tier: 3 emails per hour limit');
console.log('• PKCE is a security feature, don\'t disable it');

console.log('\n🔗 Direct Dashboard Links:');
console.log('─'.repeat(60));
console.log(`Auth Settings: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
console.log(`Email Templates: https://supabase.com/dashboard/project/${projectRef}/auth/templates`);
console.log(`Auth Logs: https://supabase.com/dashboard/project/${projectRef}/auth/users`);

console.log('\n' + '=' .repeat(60));
console.log('After adding the redirect URLs, the 422 error should be resolved!\n');