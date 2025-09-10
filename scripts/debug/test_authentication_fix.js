#!/usr/bin/env node

/**
 * Comprehensive Authentication Testing Suite
 * Tests frontend authentication flow to identify 500 errors
 */

const puppeteer = require('puppeteer');

async function testAuthentication() {

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
        );
        results.errors.push({ type: 'console', message: msg.text() });
      }
    });

    page.on('response', response => {
      if (response.status() >= 500) {
        } Error:`, response.url());
        results.errors.push({ 
          type: 'network', 
          status: response.status(), 
          url: response.url() 
        });
      }
    });

    try {
      await page.goto('http://localhost:9999/login', { waitUntil: 'networkidle2' });
      
      results.tests.push({ name: 'Login Page Load', status: 'passed' });
      results.summary.passed++;
    } catch (error) {
      
      results.tests.push({ name: 'Login Page Load', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    try {
      await page.waitForSelector('#email', { timeout: 5000 });
      await page.waitForSelector('#password', { timeout: 5000 });
      await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      
      results.tests.push({ name: 'Login Form Elements', status: 'passed' });
      results.summary.passed++;
    } catch (error) {
      
      results.tests.push({ name: 'Login Form Elements', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    try {
      await page.type('#email', 'demo@barbershop.com');
      await page.type('#password', 'demo123');

      await page.click('button[type="submit"]');
      
      await Promise.race([
        page.waitForNavigation({ timeout: 10000 }),
        page.waitForSelector('.bg-red-50', { timeout: 10000 }) // Error message
      ]);
      
      const currentUrl = page.url();

      if (currentUrl.includes('/dashboard')) {
        
        results.tests.push({ name: 'Demo Login', status: 'passed' });
        results.summary.passed++;
      } else {
        const errorMessage = await page.$eval('.bg-red-50', el => el.textContent).catch(() => null);
        if (errorMessage) {
          
          results.tests.push({ name: 'Demo Login', status: 'failed', error: errorMessage });
        } else {
          
          results.tests.push({ name: 'Demo Login', status: 'failed', error: 'No redirect to dashboard' });
        }
        results.summary.failed++;
      }
    } catch (error) {
      
      results.tests.push({ name: 'Demo Login', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    try {
      await page.goto('http://localhost:9999/register', { waitUntil: 'networkidle2' });
      await page.waitForSelector('#firstName', { timeout: 5000 });
      
      results.tests.push({ name: 'Registration Page Load', status: 'passed' });
      results.summary.passed++;
    } catch (error) {
      
      results.tests.push({ name: 'Registration Page Load', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    try {
      const testEmail = `test${Date.now()}@example.com`;
      
      await page.type('#firstName', 'Test');
      await page.type('#lastName', 'User');
      await page.type('#email', testEmail);
      await page.type('#phone', '(555) 123-4567');
      await page.type('#password', 'TestPass123');
      await page.type('#confirmPassword', 'TestPass123');

      const nextButton = await page.$('button:contains("Next")') || await page.$('.btn-primary');
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(2000);
        
        results.tests.push({ name: 'Registration Form Step 1', status: 'passed' });
        results.summary.passed++;
      } else {
        
        results.tests.push({ name: 'Registration Form Step 1', status: 'failed', error: 'Next button not found' });
        results.summary.failed++;
      }
    } catch (error) {
      
      results.tests.push({ name: 'Registration Form Step 1', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

    try {
      await page.goto('http://localhost:9999/login', { waitUntil: 'networkidle2' });
      
      const googleButton = await page.$('button:contains("Sign in with Google")') || 
                          await page.$('svg[viewBox="0 0 24 24"]').then(svg => svg ? svg.closest('button') : null);
      
      if (googleButton) {
        
        results.tests.push({ name: 'Google OAuth Button', status: 'passed' });
        results.summary.passed++;
      } else {
        
        results.tests.push({ name: 'Google OAuth Button', status: 'failed', error: 'Button not found' });
        results.summary.failed++;
      }
    } catch (error) {
      
      results.tests.push({ name: 'Google OAuth Button', status: 'failed', error: error.message });
      results.summary.failed++;
    }
    results.summary.total++;

  } catch (error) {
    
    results.errors.push({ type: 'critical', message: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  );
  
  );

   * 100)}%`);

  if (results.errors.length > 0) {
    :`);
    results.errors.forEach((error, index) => {
      }] ${error.message || error.url}`);
      if (error.status) 
    });
  }

  results.tests.forEach((test, index) => {
    const status = test.status === 'passed' ? '✅' : '❌';
    
    if (test.error) 
  });

  );
  
  const criticalIssues = results.errors.filter(error => 
    error.type === 'network' && error.status >= 500 ||
    error.type === 'critical'
  );

  if (criticalIssues.length > 0) {
    
    criticalIssues.forEach((issue, index) => {
      `);
    });
    
  } else if (results.summary.failed === 0) {
    
  } else {
    
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