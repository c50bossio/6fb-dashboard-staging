import { chromium } from 'playwright';

console.log('🔍 Debugging Payment Setup Page...\n');

const browser = await chromium.launch({ 
  headless: false,
  devtools: true 
});

const context = await browser.newContext();
const page = await context.newPage();

// Enable console logging
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('❌ Console Error:', msg.text());
  }
});

// Listen for page errors
page.on('pageerror', error => {
  console.log('❌ Page Error:', error.message);
});

// Listen for request failures
page.on('requestfailed', request => {
  console.log('❌ Request Failed:', request.url(), request.failure().errorText);
});

try {
  console.log('📍 Navigating to payment setup page...');
  const response = await page.goto('http://localhost:9999/shop/settings/payment-setup', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  console.log('📊 Response Status:', response.status());
  
  // Wait a bit for any dynamic content
  await page.waitForTimeout(3000);
  
  // Check if page has any content
  const bodyContent = await page.evaluate(() => document.body.innerText);
  console.log('\n📄 Page Content Length:', bodyContent.length);
  
  if (bodyContent.length < 50) {
    console.log('⚠️  Page appears to be blank or nearly blank');
  }
  
  // Check for specific elements
  const hasFinancialSetup = await page.evaluate(() => {
    return document.querySelector('[class*="financial"]') !== null ||
           document.querySelector('[class*="Financial"]') !== null;
  });
  
  console.log('💰 Has Financial Setup Component:', hasFinancialSetup);
  
  // Check for error boundaries
  const hasErrorBoundary = await page.evaluate(() => {
    return document.querySelector('[class*="error"]') !== null ||
           document.querySelector('[class*="Error"]') !== null;
  });
  
  console.log('🚨 Has Error Elements:', hasErrorBoundary);
  
  // Get all console errors
  const errors = await page.evaluate(() => {
    const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.innerText || '';
      return text.includes('error') || text.includes('Error') || text.includes('failed');
    });
    return errorElements.map(el => el.innerText).slice(0, 5);
  });
  
  if (errors.length > 0) {
    console.log('\n🔴 Error Messages Found:');
    errors.forEach(err => console.log('  -', err.substring(0, 100)));
  }
  
  // Check React DevTools for component tree
  const hasReactRoot = await page.evaluate(() => {
    return document.getElementById('__next') !== null || 
           document.getElementById('root') !== null;
  });
  
  console.log('⚛️  Has React Root:', hasReactRoot);
  
  // Take a screenshot
  await page.screenshot({ 
    path: 'payment-page-debug.png',
    fullPage: true 
  });
  console.log('\n📸 Screenshot saved as payment-page-debug.png');
  
  // Get the page HTML structure
  const htmlStructure = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 'No main element found';
    
    const children = Array.from(main.children);
    return {
      childCount: children.length,
      childTypes: children.map(child => ({
        tag: child.tagName,
        classes: child.className,
        hasContent: (child.innerText || '').length > 0
      }))
    };
  });
  
  console.log('\n🏗️  HTML Structure:', JSON.stringify(htmlStructure, null, 2));
  
  // Check network requests
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      error: request.failure().errorText
    });
  });
  
  // Reload to catch any failed requests
  await page.reload();
  await page.waitForTimeout(2000);
  
  if (failedRequests.length > 0) {
    console.log('\n🔴 Failed Network Requests:');
    failedRequests.forEach(req => {
      console.log(`  - ${req.url}: ${req.error}`);
    });
  }
  
  // Check for console errors specifically
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Navigate again to capture console errors
  await page.goto('http://localhost:9999/shop/settings/payment-setup', {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForTimeout(2000);
  
  if (consoleErrors.length > 0) {
    console.log('\n🔴 JavaScript Console Errors:');
    consoleErrors.forEach(err => console.log('  -', err));
  }
  
} catch (error) {
  console.error('❌ Error during debugging:', error);
}

console.log('\n🔍 Keeping browser open for manual inspection...');
console.log('Press Ctrl+C to exit');

// Keep browser open
await new Promise(() => {});