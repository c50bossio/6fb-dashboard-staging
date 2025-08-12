#!/usr/bin/env node

/**
 * Quick Campaign & Billing System Test
 * Simple verification that the system is working correctly
 */

const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:9999';
const TEST_USER_UUID = '11111111-1111-1111-1111-111111111111';

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Test results
let passed = 0;
let failed = 0;

// Helper function to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testServerRunning() {
  console.log('\n📡 Testing server availability...');
  try {
    const response = await makeRequest('/api/health');
    if (response.status === 200) {
      console.log(`${colors.green}✅ Server is running on port 9999${colors.reset}`);
      passed++;
      return true;
    } else {
      console.log(`${colors.red}❌ Server returned status ${response.status}${colors.reset}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Server not responding: ${error.message}${colors.reset}`);
    failed++;
    return false;
  }
}

async function testBillingAPI() {
  console.log('\n💳 Testing billing API...');
  try {
    const response = await makeRequest(`/api/marketing/billing?user_id=${TEST_USER_UUID}`);
    const data = JSON.parse(response.data);
    
    if (response.status === 200 && data.success) {
      console.log(`${colors.green}✅ Billing API working${colors.reset}`);
      console.log(`   - Account: ${data.accounts?.[0]?.account_name || 'N/A'}`);
      console.log(`   - Spent: $${data.accounts?.[0]?.total_spent || 0}`);
      passed++;
      return true;
    } else {
      console.log(`${colors.red}❌ Billing API failed${colors.reset}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Billing API error: ${error.message}${colors.reset}`);
    failed++;
    return false;
  }
}

async function testCampaignsAPI() {
  console.log('\n📧 Testing campaigns API...');
  try {
    const response = await makeRequest(`/api/marketing/campaigns?user_id=${TEST_USER_UUID}&limit=10`);
    const data = JSON.parse(response.data);
    
    if (response.status === 200 && data.campaigns) {
      console.log(`${colors.green}✅ Campaigns API working${colors.reset}`);
      console.log(`   - Total campaigns: ${data.campaigns.length}`);
      console.log(`   - Email campaigns: ${data.stats?.email || 0}`);
      console.log(`   - SMS campaigns: ${data.stats?.sms || 0}`);
      passed++;
      return true;
    } else {
      console.log(`${colors.red}❌ Campaigns API failed${colors.reset}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Campaigns API error: ${error.message}${colors.reset}`);
    failed++;
    return false;
  }
}

async function testPaymentMethodsAPI() {
  console.log('\n💳 Testing payment methods API...');
  try {
    const accountId = `billing-${TEST_USER_UUID}`;
    const response = await makeRequest(`/api/marketing/billing/payment-methods?account_id=${accountId}`);
    const data = JSON.parse(response.data);
    
    if (response.status === 200 && data.success) {
      console.log(`${colors.green}✅ Payment methods API working${colors.reset}`);
      console.log(`   - Payment methods: ${data.paymentMethods?.length || 0}`);
      if (data.paymentMethods?.[0]) {
        console.log(`   - Default card: ${data.paymentMethods[0].card_brand} ****${data.paymentMethods[0].card_last4}`);
      }
      passed++;
      return true;
    } else {
      console.log(`${colors.red}❌ Payment methods API failed${colors.reset}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Payment methods API error: ${error.message}${colors.reset}`);
    failed++;
    return false;
  }
}

async function testBillingHistoryAPI() {
  console.log('\n📊 Testing billing history API...');
  try {
    const response = await makeRequest(`/api/marketing/billing/history?user_id=${TEST_USER_UUID}&limit=5`);
    const data = JSON.parse(response.data);
    
    if (response.status === 200 && data.success) {
      console.log(`${colors.green}✅ Billing history API working${colors.reset}`);
      console.log(`   - Transactions: ${data.transactions?.length || 0}`);
      console.log(`   - Total spent: $${data.stats?.totalAmount || 0}`);
      passed++;
      return true;
    } else {
      console.log(`${colors.red}❌ Billing history API failed${colors.reset}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Billing history API error: ${error.message}${colors.reset}`);
    failed++;
    return false;
  }
}

async function testCampaignCreation() {
  console.log('\n🚀 Testing campaign creation...');
  try {
    const campaignData = {
      type: 'email',
      name: 'Test Campaign - Quick Test',
      subject: 'Automated Test Campaign',
      content: 'This is a test campaign created by the quick test script.',
      target_audience: 'all',
      user_id: TEST_USER_UUID,
      billing_account: `billing-${TEST_USER_UUID}`
    };
    
    const response = await makeRequest('/api/marketing/campaigns', {
      method: 'POST',
      body: campaignData
    });
    
    const data = JSON.parse(response.data);
    
    if (response.status === 200 && data.success) {
      console.log(`${colors.green}✅ Campaign creation working${colors.reset}`);
      console.log(`   - Campaign ID: ${data.campaign?.id || 'N/A'}`);
      console.log(`   - Recipients: ${data.campaign?.recipients_count || 0}`);
      console.log(`   - Status: ${data.campaign?.status || 'unknown'}`);
      passed++;
      return true;
    } else {
      console.log(`${colors.red}❌ Campaign creation failed${colors.reset}`);
      if (data.error) console.log(`   - Error: ${data.error}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Campaign creation error: ${error.message}${colors.reset}`);
    failed++;
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('========================================');
  console.log('🧪 Campaign & Billing System Quick Test');
  console.log('========================================');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`🔐 Test User: ${TEST_USER_UUID}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run tests
  const serverOk = await testServerRunning();
  
  if (serverOk) {
    await testBillingAPI();
    await testCampaignsAPI();
    await testPaymentMethodsAPI();
    await testBillingHistoryAPI();
    await testCampaignCreation();
  }
  
  // Summary
  console.log('\n========================================');
  console.log('📊 Test Results Summary');
  console.log('========================================');
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  
  const total = passed + failed;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  console.log(`\n📈 Success Rate: ${percentage}%`);
  
  if (percentage >= 80) {
    console.log(`${colors.green}🎉 System is working well!${colors.reset}`);
  } else if (percentage >= 50) {
    console.log(`${colors.yellow}⚠️  System partially working${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ System has issues${colors.reset}`);
  }
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});