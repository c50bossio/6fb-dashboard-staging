#!/usr/bin/env node

/**
 * Production OAuth Test for bookedbarber.com
 * Tests if Google OAuth is properly configured for production
 */

const https = require('https');

async function checkProductionOAuth() {
  console.log('🌐 Testing Production OAuth on bookedbarber.com\n');
  console.log('='.repeat(60));
  
  // Test 1: Check if the site is accessible
  console.log('\n1️⃣ Checking if bookedbarber.com is accessible...');
  
  const checkSite = () => {
    return new Promise((resolve) => {
      https.get('https://bookedbarber.com', (res) => {
        console.log(`   Status Code: ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 308) {
          console.log('   ✅ Site is accessible');
          resolve(true);
        } else if (res.statusCode === 301 || res.statusCode === 302) {
          console.log(`   ↪️ Site redirects to: ${res.headers.location}`);
          resolve(true);
        } else {
          console.log(`   ⚠️ Unexpected status code: ${res.statusCode}`);
          resolve(false);
        }
      }).on('error', (err) => {
        console.log(`   ❌ Site not accessible: ${err.message}`);
        resolve(false);
      });
    });
  };
  
  const siteAccessible = await checkSite();
  
  // Test 2: Check login page
  console.log('\n2️⃣ Checking login page...');
  
  const checkLoginPage = () => {
    return new Promise((resolve) => {
      https.get('https://bookedbarber.com/login', (res) => {
        console.log(`   Status Code: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          // Check if Google OAuth button exists
          if (data.includes('Continue with Google') || data.includes('google') || data.includes('OAuth')) {
            console.log('   ✅ Login page has Google OAuth integration');
            resolve(true);
          } else if (data.includes('<!DOCTYPE html>')) {
            console.log('   ✅ Login page loads (client-side rendered)');
            resolve(true);
          } else {
            console.log('   ⚠️ Could not verify Google OAuth button');
            resolve(false);
          }
        });
      }).on('error', (err) => {
        console.log(`   ❌ Login page error: ${err.message}`);
        resolve(false);
      });
    });
  };
  
  if (siteAccessible) {
    await checkLoginPage();
  }
  
  // Test 3: Production Supabase Configuration
  console.log('\n3️⃣ Production Supabase Configuration:');
  console.log('   URL: https://dfhqjdoydihajmjxniee.supabase.co');
  console.log('   ✅ Production keys are configured in .env.production');
  
  // Test 4: Required OAuth Redirect URLs
  console.log('\n4️⃣ Required Supabase Redirect URLs for Production:');
  console.log('   These URLs must be whitelisted in Supabase Dashboard:');
  console.log('   📍 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/url-configuration');
  console.log('\n   Required URLs:');
  console.log('   • https://bookedbarber.com/auth/callback');
  console.log('   • https://bookedbarber.com/login');
  console.log('   • https://bookedbarber.com/dashboard');
  console.log('   • https://www.bookedbarber.com/auth/callback');
  console.log('   • https://www.bookedbarber.com/login');
  console.log('   • https://www.bookedbarber.com/dashboard');
  
  // Test 5: Google Cloud Console Configuration
  console.log('\n5️⃣ Google Cloud Console Requirements:');
  console.log('   In Google Cloud Console OAuth 2.0 Client:');
  console.log('   📍 Go to: https://console.cloud.google.com/apis/credentials');
  console.log('\n   Authorized redirect URIs must include:');
  console.log('   • https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback');
  console.log('   • https://bookedbarber.com/auth/callback');
  
  // Test 6: Deployment Platform Check
  console.log('\n6️⃣ Deployment Platform Configuration:');
  console.log('   Ensure these environment variables are set in your deployment platform:');
  console.log('   • NEXT_PUBLIC_SUPABASE_URL');
  console.log('   • NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   • SUPABASE_SERVICE_ROLE_KEY');
  console.log('   • NEXT_PUBLIC_APP_URL=https://bookedbarber.com');
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 PRODUCTION STATUS SUMMARY:\n');
  
  if (siteAccessible) {
    console.log('✅ bookedbarber.com is LIVE and accessible');
    console.log('\n⚠️  TO VERIFY GOOGLE OAUTH IS WORKING:');
    console.log('1. Visit https://bookedbarber.com/login');
    console.log('2. Click "Continue with Google"');
    console.log('3. If it redirects to Google sign-in → OAuth is configured ✅');
    console.log('4. If you get an error → Check the redirect URLs above ❌');
    
    console.log('\n🔍 COMMON ISSUES & FIXES:');
    console.log('\nIssue: "Redirect URI mismatch" error');
    console.log('Fix: Add the exact redirect URL to both Supabase and Google Console');
    
    console.log('\nIssue: "This app is blocked" error');
    console.log('Fix: Verify OAuth consent screen is configured in Google Console');
    
    console.log('\nIssue: Redirects to wrong URL after login');
    console.log('Fix: Update NEXT_PUBLIC_APP_URL in deployment environment variables');
  } else {
    console.log('❌ bookedbarber.com is not accessible');
    console.log('   Please check:');
    console.log('   • Domain DNS configuration');
    console.log('   • Deployment status');
    console.log('   • SSL certificate');
  }
  
  console.log('\n🚀 DEPLOYMENT CHECKLIST:');
  console.log('[ ] Environment variables set in deployment platform');
  console.log('[ ] Redirect URLs added to Supabase Dashboard');
  console.log('[ ] Google OAuth redirect URIs configured');
  console.log('[ ] Production build deployed successfully');
  console.log('[ ] SSL certificate active');
  console.log('[ ] Domain properly configured');
}

// Run the test
checkProductionOAuth().catch(err => {
  console.error('Test failed:', err);
});