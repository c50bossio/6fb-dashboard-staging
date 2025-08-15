#!/usr/bin/env node

/**
 * Comprehensive Authentication Testing Suite
 * Tests frontend authentication flow to identify 500 errors
 */

const puppeteer = require('puppeteer');

async function testAuthentication() {
  console.log('🔐 Starting Comprehensive Authentication Testing...\n');
  
  let browser;
  let results = {
    tests: [],
    errors: [],
    summary: { passed: 0, failed: 0, total: 0 }
  };

  try {
    browser = await puppeteer.launch({ 
      headless: false, 
      slowMo: 100,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
        results.errors.push({ type: 'console', message: msg.text() });
      }
    });

    page.on('response', response => {
      if (response.status() >= 500) {
        console.log(`❌ HTTP ${response.status()} Error:`, response.url());
        results.errors.push({ 
          type: 'network', 
          status: response.status(), 
          url: response.url() 
        });
      }
    });

    console.log('🧪 Test 1: Loading login page...');
    try {
      await page.goto('http://localhost:9999/login', { waitUntil: 'networkidle2' });
      console.log('✅ Login page loaded successfully');
      results.tests.push({ name: 'Login Page Load', status: 'passed' });
      results.summary.passed++;
    } catch (error) {
      console.log('❌ Failed to load login page:', error.message);
      results.tests.push({ name: 'Login Page Load', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    console.log('\n🧪 Test 2: Checking login form elements...');
    try {
      await page.waitForSelector('#email', { timeout: 5000 });
      await page.waitForSelector('#password', { timeout: 5000 });
      await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      console.log('✅ All login form elements found');
      results.tests.push({ name: 'Login Form Elements', status: 'passed' });
      results.summary.passed++;
    } catch (error) {
      console.log('❌ Login form elements missing:', error.message);
      results.tests.push({ name: 'Login Form Elements', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    console.log('\n🧪 Test 3: Testing login with demo credentials...');
    try {
      await page.type('#email', 'demo@barbershop.com');
      await page.type('#password', 'demo123');
      
      console.log('📝 Form filled, clicking submit...');
      await page.click('button[type="submit"]');
      
      await Promise.race([
        page.waitForNavigation({ timeout: 10000 }),
        page.waitForSelector('.bg-red-50', { timeout: 10000 }) // Error message
      ]);
      
      const currentUrl = page.url();
      console.log('🔗 Current URL after login attempt:', currentUrl);
      
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Login successful - redirected to dashboard');
        results.tests.push({ name: 'Demo Login', status: 'passed' });
        results.summary.passed++;
      } else {
        const errorMessage = await page.$eval('.bg-red-50', el => el.textContent).catch(() => null);
        if (errorMessage) {
          console.log('❌ Login failed with error:', errorMessage);
          results.tests.push({ name: 'Demo Login', status: 'failed', error: errorMessage });
        } else {
          console.log('❌ Login failed - no redirect to dashboard');
          results.tests.push({ name: 'Demo Login', status: 'failed', error: 'No redirect to dashboard' });
        }
        results.summary.failed++;
      }
    } catch (error) {
      console.log('❌ Login test failed:', error.message);
      results.tests.push({ name: 'Demo Login', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    console.log('\n🧪 Test 4: Testing registration page...');
    try {
      await page.goto('http://localhost:9999/register', { waitUntil: 'networkidle2' });
      await page.waitForSelector('#firstName', { timeout: 5000 });
      console.log('✅ Registration page loaded successfully');
      results.tests.push({ name: 'Registration Page Load', status: 'passed' });
      results.summary.passed++;
    } catch (error) {
      console.log('❌ Failed to load registration page:', error.message);
      results.tests.push({ name: 'Registration Page Load', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    console.log('\n🧪 Test 5: Testing registration form...');
    try {
      const testEmail = `test${Date.now()}@example.com`;
      
      await page.type('#firstName', 'Test');
      await page.type('#lastName', 'User');
      await page.type('#email', testEmail);
      await page.type('#phone', '(555) 123-4567');
      await page.type('#password', 'TestPass123');
      await page.type('#confirmPassword', 'TestPass123');
      
      console.log('📝 Registration form filled, proceeding to next step...');
      
      const nextButton = await page.$('button:contains("Next")') || await page.$('.btn-primary');
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Registration form step 1 completed');
        results.tests.push({ name: 'Registration Form Step 1', status: 'passed' });
        results.summary.passed++;
      } else {
        console.log('❌ Next button not found');
        results.tests.push({ name: 'Registration Form Step 1', status: 'failed', error: 'Next button not found' });
        results.summary.failed++;
      }
    } catch (error) {
      console.log('❌ Registration form test failed:', error.message);
      results.tests.push({ name: 'Registration Form Step 1', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    console.log('\n🧪 Test 6: Testing Google OAuth button...');
    try {
      await page.goto('http://localhost:9999/login', { waitUntil: 'networkidle2' });
      
      const googleButton = await page.$('button:contains("Sign in with Google")') || 
                          await page.$('svg[viewBox="0 0 24 24"]').then(svg => svg ? svg.closest('button') : null);
      
      if (googleButton) {
        console.log('✅ Google OAuth button found');
        results.tests.push({ name: 'Google OAuth Button', status: 'passed' });
        results.summary.passed++;
      } else {
        console.log('❌ Google OAuth button not found');
        results.tests.push({ name: 'Google OAuth Button', status: 'failed', error: 'Button not found' });
        results.summary.failed++;
      }
    } catch (error) {
      console.log('❌ Google OAuth test failed:', error.message);
      results.tests.push({ name: 'Google OAuth Button', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

  } catch (error) {
    console.log('❌ Critical test error:', error.message);
    results.errors.push({ type: 'critical', message: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 AUTHENTICATION TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Tests: ${results.summary.total}`);
  console.log(`   Passed: ${results.summary.passed} ✅`);
  console.log(`   Failed: ${results.summary.failed} ❌`);
  console.log(`   Success Rate: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);

  if (results.errors.length > 0) {
    console.log(`\n🚨 Errors Found (${results.errors.length}):`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. [${error.type.toUpperCase()}] ${error.message || error.url}`);
      if (error.status) console.log(`      Status: ${error.status}`);
    });
  }

  console.log(`\n📋 Detailed Test Results:`);
  results.tests.forEach((test, index) => {
    const status = test.status === 'passed' ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${test.name}`);
    if (test.error) console.log(`      Error: ${test.error}`);
  });

  console.log('\n' + '='.repeat(60));
  
  const criticalIssues = results.errors.filter(error => 
    error.type === 'network' && error.status >= 500 ||
    error.type === 'critical'
  );

  if (criticalIssues.length > 0) {
    console.log('\n🔥 CRITICAL ISSUES FOUND:');
    criticalIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.message || issue.url} (Status: ${issue.status || 'Unknown'})`);
    });
    console.log('\n✨ These are the authentication issues blocking production deployment.');
  } else if (results.summary.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Authentication system is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed, but no critical 500 errors found.');
  }

  return results;
}

if (require.main === module) {
  testAuthentication()
    .then(results => {
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuthentication };