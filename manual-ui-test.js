/**
 * Manual UI Testing Script for 6FB AI Agent System
 * Comprehensive Frontend Analysis
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runComprehensiveUITest() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--start-maximized', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  
  // Set viewport for desktop testing
  await page.setViewport({ width: 1920, height: 1080 });
  
  const results = {
    timestamp: new Date().toISOString(),
    platform: '6FB AI Agent System',
    baseUrl: 'http://localhost:9999',
    tests: []
  };

  try {
    console.log('🚀 Starting Comprehensive UI/UX Analysis...');
    
    // Test 1: Homepage Load and Initial Rendering
    console.log('📋 Test 1: Homepage Load Analysis');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle2' });
    
    // Take screenshot of homepage
    await page.screenshot({ path: '/Users/bossio/6FB AI Agent System/test-results/homepage-screenshot.png', fullPage: true });
    
    // Check for basic elements
    const title = await page.title();
    const bodyContent = await page.evaluate(() => document.body.innerText);
    
    // Check for navigation elements
    const navElements = await page.$$eval('nav, .nav, .navigation, [role="navigation"]', els => 
      els.map(el => ({ tagName: el.tagName, className: el.className, text: el.textContent.trim() }))
    );
    
    // Check for sidebar
    const sidebarElements = await page.$$eval('.sidebar, .side-nav, aside, [data-testid*="sidebar"]', els => 
      els.map(el => ({ tagName: el.tagName, className: el.className, visible: el.offsetParent !== null }))
    );
    
    // Check for main content area
    const mainContent = await page.$eval('main, .main, .content, [role="main"]', el => ({
      tagName: el.tagName,
      className: el.className,
      hasContent: el.children.length > 0
    })).catch(() => null);
    
    results.tests.push({
      name: 'Homepage Load',
      status: title ? 'PASS' : 'FAIL',
      details: {
        title,
        hasNavigation: navElements.length > 0,
        hasSidebar: sidebarElements.length > 0,
        hasMainContent: !!mainContent,
        navElements,
        sidebarElements,
        mainContent
      }
    });

    // Test 2: Responsive Design Check
    console.log('📱 Test 2: Responsive Design Analysis');
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.waitForTimeout(1000); // Allow layout to adjust
      
      await page.screenshot({ 
        path: `/Users/bossio/6FB AI Agent System/test-results/${viewport.name.toLowerCase()}-view.png`,
        fullPage: true 
      });
      
      // Check if navigation is responsive
      const navVisible = await page.evaluate(() => {
        const nav = document.querySelector('nav, .nav, .navigation, [role="navigation"]');
        return nav ? window.getComputedStyle(nav).display !== 'none' : false;
      });
      
      results.tests.push({
        name: `Responsive Design - ${viewport.name}`,
        status: navVisible ? 'PASS' : 'WARN',
        details: { viewport, navigationVisible: navVisible }
      });
    }

    // Reset to desktop view
    await page.setViewport({ width: 1920, height: 1080 });

    // Test 3: Navigation Functionality
    console.log('🧭 Test 3: Navigation Analysis');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle2' });
    
    // Find all clickable navigation elements
    const navLinks = await page.$$eval('a, button, [role="button"]', els => 
      els.map(el => ({
        text: el.textContent.trim(),
        href: el.href || el.getAttribute('href'),
        type: el.tagName.toLowerCase(),
        visible: el.offsetParent !== null
      })).filter(link => link.visible && link.text.length > 0)
    );
    
    results.tests.push({
      name: 'Navigation Links',
      status: navLinks.length > 0 ? 'PASS' : 'FAIL',
      details: { linkCount: navLinks.length, links: navLinks.slice(0, 10) } // First 10 links
    });

    // Test 4: Form Elements and Inputs
    console.log('📝 Test 4: Form Elements Analysis');
    const formElements = await page.$$eval('input, textarea, select, button[type="submit"]', els =>
      els.map(el => ({
        type: el.type || el.tagName.toLowerCase(),
        placeholder: el.placeholder,
        required: el.required,
        visible: el.offsetParent !== null,
        disabled: el.disabled
      }))
    );
    
    results.tests.push({
      name: 'Form Elements',
      status: formElements.length > 0 ? 'PASS' : 'WARN',
      details: { formElementCount: formElements.length, elements: formElements }
    });

    // Test 5: JavaScript Errors Check
    console.log('🐛 Test 5: JavaScript Errors Analysis');
    const jsErrors = [];
    
    page.on('pageerror', error => {
      jsErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push({
          message: msg.text(),
          type: 'console.error',
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Reload page to catch any errors
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000); // Wait for potential async errors
    
    results.tests.push({
      name: 'JavaScript Errors',
      status: jsErrors.length === 0 ? 'PASS' : 'FAIL',
      details: { errorCount: jsErrors.length, errors: jsErrors }
    });

    // Test 6: Performance Metrics
    console.log('⚡ Test 6: Performance Analysis');
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || null,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || null
      };
    });
    
    results.tests.push({
      name: 'Performance Metrics',
      status: performanceMetrics.domContentLoaded < 3000 ? 'PASS' : 'WARN',
      details: performanceMetrics
    });

    // Test 7: Accessibility Check
    console.log('♿ Test 7: Accessibility Analysis');
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for images without alt text
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt) {
          issues.push(`Image ${index + 1} missing alt text`);
        }
      });
      
      // Check for buttons without accessible names
      const buttons = document.querySelectorAll('button');
      buttons.forEach((btn, index) => {
        if (!btn.textContent.trim() && !btn.getAttribute('aria-label')) {
          issues.push(`Button ${index + 1} missing accessible name`);
        }
      });
      
      // Check for form inputs without labels
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
      inputs.forEach((input, index) => {
        const hasLabel = document.querySelector(`label[for="${input.id}"]`) || 
                        input.getAttribute('aria-label') || 
                        input.getAttribute('placeholder');
        if (!hasLabel) {
          issues.push(`Input ${index + 1} missing label`);
        }
      });
      
      return issues;
    });
    
    results.tests.push({
      name: 'Accessibility Check',
      status: accessibilityIssues.length === 0 ? 'PASS' : 'WARN',
      details: { issueCount: accessibilityIssues.length, issues: accessibilityIssues }
    });

    // Test 8: Barbershop-Specific Features
    console.log('✂️ Test 8: Barbershop Features Analysis');
    const barbershopFeatures = await page.evaluate(() => {
      const keywords = ['appointment', 'booking', 'barber', 'calendar', 'schedule', 'service', 'client', 'customer'];
      const pageText = document.body.textContent.toLowerCase();
      
      const foundFeatures = keywords.filter(keyword => pageText.includes(keyword));
      
      // Look for specific UI elements
      const calendarElement = document.querySelector('.calendar, #calendar, [data-testid*="calendar"]');
      const bookingButton = document.querySelector('[data-testid*="book"], .book-appointment, .booking-btn');
      const servicesList = document.querySelector('.services, .service-list, [data-testid*="service"]');
      
      return {
        foundKeywords: foundFeatures,
        hasCalendar: !!calendarElement,
        hasBookingButton: !!bookingButton,
        hasServicesList: !!servicesList
      };
    });
    
    results.tests.push({
      name: 'Barbershop Features',
      status: barbershopFeatures.foundKeywords.length > 2 ? 'PASS' : 'WARN',
      details: barbershopFeatures
    });

  } catch (error) {
    console.error('❌ Test execution error:', error);
    results.tests.push({
      name: 'Test Execution',
      status: 'FAIL',
      details: { error: error.message, stack: error.stack }
    });
  }

  // Generate comprehensive report
  const reportPath = '/Users/bossio/6FB AI Agent System/test-results/comprehensive-ui-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;
  const warnings = results.tests.filter(t => t.status === 'WARN').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📋 Total: ${results.tests.length}`);
  console.log(`\n📄 Full report: ${reportPath}`);
  
  await browser.close();
  return results;
}

// Run the test
runComprehensiveUITest().catch(console.error);