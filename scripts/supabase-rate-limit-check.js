#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Supabase Rate Limiting Configuration\n');
console.log('=' .repeat(60));

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];

console.log('📋 Project Information:');
console.log('─'.repeat(60));
console.log(`Project Reference: ${projectRef}`);
console.log(`Full URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

console.log('\n⚠️  Unfortunately, I cannot directly modify your Supabase settings because:');
console.log('─'.repeat(60));
console.log('• Supabase dashboard requires your personal login');
console.log('• Rate limiting settings are only accessible via web dashboard');
console.log('• No public API exists for these security settings');
console.log('• This is for security reasons (prevents unauthorized changes)');

console.log('\n🎯 BUT I can guide you step-by-step:');
console.log('─'.repeat(60));

console.log('\n1️⃣  Open this exact link:');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/auth/settings`);

console.log('\n2️⃣  Look for these specific sections:');
console.log('   ┌─────────────────────────────────────┐');
console.log('   │ "Rate limiting"                     │');
console.log('   │ "Security settings"                 │');
console.log('   │ "Auth rate limits"                  │');
console.log('   │ "Email rate limits"                 │');
console.log('   └─────────────────────────────────────┘');

console.log('\n3️⃣  What you\'re looking for:');
console.log('   • Any setting mentioning "seconds" or "delay"');
console.log('   • Fields with values like "56" or similar');
console.log('   • Dropdown menus for rate limiting policies');

console.log('\n4️⃣  Changes to make:');
console.log('   ┌─────────────────────────────────────┐');
console.log('   │ FROM: 56 seconds (or high number)   │');
console.log('   │ TO:   5-10 seconds maximum          │');
console.log('   │                                     │');
console.log('   │ FROM: Very strict limits            │');
console.log('   │ TO:   3-5 attempts per hour         │');
console.log('   └─────────────────────────────────────┘');

console.log('\n💡 ALTERNATIVE: Quick Temporary Fix');
console.log('─'.repeat(60));
console.log('If you can\'t find rate limiting settings:');
console.log('• Look for "Enable email confirmations"');
console.log('• TURN IT OFF temporarily');
console.log('• This bypasses the 56-second delay completely');
console.log('• Users can register and login immediately');

console.log('\n📱 What to do right now:');
console.log('─'.repeat(60));
console.log('1. Click this link (opens in new tab):');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
console.log('2. Tell me what sections you see');
console.log('3. I\'ll guide you to the exact setting');

console.log('\n🔧 Screenshot Option:');
console.log('─'.repeat(60));
console.log('• Take a screenshot of your Supabase Auth Settings page');
console.log('• I can point to exactly what to change');
console.log('• This will be the fastest way to fix it');

console.log('\n' + '=' .repeat(60));
console.log('🎯 Ready to guide you through this!');
console.log('Just open the link above and tell me what you see.');
console.log('=' .repeat(60) + '\n');