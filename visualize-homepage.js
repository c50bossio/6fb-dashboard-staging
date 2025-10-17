const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1440, height: 900 });
  
  await page.goto('http://localhost:9999');
  
  await page.waitForLoadState('networkidle');
  
  await page.screenshot({ 
    path: 'homepage-spacing-desktop.png', 
    fullPage: true 
  });
  
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ 
    path: 'homepage-spacing-mobile.png', 
    fullPage: true 
  });

  await page.waitForTimeout(30000);
  
  await browser.close();
})();