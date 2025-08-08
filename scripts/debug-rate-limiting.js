#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🚨 DEBUGGING PERSISTENT RATE LIMITING\n');
console.log('=' .repeat(60));

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];

console.log('⚠️  STILL GETTING 54-SECOND DELAYS');
console.log('─'.repeat(60));
console.log('This means one of the following:');
console.log('1. Rate limit changes didn\'t save properly');
console.log('2. Browser cache is using old settings');
console.log('3. There\'s another rate limiting setting we missed');
console.log('4. The limit is being triggered by a different setting');

console.log('\n🔧 IMMEDIATE SOLUTIONS:');
console.log('─'.repeat(60));

console.log('\n1️⃣  Verify Rate Limits Were Saved:');
console.log(`   Go back to: https://supabase.com/dashboard/project/${projectRef}/auth/rate-limits`);
console.log('   Check if "Rate limit for sign ups and sign ins" shows 100 (not 30)');
console.log('   If it shows 30, change it to 100 and save again');

console.log('\n2️⃣  Clear Browser State:');
console.log('   • Open Developer Tools (F12)');
console.log('   • Go to Application tab → Clear Storage');
console.log('   • Clear ALL data for localhost:9999');
console.log('   • OR use a fresh incognito/private window');

console.log('\n3️⃣  Alternative: Disable Email Confirmation:');
console.log(`   Go to: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
console.log('   Look for "Enable email confirmations"');
console.log('   Turn it OFF temporarily for testing');
console.log('   This bypasses rate limiting entirely');

console.log('\n4️⃣  Check Additional Rate Limiting:');
console.log('   Look for these sections in Supabase:');
console.log('   • "General user signup" settings');
console.log('   • "Bot and abuse protection" (CAPTCHA settings)');
console.log('   • Any other "rate" or "limit" settings');

console.log('\n⚡ QUICK FIX FOR TESTING:');
console.log('─'.repeat(60));
console.log('Option A: Wait 1-2 minutes, try again');
console.log('Option B: Use completely different browser');
console.log('Option C: Use mobile hotspot (different IP)');
console.log('Option D: Disable email confirmations temporarily');

console.log('\n🎯 DEBUGGING STEPS:');
console.log('─'.repeat(60));
console.log('1. Open incognito window');
console.log('2. Go to http://localhost:9999/register');
console.log('3. If you still get 54-second delay:');
console.log('   → Rate limits need to be checked again');
console.log('4. If no delay in incognito:');
console.log('   → Browser cache issue, clear all data');

console.log('\n🔗 Direct Links to Check:');
console.log('─'.repeat(60));
console.log(`Rate Limits: https://supabase.com/dashboard/project/${projectRef}/auth/rate-limits`);
console.log(`Auth Settings: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
console.log(`General Settings: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);

console.log('\n💡 MOST LIKELY CAUSES:');
console.log('─'.repeat(60));
console.log('1. Browser cached the rate limit state (try incognito)');
console.log('2. Changes didn\'t save in Supabase dashboard');
console.log('3. There\'s another rate limit setting active');

console.log('\n' + '=' .repeat(60));
console.log('🚨 TRY INCOGNITO WINDOW FIRST - Quick test!');
console.log('=' .repeat(60) + '\n');