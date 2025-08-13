// Comprehensive OAuth verification script
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyOAuthComplete() {
  console.log('🎯 COMPREHENSIVE OAUTH VERIFICATION');
  console.log('====================================\n');
  
  const checks = {
    pageAccessible: false,
    buttonReady: false,
    envVarsDeployed: false,
    callbackReady: false,
    supabaseConfigured: false
  };
  
  // 1. Check if register page is accessible
  try {
    const response = await fetch('https://bookedbarber.com/register');
    checks.pageAccessible = response.status === 200;
    console.log(`✅ Register page accessible: ${checks.pageAccessible ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ Register page not accessible:', error.message);
  }
  
  // 2. Check if OAuth callback endpoint is accessible
  try {
    const response = await fetch('https://bookedbarber.com/api/auth/callback', {
      method: 'GET',
      redirect: 'manual'
    });
    // Should redirect (302/307) when no code is present
    checks.callbackReady = response.status === 307 || response.status === 302;
    console.log(`✅ OAuth callback endpoint ready: ${checks.callbackReady ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ OAuth callback not ready:', error.message);
  }
  
  // 3. Check environment variables
  const hasGoogleClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  checks.envVarsDeployed = hasGoogleClientId && hasGoogleSecret && hasSupabaseUrl && hasSupabaseKey;
  
  console.log(`✅ Environment variables configured: ${checks.envVarsDeployed ? 'Yes' : 'No'}`);
  if (!checks.envVarsDeployed) {
    console.log('   Missing:', [
      !hasGoogleClientId && 'GOOGLE_CLIENT_ID',
      !hasGoogleSecret && 'GOOGLE_SECRET',
      !hasSupabaseUrl && 'SUPABASE_URL',
      !hasSupabaseKey && 'SUPABASE_KEY'
    ].filter(Boolean).join(', '));
  }
  
  // 4. Check subscription page
  try {
    const response = await fetch('https://bookedbarber.com/subscribe');
    const subscribePageReady = response.status === 200;
    console.log(`✅ Subscription page ready: ${subscribePageReady ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ Subscription page error:', error.message);
  }
  
  // Summary
  console.log('\n📊 OAUTH FLOW STATUS');
  console.log('====================');
  
  const allChecks = Object.values(checks).every(check => check);
  
  if (allChecks) {
    console.log('🎉 ALL CHECKS PASSED - OAuth is fully operational!');
    console.log('\n✅ Users can now:');
    console.log('1. Click "Sign up with Google" button');
    console.log('2. Authenticate with Google');
    console.log('3. Get redirected to subscription page');
    console.log('4. Select a plan and complete payment');
    console.log('5. Access the dashboard');
  } else {
    console.log('⚠️  Some checks failed - OAuth may have issues');
    console.log('\nFailed checks:');
    Object.entries(checks).forEach(([key, value]) => {
      if (!value) {
        console.log(`   ❌ ${key}`);
      }
    });
  }
  
  console.log('\n📝 MANUAL VERIFICATION NEEDED:');
  console.log('1. Supabase Auth settings must include bookedbarber.com redirect URLs');
  console.log('2. Google Cloud Console must have bookedbarber.com as authorized domain');
  console.log('3. Test actual OAuth flow by clicking the button on the live site');
}

verifyOAuthComplete().catch(console.error);