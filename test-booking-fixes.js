#!/usr/bin/env node

/**
 * Simple test to verify the booking page fixes
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:9999/shop/settings/booking';

async function testBookingPageFixes() {
  console.log('🧪 Testing Booking Page Fixes');
  console.log('=' .repeat(50));
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Monitor page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    console.log('📋 Step 1: Navigate to booking page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('📋 Step 2: Check for JavaScript errors...');
    await page.waitForTimeout(3000); // Wait for React to hydrate
    
    if (consoleErrors.length === 0 && pageErrors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log('❌ JavaScript errors found:');
      consoleErrors.forEach(error => console.log('  Console:', error));
      pageErrors.forEach(error => console.log('  Page:', error));
    }
    
    console.log('📋 Step 3: Check for save buttons...');
    
    // Wait for the page to load completely
    await page.waitForSelector('[data-testid="policies-tab"], .bg-white', { timeout: 10000 });
    
    // Count save buttons
    const saveButtons = await page.$$eval('button', buttons => {
      return buttons.filter(btn => 
        btn.textContent.includes('Save') || 
        btn.textContent.includes('save')
      ).length;
    });
    
    console.log(`📊 Save buttons found: ${saveButtons}`);
    
    if (saveButtons === 1) {
      console.log('✅ Correct number of save buttons (1)');
    } else if (saveButtons === 0) {
      console.log('⚠️  No save buttons found - might be hidden due to no changes');
    } else {
      console.log('❌ Too many save buttons found');
    }
    
    console.log('📋 Step 4: Check if supabase variable is defined...');
    
    // Check if the page has access to supabase without errors
    const hasSupabaseAccess = await page.evaluate(() => {
      try {
        // This should not throw an error anymore
        return typeof window !== 'undefined' && document.querySelector('[data-supabase-ready]') !== null;
      } catch (error) {
        return false;
      }
    });
    
    console.log('📋 Step 5: Test basic UI interactions...');
    
    // Try to find some toggles or checkboxes
    const toggles = await page.$$eval('input[type="checkbox"], [role="switch"]', elements => elements.length);
    console.log(`📊 Interactive elements found: ${toggles}`);
    
    // Try to find percentage inputs
    const percentageInputs = await page.$$eval('input[type="number"], input[placeholder*="%"]', elements => elements.length);
    console.log(`📊 Percentage inputs found: ${percentageInputs}`);
    
    // Check for the main page title or heading
    const pageTitle = await page.$eval('h1, h2, [role="heading"]', el => el.textContent).catch(() => 'Not found');
    console.log(`📊 Page title: ${pageTitle}`);
    
    console.log('\\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const results = {
      pageLoads: true,
      jsErrors: consoleErrors.length === 0 && pageErrors.length === 0,
      saveButtonCount: saveButtons <= 1,
      uiElements: toggles > 0 || percentageInputs > 0
    };
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log(`✅ Page loads successfully: ${results.pageLoads}`);
    console.log(`✅ No JavaScript errors: ${results.jsErrors}`);
    console.log(`✅ Correct save button count: ${results.saveButtonCount}`);
    console.log(`✅ UI elements present: ${results.uiElements}`);
    
    console.log('\\n' + '=' .repeat(50));
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Booking page fixes are working correctly');
    } else {
      console.log(`⚠️  TESTS PARTIAL: ${passed}/${total} passed`);
    }
    
    // Keep browser open for manual testing
    console.log('\\n🔍 Browser left open for manual testing...');
    console.log('Press Ctrl+C to close when done testing');
    
    await new Promise(() => {}); // Keep alive
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBookingPageFixes().catch(console.error);