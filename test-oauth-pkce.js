#!/usr/bin/env node

const https = require('https');
const crypto = require('crypto');

console.log('🔍 PKCE OAuth Flow Analysis');
console.log('============================\n');

// Generate PKCE challenge like Supabase does
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  
  return { verifier, challenge };
}

const { verifier, challenge } = generatePKCE();

console.log('1. PKCE Generation (what happens when user clicks "Continue with Google"):');
console.log('   Code Verifier:', verifier.substring(0, 20) + '...');
console.log('   Code Challenge:', challenge.substring(0, 20) + '...');
console.log('   ➜ Verifier is stored in cookie: sb-dfhqjdoydihajmjxniee-auth-pkce-code-verifier');
console.log('   ➜ Challenge is sent to Google\n');

console.log('2. OAuth Flow:');
console.log('   a. User at: bookedbarber.com');
console.log('   b. Clicks Google OAuth → Supabase sets PKCE cookie');
console.log('   c. Redirects to: dfhqjdoydihajmjxniee.supabase.co/auth/v1/authorize');
console.log('   d. Supabase redirects to: accounts.google.com');
console.log('   e. User authenticates with Google');
console.log('   f. Google redirects to: dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback');
console.log('   g. Supabase redirects to: bookedbarber.com/auth/callback?code=XXX\n');

console.log('3. THE PROBLEM:');
console.log('   ❌ Cookie set on: bookedbarber.com (step b)');
console.log('   ❌ Cookie needed on: dfhqjdoydihajmjxniee.supabase.co (step f)');
console.log('   ❌ These are different domains!\n');

console.log('4. Why exchangeCodeForSession fails:');
console.log('   - The PKCE verifier cookie was set on bookedbarber.com');
console.log('   - But Supabase needs it when processing the callback');
console.log('   - Cookies don\'t cross domains (security feature)');
console.log('   - Without the verifier, Supabase can\'t validate the code\n');

console.log('5. SOLUTION OPTIONS:\n');

console.log('Option A: Use Supabase domain for OAuth (RECOMMENDED):');
console.log('   Change login page OAuth initiation to use:');
console.log('   redirectTo: "https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback"');
console.log('   Then let Supabase redirect to bookedbarber.com\n');

console.log('Option B: Remove custom cookie options:');
console.log('   In server-client.js, use the default Supabase pattern:');
console.log('   Just pass cookies without modifying options\n');

console.log('Option C: Use implicit flow instead of PKCE:');
console.log('   Set flow_type: "implicit" in signInWithOAuth');
console.log('   (Less secure but avoids cookie issues)\n');

console.log('6. Test if cookies are the issue:');

// Test cookie behavior
const testUrl = 'https://bookedbarber.com/auth/callback?code=test';
https.get(testUrl, {
  headers: {
    'Cookie': 'sb-dfhqjdoydihajmjxniee-auth-pkce-code-verifier=test-verifier'
  }
}, (res) => {
  console.log('   Test request to callback:');
  console.log('   Status:', res.statusCode);
  console.log('   Redirect:', res.headers.location || 'None');
  
  if (res.statusCode === 307 && res.headers.location?.includes('auth-code-error')) {
    console.log('   ✅ Callback route is working (redirects to error as expected)');
    console.log('   ❌ But the cookie issue remains\n');
  }
}).on('error', (err) => {
  console.error('   Error:', err.message);
});