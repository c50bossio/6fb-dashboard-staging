#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPageLoading() {
  console.log('🔍 DEBUGGING PAGE LOADING ISSUE\n');
  console.log('=' .repeat(50));
  
  // 1. Test all APIs that the page calls
  console.log('\n📡 TESTING API ENDPOINTS:');
  
  const testApis = [
    {
      name: 'Campaigns API (no user)',
      url: 'http://localhost:9999/api/marketing/campaigns?limit=50'
    },
    {
      name: 'Campaigns API (with demo user)',  
      url: 'http://localhost:9999/api/marketing/campaigns?user_id=demo-user-001&limit=50'
    },
    {
      name: 'Billing API (with demo user)',
      url: 'http://localhost:9999/api/marketing/billing?user_id=demo-user-001'
    }
  ];
  
  for (const api of testApis) {
    try {
      console.log(`\n   Testing: ${api.name}`);
      const response = await fetch(api.url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   📊 Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Status: ${response.status}`);
        console.log(`   🚨 Error: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.log(`   ❌ Connection failed: ${e.message}`);
    }
  }
  
  // 2. Check if frontend can reach backend
  console.log('\n🔌 TESTING FRONTEND → BACKEND CONNECTION:');
  
  try {
    const frontendResponse = await fetch('http://localhost:9999/api/health');
    if (frontendResponse.ok) {
      console.log('   ✅ Frontend health check: OK');
    } else {
      console.log('   ❌ Frontend health check failed');
    }
  } catch (e) {
    console.log('   ❌ Frontend not responding:', e.message);
  }
  
  try {
    const backendResponse = await fetch('http://localhost:8000/health');
    if (backendResponse.ok) {
      console.log('   ✅ Backend health check: OK');
    } else {
      console.log('   ❌ Backend health check failed');
    }
  } catch (e) {
    console.log('   ❌ Backend not responding:', e.message);
  }
  
  // 3. Check database connectivity
  console.log('\n💾 TESTING DATABASE ACCESS:');
  
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);
    
    if (!profileError) {
      console.log('   ✅ Database connection: Working');
      console.log(`   📊 Sample data: ${profiles?.length || 0} profile(s)`);
    } else {
      console.log('   ❌ Database error:', profileError.message);
    }
  } catch (e) {
    console.log('   ❌ Database connection failed:', e.message);
  }
  
  // 4. Check specific table that might be causing issues
  console.log('\n📋 TESTING CAMPAIGNS TABLE:');
  
  try {
    const { data: campaigns, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .limit(1);
    
    if (!campaignError) {
      console.log('   ✅ Campaigns table: Accessible');
      console.log(`   📊 Campaign records: ${campaigns?.length || 0}`);
    } else {
      console.log('   ❌ Campaigns table error:', campaignError.message);
      console.log('   💡 This might be causing the loading issue');
    }
  } catch (e) {
    console.log('   ❌ Campaigns table failed:', e.message);
  }
  
  // 5. Summary and recommendations
  console.log('\n' + '=' .repeat(50));
  console.log('💡 RECOMMENDATIONS:');
  console.log('\n1. If APIs are working but page is stuck loading:');
  console.log('   → Check browser console for JavaScript errors');
  console.log('   → Open DevTools → Console tab');
  console.log('\n2. If campaigns table is not accessible:');
  console.log('   → Tables exist but Supabase cache needs refresh');
  console.log('   → Wait 5-10 minutes or restart Supabase project');
  console.log('\n3. Authentication issues:');
  console.log('   → The page expects an authenticated user');
  console.log('   → Try creating a test user or using development mode');
  console.log('\n🔧 QUICK FIXES TO TRY:');
  console.log('1. Hard refresh: Cmd+Shift+R');
  console.log('2. Clear browser cache completely');
  console.log('3. Open in incognito/private window');
  console.log('4. Check if there are JavaScript errors in DevTools Console');
}

debugPageLoading().catch(console.error);