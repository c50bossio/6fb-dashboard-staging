const puppeteer = require('puppeteer');

async function testRegistrationFix() {
  console.log('🚀 Testing registration fix with proper email...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    console.log(`📋 PAGE LOG [${msg.type()}]:`, msg.text());
  });
  
  // Enable error logging
  page.on('pageerror', err => {
    console.error('🚨 PAGE ERROR:', err.message);
  });
  
  try {
    console.log('📍 Navigating to registration page...');
    await page.goto('http://localhost:9999/register', { waitUntil: 'networkidle0' });
    
    console.log('✅ Page loaded, testing with REAL email address...\n');
    
    // Fill Step 1 with a real email
    await page.type('#firstName', 'John');
    await page.type('#lastName', 'Test');
    await page.type('#email', 'john.test.user@gmail.com'); // Real email domain
    await page.type('#phone', '(555) 123-4567');
    await page.type('#password', 'TestPassword123');
    await page.type('#confirmPassword', 'TestPassword123');
    
    console.log('📝 Step 1 filled with real email: john.test.user@gmail.com');
    
    // Move to Step 2
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
      const nextButton = buttons.find(btn => btn.textContent.trim() === 'Next');
      if (nextButton) nextButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fill Step 2
    await page.type('#businessName', 'Test Barbershop');
    await page.type('#businessAddress', '123 Main Street, Test City, TC 12345');
    await page.type('#businessPhone', '(555) 987-6543');
    
    console.log('📝 Step 2 filled');
    
    // Move to Step 3
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
      const nextButton = buttons.find(btn => btn.textContent.trim() === 'Next');
      if (nextButton) nextButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🎯 On Step 3, ready to test registration...');
    
    // Submit the form
    console.log('🖱️ Clicking Create account button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
      const createButton = buttons.find(btn => btn.textContent.includes('Create account'));
      if (createButton) {
        createButton.click();
      }
    });
    
    // Wait for response
    console.log('⏳ Waiting for registration response...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check final state
    const currentUrl = page.url();
    const hasErrors = await page.$$eval('.text-red-600, .text-red-500', 
      elements => elements.map(el => el.textContent.trim())
    );
    
    console.log(`\n📍 Final URL: ${currentUrl}`);
    console.log(`❌ Visible errors: ${hasErrors.length > 0 ? hasErrors : 'None'}`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('🎉 SUCCESS: User redirected to dashboard - registration worked!');
    } else if (currentUrl.includes('/confirm')) {
      console.log('✅ SUCCESS: User redirected to confirmation page - email verification required');
    } else if (hasErrors.length > 0) {
      console.log('✅ IMPROVEMENT: Error messages now displayed to user');
      console.log('📋 Error messages:', hasErrors);
    } else {
      console.log('⚠️ Still on registration page with no visible errors');
      await page.screenshot({ path: 'test-registration-final.png' });
    }
    
  } catch (error) {
    console.error('🚨 Error during registration testing:', error);
  } finally {
    console.log('\n🔍 Registration fix test complete.');
    await browser.close();
  }
}

// Run the test
testRegistrationFix().catch(console.error);