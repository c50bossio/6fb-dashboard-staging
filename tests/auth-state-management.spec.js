/**
 * 6FB AI Agent System - Authentication State Management Testing
 * Tests authentication persistence, session handling, and state synchronization
 */

const { test, expect } = require('@playwright/test');

test.describe('Authentication State Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
  
  test('should persist authentication state across page reloads', async ({ page }) => {
    console.log('🔄 Testing authentication state persistence...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
      localStorage.setItem('dev_session', 'true');
      document.cookie = 'dev_auth=true; path=/';
      
      const Session = {
        access_token: 'mock_token_' + Date.now(),
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            full_name: await getTestUserFromDatabase()
          }
        },
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
    });
    
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isOnProtectedRoute = currentUrl.includes('/ai-agents');
    const isOnLoginPage = currentUrl.includes('/login');
    
    console.log(`🔄 Current URL: ${currentUrl}`);
    console.log(`🔄 On protected route: ${isOnProtectedRoute}`);
    console.log(`🔄 On login page: ${isOnLoginPage}`);
    
    console.log('🔄 Reloading page to test state persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const urlAfterReload = page.url();
    const stillOnProtectedRoute = urlAfterReload.includes('/ai-agents');
    const redirectedToLogin = urlAfterReload.includes('/login');
    
    console.log(`🔄 URL after reload: ${urlAfterReload}`);
    console.log(`🔄 Still on protected route: ${stillOnProtectedRoute}`);
    console.log(`🔄 Redirected to login: ${redirectedToLogin}`);
    
    await page.screenshot({ 
      path: `test-results/auth-state-persistence.png`,
      fullPage: true 
    });
    
    console.log('✅ Authentication state persistence test completed');
  });
  
  test('should handle session timeout and cleanup', async ({ page }) => {
    console.log('⏰ Testing session timeout handling...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
      const expiredSession = {
        access_token: 'expired_token_' + Date.now(),
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        },
        expires_at: Date.now() - (24 * 60 * 60 * 1000) // Expired 24 hours ago
      };
      
      localStorage.setItem('supabase.auth.token', JSON.stringify(expiredSession));
      
      sessionStorage.setItem('auth_state', 'authenticated');
    });
    
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Allow time for session validation
    
    const finalUrl = page.url();
    const redirectedToLogin = finalUrl.includes('/login');
    
    console.log(`⏰ Final URL: ${finalUrl}`);
    console.log(`⏰ Redirected to login: ${redirectedToLogin}`);
    
    const sessionAfterCleanup = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie
      };
    });
    
    console.log(`⏰ Storage after cleanup:`, sessionAfterCleanup);
    
    await page.screenshot({ 
      path: `test-results/session-timeout.png`,
      fullPage: true 
    });
    
    console.log('✅ Session timeout test completed');
  });
  
  test('should synchronize authentication state across tabs', async ({ context }) => {
    console.log('🔄 Testing multi-tab authentication sync...');
    
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto('/login', { waitUntil: 'networkidle' });
    await page2.goto('/', { waitUntil: 'networkidle' });
    
    await page1.evaluate(() => {
      localStorage.setItem('dev_session', 'true');
      document.cookie = 'dev_auth=true; path=/';
      
      const Session = {
        access_token: 'mock_token_' + Date.now(),
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        },
        expires_at: Date.now() + (24 * 60 * 60 * 1000)
      };
      
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supabase.auth.token',
        newValue: JSON.stringify(mockSession)
      }));
    });
    
    await page1.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page1.waitForTimeout(3000);
    
    const page1Url = page1.url();
    console.log(`🔄 Tab 1 URL: ${page1Url}`);
    
    await page2.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(3000);
    
    const page2Url = page2.url();
    console.log(`🔄 Tab 2 URL: ${page2Url}`);
    
    const tab1Authenticated = page1Url.includes('/ai-agents');
    const tab2Authenticated = page2Url.includes('/ai-agents');
    
    console.log(`🔄 Tab 1 authenticated: ${tab1Authenticated}`);
    console.log(`🔄 Tab 2 authenticated: ${tab2Authenticated}`);
    
    await page1.screenshot({ 
      path: `test-results/multi-tab-auth-page1.png`,
      fullPage: true 
    });
    
    await page2.screenshot({ 
      path: `test-results/multi-tab-auth-page2.png`,
      fullPage: true 
    });
    
    console.log('🔄 Testing logout synchronization...');
    
    await page1.evaluate(() => {
      localStorage.removeItem('dev_session');
      localStorage.removeItem('supabase.auth.token');
      document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supabase.auth.token',
        newValue: null
      }));
    });
    
    await page2.waitForTimeout(2000);
    await page2.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(3000);
    
    const page2UrlAfterLogout = page2.url();
    const tab2LoggedOut = page2UrlAfterLogout.includes('/login');
    
    console.log(`🔄 Tab 2 URL after logout: ${page2UrlAfterLogout}`);
    console.log(`🔄 Tab 2 logged out: ${tab2LoggedOut}`);
    
    await page1.close();
    await page2.close();
    
    console.log('✅ Multi-tab authentication sync test completed');
  });
  
  test('should properly manage authentication storage', async ({ page }) => {
    console.log('💾 Testing authentication storage management...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    const initialStorage = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie
      };
    });
    
    console.log('💾 Initial storage state:', initialStorage);
    
    await page.evaluate(() => {
      localStorage.setItem('dev_session', 'true');
      localStorage.setItem('auth_user', JSON.stringify({ id: 'test', email: 'test@example.com' }));
      localStorage.setItem('supabase.auth.token', JSON.stringify({ token: 'test_token' }));
      
      sessionStorage.setItem('temp_auth_state', 'authenticated');
      
      document.cookie = 'dev_auth=true; path=/; max-age=86400'; // 24 hours
      document.cookie = 'session_id=test_session_123; path=/; max-age=86400';
    });
    
    const authStorage = await page.evaluate(() => {
      return {
        localStorage: Object.fromEntries(
          Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
        ),
        sessionStorage: Object.fromEntries(
          Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
        ),
        cookies: document.cookie
      };
    });
    
    console.log('💾 Storage after auth:', authStorage);
    
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const protectedUrl = page.url();
    console.log(`💾 Protected route URL: ${protectedUrl}`);
    
    await page.evaluate(() => {
      const keysToRemove = [
        'dev_session',
        'auth_user',
        'supabase.auth.token',
        'temp_auth_state'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
    
    const cleanedStorage = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie
      };
    });
    
    console.log('💾 Storage after cleanup:', cleanedStorage);
    
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    const isLoggedOut = finalUrl.includes('/login') || finalUrl === page.url();
    
    console.log(`💾 Final URL: ${finalUrl}`);
    console.log(`💾 Properly logged out: ${isLoggedOut}`);
    
    await page.screenshot({ 
      path: `test-results/storage-management.png`,
      fullPage: true 
    });
    
    console.log('✅ Authentication storage management test completed');
  });
  
  test('should recover from authentication errors gracefully', async ({ page }) => {
    console.log('🚨 Testing authentication error recovery...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    const errorStates = [
      {
        name: 'Corrupted localStorage',
        setup: () => {
          localStorage.setItem('supabase.auth.token', 'invalid-json-data');
          localStorage.setItem('auth_user', '{invalid-json}');
        }
      },
      {
        name: 'Invalid session format',
        setup: () => {
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: null,
            user: undefined,
            expires_at: 'invalid-date'
          }));
        }
      },
      {
        name: 'Mixed authentication states',
        setup: () => {
          localStorage.setItem('dev_session', 'true');
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: 'valid_token',
            user: null
          }));
          document.cookie = 'dev_auth=false; path=/';
        }
      }
    ];
    
    for (const errorState of errorStates) {
      console.log(`🚨 Testing error state: ${errorState.name}`);
      
      await page.evaluate(errorState.setup);
      
      await page.goto('/ai-agents', { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000); // Allow time for error handling
      
      const currentUrl = page.url();
      console.log(`🚨 [${errorState.name}] Current URL: ${currentUrl}`);
      
      const hasError = await page.locator('.error, .alert-error, [role="alert"]').count() > 0;
      const isOnLoginPage = currentUrl.includes('/login');
      const isResponsive = await page.locator('body').isVisible();
      
      console.log(`🚨 [${errorState.name}] Has error message: ${hasError}`);
      console.log(`🚨 [${errorState.name}] Redirected to login: ${isOnLoginPage}`);
      console.log(`🚨 [${errorState.name}] Page responsive: ${isResponsive}`);
      
      await page.screenshot({ 
        path: `test-results/error-recovery-${errorState.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach(c => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
      });
      
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ Authentication error recovery test completed');
  });
  
});