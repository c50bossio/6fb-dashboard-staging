#!/usr/bin/env node

/**
 * Debug script to test inventory panel loading
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const BASE_URL = 'http://localhost:9999';

async function debugInventoryPanel() {
  console.log('🐛 Debugging Inventory Panel Loading');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console logs
  page.on('console', msg => {
    console.log(`📄 PAGE LOG [${msg.type()}]:`, msg.text());
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log('❌ PAGE ERROR:', error.message);
  });

  try {
    console.log('🌐 Navigating to dashboard with inventory mode...');
    await page.goto(BASE_URL + '/dashboard?mode=inventory');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    console.log('🔍 Checking for dashboard elements...');
    
    // Check for mode buttons
    const modeButtons = await page.locator('button').all();
    console.log(`📋 Found ${modeButtons.length} buttons on page`);
    
    for (let i = 0; i < Math.min(modeButtons.length, 15); i++) {
      try {
        const text = await modeButtons[i].textContent();
        const isVisible = await modeButtons[i].isVisible();
        console.log(`  - Button ${i + 1}: "${text}" (visible: ${isVisible})`);
        
        if (text && text.includes('Inventory')) {
          console.log('    ⭐ This is the inventory button!');
          
          // Check if it's already active
          const buttonClass = await modeButtons[i].getAttribute('class');
          console.log(`    🎨 Button classes: ${buttonClass}`);
          
          if (!buttonClass?.includes('active') && !buttonClass?.includes('bg-olive') && !buttonClass?.includes('bg-gold')) {
            console.log('    🖱️ Clicking inventory button...');
            await modeButtons[i].click();
            await page.waitForTimeout(2000);
          }
        }
      } catch (e) {
        console.log(`  - Button ${i + 1}: Error getting text - ${e.message}`);
      }
    }
    
    console.log('🔍 Looking for inventory panel content...');
    
    // Look for inventory-specific content
    const inventoryElements = [
      'text=Inventory & POS Management',
      'text=CIN7 Connected',
      'text=CIN7 Marketplace',
      'text=Total Items',
      '[data-testid="inventory-panel"]',
      '.inventory-panel'
    ];
    
    for (const selector of inventoryElements) {
      const element = page.locator(selector);
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`  📋 "${selector}": ${isVisible ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Check for any errors in console
    console.log('🎯 Taking debug screenshot...');
    await page.screenshot({ path: 'debug-inventory-panel.png', fullPage: true });
    
    // Check current URL
    console.log('📍 Current URL:', page.url());
    
    // Try to get page source for debugging
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    console.log('⏳ Waiting 5 more seconds to see any dynamic loading...');
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ path: 'debug-inventory-final.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the debug
debugInventoryPanel().then(() => {
  console.log('🏁 Inventory debug finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug runner failed:', error);
  process.exit(1);
});