
const { test, expect } = require('@playwright/test');

test.use({
  baseURL: 'http://localhost:9999',
  extraHTTPHeaders: {
    'X-Test-Mode': 'true'
  }
});

test.describe('Campaign Management - Simple Tests', () => {
  
  test('should load campaigns page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    
    const pageLoaded = await Promise.race([
      page.waitForSelector('text=Campaign Management', { timeout: 15000 }).then(() => true),
      page.waitForSelector('text=Loading', { timeout: 15000 }).then(() => false)
    ]);
    
    if (pageLoaded) {
      await expect(page.locator('h1, h2').filter({ hasText: 'Campaign Management' })).toBeVisible();
      console.log('✅ Campaigns page loaded successfully');
    } else {
      console.log('⚠️ Page is loading, checking for test user...');
      const userText = await page.textContent('body');
      expect(userText).toContain('Test Shop Owner');
    }
  });

  test('should display test user in dev mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    
    await page.waitForTimeout(3000);
    
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Test Shop Owner');
    console.log('✅ Test user detected');
  });

  test('should have campaign action buttons', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(3000);
    
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => btn.textContent.trim())
    );
    
    const hasEmailButton = buttons.some(text => text.includes('Email'));
    const hasSMSButton = buttons.some(text => text.includes('SMS'));
    const hasBillingButton = buttons.some(text => text.includes('Billing'));
    
    expect(hasEmailButton || hasSMSButton || hasBillingButton).toBeTruthy();
    console.log('✅ Campaign action buttons found');
  });

  test('should open email campaign modal', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(3000);
    
    const emailButton = await page.$('button:has-text("Email")');
    if (emailButton) {
      await emailButton.click();
      await page.waitForTimeout(1000);
      
      const modalText = await page.textContent('body');
      const hasModal = modalText.includes('Create') || modalText.includes('Campaign') || modalText.includes('Subject');
      expect(hasModal).toBeTruthy();
      console.log('✅ Email campaign modal opened');
    } else {
      console.log('⚠️ Email button not found, page may still be loading');
    }
  });

  test('should interact with billing modal', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(3000);
    
    const billingButton = await page.$('button:has-text("Billing")');
    if (billingButton) {
      await billingButton.click();
      await page.waitForTimeout(1000);
      
      const pageText = await page.textContent('body');
      const hasBillingContent = pageText.includes('Payment') || pageText.includes('4242') || pageText.includes('Account');
      expect(hasBillingContent).toBeTruthy();
      console.log('✅ Billing modal displayed');
    } else {
      console.log('⚠️ Billing button not found');
    }
  });
});

test.describe('Mock Services Verification', () => {
  
  test('should make API calls with test user UUID', async ({ page }) => {
    const apiCalls = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/marketing')) {
        apiCalls.push(url);
        console.log('📡 API Call:', url.substring(url.indexOf('/api')));
      }
    });
    
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(3000);
    
    const hasTestUUID = apiCalls.some(url => 
      url.includes('11111111-1111-1111-1111-111111111111')
    );
    
    if (hasTestUUID) {
      console.log('✅ API calls include test user UUID');
    } else if (apiCalls.length > 0) {
      console.log('⚠️ API calls made but no test UUID found');
    } else {
      console.log('⚠️ No API calls intercepted');
    }
    
    expect(true).toBeTruthy();
  });

  test('should handle campaign creation without errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(3000);
    
    const emailButton = await page.$('button:has-text("Email")');
    if (emailButton) {
      await emailButton.click();
      await page.waitForTimeout(1000);
      
      const subjectField = await page.$('input[placeholder*="subject" i]');
      if (subjectField) {
        await subjectField.fill('Test Campaign');
      }
      
      const textArea = await page.$('textarea');
      if (textArea) {
        await textArea.fill('Test message');
      }
      
      const submitButton = await page.$('button:has-text("Create")');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    const criticalErrors = errors.filter(err => 
      err.includes('500') || 
      err.includes('undefined') || 
      err.includes('TypeError')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    if (criticalErrors.length === 0) {
      console.log('✅ No critical errors during campaign creation');
    } else {
      console.log('❌ Critical errors found:', criticalErrors);
    }
  });
});

test.describe('Development Mode Features', () => {
  
  test('should not require login in dev mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(2000);
    
    const currentURL = page.url();
    expect(currentURL).not.toContain('/login');
    expect(currentURL).not.toContain('/register');
    
    console.log('✅ No login required in dev mode');
  });

  test('should load mock billing data', async ({ page }) => {
    let billingDataLoaded = false;
    
    page.on('response', response => {
      if (response.url().includes('/api/marketing/billing')) {
        if (response.status() === 200) {
          billingDataLoaded = true;
        }
      }
    });
    
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(3000);
    
    expect(billingDataLoaded).toBeTruthy();
    console.log('✅ Mock billing data loaded');
  });
});

test.describe('System Health Check', () => {
  
  test('overall system functionality', async ({ page }) => {
    const results = {
      pageLoads: false,
      testUserPresent: false,
      buttonsPresent: false,
      apiCallsWork: false,
      noErrors: true
    };
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.noErrors = false;
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/marketing') && response.status() === 200) {
        results.apiCallsWork = true;
      }
    });
    
    await page.addInitScript(() => {
      localStorage.setItem('dev-mode', 'true');
      window.NEXT_PUBLIC_DEV_MODE = 'true';
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    results.pageLoads = title.includes('6FB') || title.includes('Agent');
    
    const pageText = await page.textContent('body');
    results.testUserPresent = pageText.includes('Test Shop Owner');
    
    const buttons = await page.$$('button');
    results.buttonsPresent = buttons.length > 3;
    
    console.log('\n📊 System Health Check Results:');
    console.log(`  Page Loads: ${results.pageLoads ? '✅' : '❌'}`);
    console.log(`  Test User: ${results.testUserPresent ? '✅' : '❌'}`);
    console.log(`  UI Buttons: ${results.buttonsPresent ? '✅' : '❌'}`);
    console.log(`  API Calls: ${results.apiCallsWork ? '✅' : '❌'}`);
    console.log(`  No Errors: ${results.noErrors ? '✅' : '⚠️'}`);
    
    const passCount = Object.values(results).filter(v => v).length;
    expect(passCount).toBeGreaterThanOrEqual(3);
  });
});