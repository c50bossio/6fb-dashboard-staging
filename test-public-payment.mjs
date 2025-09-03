import { chromium } from 'playwright';

console.log('🔍 Testing public payment page...\n');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture console messages
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') {
    console.log('❌ Console Error:', text);
  } else if (type === 'warning') {
    console.log('⚠️ Console Warning:', text);
  } else if (text.includes('Stripe') || text.includes('payment')) {
    console.log('💳 Stripe Log:', text);
  }
});

// Capture page errors
page.on('pageerror', error => {
  console.log('🔴 Page Error:', error.message);
});

try {
  console.log('📍 Navigating to test payment page...');
  const response = await page.goto('http://localhost:9999/test-payment', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  console.log('📊 Response Status:', response.status());
  
  // Wait for content to load
  await page.waitForTimeout(3000);
  
  // Check for FinancialSetupEnhanced component
  const hasComponent = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Connect Bank Account') || 
           text.includes('Stripe') || 
           text.includes('financial') ||
           text.includes('Financial');
  });
  
  console.log('💰 Has Financial Component:', hasComponent);
  
  // Check for buttons
  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map(btn => btn.innerText);
  });
  
  if (buttons.length > 0) {
    console.log('\n🔘 Buttons found:');
    buttons.forEach(btn => console.log('  -', btn));
  }
  
  // Get page content
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n📄 Page Content Preview:');
  console.log(bodyText.substring(0, 500));
  
  // Take screenshot
  await page.screenshot({ 
    path: 'test-payment-page.png',
    fullPage: true 
  });
  console.log('\n📸 Screenshot saved as test-payment-page.png');
  
  // Look for Stripe Connect button
  const stripeButton = await page.$('button:has-text("Connect Bank Account")');
  if (stripeButton) {
    console.log('\n✅ Stripe Connect button found!');
    const isDisabled = await stripeButton.isDisabled();
    console.log('Button disabled:', isDisabled);
  } else {
    console.log('\n⚠️ Stripe Connect button not found');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n🔍 Keeping browser open for inspection...');
console.log('Press Ctrl+C to exit');

// Keep browser open
await new Promise(() => {});
