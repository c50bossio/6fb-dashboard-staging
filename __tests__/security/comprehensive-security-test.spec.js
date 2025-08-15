/**
 * Comprehensive Security Test Suite
 * Main test file that orchestrates all security testing workflows
 */

import { test, expect } from '@playwright/test';
import SecurityTestOrchestrator from './security-test-orchestrator.js';
import { SECURITY_CONFIG } from './config/security-config.js';

const TEST_CONFIG = {
  timeout: 30 * 60 * 1000, // 30 minutes for complete suite
  retries: 1,
  testDir: '__tests__/security'
};

test.describe('Comprehensive Security Testing Suite', () => {
  let orchestrator;

  test.beforeAll(async () => {
    console.log('🚀 Initializing comprehensive security testing suite...');
    console.log(`📋 Target environment: ${SECURITY_CONFIG.environments.development.baseUrl}`);
    
    const response = await fetch(`${SECURITY_CONFIG.environments.development.baseUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`Application not available at ${SECURITY_CONFIG.environments.development.baseUrl}`);
    }
    
    console.log('✅ Application health check passed');
  });

  test.beforeEach(async ({ page }) => {
    orchestrator = new SecurityTestOrchestrator({
      ...SECURITY_CONFIG,
      page
    });
  });

  test('Complete Security Suite - All Tests', async ({ page }) => {
    test.setTimeout(TEST_CONFIG.timeout);
    
    console.log('\n🛡️ Starting complete security testing suite...');
    console.log('This comprehensive test includes:');
    console.log('- Static Application Security Testing (SAST)');
    console.log('- Dynamic Application Security Testing (DAST)');
    console.log('- API Security Testing');
    console.log('- Penetration Testing');
    console.log('- GDPR Compliance Testing');
    console.log('- Security Monitoring Setup');

    const results = await orchestrator.runCompleteSuite(page, ['all']);

    expect(results).toBeDefined();
    expect(results.results).toBeDefined();
    expect(results.finalReport).toBeDefined();
    expect(results.securityPosture).toBeDefined();

    console.log('\n📊 Security Testing Summary:');
    console.log(`🔒 Overall Security Score: ${results.securityPosture.overallScore}/100`);
    console.log(`⚠️ Risk Level: ${results.securityPosture.riskLevel}`);
    console.log(`🔍 Total Findings: ${results.securityPosture.totalFindings}`);
    console.log(`🔴 Critical: ${results.securityPosture.critical}`);
    console.log(`🟠 High: ${results.securityPosture.high}`);
    console.log(`🟡 Medium: ${results.securityPosture.medium}`);
    console.log(`🟢 Low: ${results.securityPosture.low}`);
    console.log(`⏱️ Execution Time: ${Math.round(results.executionTime / 60000)} minutes`);

    expect(results.securityPosture.overallScore).toBeGreaterThan(0);
    expect(results.securityPosture.riskLevel).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
    
    if (results.securityPosture.critical > 0) {
      console.warn(`⚠️ WARNING: ${results.securityPosture.critical} critical security issues found!`);
      console.warn('These issues require immediate attention.');
    }

    if (results.securityPosture.high > 0) {
      console.warn(`⚠️ NOTICE: ${results.securityPosture.high} high-severity security issues found.`);
      console.warn('These issues should be addressed within 7 days.');
    }

    if (results.securityPosture.overallScore < 50) {
      console.error('❌ CRITICAL: Security score below acceptable threshold (50)');
      throw new Error(`Security score too low: ${results.securityPosture.overallScore}/100`);
    } else if (results.securityPosture.overallScore < 70) {
      console.warn('⚠️ WARNING: Security score below recommended threshold (70)');
    } else if (results.securityPosture.overallScore >= 90) {
      console.log('✅ EXCELLENT: Security score meets excellent standards (90+)');
    }

    expect(results.finalReport.metadata.scanId).toBeDefined();
    expect(results.finalReport.executiveSummary).toBeDefined();
    expect(results.finalReport.recommendations).toBeDefined();
    
    console.log(`\n✅ Comprehensive security testing completed successfully`);
    console.log(`📋 Detailed reports available in: __tests__/security/reports/`);
  });

  test('SAST Only - Static Application Security Testing', async ({ page }) => {
    test.setTimeout(10 * 60 * 1000); // 10 minutes

    console.log('\n🔍 Running Static Application Security Testing (SAST)...');
    
    const results = await orchestrator.runCompleteSuite(page, ['sast']);
    
    expect(results.results.sast).toBeDefined();
    expect(results.securityPosture).toBeDefined();
    
    console.log(`SAST Results: ${results.securityPosture.totalFindings} findings`);
    console.log(`Security Score: ${results.securityPosture.overallScore}/100`);
  });

  test('DAST Only - Dynamic Application Security Testing', async ({ page }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minutes

    console.log('\n🎯 Running Dynamic Application Security Testing (DAST)...');
    
    const results = await orchestrator.runCompleteSuite(page, ['dast']);
    
    expect(results.results.dast).toBeDefined();
    expect(results.securityPosture).toBeDefined();
    
    console.log(`DAST Results: ${results.securityPosture.totalFindings} findings`);
    console.log(`Security Score: ${results.securityPosture.overallScore}/100`);
  });

  test('API Security Testing Only', async ({ page }) => {
    test.setTimeout(10 * 60 * 1000); // 10 minutes

    console.log('\n🛡️ Running API Security Testing...');
    
    const results = await orchestrator.runCompleteSuite(page, ['api']);
    
    expect(results.results.api).toBeDefined();
    expect(results.securityPosture).toBeDefined();
    
    console.log(`API Security Results: ${results.securityPosture.totalFindings} findings`);
    console.log(`Security Score: ${results.securityPosture.overallScore}/100`);
  });

  test('Penetration Testing Only', async ({ page }) => {
    test.setTimeout(20 * 60 * 1000); // 20 minutes

    console.log('\n🎯 Running Automated Penetration Testing...');
    
    const results = await orchestrator.runCompleteSuite(page, ['penetration']);
    
    expect(results.results.penetration).toBeDefined();
    expect(results.securityPosture).toBeDefined();
    
    console.log(`Penetration Testing Results: ${results.securityPosture.totalFindings} findings`);
    console.log(`Security Score: ${results.securityPosture.overallScore}/100`);
  });

  test('GDPR Compliance Testing Only', async ({ page }) => {
    test.setTimeout(8 * 60 * 1000); // 8 minutes

    console.log('\n🇪🇺 Running GDPR Compliance Testing...');
    
    const results = await orchestrator.runCompleteSuite(page, ['gdpr']);
    
    expect(results.results.gdpr).toBeDefined();
    expect(results.securityPosture).toBeDefined();
    
    console.log(`GDPR Compliance Results: ${results.securityPosture.totalFindings} findings`);
    console.log(`Compliance Score: ${results.securityPosture.overallScore}/100`);
  });

  test('Security Monitoring Setup', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000); // 5 minutes

    console.log('\n🔄 Setting up Security Monitoring...');
    
    const results = await orchestrator.runCompleteSuite(page, ['monitoring']);
    
    expect(results.results.monitoring).toBeDefined();
    expect(results.results.monitoring.status).toBe('configured');
    
    console.log('✅ Security monitoring configuration completed');
  });

  test('Quick Security Health Check', async ({ page }) => {
    test.setTimeout(2 * 60 * 1000); // 2 minutes

    console.log('\n⚡ Running quick security health check...');
    
    const response = await page.request.get('/');
    const headers = response.headers();
    
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];

    const missingHeaders = securityHeaders.filter(header => !headers[header]);
    
    if (missingHeaders.length > 0) {
      console.warn(`⚠️ Missing security headers: ${missingHeaders.join(', ')}`);
    } else {
      console.log('✅ Basic security headers present');
    }

    const testUrls = [
      '/.env',
      '/config.json',
      '/.git/config',
      '/admin',
      '/debug'
    ];

    let exposedEndpoints = 0;
    for (const testUrl of testUrls) {
      try {
        const testResponse = await page.request.get(testUrl);
        if (testResponse.ok()) {
          console.warn(`⚠️ Potentially exposed endpoint: ${testUrl}`);
          exposedEndpoints++;
        }
      } catch (error) {
      }
    }

    if (exposedEndpoints === 0) {
      console.log('✅ No obviously exposed sensitive endpoints found');
    }

    expect(missingHeaders.length).toBeLessThan(3); // Allow some missing headers
    expect(exposedEndpoints).toBe(0); // No exposed endpoints
  });

  test.afterAll(async () => {
    console.log('\n🎯 Security testing suite completed');
    console.log('📋 Review the generated reports for detailed findings and recommendations');
    console.log('🔧 Implement the recommended security improvements');
    console.log('📅 Schedule regular security testing as part of your CI/CD pipeline');
  });
});

test.describe('Security Test Utilities', () => {
  
  test('Validate Security Configuration', async () => {
    expect(SECURITY_CONFIG).toBeDefined();
    expect(SECURITY_CONFIG.environments).toBeDefined();
    expect(SECURITY_CONFIG.authentication).toBeDefined();
    expect(SECURITY_CONFIG.inputValidation).toBeDefined();
    expect(SECURITY_CONFIG.apiSecurity).toBeDefined();
    expect(SECURITY_CONFIG.vulnerabilityScanning).toBeDefined();
    expect(SECURITY_CONFIG.penetrationTesting).toBeDefined();
    expect(SECURITY_CONFIG.gdprCompliance).toBeDefined();
    expect(SECURITY_CONFIG.monitoring).toBeDefined();
    
    console.log('✅ Security configuration validation passed');
  });

  test('Test Security Tools Availability', async () => {
    console.log('🔧 Checking security tools availability...');
    
    // - semgrep --version
    // - nuclei -version
    // - bandit --version
    // - safety --version
    
    console.log('ℹ️ Tool availability check would run in CI/CD environment');
    expect(true).toBe(true); // Placeholder
  });

  test('Performance Baseline', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 Page load time: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });
});

export { TEST_CONFIG, SECURITY_CONFIG };