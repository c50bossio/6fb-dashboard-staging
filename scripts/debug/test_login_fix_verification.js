const { chromium } = require('playwright');

async function testLoginFix() {

  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.text().includes('Sign in successful') || 
        msg.text().includes('Tenant loaded') ||
        msg.text().includes('error')) {
      }: ${msg.text()}`);
    }
  });
  
  try {
    
    await page.goto('http://localhost:9999/login', { waitUntil: 'domcontentloaded' });
    
    await page.fill('input[name="email"]', 'demo@barbershop.com');
    await page.fill('input[name="password"]', 'demo123');

    const initialText = await page.locator('button[type="submit"]').textContent();

    await page.click('button[type="submit"]');
    
    let previousText = initialText;
    for (let i = 1; i <= 10; i++) {
      await page.waitForTimeout(1000);
      
      const currentText = await page.locator('button[type="submit"]').textContent();
      const currentUrl = page.url();
      
      if (currentText !== previousText || currentUrl.includes('/dashboard')) {
        }" | URL: ${currentUrl}`);
        previousText = currentText;
        
        if (currentUrl.includes('/dashboard')) {
          
          break;
        }
      }
    }
    
    const finalUrl = page.url();
    const finalButtonText = await page.locator('button[type="submit"]').textContent();

    );
    );
    );
    
    if (finalUrl.includes('/dashboard') && !finalButtonText.includes('Signing in')) {
      
    } else if (finalUrl.includes('/dashboard')) {
      
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testLoginFix().catch(console.error);