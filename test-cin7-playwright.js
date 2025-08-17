/**
 * Use Playwright to test CIN7 API through browser automation
 * This will simulate what happens in the API Explorer
 */

const { chromium } = require('playwright');

const ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const API_KEY = '2fa20439-73b3-e86b-b7b2-1bd765e45743';

async function testWithPlaywright() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  });
  
  const page = await context.newPage();
  
  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('inventory.dearsystems.com')) {
      console.log('Request:', request.method(), request.url());
      console.log('Headers:', request.headers());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('inventory.dearsystems.com')) {
      console.log('Response:', response.status(), response.url());
    }
  });
  
  try {
    // First, try to navigate directly to the API endpoint
    console.log('\n=== Testing direct API call through browser ===');
    const response = await page.goto('https://inventory.dearsystems.com/ExternalApi/Me', {
      waitUntil: 'networkidle'
    });
    
    const content = await page.content();
    console.log('Status:', response.status());
    console.log('Content:', content.substring(0, 500));
    
    // Try to make an API call from within the page context
    console.log('\n=== Testing API call from page context ===');
    const apiResult = await page.evaluate(async ({ accountId, apiKey }) => {
      try {
        const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
          method: 'GET',
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text
        };
      } catch (error) {
        return { error: error.message };
      }
    }, { accountId: ACCOUNT_ID, apiKey: API_KEY });
    
    console.log('API Result:', JSON.stringify(apiResult, null, 2));
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'cin7-api-test.png', fullPage: true });
    console.log('Screenshot saved as cin7-api-test.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
console.log('='.repeat(60));
console.log('CIN7 PLAYWRIGHT BROWSER TEST');
console.log('Testing API through browser automation');
console.log('='.repeat(60));

testWithPlaywright().catch(console.error);