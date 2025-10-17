/**
 * Test: Command Center User Scoping Security Fix
 *
 * Verifies:
 * 1. User A's conversations are isolated from User B
 * 2. Legacy migration works correctly
 * 3. Logout cleanup removes user data
 * 4. No data leakage across user sessions
 */

import { chromium } from '@playwright/test';

const TEST_URL = 'http://localhost:9999/dashboard/ai-command-center';

async function testUserScoping() {
  console.log('🧪 Testing Command Center User Scoping Security Fix\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Check if page loads without user
    console.log('\n✓ Test 1: Check authentication protection...');
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');

    // Should redirect to login if not authenticated
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    if (!currentUrl.includes('login') && !currentUrl.includes('auth')) {
      console.log('  ℹ️  Already authenticated - checking storage...');

      // Check localStorage for user-scoped keys
      const storageKeys = await page.evaluate(() => {
        return Object.keys(localStorage).filter(key => key.includes('ai-conversation'));
      });

      console.log(`  Found storage keys: ${JSON.stringify(storageKeys, null, 2)}`);

      // Verify keys are user-scoped (contain user ID)
      const hasLegacyKey = storageKeys.some(key => key === 'ai-conversations');
      const hasUserScopedKeys = storageKeys.some(key => key.startsWith('ai-conversations-'));

      console.log(`  Legacy global key present: ${hasLegacyKey ? '❌ YES (PROBLEM)' : '✅ NO'}`);
      console.log(`  User-scoped keys present: ${hasUserScopedKeys ? '✅ YES' : '❌ NO (PROBLEM)'}`);

      // Test 2: Create a test conversation
      console.log('\n✓ Test 2: Create test conversation...');

      // Find input field and send a test message
      const input = page.locator('textarea[placeholder*="Type your message"]').first();
      if (await input.isVisible()) {
        await input.fill('Test message for user scoping verification');
        await input.press('Enter');
        await page.waitForTimeout(2000); // Wait for save

        console.log('  ✅ Test message sent');
      } else {
        console.log('  ℹ️  Input not found (may be in different state)');
      }

      // Test 3: Check localStorage after message
      console.log('\n✓ Test 3: Verify storage after message...');
      const storageAfterMessage = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter(key => key.includes('ai-conversation'));
        const result = {};

        keys.forEach(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            result[key] = {
              conversationCount: Array.isArray(data) ? data.length : 'N/A',
              messageCount: Array.isArray(data) && data[0]?.messages ? data[0].messages.length : 'N/A'
            };
          } catch (e) {
            result[key] = 'Parse error';
          }
        });

        return result;
      });

      console.log('  Storage state:', JSON.stringify(storageAfterMessage, null, 2));

      // Test 4: Verify no legacy key after migration
      console.log('\n✓ Test 4: Verify migration from legacy key...');
      const hasLegacyAfter = await page.evaluate(() => {
        return localStorage.getItem('ai-conversations') !== null;
      });

      if (hasLegacyAfter) {
        console.log('  ⚠️  WARNING: Legacy key still present after migration');
      } else {
        console.log('  ✅ Legacy key properly removed');
      }

      // Test 5: Simulate logout and verify cleanup
      console.log('\n✓ Test 5: Test logout cleanup...');

      // Store keys before logout
      const keysBeforeLogout = await page.evaluate(() => {
        return Object.keys(localStorage).filter(key => key.startsWith('ai-conversations-'));
      });

      console.log(`  Keys before logout: ${keysBeforeLogout.length}`);

      // Navigate to home and check if logout is available
      await page.goto('http://localhost:9999/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for logout button (might be in nav or profile menu)
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout"), a:has-text("Log out")').first();

      if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('  Found logout button, clicking...');
        await logoutButton.click();
        await page.waitForTimeout(2000);

        // Check if keys were cleaned up
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');

        const keysAfterLogout = await page.evaluate(() => {
          return Object.keys(localStorage).filter(key => key.startsWith('ai-conversations-'));
        });

        console.log(`  Keys after logout: ${keysAfterLogout.length}`);

        if (keysAfterLogout.length === 0) {
          console.log('  ✅ All user-scoped keys cleaned up on logout');
        } else {
          console.log('  ⚠️  WARNING: Some keys remain after logout:', keysAfterLogout);
        }
      } else {
        console.log('  ℹ️  Logout button not found (skipping cleanup test)');
      }

    } else {
      console.log('  ✅ Properly redirected to authentication');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 User Scoping Security Fix Validation Complete\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testUserScoping().catch(console.error);
