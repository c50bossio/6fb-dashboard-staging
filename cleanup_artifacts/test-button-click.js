const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Testing Button Click Flow');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Enable ALL console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log('🔍 [' + type.toUpperCase() + ']:', text);
  });
  
  try {
    console.log('1️⃣ Navigating to subscription page...');
    await page.goto('http://localhost:9999/subscribe', { waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log('2️⃣ Waiting for pricing cards to load...');
    await page.waitForSelector('.pricing-card', { timeout: 10000 });
    
    console.log('3️⃣ Looking for shop plan button...');
    const shopButton = await page.$('[data-plan-name="shop"] button');
    
    if (shopButton) {
      console.log('4️⃣ Found shop button, clicking...');
      await shopButton.click();
      
      console.log('5️⃣ Waiting for any JavaScript responses...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check for error messages after click
      const errorMessage = await page.evaluate(() => {
        const errorEl = document.querySelector('.bg-red-50');
        return errorEl ? errorEl.textContent : null;
      });
      
      if (errorMessage) {
        console.log('❌ Error found:', errorMessage);
      } else {
        console.log('✅ No error message visible');
      }
      
      // Check button state
      const buttonState = await page.evaluate(() => {
        const btn = document.querySelector('[data-plan-name="shop"] button');
        return {
          text: btn ? btn.textContent : 'not found',
          disabled: btn ? btn.disabled : 'not found',
          loading: btn ? (btn.querySelector('.animate-spin') !== null) : 'not found'
        };
      });
      
      console.log('🔍 Button state after click:', buttonState);
      
    } else {
      console.log('❌ Could not find shop button');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('🔍 Keeping browser open for 20 seconds...');
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  await browser.close();
})();
