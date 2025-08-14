const { test, expect } = require('@playwright/test');

test('Test Login Button Fix - Dynamic Import Issue', async ({ page }) => {
  console.log('🔥 Starting login button test...');
  
  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Wait a bit for dynamic imports to load
  await page.waitForTimeout(2000);
  
  // Take initial screenshot
  await page.screenshot({ path: 'login-initial-state.png', fullPage: true });
  
  // Check console logs for ultra debugging messages
  page.on('console', msg => {
    if (msg.text().includes('🔥 ULTRA DEBUG LOGIN PAGE:')) {
      console.log('ULTRA DEBUG LOG:', msg.text());
    }
  });
  
  // Get the login button
  const loginButton = page.locator('button[type="submit"]').first();
  
  // Check if button exists
  await expect(loginButton).toBeVisible();
  
  // Get button text
  const buttonText = await loginButton.textContent();
  console.log('🔥 Button text:', buttonText);
  
  // Check if button is disabled
  const isDisabled = await loginButton.isDisabled();
  console.log('🔥 Button disabled:', isDisabled);
  
  // Evaluate JavaScript to get debug values
  const debugInfo = await page.evaluate(() => {
    return {
      authLoading: window.authLoading,
      isLoading: window.isLoading,
      isFormDisabled: window.isFormDisabled,
      hasSignIn: typeof window.signIn === 'function',
      hasSignInWithGoogle: typeof window.signInWithGoogle === 'function'
    };
  });
  
  console.log('🔥 Debug Info:', debugInfo);
  
  // Test button interaction
  if (!isDisabled) {
    console.log('🔥 Testing button click...');
    await loginButton.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot after click
    await page.screenshot({ path: 'login-after-click.png', fullPage: true });
    
    const newButtonText = await loginButton.textContent();
    console.log('🔥 Button text after click:', newButtonText);
  }
  
  // Summary
  const isFixed = !isDisabled && buttonText?.includes('Sign in') && !buttonText?.includes('Signing in...');
  console.log('🔥 LOGIN FIX STATUS:', isFixed ? 'FIXED ✅' : 'STILL BROKEN ❌');
  
  // Assertions for the fix
  expect(buttonText).not.toContain('Signing in...');
  expect(isDisabled).toBe(false);
});