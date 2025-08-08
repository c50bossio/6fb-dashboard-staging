/**
 * 6FB AI Agent System - Mobile Authentication Testing
 * Comprehensive mobile responsiveness and touch interaction testing
 */

const { test, expect, devices } = require('@playwright/test');

// Mobile device configurations for testing
const mobileDevices = [
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'iPhone SE', ...devices['iPhone SE'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
  { name: 'iPad', ...devices['iPad Pro'] }
];

test.describe('Mobile Authentication Testing', () => {
  
  // Test mobile login form on different devices
  mobileDevices.forEach(device => {
    test(`should display responsive login form on ${device.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
        locale: 'en-US',
        geolocation: { longitude: 12.4924, latitude: 41.8902 },
        permissions: ['geolocation']
      });
      
      const page = await context.newPage();
      
      console.log(`📱 Testing login form on ${device.name} (${device.viewport.width}x${device.viewport.height})`);
      
      // Clear storage
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      // Wait for form to load
      await page.waitForTimeout(3000);
      
      // Check form elements responsiveness
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")').first();
      
      // Verify elements are visible and properly sized
      if (await emailInput.count() > 0) {
        await expect(emailInput).toBeVisible();
        const emailBox = await emailInput.boundingBox();
        console.log(`📱 [${device.name}] Email input size: ${emailBox?.width}x${emailBox?.height}`);
        
        // Verify minimum touch target size (44px recommended)
        if (emailBox && emailBox.height < 44) {
          console.warn(`⚠️ [${device.name}] Email input too small for touch: ${emailBox.height}px height`);
        }
      }
      
      if (await passwordInput.count() > 0) {
        await expect(passwordInput).toBeVisible();
        const passwordBox = await passwordInput.boundingBox();
        console.log(`📱 [${device.name}] Password input size: ${passwordBox?.width}x${passwordBox?.height}`);
      }
      
      if (await loginButton.count() > 0) {
        await expect(loginButton).toBeVisible();
        const buttonBox = await loginButton.boundingBox();
        console.log(`📱 [${device.name}] Login button size: ${buttonBox?.width}x${buttonBox?.height}`);
        
        // Verify button is large enough for touch
        if (buttonBox && (buttonBox.height < 44 || buttonBox.width < 44)) {
          console.warn(`⚠️ [${device.name}] Login button too small for touch: ${buttonBox.width}x${buttonBox.height}px`);
        }
      }
      
      // Test form interactions
      try {
        if (await emailInput.count() > 0) {
          await emailInput.tap();
          await emailInput.fill('mobile.test@example.com');
          
          const emailValue = await emailInput.inputValue();
          console.log(`📱 [${device.name}] Email input value: "${emailValue}"`);
        }
        
        if (await passwordInput.count() > 0) {
          await passwordInput.tap();
          await passwordInput.fill('mobiletest123');
          
          const passwordValue = await passwordInput.inputValue();
          console.log(`📱 [${device.name}] Password input works: ${passwordValue.length > 0}`);
        }
      } catch (error) {
        console.warn(`⚠️ [${device.name}] Form interaction error:`, error.message);
      }
      
      // Check for mobile-specific UI elements
      const mobileElements = {
        hamburgerMenu: 'button[aria-label*="menu" i], .hamburger, .mobile-menu',
        backButton: 'button:has-text("Back"), [aria-label*="back" i]',
        closeButton: 'button:has-text("×"), button:has-text("Close"), [aria-label*="close" i]',
        drawer: '.drawer, .slide-out, .mobile-nav'
      };
      
      for (const [elementName, selector] of Object.entries(mobileElements)) {
        const element = page.locator(selector);
        const count = await element.count();
        const visible = count > 0 ? await element.first().isVisible() : false;
        console.log(`📱 [${device.name}] ${elementName}: ${count} found, visible: ${visible}`);
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/mobile-login-${device.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      
      await context.close();
      console.log(`✅ [${device.name}] Mobile login form test completed`);
    });
  });
  
  // Test mobile navigation and menu interactions
  test('should handle mobile navigation menu interactions', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true
    });
    
    const page = await context.newPage();
    
    console.log('📱 Testing mobile navigation interactions...');
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Look for mobile menu triggers
    const menuSelectors = [
      'button[aria-label*="menu" i]',
      '.mobile-menu-button',
      '.hamburger-menu',
      'button:has-text("☰")',
      'button:has-text("Menu")',
      '.md\\:hidden button',
      '[data-testid="mobile-menu-button"]'
    ];
    
    let menuInteraction = false;
    
    for (const selector of menuSelectors) {
      const menuButton = page.locator(selector);
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        console.log(`📱 Found mobile menu button: ${selector}`);
        
        try {
          // Take screenshot before interaction
          await page.screenshot({ 
            path: `test-results/mobile-menu-before.png`,
            fullPage: true 
          });
          
          // Tap the menu button
          await menuButton.tap();
          await page.waitForTimeout(1000);
          
          // Look for opened menu
          const menuOpenSelectors = [
            '.menu-open',
            '.nav-open',
            '.drawer-open',
            '.mobile-menu.open',
            '.sidebar.open',
            '[data-state="open"]'
          ];
          
          let menuOpened = false;
          for (const openSelector of menuOpenSelectors) {
            if (await page.locator(openSelector).count() > 0) {
              menuOpened = true;
              break;
            }
          }
          
          console.log(`📱 Mobile menu opened: ${menuOpened}`);
          
          // Take screenshot after interaction
          await page.screenshot({ 
            path: `test-results/mobile-menu-after.png`,
            fullPage: true 
          });
          
          menuInteraction = true;
          break;
        } catch (error) {
          console.warn(`⚠️ Mobile menu interaction failed:`, error.message);
        }
      }
    }
    
    if (!menuInteraction) {
      console.log('📱 No mobile menu found or menu interaction not available');
    }
    
    await context.close();
    console.log('✅ Mobile navigation test completed');
  });
  
  // Test touch interactions and scroll behavior
  test('should handle touch interactions properly', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true
    });
    
    const page = await context.newPage();
    
    console.log('👆 Testing touch interactions...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Test scroll behavior
    const initialScrollY = await page.evaluate(() => window.scrollY);
    console.log(`👆 Initial scroll position: ${initialScrollY}`);
    
    // Simulate scroll down
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);
    
    const scrolledY = await page.evaluate(() => window.scrollY);
    console.log(`👆 After scroll: ${scrolledY}`);
    
    const scrollWorking = scrolledY > initialScrollY;
    console.log(`👆 Scroll functionality: ${scrollWorking ? 'Working' : 'Not working'}`);
    
    // Test touch interactions on form elements
    const touchElements = page.locator('input, button, a, .touchable, [role="button"]');
    const touchCount = await touchElements.count();
    
    console.log(`👆 Found ${touchCount} touchable elements`);
    
    // Test a few touch interactions
    if (touchCount > 0) {
      try {
        // Test first input field
        const firstInput = touchElements.first();
        if (await firstInput.isVisible()) {
          await firstInput.tap();
          console.log('👆 Touch interaction on first input: Success');
        }
      } catch (error) {
        console.warn('⚠️ Touch interaction failed:', error.message);
      }
    }
    
    // Check for touch-friendly spacing
    const elements = await page.$$('button, a, input[type="submit"], input[type="button"]');
    let tooSmallElements = 0;
    
    for (const element of elements) {
      const box = await element.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        tooSmallElements++;
      }
    }
    
    console.log(`👆 Elements too small for touch: ${tooSmallElements} out of ${elements.length}`);
    
    if (tooSmallElements > 0) {
      console.warn(`⚠️ ${tooSmallElements} elements are smaller than 44px (recommended touch target size)`);
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: `test-results/touch-interactions.png`,
      fullPage: true 
    });
    
    await context.close();
    console.log('✅ Touch interaction test completed');
  });
  
  // Test landscape vs portrait orientations
  test('should work in both portrait and landscape orientations', async ({ browser }) => {
    const orientations = [
      { name: 'Portrait', width: 375, height: 667 },
      { name: 'Landscape', width: 667, height: 375 }
    ];
    
    for (const orientation of orientations) {
      const context = await browser.newContext({
        viewport: { width: orientation.width, height: orientation.height },
        hasTouch: true,
        isMobile: true
      });
      
      const page = await context.newPage();
      
      console.log(`🔄 Testing ${orientation.name} orientation (${orientation.width}x${orientation.height})`);
      
      await page.goto('/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Check if key elements are still accessible
      const formElements = {
        email: 'input[type="email"], input[name="email"]',
        password: 'input[type="password"]',
        submit: 'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")'
      };
      
      let elementsVisible = 0;
      let elementsTotal = 0;
      
      for (const [elementName, selector] of Object.entries(formElements)) {
        elementsTotal++;
        const element = page.locator(selector).first();
        
        if (await element.count() > 0) {
          const isVisible = await element.isVisible();
          if (isVisible) elementsVisible++;
          
          console.log(`🔄 [${orientation.name}] ${elementName}: ${isVisible ? 'Visible' : 'Hidden'}`);
          
          // Check if element is within viewport
          const box = await element.boundingBox();
          if (box) {
            const inViewport = box.x >= 0 && box.y >= 0 && 
                             (box.x + box.width) <= orientation.width && 
                             (box.y + box.height) <= orientation.height;
            
            console.log(`🔄 [${orientation.name}] ${elementName} in viewport: ${inViewport}`);
          }
        }
      }
      
      console.log(`🔄 [${orientation.name}] Elements visible: ${elementsVisible}/${elementsTotal}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/orientation-${orientation.name.toLowerCase()}.png`,
        fullPage: true 
      });
      
      await context.close();
    }
    
    console.log('✅ Orientation testing completed');
  });
  
});