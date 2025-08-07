/**
 * Simplified UI Testing Script for 6FB AI Agent System
 * Cross-browser and UX Analysis
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function runSimplifiedUITest() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const results = {
    timestamp: new Date().toISOString(),
    platform: '6FB AI Agent System',
    baseUrl: 'http://localhost:9999',
    tests: [],
    screenshots: [],
    criticalIssues: [],
    recommendations: []
  };

  try {
    console.log('🚀 Starting 6FB AI Agent System UI/UX Analysis...');
    
    // Test 1: Landing Page Analysis
    console.log('📋 Test 1: Landing Page Load and Visual Elements');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle2' });
    
    // Capture screenshot
    await page.screenshot({ 
      path: '/Users/bossio/6FB AI Agent System/test-results/landing-page-full.png', 
      fullPage: true 
    });
    results.screenshots.push('landing-page-full.png');
    
    // Check page title and content
    const title = await page.title();
    const mainContent = await page.evaluate(() => {
      return {
        title: document.querySelector('h1, .title, [class*="title"]')?.textContent || 'No title found',
        subtitle: document.querySelector('h2, .subtitle, [class*="subtitle"]')?.textContent || 'No subtitle found',
        buttons: Array.from(document.querySelectorAll('button, .btn, [role="button"]')).map(btn => ({
          text: btn.textContent.trim(),
          type: btn.type || 'button',
          classes: btn.className
        })),
        links: Array.from(document.querySelectorAll('a')).map(link => ({
          text: link.textContent.trim(),
          href: link.href
        }))
      };
    });
    
    results.tests.push({
      name: 'Landing Page Elements',
      status: title.includes('6FB') ? 'PASS' : 'FAIL',
      details: { title, ...mainContent }
    });

    // Test 2: Button Interactions
    console.log('🔘 Test 2: Button and Link Interactions');
    
    // Test "Continue to Dashboard" link
    const dashboardLinkExists = await page.$('a[href*="dashboard"], a:contains("Dashboard")') !== null;
    
    if (dashboardLinkExists || await page.$('text=Continue to Dashboard')) {
      console.log('   Testing Dashboard link...');
      try {
        // Try to click dashboard link
        await page.click('text=Continue to Dashboard');
        await page.waitForLoadState?.('networkidle') || await page.waitForTimeout(2000);
        
        // Capture dashboard page
        await page.screenshot({ 
          path: '/Users/bossio/6FB AI Agent System/test-results/dashboard-page.png', 
          fullPage: true 
        });
        results.screenshots.push('dashboard-page.png');
        
        // Analyze dashboard content
        const dashboardContent = await page.evaluate(() => {
          return {
            url: window.location.pathname,
            hasNavigation: !!document.querySelector('nav, .nav, .navigation, [data-testid*="nav"]'),
            hasSidebar: !!document.querySelector('.sidebar, .side-nav, aside, [data-testid*="sidebar"]'),
            hasMainContent: !!document.querySelector('main, .main, .content, [role="main"]'),
            dashboardElements: Array.from(document.querySelectorAll('.dashboard, .widget, .card, [data-testid*="widget"]')).length,
            title: document.title
          };
        });
        
        results.tests.push({
          name: 'Dashboard Navigation',
          status: dashboardContent.hasMainContent ? 'PASS' : 'FAIL',
          details: dashboardContent
        });
        
      } catch (error) {
        results.tests.push({
          name: 'Dashboard Navigation',
          status: 'FAIL',
          details: { error: error.message }
        });
      }
    }

    // Test 3: Responsive Design Check
    console.log('📱 Test 3: Responsive Design');
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: `/Users/bossio/6FB AI Agent System/test-results/responsive-${viewport.name.toLowerCase()}.png`
      });
      results.screenshots.push(`responsive-${viewport.name.toLowerCase()}.png`);
      
      // Check responsive behavior
      const responsiveCheck = await page.evaluate(() => {
        const container = document.body;
        return {
          hasHorizontalScroll: container.scrollWidth > container.clientWidth,
          contentVisible: window.getComputedStyle(document.body).overflow !== 'hidden'
        };
      });
      
      results.tests.push({
        name: `Responsive - ${viewport.name}`,
        status: !responsiveCheck.hasHorizontalScroll ? 'PASS' : 'WARN',
        details: { viewport, ...responsiveCheck }
      });
    }

    // Reset to desktop
    await page.setViewport({ width: 1920, height: 1080 });

    // Test 4: Performance and Load Times
    console.log('⚡ Test 4: Performance Analysis');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle2' });
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (!navigation) return { error: 'No navigation timing available' };
      
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        totalLoadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    results.tests.push({
      name: 'Performance Metrics',
      status: performanceMetrics.totalLoadTime < 3000 ? 'PASS' : 'WARN',
      details: performanceMetrics
    });

    // Test 5: JavaScript Console Errors
    console.log('🐛 Test 5: Console Error Check');
    const consoleMessages = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    page.on('pageerror', error => {
      consoleMessages.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // Reload to catch any console errors
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    results.tests.push({
      name: 'Console Errors',
      status: consoleMessages.length === 0 ? 'PASS' : 'FAIL',
      details: { errorCount: consoleMessages.length, errors: consoleMessages }
    });

    // Test 6: Accessibility Quick Check
    console.log('♿ Test 6: Basic Accessibility');
    const accessibilityCheck = await page.evaluate(() => {
      const issues = [];
      
      // Check for missing alt text on images
      const imagesWithoutAlt = Array.from(document.querySelectorAll('img:not([alt])')).length;
      if (imagesWithoutAlt > 0) issues.push(`${imagesWithoutAlt} images missing alt text`);
      
      // Check for buttons without accessible names
      const unlabeledButtons = Array.from(document.querySelectorAll('button:not([aria-label]):not([title])')).filter(btn => !btn.textContent.trim()).length;
      if (unlabeledButtons > 0) issues.push(`${unlabeledButtons} buttons without accessible names`);
      
      // Check for proper heading structure
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const hasH1 = headings.some(h => h.tagName === 'H1');
      if (!hasH1) issues.push('No H1 heading found');
      
      return {
        issues,
        totalImages: document.querySelectorAll('img').length,
        totalButtons: document.querySelectorAll('button').length,
        totalHeadings: headings.length
      };
    });
    
    results.tests.push({
      name: 'Accessibility Check',
      status: accessibilityCheck.issues.length === 0 ? 'PASS' : 'WARN',
      details: accessibilityCheck
    });

    // Generate recommendations based on findings
    const failed = results.tests.filter(t => t.status === 'FAIL');
    const warnings = results.tests.filter(t => t.status === 'WARN');
    
    if (failed.length > 0) {
      results.criticalIssues = failed.map(test => `${test.name}: ${test.details.error || 'Failed validation'}`);
    }
    
    // Add specific recommendations
    results.recommendations = [
      'Add navigation menu to improve user wayfinding',
      'Consider adding a sidebar for dashboard functionality',
      'Implement proper error boundaries for better error handling',
      'Add loading states for better user experience',
      'Consider adding more barbershop-specific visual elements',
      'Implement comprehensive accessibility improvements'
    ];

  } catch (error) {
    console.error('❌ Test execution error:', error);
    results.tests.push({
      name: 'Test Suite Execution',
      status: 'FAIL',
      details: { error: error.message }
    });
  }

  // Save comprehensive report
  const reportPath = '/Users/bossio/6FB AI Agent System/test-results/ui-ux-analysis-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Generate summary
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;
  const warnings = results.tests.filter(t => t.status === 'WARN').length;
  
  console.log('\n📊 6FB AI Agent System - UI/UX Test Summary:');
  console.log('================================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📋 Total Tests: ${results.tests.length}`);
  console.log(`📸 Screenshots: ${results.screenshots.length}`);
  console.log(`\n🔍 Critical Issues: ${results.criticalIssues.length}`);
  if (results.criticalIssues.length > 0) {
    results.criticalIssues.forEach(issue => console.log(`   • ${issue}`));
  }
  console.log(`\n📄 Full report saved: ${reportPath}`);
  
  await browser.close();
  return results;
}

// Run the simplified test
runSimplifiedUITest().catch(console.error);