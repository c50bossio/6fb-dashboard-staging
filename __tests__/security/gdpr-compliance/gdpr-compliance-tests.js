/**
 * GDPR Compliance Testing Suite
 * Comprehensive testing for GDPR compliance requirements
 */

import { test, expect } from '@playwright/test';
import { SECURITY_CONFIG } from '../config/security-config.js';
import fs from 'fs/promises';
import path from 'path';

export class GDPRComplianceTester {
  constructor(page, options = {}) {
    this.page = page;
    this.config = { ...SECURITY_CONFIG, ...options };
    this.baseUrl = this.config.environments.development.baseUrl;
    this.results = [];
    this.testSubjects = this.config.gdprCompliance.dataSubjects.testPersons;
    this.createdTestData = [];
  }

  /**
   * Run comprehensive GDPR compliance testing
   */
  async runGDPRComplianceTests() {
    console.log('🇪🇺 Starting GDPR compliance testing...');

    const testSuites = [
      () => this.testConsentManagement(),
      () => this.testRightToAccess(),
      () => this.testRightToRectification(),
      () => this.testRightToErasure(),
      () => this.testRightToPortability(),
      () => this.testRightToRestriction(),
      () => this.testRightToObject(),
      () => this.testDataMinimization(),
      () => this.testPurposeLimitation(),
      () => this.testLawfulBasisTracking(),
      () => this.testDataRetentionPolicies(),
      () => this.testDataBreachNotification(),
      () => this.testPrivacyByDesign(),
      () => this.testCookieCompliance(),
      () => this.testThirdPartyDataSharing(),
      () => this.testChildrenDataProtection()
    ];

    for (const testSuite of testSuites) {
      try {
        await testSuite();
      } catch (error) {
        console.error(`GDPR compliance test failed: ${error.message}`);
        this.addResult('ERROR', 'test-failure', error.message);
      }
    }

    // Cleanup test data
    await this.cleanupTestData();

    return this.generateGDPRComplianceReport();
  }

  /**
   * Test consent management mechanisms
   */
  async testConsentManagement() {
    console.log('✅ Testing consent management...');

    // Test initial consent banner
    await this.page.goto('/');
    
    const consentBanner = this.page.locator('[data-testid="cookie-consent"], [data-testid="consent-banner"]');
    const hasBanner = await consentBanner.isVisible();
    
    if (!hasBanner) {
      this.addResult('HIGH', 'missing-consent-banner',
        'No consent banner found on initial page load',
        { url: '/', recommendation: 'Implement consent banner for cookie and data processing consent' });
    }

    // Test granular consent options
    if (hasBanner) {
      const necessaryConsent = this.page.locator('[data-testid="necessary-cookies"], [data-testid="essential-consent"]');
      const analyticsConsent = this.page.locator('[data-testid="analytics-cookies"], [data-testid="analytics-consent"]');
      const marketingConsent = this.page.locator('[data-testid="marketing-cookies"], [data-testid="marketing-consent"]');

      // Necessary cookies should be pre-checked and disabled
      if (await necessaryConsent.isVisible()) {
        const isChecked = await necessaryConsent.isChecked();
        const isDisabled = await necessaryConsent.isDisabled();
        
        if (!isChecked || !isDisabled) {
          this.addResult('MEDIUM', 'improper-necessary-consent',
            'Necessary cookies consent should be pre-checked and disabled',
            { isChecked, isDisabled });
        }
      }

      // Optional consents should be unchecked by default
      for (const consent of [analyticsConsent, marketingConsent]) {
        if (await consent.isVisible()) {
          const isChecked = await consent.isChecked();
          if (isChecked) {
            this.addResult('HIGH', 'pre-checked-optional-consent',
              'Optional consent options should not be pre-checked',
              { consentType: await consent.getAttribute('data-testid') });
          }
        }
      }

      // Test consent withdrawal
      await this.testConsentWithdrawal();
    }

    // Test consent for data processing during registration
    await this.testRegistrationConsent();
  }

