const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:9999';
const API_URL = `${BASE_URL}/api/payments`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const color = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    test: colors.cyan
  }[type] || colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test 1: Create Stripe Connected Account
async function testCreateAccount() {
  log('\n=== Test 1: Create Stripe Connected Account ===', 'test');
  
  try {
    const response = await makeRequest(`${API_URL}/connect/create`, {
      method: 'POST',
      body: {
        email: 'test@bookedbarber.com',
        country: 'US',
        type: 'express'
      }
    });

    if (response.status === 200) {
      log('✓ Account creation successful', 'success');
      log(`  Account ID: ${response.data.account_id}`, 'info');
      log(`  Demo mode: ${response.data.demo_mode || false}`, 'info');
      return response.data.account_id;
    } else {
      log(`✗ Account creation failed: ${response.status}`, 'error');
      log(`  Error: ${JSON.stringify(response.data)}`, 'error');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'error');
    return null;
  }
}

// Test 2: Generate Onboarding Link
async function testOnboardingLink(accountId) {
  log('\n=== Test 2: Generate Onboarding Link ===', 'test');
  
  if (!accountId) {
    log('⚠ Skipping: No account ID available', 'warning');
    return null;
  }

  try {
    const response = await makeRequest(`${API_URL}/connect/onboarding-link`, {
      method: 'POST',
      body: {
        account_id: accountId,
        refresh_url: `${BASE_URL}/dashboard/settings#payments`,
        return_url: `${BASE_URL}/dashboard/settings?section=payments&success=true`
      }
    });

    if (response.status === 200) {
      log('✓ Onboarding link generated', 'success');
      log(`  URL: ${response.data.url}`, 'info');
      log(`  Demo mode: ${response.data.demo_mode || false}`, 'info');
      
      // Check if URL is properly formatted for production
      if (response.data.url) {
        const url = new URL(response.data.url);
        if (url.hostname.includes('stripe.com')) {
          log('  ✓ Valid Stripe URL', 'success');
        } else if (response.data.demo_mode) {
          log('  ✓ Demo mode URL', 'info');
        } else {
          log('  ⚠ Unexpected URL format', 'warning');
        }
      }
      
      return response.data.url;
    } else {
      log(`✗ Onboarding link generation failed: ${response.status}`, 'error');
      log(`  Error: ${JSON.stringify(response.data)}`, 'error');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'error');
    return null;
  }
}

// Test 3: Check Payment Settings Endpoint
async function testPaymentSettings() {
  log('\n=== Test 3: Payment Settings Endpoint ===', 'test');
  
  try {
    const response = await makeRequest(`${API_URL}/settings`, {
      method: 'GET'
    });

    if (response.status === 200) {
      log('✓ Payment settings retrieved', 'success');
      log(`  Has accounts: ${response.data.accounts?.length > 0}`, 'info');
      return true;
    } else {
      log(`✗ Payment settings failed: ${response.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 4: Verify Redirect Handler
async function testRedirectHandler() {
  log('\n=== Test 4: Stripe Redirect Handler ===', 'test');
  
  try {
    // Test the stripe-redirect page exists
    const response = await makeRequest(`${BASE_URL}/stripe-redirect`, {
      method: 'GET'
    });

    if (response.status === 200) {
      log('✓ Stripe redirect page accessible', 'success');
      return true;
    } else {
      log(`⚠ Stripe redirect page returned: ${response.status}`, 'warning');
      return false;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 5: Check Environment Configuration
async function testEnvironmentConfig() {
  log('\n=== Test 5: Environment Configuration ===', 'test');
  
  try {
    // Create a test account to check if Stripe is configured
    const response = await makeRequest(`${API_URL}/connect/create`, {
      method: 'POST',
      body: {
        email: 'env-test@bookedbarber.com',
        country: 'US',
        type: 'express'
      }
    });

    if (response.data.demo_mode) {
      log('⚠ Running in DEMO mode (Stripe not configured)', 'warning');
      log('  To test with real Stripe:', 'info');
      log('  1. Ensure STRIPE_SECRET_KEY is set in .env.local', 'info');
      log('  2. Use live keys for production testing', 'info');
    } else if (response.data.account_id?.startsWith('acct_')) {
      log('✓ Stripe is properly configured', 'success');
      
      // Check if using test or live keys
      if (response.data.account_id.includes('test')) {
        log('  Mode: TEST (using test keys)', 'info');
      } else {
        log('  Mode: LIVE (using production keys)', 'info');
      }
    }
    
    return true;
  } catch (error) {
    log(`✗ Configuration check failed: ${error.message}`, 'error');
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), 'info');
  log('       STRIPE ONBOARDING FLOW TEST SUITE', 'info');
  log('='.repeat(60), 'info');
  
  let allTestsPassed = true;
  
  // Check if server is running
  try {
    await makeRequest(BASE_URL);
    log('\n✓ Server is running on ' + BASE_URL, 'success');
  } catch (error) {
    log('\n✗ Server is not running on ' + BASE_URL, 'error');
    log('  Please run: npm run dev', 'error');
    process.exit(1);
  }

  // Run tests
  const accountId = await testCreateAccount();
  const onboardingUrl = await testOnboardingLink(accountId);
  const settingsOk = await testPaymentSettings();
  const redirectOk = await testRedirectHandler();
  const configOk = await testEnvironmentConfig();

  // Summary
  log('\n' + '='.repeat(60), 'info');
  log('                    TEST SUMMARY', 'info');
  log('='.repeat(60), 'info');
  
  const results = [
    { name: 'Account Creation', passed: !!accountId },
    { name: 'Onboarding Link', passed: !!onboardingUrl },
    { name: 'Payment Settings', passed: settingsOk },
    { name: 'Redirect Handler', passed: redirectOk },
    { name: 'Environment Config', passed: configOk }
  ];

  results.forEach(result => {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? 'success' : 'error';
    log(`${icon} ${result.name}`, color);
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  log('\n' + '='.repeat(60), 'info');
  if (passed === total) {
    log(`ALL TESTS PASSED (${passed}/${total})`, 'success');
    log('\n✅ Stripe onboarding is properly configured!', 'success');
  } else {
    log(`TESTS PASSED: ${passed}/${total}`, passed > total/2 ? 'warning' : 'error');
    log('\n⚠️  Some tests failed. Check the logs above for details.', 'warning');
  }
  
  if (onboardingUrl && !onboardingUrl.includes('demo')) {
    log('\n📝 Next Steps:', 'info');
    log('1. Click the onboarding URL to test the Stripe flow', 'info');
    log('2. Complete the Stripe onboarding process', 'info');
    log('3. Verify redirect back to bookedbarber.com', 'info');
    log(`\nOnboarding URL: ${onboardingUrl}`, 'cyan');
  }
}

// Run the tests
runTests().catch(error => {
  log(`\n✗ Test suite failed: ${error.message}`, 'error');
  process.exit(1);
});