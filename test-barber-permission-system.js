/**
 * Comprehensive Test Suite for Barber Permission System
 * Tests all implemented features, UI elements, and error handling
 */

const { chromium } = require('playwright');

class BarberPermissionSystemTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    this.baseUrl = 'http://localhost:3000';
  }

  async initialize() {
    console.log('🚀 Initializing Barber Permission System Test Suite...\n');
    
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 500,     // Slow down for better visibility
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent testing
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Enable console logging
    this.page.on('console', msg => console.log(`🖥️  BROWSER: ${msg.text()}`));
    this.page.on('pageerror', error => console.log(`❌ PAGE ERROR: ${error.message}`));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('\n🧹 Test cleanup completed');
  }

  async takeScreenshot(name, description) {
    const screenshotPath = `/Users/bossio/6FB AI Agent System/test-screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.screenshots.push({ name, description, path: screenshotPath });
    console.log(`📸 Screenshot saved: ${name}`);
  }

  logResult(testName, status, details = '') {
    const result = {
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${testName}: ${status}${details ? ' - ' + details : ''}`);
  }

  async testHealthEndpoint() {
    console.log('\n🔍 Testing Health Endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const health = await response.json();
      
      if (health.status && health.services) {
        this.logResult('Health Endpoint', 'PASS', `Services: ${Object.keys(health.services).length} configured`);
        return true;
      } else {
        this.logResult('Health Endpoint', 'FAIL', 'Invalid health response structure');
        return false;
      }
    } catch (error) {
      this.logResult('Health Endpoint', 'FAIL', error.message);
      return false;
    }
  }

  async testBarberServicesPage() {
    console.log('\n🔍 Testing Barber Services Page...');
    
    try {
      // Navigate to barber services page
      await this.page.goto(`${this.baseUrl}/barber/services`, { 
        waitUntil: 'networkidle', 
        timeout: 10000 
      });
      
      await this.takeScreenshot('barber-services-initial', 'Initial load of barber services page');
      
      // Test 1: Page loads without errors
      const pageTitle = await this.page.locator('h1').first().textContent();
      if (pageTitle && pageTitle.includes('My Services')) {
        this.logResult('Barber Services Page Load', 'PASS', `Found title: "${pageTitle}"`);
      } else {
        this.logResult('Barber Services Page Load', 'FAIL', `Expected "My Services" title, got: "${pageTitle}"`);
      }

      // Test 2: Check for permission indicators
      await this.testPermissionIndicators();
      
      // Test 3: Test ServiceManager component
      await this.testServiceManagerComponent();
      
      // Test 4: Check permission level badge
      await this.testPermissionLevelBadge();
      
      return true;
    } catch (error) {
      this.logResult('Barber Services Page Navigation', 'FAIL', error.message);
      await this.takeScreenshot('barber-services-error', 'Error state on barber services page');
      return false;
    }
  }

  async testPermissionIndicators() {
    console.log('   🔐 Testing permission indicators...');
    
    try {
      // Look for permission-related elements
      const permissionBadge = await this.page.locator('[class*="permission"]').first();
      const shieldIcons = await this.page.locator('svg[class*="ShieldCheck"]').count();
      const permissionText = await this.page.locator('text=/permission/i').count();
      
      if (shieldIcons > 0 || permissionText > 0) {
        this.logResult('Permission Indicators', 'PASS', `Found ${shieldIcons} shield icons and ${permissionText} permission references`);
      } else {
        this.logResult('Permission Indicators', 'WARNING', 'No explicit permission indicators found');
      }
    } catch (error) {
      this.logResult('Permission Indicators', 'FAIL', error.message);
    }
  }

  async testServiceManagerComponent() {
    console.log('   🛠️ Testing ServiceManager component...');
    
    try {
      // Wait for ServiceManager to load
      await this.page.waitForTimeout(2000);
      
      // Check for service cards/grid
      const serviceCards = await this.page.locator('[class*="grid"]').count();
      const serviceElements = await this.page.locator('text=/service/i').count();
      
      if (serviceCards > 0 || serviceElements > 0) {
        this.logResult('ServiceManager Component', 'PASS', `Found ${serviceCards} grids and ${serviceElements} service elements`);
        
        // Test service card permission indicators
        await this.testServiceCardPermissions();
      } else {
        this.logResult('ServiceManager Component', 'WARNING', 'ServiceManager component may not have loaded or has no services');
      }
    } catch (error) {
      this.logResult('ServiceManager Component', 'FAIL', error.message);
    }
  }

  async testServiceCardPermissions() {
    console.log('     🏷️ Testing service card permissions...');
    
    try {
      // Look for permission badges on service cards
      const ownerBadges = await this.page.locator('text="Owner"').count();
      const customizedBadges = await this.page.locator('text="Customized"').count();
      const shopDefaultBadges = await this.page.locator('text="Shop Default"').count();
      
      const totalBadges = ownerBadges + customizedBadges + shopDefaultBadges;
      
      if (totalBadges > 0) {
        this.logResult('Service Card Permission Badges', 'PASS', 
          `Found: ${ownerBadges} Owner, ${customizedBadges} Customized, ${shopDefaultBadges} Shop Default badges`);
      } else {
        this.logResult('Service Card Permission Badges', 'WARNING', 'No permission badges found on service cards');
      }
    } catch (error) {
      this.logResult('Service Card Permission Badges', 'FAIL', error.message);
    }
  }

  async testPermissionLevelBadge() {
    console.log('   🎖️ Testing permission level badge...');
    
    try {
      // Look for permission level indicators
      const permissionLevel = await this.page.locator('text=/Permission Level/i').count();
      const levelDescriptions = await this.page.locator('text=/basic|intermediate|advanced|full/i').count();
      
      if (permissionLevel > 0 || levelDescriptions > 0) {
        this.logResult('Permission Level Badge', 'PASS', `Found ${permissionLevel} level indicators and ${levelDescriptions} level descriptions`);
      } else {
        this.logResult('Permission Level Badge', 'WARNING', 'No permission level badge found');
      }
    } catch (error) {
      this.logResult('Permission Level Badge', 'FAIL', error.message);
    }
  }

  async testStaffPermissionsPage() {
    console.log('\n🔍 Testing Staff Permissions Page...');
    
    try {
      // Navigate to staff permissions page
      await this.page.goto(`${this.baseUrl}/shop/settings/staff`, { 
        waitUntil: 'networkidle', 
        timeout: 10000 
      });
      
      await this.takeScreenshot('staff-permissions-initial', 'Initial load of staff permissions page');
      
      // Test 1: Page loads without errors
      const pageTitle = await this.page.locator('h1').first().textContent();
      if (pageTitle && pageTitle.includes('Staff Permissions')) {
        this.logResult('Staff Permissions Page Load', 'PASS', `Found title: "${pageTitle}"`);
      } else {
        this.logResult('Staff Permissions Page Load', 'FAIL', `Expected "Staff Permissions" title, got: "${pageTitle}"`);
      }

      // Test 2: Check for permission templates
      await this.testPermissionTemplates();
      
      // Test 3: Test staff member management
      await this.testStaffMemberManagement();
      
      // Test 4: Test navigation elements
      await this.testStaffPageNavigation();
      
      return true;
    } catch (error) {
      this.logResult('Staff Permissions Page Navigation', 'FAIL', error.message);
      await this.takeScreenshot('staff-permissions-error', 'Error state on staff permissions page');
      return false;
    }
  }

  async testPermissionTemplates() {
    console.log('   📋 Testing permission templates...');
    
    try {
      // Look for template sections
      const templateSection = await this.page.locator('text="Permission Templates"').count();
      const basicTemplate = await this.page.locator('text="basic"').count();
      const intermediateTemplate = await this.page.locator('text="intermediate"').count();
      const advancedTemplate = await this.page.locator('text="advanced"').count();
      
      if (templateSection > 0) {
        this.logResult('Permission Templates Section', 'PASS', 'Permission Templates section found');
        
        const totalTemplates = basicTemplate + intermediateTemplate + advancedTemplate;
        if (totalTemplates > 0) {
          this.logResult('Permission Template Types', 'PASS', 
            `Found: ${basicTemplate} basic, ${intermediateTemplate} intermediate, ${advancedTemplate} advanced templates`);
        } else {
          this.logResult('Permission Template Types', 'WARNING', 'No template level indicators found');
        }
      } else {
        this.logResult('Permission Templates Section', 'WARNING', 'Permission Templates section not found');
      }
    } catch (error) {
      this.logResult('Permission Templates', 'FAIL', error.message);
    }
  }

  async testStaffMemberManagement() {
    console.log('   👥 Testing staff member management...');
    
    try {
      // Look for staff member elements
      const staffSection = await this.page.locator('text="Staff Members"').count();
      const inviteButton = await this.page.locator('text="Invite Staff"').count();
      const staffMembers = await this.page.locator('[class*="staff-member"]').count();
      
      if (staffSection > 0) {
        this.logResult('Staff Members Section', 'PASS', 'Staff Members section found');
        
        if (inviteButton > 0) {
          this.logResult('Invite Staff Button', 'PASS', 'Invite Staff button found');
        } else {
          this.logResult('Invite Staff Button', 'WARNING', 'Invite Staff button not found');
        }
        
        // Check for empty state or staff list
        const noStaffMessage = await this.page.locator('text="No Staff Members"').count();
        if (noStaffMessage > 0) {
          this.logResult('Staff Empty State', 'PASS', 'Empty staff state properly displayed');
        } else if (staffMembers > 0) {
          this.logResult('Staff Member List', 'PASS', `${staffMembers} staff members displayed`);
        } else {
          this.logResult('Staff Display', 'WARNING', 'No staff members or empty state message found');
        }
      } else {
        this.logResult('Staff Members Section', 'FAIL', 'Staff Members section not found');
      }
    } catch (error) {
      this.logResult('Staff Member Management', 'FAIL', error.message);
    }
  }

  async testStaffPageNavigation() {
    console.log('   🧭 Testing staff page navigation...');
    
    try {
      // Look for navigation elements and help sections
      const helpSection = await this.page.locator('text="Permission Management Tips"').count();
      const navigationElements = await this.page.locator('nav, [role="navigation"]').count();
      
      if (helpSection > 0) {
        this.logResult('Help Section', 'PASS', 'Permission Management Tips section found');
      } else {
        this.logResult('Help Section', 'WARNING', 'Help section not found');
      }
      
      if (navigationElements > 0) {
        this.logResult('Navigation Elements', 'PASS', `${navigationElements} navigation elements found`);
      } else {
        this.logResult('Navigation Elements', 'WARNING', 'No navigation elements detected');
      }
    } catch (error) {
      this.logResult('Staff Page Navigation', 'FAIL', error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 Testing Error Handling...');
    
    try {
      // Test non-existent page
      await this.page.goto(`${this.baseUrl}/nonexistent-page`, { 
        waitUntil: 'networkidle', 
        timeout: 5000 
      });
      
      const errorMessage = await this.page.locator('text=/error|404|not found/i').count();
      if (errorMessage > 0) {
        this.logResult('404 Error Handling', 'PASS', 'Error page properly displayed');
      } else {
        this.logResult('404 Error Handling', 'WARNING', 'No clear error message for 404');
      }
      
      await this.takeScreenshot('error-handling', 'Error page display');
      
    } catch (error) {
      this.logResult('Error Handling Test', 'FAIL', error.message);
    }
  }

  async testUIResponsiveness() {
    console.log('\n🔍 Testing UI Responsiveness...');
    
    try {
      // Test mobile viewport
      await this.page.setViewportSize({ width: 375, height: 667 });
      await this.page.goto(`${this.baseUrl}/barber/services`, { waitUntil: 'networkidle' });
      
      await this.takeScreenshot('mobile-barber-services', 'Mobile view of barber services');
      
      // Check if mobile-specific elements are visible
      const mobileMenu = await this.page.locator('[class*="mobile"]').count();
      this.logResult('Mobile Responsiveness', mobileMenu > 0 ? 'PASS' : 'WARNING', 
        `Mobile elements found: ${mobileMenu}`);
      
      // Reset to desktop viewport
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
    } catch (error) {
      this.logResult('UI Responsiveness', 'FAIL', error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    const passCount = this.testResults.filter(r => r.status === 'PASS').length;
    const failCount = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnCount = this.testResults.filter(r => r.status === 'WARNING').length;
    
    const report = {
      testSuite: 'Barber Permission System',
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: passCount,
        failed: failCount,
        warnings: warnCount,
        successRate: Math.round((passCount / this.testResults.length) * 100)
      },
      results: this.testResults,
      screenshots: this.screenshots,
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n📈 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⚠️  Warnings: ${warnCount}`);
    console.log(`🎯 Success Rate: ${report.summary.successRate}%`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const failedTests = this.testResults.filter(r => r.status === 'FAIL');
    const warningTests = this.testResults.filter(r => r.status === 'WARNING');
    
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Critical Issues',
        items: failedTests.map(t => `Fix: ${t.test} - ${t.details}`)
      });
    }
    
    if (warningTests.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Improvements',
        items: warningTests.map(t => `Improve: ${t.test} - ${t.details}`)
      });
    }
    
    // General recommendations
    recommendations.push({
      priority: 'LOW',
      category: 'Enhancements',
      items: [
        'Add loading state indicators for better UX',
        'Implement comprehensive error boundaries',
        'Add keyboard navigation support',
        'Include accessibility improvements',
        'Add visual feedback for permission changes'
      ]
    });
    
    return recommendations;
  }
}

// Main test execution
async function runBarberPermissionSystemTests() {
  const tester = new BarberPermissionSystemTester();
  
  try {
    await tester.initialize();
    
    // Run all test suites
    await tester.testHealthEndpoint();
    await tester.testBarberServicesPage();
    await tester.testStaffPermissionsPage();
    await tester.testErrorHandling();
    await tester.testUIResponsiveness();
    
    // Generate final report
    const report = await tester.generateReport();
    
    // Output detailed recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('===================');
    report.recommendations.forEach(rec => {
      console.log(`\n${rec.priority} Priority - ${rec.category}:`);
      rec.items.forEach(item => console.log(`  • ${item}`));
    });
    
    return report;
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await tester.cleanup();
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runBarberPermissionSystemTests()
    .then(report => {
      console.log('\n🎉 Barber Permission System testing completed!');
      if (report && report.summary.successRate >= 80) {
        console.log('✅ System is functioning well with minimal issues.');
      } else {
        console.log('⚠️ System has some issues that should be addressed.');
      }
    })
    .catch(error => {
      console.error('💥 Fatal error during testing:', error);
      process.exit(1);
    });
}

module.exports = { BarberPermissionSystemTester };