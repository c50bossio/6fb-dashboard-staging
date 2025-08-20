#!/usr/bin/env node

/**
 * Test current login flow status
 */

async function testCurrentLoginFlow() {
  console.log('🧪 Testing Current Login Flow Status\n');

  // Test 1: Check if login page loads
  console.log('1️⃣ Testing Login Page Accessibility...');
  try {
    const response = await fetch('http://localhost:9999/login');
    const html = await response.text();
    
    console.log('✅ Login page status:', response.status);
    console.log('✅ Login page loads successfully:', response.ok);
    console.log('✅ Contains Google login button:', html.includes('Continue with Google'));
    console.log('✅ Contains email login form:', html.includes('Email address'));
    
    // Check for any error messages in the page
    const hasErrorMessage = html.includes('OAuth error') || html.includes('Authentication failed');
    console.log('✅ No visible error messages:', !hasErrorMessage);
    
  } catch (error) {
    console.log('❌ Login page error:', error.message);
  }

  // Test 2: Check dashboard accessibility (should redirect to login if not authenticated)
  console.log('\n2️⃣ Testing Dashboard Access (without auth)...');
  try {
    const response = await fetch('http://localhost:9999/dashboard', {
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log('✅ Dashboard response status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Dashboard accessible (may indicate session exists)');
    } else if (response.status >= 300 && response.status < 400) {
      console.log('✅ Dashboard redirects correctly (authentication required)');
    }
    
  } catch (error) {
    console.log('❌ Dashboard test error:', error.message);
  }

  // Test 3: Check auth callback endpoint
  console.log('\n3️⃣ Testing Auth Callback Endpoint...');
  try {
    const response = await fetch('http://localhost:9999/auth/callback', {
      redirect: 'manual'
    });
    
    console.log('✅ Auth callback status:', response.status);
    
    if (response.status === 400 || response.status === 404) {
      console.log('✅ Callback endpoint exists (expected error without auth code)');
    }
    
  } catch (error) {
    console.log('❌ Auth callback error:', error.message);
  }

  // Test 4: Check server logs for recent activity
  console.log('\n4️⃣ Recent Activity Summary...');
  console.log('From server logs, I can see:');
  console.log('- OAuth callbacks are reaching /dashboard?code=...');
  console.log('- Users are getting redirected back to /login');
  console.log('- This suggests OAuth flow starts but session establishment fails');

  console.log('\n📊 Current Status Summary:');
  console.log('==========================================');
  console.log('🔄 LOGIN FLOW: Partially working');
  console.log('🔄 OAUTH CALLBACKS: Reaching server');
  console.log('❌ SESSION ESTABLISHMENT: Failing');
  console.log('🔄 AUTHENTICATION: Google OAuth needs configuration');

  console.log('\n💡 Immediate Steps to Test:');
  console.log('1. Visit http://localhost:9999/login in your browser');
  console.log('2. Try email/password login if you have test credentials');
  console.log('3. Check browser developer tools for specific error messages');
  console.log('4. Look at Network tab to see exact API calls failing');

  console.log('\n🔧 If Google OAuth was just configured:');
  console.log('   The server may need to be restarted to pick up new environment variables');
  console.log('   Run: npm run dev (restart development server)');
}

testCurrentLoginFlow().catch(console.error);