  /**
   * Test consent withdrawal functionality
   */
  async testConsentWithdrawal() {
    // Look for consent management page
    const consentManagementPaths = ['/privacy/consent', '/settings/privacy', '/cookies', '/consent'];
    let consentPageFound = false;

    for (const path of consentManagementPaths) {
      try {
        await this.page.goto(`${this.baseUrl}${path}`);
        const pageContent = await this.page.textContent('body');
        
        if (pageContent.toLowerCase().includes('consent') && pageContent.toLowerCase().includes('withdraw')) {
          consentPageFound = true;
          
          // Test if user can withdraw consent
          const withdrawButton = this.page.locator('[data-testid="withdraw-consent"], button:has-text("withdraw"), button:has-text("revoke")');
          
          if (await withdrawButton.isVisible()) {
            this.addResult('PASS', 'consent-withdrawal-available',
              `Consent withdrawal functionality found at ${path}`,
              { path });
          } else {
            this.addResult('MEDIUM', 'unclear-consent-withdrawal',
              `Consent page found but withdrawal mechanism unclear at ${path}`,
              { path });
          }
          break;
        }
      } catch (error) {
        // Page might not exist, continue checking
      }
    }

    if (!consentPageFound) {
      this.addResult('HIGH', 'missing-consent-withdrawal',
        'No consent withdrawal mechanism found',
        { recommendation: 'Provide clear mechanism for users to withdraw consent' });
    }
  }

  /**
   * Test consent during registration
   */
  async testRegistrationConsent() {
    await this.page.goto('/register');
    
    const consentCheckbox = this.page.locator('[data-testid="privacy-consent"], [data-testid="terms-consent"], input[type="checkbox"]:near(text="privacy")');
    const privacyLink = this.page.locator('a:has-text("privacy policy"), a:has-text("privacy notice")');
    
    if (await consentCheckbox.isVisible()) {
      const isRequired = await consentCheckbox.isRequired();
      const isChecked = await consentCheckbox.isChecked();
      
      if (!isRequired) {
        this.addResult('HIGH', 'optional-privacy-consent',
          'Privacy consent should be required for registration',
          { recommendation: 'Make privacy policy consent mandatory' });
      }
      
      if (isChecked) {
        this.addResult('HIGH', 'pre-checked-privacy-consent',
          'Privacy consent should not be pre-checked',
          { recommendation: 'Require explicit user action for consent' });
      }
    } else {
      this.addResult('HIGH', 'missing-registration-consent',
        'No privacy consent found in registration form',
        { recommendation: 'Add privacy policy consent to registration' });
    }

    if (await privacyLink.isVisible()) {
      // Test if privacy policy is accessible
      const href = await privacyLink.getAttribute('href');
      if (href) {
        try {
          const response = await this.page.request.get(`${this.baseUrl}${href}`);
          if (!response.ok()) {
            this.addResult('MEDIUM', 'inaccessible-privacy-policy',
              'Privacy policy link is not accessible',
              { link: href, status: response.status() });
          }
        } catch (error) {
          this.addResult('MEDIUM', 'privacy-policy-link-error',
            'Error accessing privacy policy',
            { link: href, error: error.message });
        }
      }
    } else {
      this.addResult('HIGH', 'missing-privacy-policy-link',
        'No privacy policy link found in registration form',
        { recommendation: 'Provide clear link to privacy policy' });
    }
  }

