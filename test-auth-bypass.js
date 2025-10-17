#!/usr/bin/env node

/**
 * Test Script: Verify Authentication Bypass in Development Mode
 */

import puppeteer from 'puppeteer';

async function testAuthBypass() {
  console.log('🔍 Testing Authentication Bypass...\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set up console log capture
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Auth:') || text.includes('Supabase:')) {
        console.log(`  📝 Console: ${text}`);
      }
    });
    
    // Navigate to the enhanced test page
    console.log('📍 Navigating to: http://localhost:9999/test-react-query-enhanced');
    await page.goto('http://localhost:9999/test-react-query-enhanced', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the page loaded successfully
    const title = await page.title();
    console.log(`\n✅ Page Title: ${title}`);
    
    // Check for development mode notice
    const devModeNotice = await page.$eval('h2', el => el.textContent).catch(() => null);
    if (devModeNotice && devModeNotice.includes('Development Mode Active')) {
      console.log('✅ Development mode is active');
    }
    
    // Check for React Query sections
    const hasServices = await page.$('h2:has-text("Services")').catch(() => null);
    const hasAppointments = await page.$('h2:has-text("Appointments")').catch(() => null);
    
    if (hasServices || hasAppointments) {
      console.log('✅ React Query sections are rendered');
    }
    
    // Check for mock data toggle
    const mockDataToggle = await page.$('input[type="checkbox"]');
    if (mockDataToggle) {
      console.log('✅ Mock data toggle is available');
      
      // Try toggling mock data
      await mockDataToggle.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isChecked = await page.$eval('input[type="checkbox"]', el => el.checked);
      console.log(`✅ Mock data is ${isChecked ? 'enabled' : 'disabled'}`);
    }
    
    // Check for any error messages
    const errors = await page.$$eval('.text-red-600', elements => 
      elements.map(el => el.textContent)
    );
    
    if (errors.length === 0) {
      console.log('✅ No authentication errors detected');
    } else {
      console.log('⚠️ Errors found:', errors);
    }
    
    // Take a screenshot for reference
    await page.screenshot({ 
      path: 'test-auth-bypass-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: test-auth-bypass-screenshot.png');
    
    console.log('\n✨ Authentication bypass test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testAuthBypass().catch(console.error);