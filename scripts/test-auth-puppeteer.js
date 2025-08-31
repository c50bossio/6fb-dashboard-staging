#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:9999';
const SCREENSHOTS_DIR = join(__dirname, '..', 'test-results', 'puppeteer-screenshots');

// Test credentials
const TEST_EMAIL = 'demo@barbershop.com';
const TEST_PASSWORD = 'demo123';

// Ensure screenshots directory exists
async function ensureScreenshotsDir() {
  try {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating screenshots directory:', error);
  }
}

// Helper function to take screenshots
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = join(SCREENSHOTS_DIR, `${timestamp}-${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}`);
}

// Test 1: Check if login page loads correctly
async function testLoginPageLoad(browser) {
  console.log('\n🧪 Test 1: Login Page Load');
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await takeScreenshot(page, 'login-page-loaded');
    
    // Check for essential elements
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');
    const googleButton = await page.$$eval('button', buttons => 
      buttons.find(btn => btn.textContent.includes('Continue with Google')) ? true : false
    );
    
    if (emailInput && passwordInput && submitButton) {
      console.log('✅ Login page loaded with all required elements');
      
      // Check for Google OAuth button
      if (googleButton) {
        console.log('✅ Google OAuth button found');
      }
      
      return true;
    } else {
      console.log('❌ Missing required elements on login page');
      return false;
    }
  } catch (error) {
    console.log('❌ Error loading login page:', error.message);
    return false;
  } finally {
    await page.close();
  }
}

// Test 2: Test email/password authentication
async function testEmailPasswordAuth(browser) {
  console.log('\n🧪 Test 2: Email/Password Authentication');
  const page = await browser.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Browser console error:', msg.text());
    }
  });
  
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Fill in login form
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await takeScreenshot(page, 'login-form-filled');
    
    // Click submit and wait for navigation
    const submitButton = await page.$('button[type="submit"]');
    if (!submitButton) {
      console.log('❌ Submit button not found');
      return false;
    }
    
    // Set up response monitoring
    const authResponses = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/auth') || url.includes('supabase')) {
        authResponses.push({
          url: url,
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    await Promise.all([
      submitButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {})
    ]);
    
    await takeScreenshot(page, 'after-login-attempt');
    
    // Check authentication responses
    console.log(`📡 Authentication requests: ${authResponses.length}`);
    authResponses.forEach(resp => {
      if (resp.status >= 200 && resp.status < 300) {
        console.log(`✅ Auth request successful: ${resp.status} ${resp.url.substring(0, 50)}...`);
      } else {
        console.log(`❌ Auth request failed: ${resp.status} ${resp.statusText}`);
      }
    });
    
    // Check if redirected to dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard');
      await takeScreenshot(page, 'dashboard-after-login');
      return true;
    } else if (currentUrl !== `${BASE_URL}/login`) {
      console.log(`⚠️ Redirected to: ${currentUrl}`);
      return true;
    } else {
      // Check for error messages
      const errorElement = await page.$('.text-red-500, .text-red-600, [role="alert"]');
      if (errorElement) {
        const errorText = await errorElement.evaluate(el => el.textContent);
        console.log(`❌ Login error: ${errorText}`);
      } else {
        console.log('❌ Login failed - still on login page');
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Error during authentication test:', error.message);
    return false;
  } finally {
    await page.close();
  }
}

