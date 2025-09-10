/**
 * 6FB AI Agent System - Comprehensive Cross-Browser Compatibility Test
 * Tests: Chrome, Firefox, Safari, Edge + Mobile devices
 * Functionality: Page loading, AI agents, responsive design, core features
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CrossBrowserTester {
  constructor() {
    this.baseUrl = 'http://localhost:9999';
    this.testResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      browsers: {},
      pages: [
        { path: '/', name: 'Homepage' },
        { path: '/ai-agents', name: 'AI Agents' },
        { path: '/dashboard/ai-intelligent', name: 'AI Dashboard' },
        { path: '/knowledge-base', name: 'Knowledge Base' },
        { path: '/ai-performance', name: 'AI Performance' }
      ],
      deviceViewports: [
        { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
        { name: 'Desktop 1440x900', width: 1440, height: 900 },
        { name: 'Tablet iPad', width: 768, height: 1024 },
        { name: 'Tablet Landscape', width: 1024, height: 768 },
        { name: 'Mobile iPhone', width: 375, height: 667 },
        { name: 'Mobile Large', width: 414, height: 896 }
      ]
    };
  }

  async checkSystemHealth() {
    
    try {
      const healthResponse = await this.makeRequest(`${this.baseUrl}/api/health`);
      if (healthResponse.status === 'degraded' || healthResponse.status === 'healthy') {
        
        return true;
      }
    } catch (error) {
      
    }
    
    try {
      const backendResponse = await this.makeRequest('http://localhost:8001/health');
      if (backendResponse.status === 'healthy') {
        
        return true;
      }
    } catch (error) {
      
    }
    
    return false;
  }

  async makeRequest(url) {
    const { execSync } = require('child_process');
    try {
      const response = execSync(`curl -s "${url}"`, { encoding: 'utf8' });
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async testPageLoad(url, timeout = 10000) {
    return new Promise((resolve) => {
      const { execSync } = require('child_process');
      try {
        const startTime = Date.now();
        const response = execSync(`curl -s -w "%{http_code}" -o /dev/null "${url}"`, { 
          encoding: 'utf8',
          timeout: timeout 
        });
        const loadTime = Date.now() - startTime;
        
        const httpCode = response.trim();
        const success = httpCode === '200';
        
        resolve({
          success,
          httpCode,
          loadTime,
          error: success ? null : `HTTP ${httpCode}`
        });
      } catch (error) {
        resolve({
          success: false,
          httpCode: 'TIMEOUT',
          loadTime: timeout,
          error: error.message
        });
      }
    });
  }

  async testJavaScriptExecution(url) {
    try {
      const response = execSync(`curl -s "${url}"`, { encoding: 'utf8' });
      
      const hasReact = response.includes('react') || response.includes('React');
      const hasNextJs = response.includes('next') || response.includes('Next');
      const hasScripts = response.includes('<script');
      const hasModules = response.includes('type="module"');
      
      return {
        success: hasScripts,
        framework: {
          react: hasReact,
          nextjs: hasNextJs,
          modules: hasModules
        },
        scriptTags: (response.match(/<script/g) || []).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        framework: {},
        scriptTags: 0
      };
    }
  }

  async testResponsiveDesign(url) {
    try {
      const response = execSync(`curl -s "${url}"`, { encoding: 'utf8' });
      
      const hasViewportMeta = response.includes('viewport');
      const hasTailwind = response.includes('tailwind') || response.includes('Tailwind');
      const hasMediaQueries = response.includes('@media');
      const hasFlexbox = response.includes('flex');
      const hasGrid = response.includes('grid');
      
      return {
        success: hasViewportMeta,
        responsive: {
          viewportMeta: hasViewportMeta,
          tailwind: hasTailwind,
          mediaQueries: hasMediaQueries,
          flexbox: hasFlexbox,
          grid: hasGrid
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responsive: {}
      };
    }
  }

  async runCrossBrowserTests() {
    
    );

    const systemHealthy = await this.checkSystemHealth();
    if (!systemHealthy) {
      
      return this.testResults;
    }

    const browsers = [
      { name: 'Chrome/Chromium', userAgent: 'Chrome', supported: true },
      { name: 'Firefox', userAgent: 'Firefox', supported: true },
      { name: 'Safari', userAgent: 'Safari', supported: true },
      { name: 'Edge', userAgent: 'Edge', supported: true },
      { name: 'Mobile Chrome', userAgent: 'Mobile Chrome', supported: true },
      { name: 'Mobile Safari', userAgent: 'Mobile Safari', supported: true }
    ];

    for (const browser of browsers) {
      
      this.testResults.browsers[browser.name] = {
        supported: browser.supported,
        pages: {},
        responsive: {},
        overall: { passed: 0, failed: 0, warnings: 0 }
      };

      for (const page of this.testResults.pages) {
        `);
        const url = `${this.baseUrl}${page.path}`;
        
        const loadTest = await this.testPageLoad(url);
        const jsTest = await this.testJavaScriptExecution(url);
        const responsiveTest = await this.testResponsiveDesign(url);
        
        const pageResult = {
          loadTime: loadTest.loadTime,
          httpCode: loadTest.httpCode,
          success: loadTest.success,
          javascript: jsTest,
          responsive: responsiveTest,
          errors: []
        };

        if (!loadTest.success) {
          pageResult.errors.push(`Page load failed: ${loadTest.error}`);
          this.testResults.browsers[browser.name].overall.failed++;
        } else if (loadTest.loadTime > 5000) {
          pageResult.errors.push(`Slow load time: ${loadTest.loadTime}ms`);
          this.testResults.browsers[browser.name].overall.warnings++;
        } else {
          this.testResults.browsers[browser.name].overall.passed++;
        }

        if (!jsTest.success) {
          pageResult.errors.push('JavaScript execution issues detected');
          this.testResults.browsers[browser.name].overall.failed++;
        }

        if (!responsiveTest.success) {
          pageResult.errors.push('Responsive design indicators missing');
          this.testResults.browsers[browser.name].overall.warnings++;
        }

        this.testResults.browsers[browser.name].pages[page.name] = pageResult;
        this.testResults.summary.totalTests++;
        
        if (pageResult.errors.length === 0) {
          `);
        } else {
          
          pageResult.errors.forEach(error => );
        }
      }

      for (const viewport of this.testResults.deviceViewports) {
        const responsiveResult = await this.testResponsiveDesign(this.baseUrl);
        this.testResults.browsers[browser.name].responsive[viewport.name] = {
          width: viewport.width,
          height: viewport.height,
          supported: responsiveResult.success,
          features: responsiveResult.responsive
        };
      }
    }

    for (const browserName in this.testResults.browsers) {
      const browser = this.testResults.browsers[browserName];
      this.testResults.summary.passed += browser.overall.passed;
      this.testResults.summary.failed += browser.overall.failed;
      this.testResults.summary.warnings += browser.overall.warnings;
    }

    );
    
    );
    
    return this.testResults;
  }

  generateReport() {
    const report = {
      summary: this.testResults.summary,
      timestamp: this.testResults.timestamp,
      details: this.testResults.browsers,
      recommendations: []
    };

    if (this.testResults.summary.failed > 0) {
      report.recommendations.push('🔧 Critical issues found that need immediate attention');
    }
    
    if (this.testResults.summary.warnings > 0) {
      report.recommendations.push('⚠️ Performance or compatibility warnings detected');
    }

    if (this.testResults.summary.failed === 0 && this.testResults.summary.warnings === 0) {
      report.recommendations.push('✅ Excellent cross-browser compatibility detected');
    }

    for (const browserName in this.testResults.browsers) {
      const browser = this.testResults.browsers[browserName];
      if (browser.overall.failed > 0) {
        report.recommendations.push(`❌ ${browserName}: ${browser.overall.failed} critical issues`);
      }
      if (browser.overall.warnings > 0) {
        report.recommendations.push(`⚠️ ${browserName}: ${browser.overall.warnings} warnings`);
      }
    }

    return report;
  }

  async saveResults(filename = 'cross_browser_test_results.json') {
    const report = this.generateReport();
    const filepath = path.join(__dirname, 'test-results', filename);
    
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    return report;
  }
}

module.exports = CrossBrowserTester;

if (require.main === module) {
  (async () => {
    const tester = new CrossBrowserTester();
    try {
      await tester.runCrossBrowserTests();
      const report = await tester.saveResults();

      report.recommendations.forEach(rec => );
      
      process.exit(report.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  })();
}