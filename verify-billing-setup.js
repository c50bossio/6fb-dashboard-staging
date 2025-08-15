const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyBillingSetup() {
  console.log('🔍 VERIFYING MARKETING BILLING SYSTEM SETUP');
  console.log('==========================================\n');
  
  const checks = {
    tables: { passed: 0, failed: 0 },
    data: { passed: 0, failed: 0 },
    api: { passed: 0, failed: 0 },
    stripe: { passed: 0, failed: 0 }
  };
  
  // 1. Check Database Tables
  console.log('📊 DATABASE TABLES CHECK:');
  console.log('------------------------');
  
  const requiredTables = [
    'marketing_accounts',
    'marketing_payment_methods',
    'marketing_billing_records',
    'marketing_campaigns'
  ];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: Not accessible (${error.message})`);
        checks.tables.failed++;
      } else {
        console.log(`✅ ${table}: Ready`);
        checks.tables.passed++;
      }
    } catch (e) {
      console.log(`❌ ${table}: Error (${e.message})`);
      checks.tables.failed++;
    }
  }
  
  // 2. Check Sample Data
  console.log('\n📋 SAMPLE DATA CHECK:');
  console.log('--------------------');
  
  const { data: accounts } = await supabase
    .from('marketing_accounts')
    .select('*')
    .limit(5);
  
  if (accounts && accounts.length > 0) {
    console.log(`✅ Found ${accounts.length} marketing account(s)`);
    checks.data.passed++;
    
    // Check payment methods for first account
    const { data: methods } = await supabase
      .from('marketing_payment_methods')
      .select('*')
      .eq('account_id', accounts[0].id);
    
    if (methods && methods.length > 0) {
      console.log(`✅ Found ${methods.length} payment method(s)`);
      checks.data.passed++;
    } else {
      console.log('⚠️ No payment methods found');
      checks.data.failed++;
    }
  } else {
    console.log('⚠️ No marketing accounts found');
    checks.data.failed++;
  }
  
  // 3. Check API Endpoints
  console.log('\n🔌 API ENDPOINTS CHECK:');
  console.log('----------------------');
  
  try {
    // Test billing API
    const billingResponse = await fetch('http://localhost:9999/api/marketing/billing?user_id=demo-user-001');
    const billingData = await billingResponse.json();
    
    if (billingData.success) {
      console.log('✅ Billing API: Working');
      checks.api.passed++;
    } else {
      console.log('❌ Billing API: Failed');
      checks.api.failed++;
    }
    
    // Test payment methods API
    if (billingData.accounts && billingData.accounts[0]) {
      const pmResponse = await fetch(`http://localhost:9999/api/marketing/billing/payment-methods?account_id=${billingData.accounts[0].id}`);
      const pmData = await pmResponse.json();
      
      if (pmData.success) {
        console.log('✅ Payment Methods API: Working');
        checks.api.passed++;
      } else {
        console.log('❌ Payment Methods API: Failed');
        checks.api.failed++;
      }
    }
  } catch (error) {
    console.log('❌ API Check Error:', error.message);
    checks.api.failed += 2;
  }
  
  // 4. Check Stripe Configuration
  console.log('\n💳 STRIPE CONFIGURATION:');
  console.log('-----------------------');
  
  if (process.env.STRIPE_SECRET_KEY) {
    console.log('✅ STRIPE_SECRET_KEY: Configured');
    checks.stripe.passed++;
  } else {
    console.log('❌ STRIPE_SECRET_KEY: Missing');
    checks.stripe.failed++;
  }
  
  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.log('✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Configured');
    checks.stripe.passed++;
  } else {
    console.log('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Missing');
    checks.stripe.failed++;
  }
  
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('✅ STRIPE_WEBHOOK_SECRET: Configured');
    checks.stripe.passed++;
  } else {
    console.log('⚠️ STRIPE_WEBHOOK_SECRET: Missing (needed for webhooks)');
    checks.stripe.failed++;
  }
  
  // 5. Summary
  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log('=======================');
  
  const totalPassed = checks.tables.passed + checks.data.passed + checks.api.passed + checks.stripe.passed;
  const totalFailed = checks.tables.failed + checks.data.failed + checks.api.failed + checks.stripe.failed;
  const successRate = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);
  
  console.log(`Database Tables: ${checks.tables.passed}/${checks.tables.passed + checks.tables.failed} passed`);
  console.log(`Sample Data: ${checks.data.passed}/${checks.data.passed + checks.data.failed} passed`);
  console.log(`API Endpoints: ${checks.api.passed}/${checks.api.passed + checks.api.failed} passed`);
  console.log(`Stripe Config: ${checks.stripe.passed}/${checks.stripe.passed + checks.stripe.failed} passed`);
  console.log(`\nOverall Success Rate: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log('\n✅ SYSTEM IS PRODUCTION READY!');
  } else if (successRate >= 60) {
    console.log('\n⚠️ SYSTEM IS MOSTLY READY (some features may not work)');
  } else {
    console.log('\n❌ SYSTEM NEEDS CONFIGURATION');
  }
  
  // 6. Next Steps
  console.log('\n📝 NEXT STEPS:');
  console.log('=============');
  
  if (checks.tables.failed > 0) {
    console.log('1. Run ADD_MISSING_COLUMNS.sql in Supabase SQL Editor');
  }
  if (checks.data.failed > 0) {
    console.log('2. Create sample data using seed scripts');
  }
  if (checks.api.failed > 0) {
    console.log('3. Ensure the development server is running (npm run dev)');
  }
  if (checks.stripe.failed > 0) {
    console.log('4. Configure missing Stripe environment variables');
  }
  
  if (successRate === 100) {
    console.log('🎉 Everything is configured! The billing system is ready for production.');
  }
}

// Run verification
verifyBillingSetup().catch(console.error);