// Test 3: Test session persistence
async function testSessionPersistence(browser) {
  console.log('\n🧪 Test 3: Session Persistence');
  
  // First, log in
  const loginPage = await browser.newPage();
  try {
    await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await loginPage.type('input[type="email"]', TEST_EMAIL);
    await loginPage.type('input[type="password"]', TEST_PASSWORD);
    
    const submitButton = await loginPage.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Get cookies after login
    const cookies = await loginPage.cookies();
    const authCookies = cookies.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('session') || 
      c.name.includes('sb-')
    );
    
    console.log(`🍪 Auth cookies found: ${authCookies.length}`);
    
    // Close the page
    await loginPage.close();
    
    // Open a new page with the same browser context
    const newPage = await browser.newPage();
    
    // Navigate directly to dashboard
    await newPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    await takeScreenshot(newPage, 'session-persistence-check');
    
    // Check if we're still authenticated
    const currentUrl = newPage.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Session persisted - still on dashboard');
      return true;
    } else if (currentUrl.includes('/login')) {
      console.log('❌ Session not persisted - redirected to login');
      return false;
    } else {
      console.log(`⚠️ Unexpected redirect to: ${currentUrl}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing session persistence:', error.message);
    return false;
  } finally {
    await loginPage.close().catch(() => {});
  }
}

// Test 4: Test API health endpoints
async function testAPIHealth(browser) {
  console.log('\n🧪 Test 4: API Health Endpoints');
  const page = await browser.newPage();
  
  const endpoints = [
    '/api/health/supabase',
    '/api/health/ai',
    '/api/health/stripe',
    '/api/auth/session'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await page.goto(`${BASE_URL}${endpoint}`, { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      
      const status = response.status();
      const contentType = response.headers()['content-type'];
      
      if (status === 200) {
        console.log(`✅ ${endpoint} - Status: ${status}`);
        
        // Try to get JSON response
        if (contentType && contentType.includes('application/json')) {
          const content = await page.content();
          const bodyText = content.match(/<pre.*?>(.*?)<\/pre>/s);
          if (bodyText) {
            try {
              const json = JSON.parse(bodyText[1]);
              console.log(`   Response: ${JSON.stringify(json).substring(0, 100)}...`);
            } catch (e) {
              // Not JSON, that's okay
            }
          }
        }
        results.push(true);
      } else {
        console.log(`❌ ${endpoint} - Status: ${status}`);
        results.push(false);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
      results.push(false);
    }
  }
  
  await page.close();
  return results.every(r => r === true);
}

// Test 5: Test Google OAuth flow
async function testGoogleOAuth(browser) {
  console.log('\n🧪 Test 5: Google OAuth Flow');
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Find Google OAuth button
    const googleButtonExists = await page.$$eval('button', buttons => {
      const googleButton = buttons.find(btn => btn.textContent.includes('Continue with Google'));
      if (googleButton) {
        googleButton.click();
        return true;
      }
      return false;
    });
    
    if (googleButtonExists) {
      console.log('✅ Google OAuth button found and clicked');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = page.url();
      if (currentUrl.includes('accounts.google.com') || currentUrl.includes('/api/auth/google')) {
        console.log('✅ Redirected to Google OAuth or auth endpoint');
        await takeScreenshot(page, 'google-oauth-redirect');
        return true;
      } else {
        console.log(`⚠️ Unexpected redirect: ${currentUrl}`);
        return false;
      }
    }
    
    console.log('❌ Google OAuth button not found');
    return false;
  } catch (error) {
    console.log('❌ Error testing Google OAuth:', error.message);
    return false;
  } finally {
    await page.close();
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Authentication Tests with Puppeteer\n');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);
  
  await ensureScreenshotsDir();
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = {
    loginPageLoad: false,
    emailPasswordAuth: false,
    sessionPersistence: false,
    apiHealth: false,
    googleOAuth: false
  };
  
  try {
    // Run tests
    results.loginPageLoad = await testLoginPageLoad(browser);
    results.emailPasswordAuth = await testEmailPasswordAuth(browser);
    results.sessionPersistence = await testSessionPersistence(browser);
    results.apiHealth = await testAPIHealth(browser);
    results.googleOAuth = await testGoogleOAuth(browser);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    Object.entries(results).forEach(([test, result]) => {
      if (result) {
        console.log(`✅ ${test}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test}: FAILED`);
        failed++;
      }
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));
    
    // Exit code based on results
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Fatal error during tests:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});