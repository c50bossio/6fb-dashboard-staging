import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode
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
        
        // Check for Supabase session in browser
        const supabaseSession = await page.evaluate(async () => {
          // Check localStorage for Supabase session
          const keys = Object.keys(localStorage);
          const supabaseKeys = keys.filter(k => k.includes('supabase'));
          const sessionData = {};
          supabaseKeys.forEach(k => {
            try {
              const value = localStorage.getItem(k);
              sessionData[k] = value ? JSON.parse(value) : null;
            } catch (e) {
              sessionData[k] = localStorage.getItem(k);
            }
          });
          return sessionData;
        });
        
        console.log('Supabase localStorage:', Object.keys(supabaseSession).length > 0 ? 'Found session data' : 'No session data');
        if (Object.keys(supabaseSession).length > 0) {
          Object.entries(supabaseSession).forEach(([key, value]) => {
            console.log(`  - ${key}:`, typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : value);
          });
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
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
})();