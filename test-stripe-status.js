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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, type = 'info') {
  const color = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    test: colors.cyan,
    highlight: colors.magenta
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

// Create a new test account with timestamp to ensure uniqueness
async function createFreshAccount() {
  const timestamp = Date.now();
  const email = `test-${timestamp}@bookedbarber.com`;
  
  log(`\n📧 Creating new account with email: ${email}`, 'info');
  
  try {
    const response = await makeRequest(`${API_URL}/connect/create`, {
      method: 'POST',
      body: {
        email: email,
        country: 'US',
        type: 'express'
      }
    });

    if (response.status === 200) {
      log('✓ New account created successfully', 'success');
      log(`  Account ID: ${response.data.account_id}`, 'highlight');
      return response.data;
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

// Generate fresh onboarding link
async function generateFreshOnboardingLink(accountId) {
  log(`\n🔗 Generating fresh onboarding link for account: ${accountId}`, 'info');
  
  try {
    const response = await makeRequest(`${API_URL}/connect/onboarding-link`, {
      method: 'POST',
      body: {
        account_id: accountId,
        refresh_url: `https://bookedbarber.com/dashboard/settings#payments`,
        return_url: `https://bookedbarber.com/dashboard/settings?section=payments&success=true`
      }
    });

    if (response.status === 200) {
      log('✓ Fresh onboarding link generated', 'success');
      return response.data;
    } else {
      log(`✗ Link generation failed: ${response.status}`, 'error');
      log(`  Error: ${JSON.stringify(response.data)}`, 'error');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'error');
    return null;
  }
}

// Main test
async function runTest() {
  log('\n' + '='.repeat(60), 'info');
  log('     STRIPE CONNECT FRESH ONBOARDING TEST', 'info');
  log('='.repeat(60), 'info');
  
  // Check if server is running
  try {
    await makeRequest(BASE_URL);
    log('\n✓ Server is running on ' + BASE_URL, 'success');
  } catch (error) {
    log('\n✗ Server is not running on ' + BASE_URL, 'error');
    log('  Please run: npm run dev', 'error');
    process.exit(1);
  }

  // Create a fresh account
  const accountData = await createFreshAccount();
  
  if (!accountData) {
    log('\n❌ Failed to create account. Check your Stripe configuration.', 'error');
    return;
  }

  // Generate fresh onboarding link
  const linkData = await generateFreshOnboardingLink(accountData.account_id);
  
  if (!linkData) {
    log('\n❌ Failed to generate onboarding link.', 'error');
    return;
  }

  // Display results
  log('\n' + '='.repeat(60), 'info');
  log('              🎉 SUCCESS - READY TO TEST!', 'success');
  log('='.repeat(60), 'info');
  
  log('\n📋 Account Details:', 'highlight');
  log(`  Account ID: ${accountData.account_id}`, 'info');
  log(`  Email: ${accountData.email || 'N/A'}`, 'info');
  
  log('\n🔗 Onboarding Details:', 'highlight');
  log(`  URL Valid Until: ${new Date(linkData.expires_at * 1000).toLocaleString()}`, 'info');
  
  log('\n' + '='.repeat(60), 'info');
  log('  FRESH ONBOARDING URL (Click to test):', 'highlight');
  log('='.repeat(60), 'info');
  log(`\n${linkData.url}\n`, 'cyan');
  
  log('📝 Expected Flow:', 'info');
  log('  1. Click the link above to start Stripe onboarding', 'info');
  log('  2. Complete the Stripe Connect setup process', 'info');
  log('  3. You will be redirected to:', 'info');
  log('     https://bookedbarber.com/dashboard/settings?section=payments&success=true', 'cyan');
  log('  4. If you skip or the link expires, you\'ll go to:', 'info');
  log('     https://bookedbarber.com/dashboard/settings#payments', 'cyan');
  
  log('\n⏱️  Note: This link expires in ~10 minutes', 'warning');
  log('💡 Tip: Use Stripe test data for form fields', 'info');
  log('   - Test routing: 110000000', 'info');
  log('   - Test account: 000123456789', 'info');
}

// Run the test
runTest().catch(error => {
  log(`\n✗ Test failed: ${error.message}`, 'error');
  process.exit(1);
});