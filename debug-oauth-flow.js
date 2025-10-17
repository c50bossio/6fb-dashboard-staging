const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    devtools: true,  // Open DevTools automatically
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });

  // Log network requests
  page.on('request', request => {
    if (request.url().includes('auth') || request.url().includes('dashboard')) {
      console.log('Request:', request.method(), request.url());
    }
  });

  // Log network responses
  page.on('response', response => {
    if (response.url().includes('auth') || response.url().includes('dashboard')) {
      console.log('Response:', response.status(), response.url());
      // Log cookies on auth callback
      if (response.url().includes('callback')) {
        const headers = response.headers();
        if (headers['set-cookie']) {
          console.log('Set-Cookie headers:', headers['set-cookie']);
        }
      }
    }
  });

  try {
    console.log('\n=== Testing Dashboard Direct Access ===');
    
    // First try to access dashboard directly
    await page.goto('http://localhost:9999/dashboard', { waitUntil: 'networkidle0' });
    
    // Check if redirected to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('✓ Correctly redirected to login page');
      
      // Check for session cookies
      const cookies = await page.cookies();
      const sessionCookies = cookies.filter(c => c.name.includes('sb-'));
      console.log('Session cookies before login:', sessionCookies.length);
      sessionCookies.forEach(c => {
        console.log(`  - ${c.name}: ${c.value.substring(0, 20)}...`);
      });
      
      // Try to click Google login button
      console.log('\n=== Attempting Google OAuth ===');
      
      // Wait for login page to load
      await page.waitForSelector('button', { timeout: 5000 });
      
      // Find Google login button
      const googleButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const googleBtn = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('google') ||
          btn.textContent.toLowerCase().includes('continue with')
        );
        if (googleBtn) {
          console.log('Found Google button:', googleBtn.textContent);
          return true;
        }
        console.log('Available buttons:', buttons.map(b => b.textContent));
        return false;
      });
      
      if (googleButton) {
        console.log('✓ Found Google login button');
        
        // Monitor what happens when clicking
        const [response] = await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const googleBtn = buttons.find(btn => 
              btn.textContent.toLowerCase().includes('google') ||
              btn.textContent.toLowerCase().includes('continue with')
            );
            googleBtn.click();
          })
        ]);
        
        console.log('After Google click, redirected to:', page.url());
        
        // If we're on Google's OAuth page, we can't proceed automatically
        // But we can check what would happen after callback
        if (page.url().includes('accounts.google.com')) {
          console.log('✓ Successfully redirected to Google OAuth');
          console.log('Note: Manual login required to proceed with Google OAuth');
        }
      }
      
      // Instead, test the callback directly with a mock code
      console.log('\n=== Testing OAuth Callback Directly ===');
      
      // Navigate to callback with test code
      await page.goto('http://localhost:9999/api/auth/callback?code=test-code-123', { 
        waitUntil: 'networkidle0' 
      });
      
      console.log('After callback, URL:', page.url());
      
      // Check cookies after callback
      const cookiesAfterCallback = await page.cookies();
      const sessionCookiesAfter = cookiesAfterCallback.filter(c => c.name.includes('sb-'));
      console.log('Session cookies after callback:', sessionCookiesAfter.length);
      sessionCookiesAfter.forEach(c => {
        console.log(`  - ${c.name}: ${c.value.substring(0, 20)}...`);
      });
      
      // If redirected to login with error, check the error
      if (page.url().includes('error=')) {
        const urlParams = new URL(page.url()).searchParams;
        console.log('Error in URL:', urlParams.get('error'));
      }
      
      // Check if dashboard loads
      if (page.url().includes('/dashboard')) {
        console.log('\n=== Dashboard Loading Check ===');
        
        // Wait a bit to see if content loads
        await page.waitForTimeout(3000);
        
        // Check for loading indicators
        const hasLoading = await page.evaluate(() => {
          const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
          return loadingElements.length > 0;
        });
        
        console.log('Has loading indicators:', hasLoading);
        
        // Check for actual content
        const hasContent = await page.evaluate(() => {
          const body = document.body.textContent || '';
          return {
            hasText: body.trim().length > 100,
            textSample: body.substring(0, 200)
          };
        });
        
        console.log('Has content:', hasContent.hasText);
        if (hasContent.textSample) {
          console.log('Content sample:', hasContent.textSample);
        }
        
        // Check for any JavaScript errors
        const jsErrors = await page.evaluate(() => {
          return window.__errors || [];
        });
        
        if (jsErrors.length > 0) {
          console.log('JavaScript errors found:', jsErrors);
        }
      }
    } else if (currentUrl.includes('/dashboard')) {
      console.log('⚠️ Dashboard accessed without redirect - checking session');
      
      // This shouldn't happen if middleware is working
      const cookies = await page.cookies();
      const sessionCookies = cookies.filter(c => c.name.includes('sb-'));
      console.log('Session cookies found:', sessionCookies.length);
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Press Ctrl+C to close the browser');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error during test:', error);
  }
})();