  /**
   * Test Right to Access (Article 15)
   */
  async testRightToAccess() {
    console.log('📖 Testing Right to Access...');

    const testSubject = this.testSubjects[0];
    
    // Create test user first
    const userId = await this.createTestUser(testSubject);
    if (!userId) return;

    // Test data access functionality
    const dataAccessPaths = ['/profile/data', '/settings/data', '/account/export', '/gdpr/access'];
    let accessFunctionFound = false;

    for (const path of dataAccessPaths) {
      try {
        await this.page.goto(`${this.baseUrl}${path}`);
        const pageContent = await this.page.textContent('body');
        
        if (pageContent.toLowerCase().includes('download') && pageContent.toLowerCase().includes('data')) {
          accessFunctionFound = true;
          
          const downloadButton = this.page.locator('[data-testid="download-data"], button:has-text("download"), button:has-text("export")');
          
          if (await downloadButton.isVisible()) {
            this.addResult('PASS', 'data-access-available',
              `Data access functionality found at ${path}`,
              { path, userId });

            // Test the download functionality
            await this.testDataDownload(downloadButton, userId);
          }
          break;
        }
      } catch (error) {
        // Expected for non-existent paths
      }
    }

    if (!accessFunctionFound) {
      this.addResult('HIGH', 'missing-data-access',
        'No data access/export functionality found',
        { userId, recommendation: 'Implement data export functionality per GDPR Article 15' });
    }

    // Test data completeness in profile view
    await this.testDataCompleteness(userId);
  }

  /**
   * Test data download functionality
   */
  async testDataDownload(downloadButton, userId) {
    try {
      // Set up download event listener
      const downloadPromise = this.page.waitForEvent('download');
      
      await downloadButton.click();
      
      const download = await downloadPromise;
      const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
      
      await download.saveAs(downloadPath);
      
      // Verify download contents
      const stats = await fs.stat(downloadPath);
      if (stats.size === 0) {
        this.addResult('MEDIUM', 'empty-data-export',
          'Data export file is empty',
          { userId, downloadPath });
      } else {
        // Try to parse the file (assuming JSON format)
        try {
          const content = await fs.readFile(downloadPath, 'utf8');
          const data = JSON.parse(content);
          
          // Verify essential data categories are present
          const requiredCategories = ['profile', 'personal_data'];
          const missingCategories = requiredCategories.filter(cat => !data[cat]);
          
          if (missingCategories.length > 0) {
            this.addResult('MEDIUM', 'incomplete-data-export',
              'Data export missing required categories',
              { userId, missingCategories });
          } else {
            this.addResult('PASS', 'complete-data-export',
              'Data export contains required categories',
              { userId, categories: Object.keys(data) });
          }
        } catch (error) {
          this.addResult('LOW', 'data-export-format-issue',
            'Could not parse data export file',
            { userId, error: error.message });
        }
      }
      
      // Cleanup
      await fs.unlink(downloadPath).catch(() => {});
      
    } catch (error) {
      this.addResult('MEDIUM', 'data-download-failed',
        'Data download functionality failed',
        { userId, error: error.message });
    }
  }

  /**
   * Test Right to Rectification (Article 16)
   */
  async testRightToRectification() {
    console.log('✏️ Testing Right to Rectification...');

    const testSubject = this.testSubjects[0];
    const userId = await this.createTestUser(testSubject);
    if (!userId) return;

    // Test profile editing functionality
    await this.page.goto('/profile/edit');
    
    const editableFields = [
      { selector: '[data-testid="name-input"], input[name="name"]', field: 'name' },
      { selector: '[data-testid="email-input"], input[name="email"]', field: 'email' },
      { selector: '[data-testid="phone-input"], input[name="phone"]', field: 'phone' }
    ];

    let rectificationAvailable = false;

    for (const field of editableFields) {
      const input = this.page.locator(field.selector);
      
      if (await input.isVisible() && await input.isEditable()) {
        rectificationAvailable = true;
        
        // Test updating the field
        const originalValue = await input.inputValue();
        const newValue = `updated_${Date.now()}`;
        
        await input.fill(newValue);
        
        const saveButton = this.page.locator('[data-testid="save-profile"], button:has-text("save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await this.page.waitForTimeout(1000);
          
          // Verify the change was saved
          const updatedValue = await input.inputValue();
          if (updatedValue === newValue) {
            this.addResult('PASS', 'data-rectification-working',
              `Data rectification working for ${field.field}`,
              { userId, field: field.field, originalValue, newValue });
          } else {
            this.addResult('MEDIUM', 'data-rectification-failed',
              `Data rectification failed for ${field.field}`,
              { userId, field: field.field });
          }
        }
      }
    }

    if (!rectificationAvailable) {
      this.addResult('HIGH', 'missing-data-rectification',
        'No data rectification functionality found',
        { userId, recommendation: 'Implement data editing functionality per GDPR Article 16' });
    }
  }

