#!/usr/bin/env node

/**
 * Stripe Subscription Page Testing Script
 * Tests the production subscription page at bookedbarber.com
 */

const https = require('https');
const fs = require('fs');

// Test configuration
const BASE_URL = 'https://bookedbarber.com';
const SUBSCRIPTION_PATH = '/subscribe';
const TEST_RESULTS_FILE = 'stripe-subscription-test-results.json';

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  url: `${BASE_URL}${SUBSCRIPTION_PATH}`,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Helper function to add test result
function addTestResult(name, status, details = '', expected = '', actual = '') {
  const result = {
    name,
    status,
    details,
    expected,
    actual,
    timestamp: new Date().toISOString()
  };
  testResults.tests.push(result);
  testResults.summary.total++;
  if (status === 'PASS') {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
  }
  
  const statusIcon = status === 'PASS' ? '✅' : '❌';
  console.log(`${statusIcon} ${name}: ${status}`);
  if (details) console.log(`   ${details}`);
  if (expected && actual) {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actual}`);
  }
}

// Function to fetch page content
function fetchPageContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          content: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Test functions
async function testPageAccessibility() {
  try {
    const response = await fetchPageContent(`${BASE_URL}${SUBSCRIPTION_PATH}`);
    
    if (response.statusCode === 200) {
      addTestResult(
        'Page Accessibility', 
        'PASS', 
        'Subscription page loads successfully',
        '200 OK',
        `${response.statusCode} ${response.statusCode === 200 ? 'OK' : 'Error'}`
      );
      return response.content;
    } else {
      addTestResult(
        'Page Accessibility', 
        'FAIL', 
        'Subscription page failed to load',
        '200 OK',
        `${response.statusCode} Error`
      );
      return null;
    }
  } catch (error) {
    addTestResult(
      'Page Accessibility', 
      'FAIL', 
      `Network error: ${error.message}`,
      'Successful HTTP response',
      `Error: ${error.message}`
    );
    return null;
  }
}

function testPricingTiers(content) {
  if (!content) {
    addTestResult('Pricing Tiers Visibility', 'FAIL', 'Cannot test - page content not available');
    return;
  }

  const expectedPrices = ['$35', '$99', '$249'];
  const expectedTiers = ['Individual Barber', 'Barbershop', 'Multi-Location'];
  
  let foundPrices = 0;
  let foundTiers = 0;
  
  expectedPrices.forEach(price => {
    if (content.includes(price)) foundPrices++;
  });
  
  expectedTiers.forEach(tier => {
    if (content.toLowerCase().includes(tier.toLowerCase())) foundTiers++;
  });
  
  if (foundPrices === expectedPrices.length && foundTiers === expectedTiers.length) {
    addTestResult(
      'Pricing Tiers Visibility',
      'PASS',
      'All expected pricing tiers found',
      'Individual Barber $35, Barbershop $99, Multi-Location $249',
      `Found ${foundPrices}/3 prices and ${foundTiers}/3 tiers`
    );
  } else {
    addTestResult(
      'Pricing Tiers Visibility',
      'FAIL',
      'Missing pricing information',
      'Individual Barber $35, Barbershop $99, Multi-Location $249',
      `Found ${foundPrices}/3 prices and ${foundTiers}/3 tiers`
    );
  }
}

function testBillingToggle(content) {
  if (!content) {
    addTestResult('Billing Toggle Presence', 'FAIL', 'Cannot test - page content not available');
    return;
  }

  const hasMonthly = content.toLowerCase().includes('monthly') || content.toLowerCase().includes('month');
  const hasYearly = content.toLowerCase().includes('yearly') || content.toLowerCase().includes('year');
  const hasSavings = content.toLowerCase().includes('save') || content.toLowerCase().includes('discount');
  
  if (hasMonthly && hasYearly) {
    addTestResult(
      'Billing Toggle Presence',
      'PASS',
      'Monthly/Yearly billing options found',
      'Both monthly and yearly options visible',
      `Monthly: ${hasMonthly}, Yearly: ${hasYearly}, Savings: ${hasSavings}`
    );
  } else {
    addTestResult(
      'Billing Toggle Presence',
      'FAIL',
      'Missing billing toggle options',
      'Both monthly and yearly options visible',
      `Monthly: ${hasMonthly}, Yearly: ${hasYearly}`
    );
  }
}

function testSubscriptionButtons(content) {
  if (!content) {
    addTestResult('Subscription Buttons Presence', 'FAIL', 'Cannot test - page content not available');
    return;
  }

  const buttonTexts = ['start', 'subscribe', 'get started', 'choose plan'];
  let buttonFound = false;
  
  buttonTexts.forEach(text => {
    if (content.toLowerCase().includes(text)) {
      buttonFound = true;
    }
  });
  
  if (buttonFound) {
    addTestResult(
      'Subscription Buttons Presence',
      'PASS',
      'Subscription buttons found',
      'Subscription/action buttons visible',
      'Action buttons detected in content'
    );
  } else {
    addTestResult(
      'Subscription Buttons Presence',
      'FAIL',
      'No subscription buttons found',
      'Subscription/action buttons visible',
      'No recognizable action buttons found'
    );
  }
}

function testStripeIntegration(content) {
  if (!content) {
    addTestResult('Stripe Security Messaging', 'FAIL', 'Cannot test - page content not available');
    return;
  }

  const hasStripe = content.toLowerCase().includes('stripe');
  const hasSecure = content.toLowerCase().includes('secure') || content.toLowerCase().includes('🔒');
  const hasPayment = content.toLowerCase().includes('payment');
  
  if (hasStripe && hasSecure && hasPayment) {
    addTestResult(
      'Stripe Security Messaging',
      'PASS',
      'Stripe security messaging found',
      'Stripe security and payment messaging visible',
      `Stripe: ${hasStripe}, Secure: ${hasSecure}, Payment: ${hasPayment}`
    );
  } else {
    addTestResult(
      'Stripe Security Messaging',
      'FAIL',
      'Missing Stripe security messaging',
      'Stripe security and payment messaging visible',
      `Stripe: ${hasStripe}, Secure: ${hasSecure}, Payment: ${hasPayment}`
    );
  }
}

// Main test execution
async function runStripeSubscriptionTests() {
  console.log('🧪 Starting Stripe Subscription Page Tests');
  console.log(`📍 Testing URL: ${BASE_URL}${SUBSCRIPTION_PATH}`);
  console.log('=' * 60);
  
  const content = await testPageAccessibility();
  
  if (content) {
    testPricingTiers(content);
    testBillingToggle(content);
    testSubscriptionButtons(content);
    testStripeIntegration(content);
  }
  
  console.log('=' * 60);
  console.log('📊 Test Summary');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.summary.passed / testResults.summary.total) * 100)}%`);
  
  // Save results to file
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
  console.log(`📁 Results saved to: ${TEST_RESULTS_FILE}`);
  
  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runStripeSubscriptionTests().catch(console.error);
}

module.exports = { runStripeSubscriptionTests };