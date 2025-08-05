/**
 * Advanced Cross-Browser Compatibility Test with Visual Testing
 * Tests functionality, performance, and visual consistency across browsers
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

class AdvancedCrossBrowserTester {
  constructor() {
    this.baseUrl = 'http://localhost:9999';
    this.testResults = {
      timestamp: new Date().toISOString(),
      summary: {
        browsers: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        totalTests: 0
      },
      browsers: {},
      pages: [
        { path: '/', name: 'Homepage', critical: true },
        { path: '/ai-agents', name: 'AI Agents', critical: true },
        { path: '/dashboard/ai-intelligent', name: 'AI Dashboard', critical: true },
        { path: '/knowledge-base', name: 'Knowledge Base', critical: false },
        { path: '/ai-performance', name: 'AI Performance', critical: false }
      ],
      viewports: [
        { name: 'Desktop Large', width: 1920, height: 1080 },
        { name: 'Desktop Medium', width: 1440, height: 900 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Mobile Large', width: 414, height: 896 },
        { name: 'Mobile Small', width: 375, height: 667 }
      ]
    };
    
    this.screenshotDir = path.join(__dirname, 'test-results', 'screenshots');
    this.reportDir = path.join(__dirname, 'test-results');
    
    // Ensure directories exist
    fs.mkdirSync(this.screenshotDir, { recursive: true });
    fs.mkdirSync(this.reportDir, { recursive: true });
  }

  async testBrowser(browserType, browserName) {
    console.log(`\n🌐 Testing ${browserName}...`);
    
    const browser = await browserType.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const browserResult = {
      name: browserName,
      supported: true,
      pages: {},
      viewports: {},
      performance: {},
      errors: [],
      warnings: [],
      overall: { passed: 0, failed: 0, warnings: 0 }
    };

    try {
      // Test each page
      for (const pageInfo of this.testResults.pages) {
        console.log(`  📄 Testing ${pageInfo.name}...`);
        
        const pageResult = await this.testPage(browser, pageInfo, browserName);
        browserResult.pages[pageInfo.name] = pageResult;
        
        if (pageResult.success) {
          browserResult.overall.passed++;
        } else {
          browserResult.overall.failed++;
          if (pageInfo.critical) {
            browserResult.errors.push(`Critical page ${pageInfo.name} failed`);
          } else {
            browserResult.warnings.push(`Non-critical page ${pageInfo.name} failed`);
          }
        }
      }
      
      // Test responsive design
      console.log(`  📱 Testing responsive design...`);
      const responsiveResult = await this.testResponsiveDesign(browser, browserName);
      browserResult.viewports = responsiveResult;
      
    } catch (error) {
      console.error(`❌ Browser ${browserName} testing failed:`, error.message);
      browserResult.supported = false;
      browserResult.errors.push(`Browser testing failed: ${error.message}`);
      browserResult.overall.failed++;
    } finally {
      await browser.close();
    }
    
    this.testResults.browsers[browserName] = browserResult;
    this.testResults.summary.browsers++;
    this.testResults.summary.passed += browserResult.overall.passed;
    this.testResults.summary.failed += browserResult.overall.failed;
    this.testResults.summary.warnings += browserResult.overall.warnings;
    
    return browserResult;
  }

  async testPage(browser, pageInfo, browserName) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    
    const page = await context.newPage();
    const url = `${this.baseUrl}${pageInfo.path}`;
    
    const result = {
      url,
      success: false,
      loadTime: 0,
      httpStatus: null,
      jsErrors: [],
      performance: {},
      accessibility: {},
      screenshots: [],
      interactive: {}
    };
    
    try {
      // Monitor console errors
      const jsErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        }
      });
      
      // Monitor network responses
      let httpStatus = null;
      page.on('response', response => {
        if (response.url() === url) {
          httpStatus = response.status();
        }
      });
      
      // Navigate and measure load time
      const startTime = Date.now();
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      const loadTime = Date.now() - startTime;
      
      result.loadTime = loadTime;
      result.httpStatus = httpStatus || response.status();
      result.jsErrors = jsErrors;
      
      // Wait for page to be fully loaded
      await page.waitForTimeout(2000);
      
      // Test basic functionality
      await this.testPageInteractivity(page, pageInfo, result);
      
      // Take screenshot
      const screenshotPath = path.join(
        this.screenshotDir, 
        `${browserName}-${pageInfo.name.replace(/\s+/g, '-')}-desktop.png`
      );
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      result.screenshots.push(screenshotPath);
      
      // Basic performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart : 0,
          loadComplete: perfData ? perfData.loadEventEnd - perfData.loadEventStart : 0,
          firstPaint: 0 // Simplified for this test
        };
      });
      result.performance = performanceMetrics;
      
      // Check if page loaded successfully
      result.success = result.httpStatus === 200 && jsErrors.length === 0;
      
      console.log(`    ✅ ${pageInfo.name}: ${result.success ? 'PASS' : 'FAIL'} (${loadTime}ms)`);
      
    } catch (error) {
      console.log(`    ❌ ${pageInfo.name}: ERROR - ${error.message}`);
      result.success = false;
      result.jsErrors.push(error.message);
    } finally {
      await context.close();
    }
    
    return result;
  }

  async testPageInteractivity(page, pageInfo, result) {
    try {
      // Test common interactive elements based on page type
      if (pageInfo.name === 'Homepage') {
        // Test navigation links
        const navLinks = await page.$$('nav a');
        result.interactive.navigationLinks = navLinks.length;
        
        // Test if hero section is visible
        const heroVisible = await page.isVisible('[data-testid="hero-section"], .hero, h1').catch(() => false);
        result.interactive.heroSection = heroVisible;
      }
      
      if (pageInfo.name === 'AI Agents') {
        // Test AI agent cards
        const agentCards = await page.$$('[data-testid="agent-card"], .agent-card, .card').catch(() => []);
        result.interactive.agentCards = agentCards.length;
        
        // Test if chat interface is present
        const chatInterface = await page.isVisible('[data-testid="chat-interface"], .chat, input[type="text"]').catch(() => false);
        result.interactive.chatInterface = chatInterface;
      }
      
      if (pageInfo.name === 'AI Dashboard') {
        // Test dashboard widgets
        const widgets = await page.$$('[data-testid="widget"], .widget, .dashboard-card').catch(() => []);
        result.interactive.widgets = widgets.length;
        
        // Test if data is loading
        const hasData = await page.isVisible('.chart, [data-testid="chart"], .metric').catch(() => false);
        result.interactive.hasData = hasData;
      }
      
      // Test general page elements
      const buttons = await page.$$('button');
      const links = await page.$$('a');
      const forms = await page.$$('form');
      
      result.interactive.buttons = buttons.length;
      result.interactive.links = links.length;
      result.interactive.forms = forms.length;
      
    } catch (error) {
      result.interactive.error = error.message;
    }
  }

  async testResponsiveDesign(browser, browserName) {
    const responsiveResults = {};
    
    for (const viewport of this.testResults.viewports) {
      console.log(`    📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      
      const page = await context.newPage();
      
      try {
        await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        
        // Take screenshot for visual comparison
        const screenshotPath = path.join(
          this.screenshotDir,
          `${browserName}-responsive-${viewport.name.replace(/\s+/g, '-')}.png`
        );
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: false 
        });
        
        // Test responsive elements
        const isMenuCollapsed = viewport.width < 768;
        const hasResponsiveNavigation = await page.isVisible('[data-testid="mobile-menu"], .mobile-menu, .hamburger').catch(() => false);
        
        responsiveResults[viewport.name] = {
          width: viewport.width,
          height: viewport.height,
          screenshot: screenshotPath,
          mobileMenuExpected: isMenuCollapsed,
          mobileMenuPresent: hasResponsiveNavigation,
          responsive: isMenuCollapsed ? hasResponsiveNavigation : true
        };
        
      } catch (error) {
        responsiveResults[viewport.name] = {
          width: viewport.width,
          height: viewport.height,
          error: error.message,
          responsive: false
        };
      } finally {
        await context.close();
      }
    }
    
    return responsiveResults;
  }

  async runAllTests() {
    console.log('🚀 Starting Advanced Cross-Browser Compatibility Tests');
    console.log('=' .repeat(70));
    
    const browsers = [
      { engine: chromium, name: 'Chrome' },
      { engine: firefox, name: 'Firefox' },
      { engine: webkit, name: 'Safari' }
    ];
    
    for (const { engine, name } of browsers) {
      try {
        await this.testBrowser(engine, name);
      } catch (error) {
        console.error(`❌ Failed to test ${name}:`, error.message);
        this.testResults.browsers[name] = {
          supported: false,
          error: error.message,
          overall: { passed: 0, failed: 1, warnings: 0 }
        };
        this.testResults.summary.failed++;
      }
    }
    
    this.testResults.summary.totalTests = 
      this.testResults.summary.passed + 
      this.testResults.summary.failed + 
      this.testResults.summary.warnings;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 Advanced Cross-Browser Test Results');
    console.log('='.repeat(70));
    
    return this.testResults;
  }

  generateDetailedReport() {
    const report = {
      summary: this.testResults.summary,
      timestamp: this.testResults.timestamp,
      browserDetails: this.testResults.browsers,
      recommendations: [],
      criticalIssues: [],
      performanceInsights: [],
      responsiveAnalysis: []
    };
    
    // Analyze results and generate recommendations
    for (const [browserName, browserData] of Object.entries(this.testResults.browsers)) {
      if (!browserData.supported) {
        report.criticalIssues.push(`❌ ${browserName}: Browser not supported or failed to launch`);
        continue;
      }
      
      // Check for critical page failures
      for (const [pageName, pageData] of Object.entries(browserData.pages || {})) {
        if (!pageData.success) {
          const criticalPage = this.testResults.pages.find(p => p.name === pageName)?.critical;
          if (criticalPage) {
            report.criticalIssues.push(`❌ ${browserName}: Critical page "${pageName}" failed to load`);
          } else {
            report.recommendations.push(`⚠️ ${browserName}: Non-critical page "${pageName}" has issues`);
          }
        }
        
        // Performance analysis
        if (pageData.loadTime > 3000) {
          report.performanceInsights.push(`⚡ ${browserName} - ${pageName}: Slow load time (${pageData.loadTime}ms)`);
        }
        
        if (pageData.jsErrors && pageData.jsErrors.length > 0) {
          report.criticalIssues.push(`🐛 ${browserName} - ${pageName}: JavaScript errors detected`);
        }
      }
      
      // Responsive design analysis
      for (const [viewportName, viewportData] of Object.entries(browserData.viewports || {})) {
        if (!viewportData.responsive) {
          report.responsiveAnalysis.push(`📱 ${browserName}: Responsive issues at ${viewportName}`);
        }
      }
    }
    
    // Generate overall recommendations
    if (report.criticalIssues.length === 0) {
      report.recommendations.push('✅ No critical browser compatibility issues detected');
    }
    
    if (report.performanceInsights.length === 0) {
      report.recommendations.push('⚡ Performance is good across all browsers');
    }
    
    if (report.responsiveAnalysis.length === 0) {
      report.recommendations.push('📱 Responsive design works well across all viewports');
    }
    
    return report;
  }

  async saveResults(filename = 'advanced_cross_browser_results.json') {
    const report = this.generateDetailedReport();
    const filepath = path.join(this.reportDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed results saved to: ${filepath}`);
    
    // Also save a summary report
    const summaryPath = path.join(this.reportDir, 'cross_browser_summary.txt');
    const summaryContent = this.generateTextSummary(report);
    fs.writeFileSync(summaryPath, summaryContent);
    console.log(`📋 Summary report saved to: ${summaryPath}`);
    
    return report;
  }

  generateTextSummary(report) {
    let summary = '';
    summary += '6FB AI Agent System - Cross-Browser Compatibility Report\n';
    summary += '=' .repeat(60) + '\n\n';
    summary += `Test Date: ${new Date(report.timestamp).toLocaleString()}\n\n`;
    
    summary += `📊 SUMMARY\n`;
    summary += `---------\n`;
    summary += `Browsers Tested: ${report.summary.browsers}\n`;
    summary += `Total Tests: ${report.summary.totalTests}\n`;
    summary += `Passed: ${report.summary.passed}\n`;
    summary += `Failed: ${report.summary.failed}\n`;
    summary += `Warnings: ${report.summary.warnings}\n\n`;
    
    if (report.criticalIssues.length > 0) {
      summary += `🚨 CRITICAL ISSUES\n`;
      summary += `------------------\n`;
      report.criticalIssues.forEach(issue => summary += `${issue}\n`);
      summary += '\n';
    }
    
    if (report.performanceInsights.length > 0) {
      summary += `⚡ PERFORMANCE INSIGHTS\n`;
      summary += `----------------------\n`;
      report.performanceInsights.forEach(insight => summary += `${insight}\n`);
      summary += '\n';
    }
    
    if (report.responsiveAnalysis.length > 0) {
      summary += `📱 RESPONSIVE DESIGN\n`;
      summary += `-------------------\n`;
      report.responsiveAnalysis.forEach(analysis => summary += `${analysis}\n`);
      summary += '\n';
    }
    
    summary += `🎯 RECOMMENDATIONS\n`;
    summary += `------------------\n`;
    report.recommendations.forEach(rec => summary += `${rec}\n`);
    summary += '\n';
    
    summary += `📷 SCREENSHOTS\n`;
    summary += `--------------\n`;
    summary += `Screenshots saved to: ${this.screenshotDir}\n`;
    summary += `Review visual consistency across browsers and viewports.\n\n`;
    
    return summary;
  }
}

// Export for use in other tests
module.exports = AdvancedCrossBrowserTester;

// Run if called directly
if (require.main === module) {
  (async () => {
    const tester = new AdvancedCrossBrowserTester();
    try {
      const results = await tester.runAllTests();
      const report = await tester.saveResults();
      
      console.log('\n📈 Final Results:');
      console.log(`🌐 Browsers: ${report.summary.browsers}`);
      console.log(`✅ Passed: ${report.summary.passed}`);
      console.log(`❌ Failed: ${report.summary.failed}`);
      console.log(`⚠️ Warnings: ${report.summary.warnings}`);
      console.log(`📊 Total: ${report.summary.totalTests}`);
      
      if (report.criticalIssues.length > 0) {
        console.log('\n🚨 Critical Issues:');
        report.criticalIssues.forEach(issue => console.log(`  ${issue}`));
      }
      
      if (report.recommendations.length > 0) {
        console.log('\n🎯 Key Recommendations:');
        report.recommendations.slice(0, 3).forEach(rec => console.log(`  ${rec}`));
      }
      
      process.exit(report.criticalIssues.length > 0 ? 1 : 0);
    } catch (error) {
      console.error('❌ Advanced testing failed:', error);
      process.exit(1);
    }
  })();
}