  /**
   * Test Right to Erasure (Article 17)
   */
  async testRightToErasure() {
    console.log('🗑️ Testing Right to Erasure...');

    const testSubject = this.testSubjects[1];
    const userId = await this.createTestUser(testSubject);
    if (!userId) return;

    // Test account deletion functionality
    const deletionPaths = ['/account/delete', '/settings/delete', '/profile/delete'];
    let deletionFunctionFound = false;

    for (const path of deletionPaths) {
      try {
        await this.page.goto(`${this.baseUrl}${path}`);
        const pageContent = await this.page.textContent('body');
        
        if (pageContent.toLowerCase().includes('delete') && pageContent.toLowerCase().includes('account')) {
          deletionFunctionFound = true;
          
          const deleteButton = this.page.locator('[data-testid="delete-account"], button:has-text("delete account")');
          
          if (await deleteButton.isVisible()) {
            this.addResult('PASS', 'account-deletion-available',
              `Account deletion functionality found at ${path}`,
              { path, userId });

            // Test deletion process (but don't actually delete)
            await this.testDeletionProcess(deleteButton, userId);
          }
          break;
        }
      } catch (error) {
        // Expected for non-existent paths
      }
    }

    if (!deletionFunctionFound) {
      this.addResult('HIGH', 'missing-data-erasure',
        'No data erasure functionality found',
        { userId, recommendation: 'Implement account deletion functionality per GDPR Article 17' });
    }

    // Test data retention information
    await this.testDataRetentionInformation();
  }

