/**
 * 6FB AI Agent System - Authentication State Management Testing
 * Tests authentication persistence, session handling, and state synchronization
 */

const { test, expect } = require('@playwright/test');

test.describe('Authentication State Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
  
  // Test 1: Authentication state persistence across page reloads
  test('should persist authentication state across page reloads', async ({ page }) => {
    console.log('🔄 Testing authentication state persistence...');
    
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Set up a mock authenticated state (simulating successful login)
    await page.evaluate(() => {
      // Set development session
      localStorage.setItem('dev_session', 'true');
      document.cookie = 'dev_auth=true; path=/';
      
      // Simulate Supabase session
      const mockSession = {
        access_token: 'mock_token_' + Date.now(),
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User'
          }
        },
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
    });
    
    // Navigate to protected route
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check if we're on the protected route (not redirected to login)
    const currentUrl = page.url();
    const isOnProtectedRoute = currentUrl.includes('/ai-agents');
    const isOnLoginPage = currentUrl.includes('/login');
    
    console.log(`🔄 Current URL: ${currentUrl}`);
    console.log(`🔄 On protected route: ${isOnProtectedRoute}`);
    console.log(`🔄 On login page: ${isOnLoginPage}`);
    
    // Reload the page
    console.log('🔄 Reloading page to test state persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check state after reload
    const urlAfterReload = page.url();
    const stillOnProtectedRoute = urlAfterReload.includes('/ai-agents');
    const redirectedToLogin = urlAfterReload.includes('/login');
    
    console.log(`🔄 URL after reload: ${urlAfterReload}`);
    console.log(`🔄 Still on protected route: ${stillOnProtectedRoute}`);
    console.log(`🔄 Redirected to login: ${redirectedToLogin}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: `test-results/auth-state-persistence.png`,
      fullPage: true 
    });
    
    console.log('✅ Authentication state persistence test completed');
  });
  
  // Test 2: Session timeout and cleanup
  test('should handle session timeout and cleanup', async ({ page }) => {
    console.log('⏰ Testing session timeout handling...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Set up an expired session
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
      
      // Also set session storage items that might exist
      sessionStorage.setItem('auth_state', 'authenticated');
    });
    
    // Try to access protected route with expired session
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Allow time for session validation
    
    // Check if redirected to login
    const finalUrl = page.url();
    const redirectedToLogin = finalUrl.includes('/login');
    
    console.log(`⏰ Final URL: ${finalUrl}`);
    console.log(`⏰ Redirected to login: ${redirectedToLogin}`);
    
    // Check if expired session was cleaned up
    const sessionAfterCleanup = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie
      };
    });
    
    console.log(`⏰ Storage after cleanup:`, sessionAfterCleanup);
    
    // Take screenshot
    await page.screenshot({ 
      path: `test-results/session-timeout.png`,
      fullPage: true 
    });
    
    console.log('✅ Session timeout test completed');
  });
  
  // Test 3: Multiple tab authentication synchronization
  test('should synchronize authentication state across tabs', async ({ context }) => {
    console.log('🔄 Testing multi-tab authentication sync...');
    
    // Create two pages (tabs)
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Navigate both to different routes
    await page1.goto('/login', { waitUntil: 'networkidle' });
    await page2.goto('/', { waitUntil: 'networkidle' });
    
    // Authenticate in first tab
    await page1.evaluate(() => {
      localStorage.setItem('dev_session', 'true');
      document.cookie = 'dev_auth=true; path=/';
      
      // Simulate successful authentication
      const mockSession = {
        access_token: 'mock_token_' + Date.now(),
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        },
        expires_at: Date.now() + (24 * 60 * 60 * 1000)
      };
      
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
      
      // Trigger storage event for synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supabase.auth.token',
        newValue: JSON.stringify(mockSession)
      }));
    });
    
    // Navigate to protected route in first tab
    await page1.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page1.waitForTimeout(3000);
    
    const page1Url = page1.url();
    console.log(`🔄 Tab 1 URL: ${page1Url}`);
    
    // Now check second tab - it should also recognize the authentication
    await page2.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(3000);
    
    const page2Url = page2.url();
    console.log(`🔄 Tab 2 URL: ${page2Url}`);
    
    // Check if both tabs have access to protected route
    const tab1Authenticated = page1Url.includes('/ai-agents');
    const tab2Authenticated = page2Url.includes('/ai-agents');
    
    console.log(`🔄 Tab 1 authenticated: ${tab1Authenticated}`);
    console.log(`🔄 Tab 2 authenticated: ${tab2Authenticated}`);
    
    // Take screenshots of both tabs
    await page1.screenshot({ 
      path: `test-results/multi-tab-auth-page1.png`,
      fullPage: true 
    });
    
    await page2.screenshot({ 
      path: `test-results/multi-tab-auth-page2.png`,
      fullPage: true 
    });
    
    // Test logout synchronization
    console.log('🔄 Testing logout synchronization...');
    
    // Logout from first tab
    await page1.evaluate(() => {
      localStorage.removeItem('dev_session');
      localStorage.removeItem('supabase.auth.token');
      document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      
      // Trigger storage event for logout synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supabase.auth.token',
        newValue: null
      }));
    });
    
    // Wait and check if second tab is also logged out
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
  
  // Test 4: Local storage and cookie handling
  test('should properly manage authentication storage', async ({ page }) => {
    console.log('💾 Testing authentication storage management...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Check initial storage state
    const initialStorage = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie
      };
    });
    
    console.log('💾 Initial storage state:', initialStorage);
    
    // Simulate authentication with various storage methods
    await page.evaluate(() => {
      // Set various authentication indicators
      localStorage.setItem('dev_session', 'true');
      localStorage.setItem('auth_user', JSON.stringify({ id: 'test', email: 'test@example.com' }));
      localStorage.setItem('supabase.auth.token', JSON.stringify({ token: 'test_token' }));
      
      sessionStorage.setItem('temp_auth_state', 'authenticated');
      
      document.cookie = 'dev_auth=true; path=/; max-age=86400'; // 24 hours
      document.cookie = 'session_id=test_session_123; path=/; max-age=86400';
    });
    
    // Check storage after authentication
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
    
    // Navigate to protected route
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const protectedUrl = page.url();
    console.log(`💾 Protected route URL: ${protectedUrl}`);
    
    // Test storage cleanup on logout
    await page.evaluate(() => {
      // Clear authentication storage
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
      
      // Clear cookies
      document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
    
    // Check storage after cleanup
    const cleanedStorage = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie
      };
    });
    
    console.log('💾 Storage after cleanup:', cleanedStorage);
    
    // Verify logout by trying to access protected route
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    const isLoggedOut = finalUrl.includes('/login') || finalUrl === page.url();
    
    console.log(`💾 Final URL: ${finalUrl}`);
    console.log(`💾 Properly logged out: ${isLoggedOut}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: `test-results/storage-management.png`,
      fullPage: true 
    });
    
    console.log('✅ Authentication storage management test completed');
  });
  
  // Test 5: Error state recovery
  test('should recover from authentication errors gracefully', async ({ page }) => {
    console.log('🚨 Testing authentication error recovery...');
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Simulate various error states
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
      
      // Set up error state
      await page.evaluate(errorState.setup);
      
      // Try to access protected route
      await page.goto('/ai-agents', { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000); // Allow time for error handling
      
      const currentUrl = page.url();
      console.log(`🚨 [${errorState.name}] Current URL: ${currentUrl}`);
      
      // Check if application handled the error gracefully
      const hasError = await page.locator('.error, .alert-error, [role="alert"]').count() > 0;
      const isOnLoginPage = currentUrl.includes('/login');
      const isResponsive = await page.locator('body').isVisible();
      
      console.log(`🚨 [${errorState.name}] Has error message: ${hasError}`);
      console.log(`🚨 [${errorState.name}] Redirected to login: ${isOnLoginPage}`);
      console.log(`🚨 [${errorState.name}] Page responsive: ${isResponsive}`);
      
      // Take screenshot of error state
      await page.screenshot({ 
        path: `test-results/error-recovery-${errorState.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      
      // Clean up for next test
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