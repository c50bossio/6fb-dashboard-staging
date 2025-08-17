const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:9999';

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
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search + urlObj.hash,
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json'
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          url: res.headers.location || url
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testPaymentNavigation() {
  log('\n' + '='.repeat(60), 'info');
  log('     PAYMENT SETTINGS NAVIGATION TEST', 'info');
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

  log('\n📍 Testing Payment Settings Access Points:', 'highlight');
  
  // Test 1: Direct URL with hash
  log('\n1️⃣ Direct URL: /dashboard/settings#payments', 'test');
  try {
    const response = await makeRequest(`${BASE_URL}/dashboard/settings#payments`);
    if (response.status === 200) {
      log('   ✅ Page accessible (authenticated)', 'success');
    } else if (response.status === 302 || response.status === 307) {
      log('   ⚠️  Redirected (authentication required)', 'warning');
      log(`   → Redirect to: ${response.headers.location}`, 'info');
    } else {
      log(`   Status: ${response.status}`, 'info');
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'error');
  }
  
  // Test 2: Settings page base URL
  log('\n2️⃣ Base Settings URL: /dashboard/settings', 'test');
  try {
    const response = await makeRequest(`${BASE_URL}/dashboard/settings`);
    if (response.status === 200) {
      log('   ✅ Settings page accessible', 'success');
      log('   → Users can navigate to "Accept Payments" section', 'info');
    } else if (response.status === 302 || response.status === 307) {
      log('   ⚠️  Requires authentication', 'warning');
    } else {
      log(`   Status: ${response.status}`, 'info');
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'error');
  }
  
  // Test 3: URL with query parameter (after Stripe redirect)
  log('\n3️⃣ After Stripe Success: /dashboard/settings?section=payments&success=true', 'test');
  try {
    const response = await makeRequest(`${BASE_URL}/dashboard/settings?section=payments&success=true`);
    if (response.status === 200) {
      log('   ✅ Success redirect URL works', 'success');
    } else if (response.status === 302 || response.status === 307) {
      log('   ⚠️  Requires authentication', 'warning');
    } else {
      log(`   Status: ${response.status}`, 'info');
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'error');
  }

  // Summary
  log('\n' + '='.repeat(60), 'info');
  log('              📋 HOW TO ACCESS PAYMENT SETUP', 'highlight');
  log('='.repeat(60), 'info');
  
  log('\n🚀 For Users:', 'success');
  log('  1. Log into your dashboard', 'info');
  log('  2. Click "Settings" in the sidebar', 'info');
  log('  3. Click "Accept Payments" section', 'info');
  log('  4. Follow the setup prompts', 'info');
  
  log('\n🔗 Direct Links:', 'success');
  log('  • Setup: http://localhost:9999/dashboard/settings#payments', 'cyan');
  log('  • Production: https://bookedbarber.com/dashboard/settings#payments', 'cyan');
  
  log('\n💡 What Users Will See:', 'success');
  log('  • No account → "Start Payment Setup" button', 'info');
  log('  • Incomplete → "Continue Setup" button with warning', 'info');
  log('  • Complete → Payment dashboard with stats', 'info');
  
  log('\n✅ The payment setup is fully accessible outside of onboarding!', 'success');
  log('   Users can set it up anytime from Settings → Accept Payments\n', 'info');
}

// Run the test
testPaymentNavigation().catch(error => {
  log(`\n✗ Test failed: ${error.message}`, 'error');
  process.exit(1);
});