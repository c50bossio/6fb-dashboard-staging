import { chromium } from 'playwright';

console.log('🔍 Checking authentication flow...\n');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Enable request logging
page.on('response', response => {
  if (response.status() >= 300 && response.status() < 400) {
    console.log('🔄 Redirect:', response.url(), '→', response.headers()['location']);
  }
});

try {
  console.log('📍 Navigating to payment setup page...');
  await page.goto('http://localhost:9999/shop/settings/payment-setup', {
    waitUntil: 'networkidle'
  });
  
  const finalUrl = page.url();
  console.log('📍 Final URL:', finalUrl);
  
  // Check if redirected to login
  if (finalUrl.includes('login') || finalUrl.includes('sign-in')) {
    console.log('🔐 Redirected to login - authentication required');
  } else {
    console.log('✅ Page loaded without auth redirect');
  }
  
  // Get page title and any visible text
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  
  console.log('📄 Page Title:', title);
  console.log('📝 Page Text Preview:', bodyText.substring(0, 200));
  
  await page.screenshot({ path: 'auth-check.png' });
  console.log('📸 Screenshot saved as auth-check.png');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

await browser.close();
