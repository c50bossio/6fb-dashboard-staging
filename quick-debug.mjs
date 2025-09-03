import { chromium } from 'playwright';

console.log('🔍 Quick Payment Page Debug...\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture console messages
const consoleMessages = [];
page.on('console', msg => {
  consoleMessages.push({
    type: msg.type(),
    text: msg.text()
  });
});

// Capture page errors
const pageErrors = [];
page.on('pageerror', error => {
  pageErrors.push(error.message);
});

try {
  console.log('📍 Navigating to payment setup page...');
  const response = await page.goto('http://localhost:9999/shop/settings/payment-setup', {
    waitUntil: 'domcontentloaded',
    timeout: 10000
  });
  
  console.log('📊 Response Status:', response.status());
  
  await page.waitForTimeout(2000);
  
  // Get page content
  const content = await page.content();
  const textContent = await page.evaluate(() => document.body?.innerText || '');
  
  console.log('📄 Page has content:', content.length > 1000 ? 'Yes' : 'No');
  console.log('📝 Visible text length:', textContent.length);
  
  // Check for React errors
  const reactError = await page.evaluate(() => {
    const errorElement = document.querySelector('#__next');
    if (!errorElement) return 'No Next.js root found';
    if (!errorElement.children.length) return 'Next.js root is empty';
    return null;
  });
  
  if (reactError) {
    console.log('⚛️ React Issue:', reactError);
  }
  
  // Look for FinancialSetupEnhanced component
  const hasComponent = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.some(s => s.innerText && s.innerText.includes('FinancialSetupEnhanced'));
  });
  
  console.log('💰 FinancialSetupEnhanced in page:', hasComponent);
  
  // Console messages
  if (consoleMessages.length > 0) {
    console.log('\n📋 Console Messages:');
    consoleMessages.forEach(msg => {
      if (msg.type === 'error') {
        console.log('  ❌', msg.text);
      } else if (msg.type === 'warning') {
        console.log('  ⚠️', msg.text);
      }
    });
  }
  
  // Page errors
  if (pageErrors.length > 0) {
    console.log('\n🔴 Page Errors:');
    pageErrors.forEach(err => console.log('  -', err));
  }
  
  // Check for auth/redirect
  const finalUrl = page.url();
  if (finalUrl !== 'http://localhost:9999/shop/settings/payment-setup') {
    console.log('\n🔄 Redirected to:', finalUrl);
  }
  
  // Screenshot
  await page.screenshot({ path: 'payment-page.png' });
  console.log('\n📸 Screenshot saved as payment-page.png');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await browser.close();
}