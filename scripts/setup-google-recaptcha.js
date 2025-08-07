#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🔐 SETTING UP GOOGLE reCAPTCHA\n');
console.log('=' .repeat(60));

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];

console.log('🎯 GOOGLE reCAPTCHA SETUP (5 minutes):');
console.log('─'.repeat(60));

console.log('\n1️⃣  CREATE reCAPTCHA SITE:');
console.log('   Go to: https://www.google.com/recaptcha/admin/create');
console.log('   (Login with your Google account)');

console.log('\n2️⃣  FILL OUT THE FORM:');
console.log('   ┌─────────────────────────────────────────┐');
console.log('   │ Label: 6FB AI Agent System              │');
console.log('   │ reCAPTCHA type: v2 "I\'m not a robot"    │');
console.log('   │ Domains: localhost                      │');
console.log('   │          localhost:9999                 │');
console.log('   │          (add your production domain)   │');
console.log('   │ Accept Terms: ✓                         │');
console.log('   └─────────────────────────────────────────┘');

console.log('\n3️⃣  GET YOUR KEYS:');
console.log('   After creating, you\'ll see:');
console.log('   • Site Key (public) - starts with 6L...');
console.log('   • Secret Key (private) - starts with 6L...');
console.log('   COPY BOTH KEYS!');

console.log('\n4️⃣  CONFIGURE IN SUPABASE:');
console.log(`   Go to: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);
console.log('   Find: "Bot and abuse protection" section');
console.log('   Look for: "Google reCAPTCHA" or "CAPTCHA" settings');
console.log('   Enter:');
console.log('   • Site Key (public key)');
console.log('   • Secret Key (private key)');
console.log('   • Enable: ON');

console.log('\n5️⃣  CONFIGURE CAPTCHA BEHAVIOR:');
console.log('   Set when to show CAPTCHA:');
console.log('   ┌─────────────────────────────────────────┐');
console.log('   │ ✅ Sign up                              │');
console.log('   │ ✅ Password reset                       │');
console.log('   │ ⚠️  Sign in (optional)                  │');
console.log('   │ Trigger: After 2 failed attempts       │');
console.log('   └─────────────────────────────────────────┘');

console.log('\n⚙️  RECOMMENDED SETTINGS:');
console.log('─'.repeat(60));
console.log('• Type: reCAPTCHA v2 (checkbox)');
console.log('• Domains: localhost, localhost:9999');
console.log('• Enable for: Registration + Password Reset');
console.log('• Trigger: After 1-2 failed attempts');

console.log('\n🎯 EXPECTED BEHAVIOR AFTER SETUP:');
console.log('─'.repeat(60));
console.log('1. User fills registration form');
console.log('2. Clicks "Create account"');
console.log('3. reCAPTCHA appears (if needed)');
console.log('4. User solves "I\'m not a robot"');
console.log('5. Registration proceeds normally');
console.log('6. NO MORE 53-SECOND DELAYS!');

console.log('\n⚡ IMMEDIATE BENEFITS:');
console.log('─'.repeat(60));
console.log('✅ Eliminate aggressive rate limiting');
console.log('✅ Professional security (Google standard)');
console.log('✅ Smooth user experience');
console.log('✅ Mobile-friendly');
console.log('✅ Accessibility support');

console.log('\n🔗 DIRECT LINKS:');
console.log('─'.repeat(60));
console.log('Create reCAPTCHA: https://www.google.com/recaptcha/admin/create');
console.log(`Supabase Settings: https://supabase.com/dashboard/project/${projectRef}/auth/settings`);

console.log('\n📱 TESTING CHECKLIST:');
console.log('─'.repeat(60));
console.log('After setup, test:');
console.log('• Registration without CAPTCHA (first attempt)');
console.log('• Registration with CAPTCHA (after rate limit)');
console.log('• Mobile device compatibility');
console.log('• Different browsers');

console.log('\n🚨 IMPORTANT NOTES:');
console.log('─'.repeat(60));
console.log('• Keep Secret Key private (never commit to git)');
console.log('• Test on localhost first');
console.log('• Add production domain before going live');
console.log('• reCAPTCHA v2 is more user-friendly than v3');

console.log('\n' + '=' .repeat(60));
console.log('🎯 NEXT STEPS:');
console.log('1. Create reCAPTCHA site at Google');
console.log('2. Copy Site Key and Secret Key');
console.log('3. Configure in Supabase dashboard');
console.log('4. Test registration flow');
console.log('5. Reduce rate limits to normal levels');
console.log('=' .repeat(60) + '\n');