  /**
   * Test deletion process without actually deleting
   */
  async testDeletionProcess(deleteButton, userId) {
    try {
      await deleteButton.click();
      
      // Should show confirmation dialog
      const confirmDialog = this.page.locator('[data-testid="delete-confirmation"], .confirmation-dialog, .modal');
      
      if (await confirmDialog.isVisible()) {
        const dialogText = await confirmDialog.textContent();
        
        // Check for important deletion information
        const hasRetentionInfo = dialogText.toLowerCase().includes('day') || dialogText.toLowerCase().includes('retain');
        const hasConsequenceWarning = dialogText.toLowerCase().includes('permanent') || dialogText.toLowerCase().includes('cannot be undone');
        
        if (!hasRetentionInfo) {
          this.addResult('MEDIUM', 'missing-retention-info',
            'Deletion confirmation missing data retention information',
            { userId, recommendation: 'Inform users about data retention periods' });
        }
        
        if (!hasConsequenceWarning) {
          this.addResult('MEDIUM', 'missing-deletion-warning',
            'Deletion confirmation missing permanence warning',
            { userId, recommendation: 'Warn users about irreversible nature of deletion' });
        }
        
        // Look for cancel button (don't actually delete)
        const cancelButton = this.page.locator('[data-testid="cancel-delete"], button:has-text("cancel")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          this.addResult('PASS', 'deletion-cancellable',
            'Account deletion process is cancellable',
            { userId });
        }
      } else {
        this.addResult('HIGH', 'immediate-deletion-risk',
          'Account deletion has no confirmation step',
          { userId, recommendation: 'Add confirmation dialog for account deletion' });
      }
    } catch (error) {
      this.addResult('MEDIUM', 'deletion-process-error',
        'Error testing deletion process',
        { userId, error: error.message });
    }
  }

  /**
   * Test Right to Data Portability (Article 20)
   */
  async testRightToPortability() {
    console.log('📤 Testing Right to Data Portability...');

    const testSubject = this.testSubjects[0];
    const userId = await this.createTestUser(testSubject);
    if (!userId) return;

    // Data portability should provide data in structured, commonly used formats
    const exportFormats = ['JSON', 'CSV', 'XML'];
    let portabilityFound = false;

    const exportPaths = ['/export', '/data/export', '/account/export'];
    
    for (const path of exportPaths) {
      try {
        await this.page.goto(`${this.baseUrl}${path}`);
        
        const formatSelectors = [
          this.page.locator('select[name="format"], [data-testid="export-format"]'),
          this.page.locator('input[type="radio"][value*="json"], input[type="radio"][value*="csv"]')
        ];

        for (const selector of formatSelectors) {
          if (await selector.isVisible()) {
            portabilityFound = true;
            
            // Check available formats
            const options = await selector.locator('option').allTextContents();
            const availableFormats = options.filter(opt => 
              exportFormats.some(format => opt.toLowerCase().includes(format.toLowerCase()))
            );
            
            if (availableFormats.length > 0) {
              this.addResult('PASS', 'data-portability-available',
                'Data portability with format options available',
                { userId, path, availableFormats });
            } else {
              this.addResult('MEDIUM', 'limited-portability-formats',
                'Data portability available but limited format options',
                { userId, path, options });
            }
            break;
          }
        }
        
        if (portabilityFound) break;
      } catch (error) {
        // Expected for non-existent paths
      }
    }

    if (!portabilityFound) {
      this.addResult('MEDIUM', 'missing-data-portability',
        'No structured data portability functionality found',
        { userId, recommendation: 'Implement data export in structured formats per GDPR Article 20' });
    }
  }

  /**
   * Test data minimization principle
   */
  async testDataMinimization() {
    console.log('📊 Testing Data Minimization...');

    // Test registration form for excessive data collection
    await this.page.goto('/register');
    
    const formInputs = await this.page.locator('input, select, textarea').all();
    const collectedFields = [];
    
    for (const input of formInputs) {
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const label = await this.page.locator(`label[for="${await input.getAttribute('id')}"]`).textContent().catch(() => '');
      const placeholder = await input.getAttribute('placeholder');
      
      if (type !== 'hidden' && type !== 'submit' && name) {
        collectedFields.push({
          name,
          type,
          label: label || placeholder || name,
          required: await input.isRequired()
        });
      }
    }

    // Check for potentially excessive data collection
    const excessiveFields = [
      'ssn', 'social_security', 'national_id',
      'salary', 'income', 'financial',
      'race', 'ethnicity', 'religion',
      'sexual_orientation', 'political',
      'health', 'medical'
    ];

    const foundExcessiveFields = collectedFields.filter(field =>
      excessiveFields.some(excessive => 
        field.name.toLowerCase().includes(excessive) || 
        field.label.toLowerCase().includes(excessive)
      )
    );

    if (foundExcessiveFields.length > 0) {
      this.addResult('HIGH', 'excessive-data-collection',
        'Registration form collects potentially excessive personal data',
        { foundExcessiveFields, recommendation: 'Remove unnecessary data collection fields' });
    }

    // Check for required vs optional fields balance
    const requiredFields = collectedFields.filter(f => f.required);
    const optionalFields = collectedFields.filter(f => !f.required);
    
    if (requiredFields.length > optionalFields.length * 2) {
      this.addResult('MEDIUM', 'too-many-required-fields',
        'High ratio of required to optional fields',
        { 
          requiredCount: requiredFields.length, 
          optionalCount: optionalFields.length,
          recommendation: 'Make non-essential fields optional'
        });
    }

    this.addResult('INFO', 'data-collection-analysis',
      'Data collection analysis completed',
      { 
        totalFields: collectedFields.length,
        requiredFields: requiredFields.length,
        optionalFields: optionalFields.length,
        fields: collectedFields.map(f => ({ name: f.name, required: f.required }))
      });
  }

  /**
   * Test lawful basis tracking
   */
  async testLawfulBasisTracking() {
    console.log('⚖️ Testing Lawful Basis Tracking...');

    // Check privacy policy for lawful basis information
    const privacyPaths = ['/privacy', '/privacy-policy', '/legal/privacy'];
    let lawfulBasisFound = false;

    for (const path of privacyPaths) {
      try {
        await this.page.goto(`${this.baseUrl}${path}`);
        const pageContent = await this.page.textContent('body');
        
        const lawfulBasisTerms = [
          'lawful basis', 'legal basis', 'consent', 'contract',
          'legitimate interest', 'legal obligation', 'vital interest'
        ];

        const foundBasisTerms = lawfulBasisTerms.filter(term =>
          pageContent.toLowerCase().includes(term)
        );

        if (foundBasisTerms.length >= 3) {
          lawfulBasisFound = true;
          this.addResult('PASS', 'lawful-basis-documented',
            'Lawful basis for data processing documented',
            { path, foundBasisTerms });
          break;
        }
      } catch (error) {
        // Expected for non-existent paths
      }
    }

    if (!lawfulBasisFound) {
      this.addResult('HIGH', 'missing-lawful-basis-documentation',
        'No clear documentation of lawful basis for data processing',
        { recommendation: 'Document lawful basis for each type of data processing in privacy policy' });
    }
  }

  /**
   * Test cookie compliance
   */
  async testCookieCompliance() {
    console.log('🍪 Testing Cookie Compliance...');

    await this.page.goto('/');
    
    // Check for cookie policy
    const cookiePolicyLink = this.page.locator('a:has-text("cookie"), a[href*="cookie"]');
    
    if (await cookiePolicyLink.isVisible()) {
      const href = await cookiePolicyLink.getAttribute('href');
      try {
        const response = await this.page.request.get(`${this.baseUrl}${href}`);
        if (response.ok()) {
          this.addResult('PASS', 'cookie-policy-accessible',
            'Cookie policy is accessible',
            { link: href });
        }
      } catch (error) {
        this.addResult('MEDIUM', 'cookie-policy-inaccessible',
          'Cookie policy link exists but is not accessible',
          { link: href, error: error.message });
      }
    } else {
      this.addResult('MEDIUM', 'missing-cookie-policy',
        'No cookie policy link found',
        { recommendation: 'Provide accessible cookie policy' });
    }

    // Test cookie categorization
    await this.testCookieCategorization();
  }

  /**
   * Test cookie categorization in consent banner
   */
  async testCookieCategorization() {
    const cookieCategories = [
      'necessary', 'essential', 'functional',
      'analytics', 'performance', 'statistics',
      'marketing', 'advertising', 'targeting'
    ];

    const consentBanner = this.page.locator('[data-testid="cookie-consent"], [data-testid="consent-banner"]');
    
    if (await consentBanner.isVisible()) {
      const bannerText = await consentBanner.textContent();
      
      const foundCategories = cookieCategories.filter(category =>
        bannerText.toLowerCase().includes(category)
      );

      if (foundCategories.length >= 2) {
        this.addResult('PASS', 'cookie-categorization-present',
          'Cookie consent includes categorization',
          { foundCategories });
      } else {
        this.addResult('MEDIUM', 'limited-cookie-categorization',
          'Cookie consent has limited categorization',
          { foundCategories, recommendation: 'Provide clear cookie categories' });
      }
    }
  }

  /**
   * Helper method to create test user
   */
  async createTestUser(testSubject) {
    try {
      await this.page.goto('/register');
      
      await this.page.fill('[data-testid="name-input"], input[name="name"]', testSubject.name);
      await this.page.fill('[data-testid="email-input"], input[name="email"]', testSubject.email);
      await this.page.fill('[data-testid="password-input"], input[name="password"]', 'TestPassword123!');
      
      // Accept terms if present
      const termsCheckbox = this.page.locator('input[type="checkbox"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      await this.page.click('[data-testid="register-button"], button[type="submit"]');
      await this.page.waitForTimeout(2000);
      
      // Check if registration was successful
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/profile')) {
        const userId = `test_${Date.now()}`;
        this.createdTestData.push({ userId, email: testSubject.email });
        return userId;
      }
      
      return null;
    } catch (error) {
      console.log(`Failed to create test user: ${error.message}`);
      return null;
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    for (const testData of this.createdTestData) {
      try {
        // Attempt to delete test user account
        // This would depend on the specific API implementation
        await this.page.request.delete(`${this.baseUrl}/api/users/test/${testData.userId}`);
      } catch (error) {
        console.log(`Could not cleanup test user ${testData.userId}: ${error.message}`);
      }
    }
  }

  /**
   * Add test result
   */
  addResult(severity, category, description, details = {}) {
    this.results.push({
      timestamp: new Date().toISOString(),
      severity,
      category,
      description,
      details
    });
    
    console.log(`[${severity}] ${category}: ${description}`);
  }

  /**
   * Generate GDPR compliance report
   */
  async generateGDPRComplianceReport() {
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.severity === 'PASS').length,
      critical: this.results.filter(r => r.severity === 'CRITICAL').length,
      high: this.results.filter(r => r.severity === 'HIGH').length,
      medium: this.results.filter(r => r.severity === 'MEDIUM').length,
      low: this.results.filter(r => r.severity === 'LOW').length,
      info: this.results.filter(r => r.severity === 'INFO').length
    };

    const complianceScore = this.calculateComplianceScore();
    const recommendations = this.generateGDPRRecommendations();

    const report = {
      scanId: `gdpr_compliance_${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary,
      complianceScore,
      results: this.results,
      recommendations,
      gdprArticleAssessment: this.assessGDPRArticles()
    };

    console.log('📊 GDPR Compliance Summary:');
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`🔴 High: ${summary.high}`);
    console.log(`🟡 Medium: ${summary.medium}`);
    console.log(`🟢 Low: ${summary.low}`);
    console.log(`📊 Compliance Score: ${complianceScore}/100`);

    return report;
  }

  /**
   * Calculate overall GDPR compliance score
   */
  calculateComplianceScore() {
    const maxScore = 100;
    const penalties = {
      'CRITICAL': 25,
      'HIGH': 15,
      'MEDIUM': 8,
      'LOW': 3
    };

    let deductions = 0;
    this.results.forEach(result => {
      if (penalties[result.severity]) {
        deductions += penalties[result.severity];
      }
    });

    return Math.max(0, maxScore - deductions);
  }

  /**
   * Generate GDPR-specific recommendations
   */
  generateGDPRRecommendations() {
    const recommendations = [];
    
    // Analyze results and generate targeted recommendations
    const categoryRecommendations = {
      'missing-consent-banner': 'Implement cookie consent banner with granular options',
      'missing-data-access': 'Implement data access/export functionality (Article 15)',
      'missing-data-erasure': 'Implement right to erasure functionality (Article 17)',
      'excessive-data-collection': 'Review and minimize data collection (Article 5)',
      'missing-lawful-basis-documentation': 'Document lawful basis for all data processing activities'
    };

    // Count issues by category
    const categoryCounts = {};
    this.results.forEach(result => {
      if (result.severity !== 'PASS' && result.severity !== 'INFO') {
        categoryCounts[result.category] = (categoryCounts[result.category] || 0) + 1;
      }
    });

    // Generate recommendations
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const recommendation = categoryRecommendations[category];
      if (recommendation) {
        recommendations.push({
          priority: 'HIGH',
          category,
          recommendation,
          occurrences: count
        });
      }
    });

    return recommendations;
  }

  /**
   * Assess compliance with specific GDPR articles
   */
  assessGDPRArticles() {
    return {
      'Article 6 (Lawful Basis)': this.results.filter(r => r.category.includes('lawful-basis')).length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT',
      'Article 7 (Consent)': this.results.filter(r => r.category.includes('consent')).length === 0 ? 'COMPLIANT' : 'PARTIAL',
      'Article 15 (Right to Access)': this.results.filter(r => r.category.includes('data-access')).length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT',
      'Article 16 (Right to Rectification)': this.results.filter(r => r.category.includes('rectification')).length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT',
      'Article 17 (Right to Erasure)': this.results.filter(r => r.category.includes('erasure')).length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT',
      'Article 20 (Data Portability)': this.results.filter(r => r.category.includes('portability')).length === 0 ? 'COMPLIANT' : 'PARTIAL'
    };
  }
}

export default GDPRComplianceTester;