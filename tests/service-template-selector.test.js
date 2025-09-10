// Test script for ServiceTemplateSelector component
// Tests all the new UI/UX improvements

const { chromium } = require('playwright');

async function testServiceTemplateSelector() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to services page
    
    await page.goto('http://localhost:9999/shop/services');
    await page.waitForTimeout(3000);
    
    // Check if template selector is visible (should only show when no services exist)
    const templateSelector = await page.locator('[data-testid="service-template-selector"], .bg-gradient-to-r.from-olive-50.to-moss-50').first();
    const isSelectorVisible = await templateSelector.isVisible();
    
    if (!isSelectorVisible) {

      const serviceCards = await page.locator('[data-testid="service-card"], .bg-white.rounded-lg.shadow-sm').count();

      if (serviceCards > 0) {
        
      }
    } else {

      // Test 1: Collapsible header
      
      const header = await page.locator('button').filter({ hasText: 'Quick Start Templates' }).first();
      await header.click();
      await page.waitForTimeout(500);
      
      const isExpanded = await page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3').isVisible();

      // Expand again
      await header.click();
      await page.waitForTimeout(500);
      
      // Test 2: Tab navigation
      
      const tabs = ['Most Popular', 'Haircuts', 'Beard & Shave', 'Packages'];
      
      for (const tabName of tabs) {
        const tab = await page.locator('button').filter({ hasText: tabName }).first();
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(300);
          
        }
      }
      
      // Test 3: Chip-based service selection

      // Click on Popular tab first
      await page.locator('button').filter({ hasText: 'Most Popular' }).first().click();
      await page.waitForTimeout(300);
      
      // Try to click a service chip
      const serviceChips = await page.locator('button').filter({ hasText: 'Classic Haircut' });
      if (await serviceChips.count() > 0) {
        await serviceChips.first().click();
        await page.waitForTimeout(1000);

        // Check if it was added (chip should show checkmark)
        const addedChip = await page.locator('.bg-green-50').first();
        if (await addedChip.isVisible()) {
          ');
        }
      }
      
      // Test 4: Bulk selection mode
      
      const bulkButton = await page.locator('button').filter({ hasText: 'Select Multiple' }).first();
      if (await bulkButton.isVisible()) {
        await bulkButton.click();
        await page.waitForTimeout(300);

        // Select multiple services
        const checkboxChips = await page.locator('button:has(.w-4.h-4.rounded)');
        const chipCount = await checkboxChips.count();

        if (chipCount > 0) {
          // Select first 3 chips
          for (let i = 0; i < Math.min(3, chipCount); i++) {
            await checkboxChips.nth(i).click();
            await page.waitForTimeout(200);
          }

          // Click "Add Selected" button
          const addSelectedButton = await page.locator('button').filter({ hasText: 'Add Selected' }).first();
          if (await addSelectedButton.isVisible()) {
            await addSelectedButton.click();
            await page.waitForTimeout(1000);
            
          }
        }
      }
      
      // Test 5: Quick Start Pack
      
      const quickStartButton = await page.locator('button').filter({ hasText: 'Add All Popular' }).first();
      if (await quickStartButton.isVisible()) {
        
        // Don't actually click it to avoid adding too many services
      }
      
      // Test 6: Auto-collapse after adding services

      // Check current state
      const selectorAfterAdding = await page.locator('.bg-gradient-to-r.from-olive-50.to-moss-50').first();
      const expandedContent = await page.locator('.px-6.pb-4').first();
      const isStillExpanded = await expandedContent.isVisible();
      
      if (!isStillExpanded) {
        
      } else {
        ');
      }
    }
    
    // Test 7: Check space efficiency

    // Summary

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testServiceTemplateSelector().catch(console.error);