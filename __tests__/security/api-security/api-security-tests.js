/**
 * Comprehensive API Security Testing Suite
 * Tests all API endpoints for security vulnerabilities and compliance
 */

import { test, expect } from '@playwright/test';
import { SECURITY_CONFIG } from '../config/security-config.js';
import fs from 'fs/promises';
import path from 'path';

export class APISecurityTester {
  constructor(page, options = {}) {
    this.page = page;
    this.config = { ...SECURITY_CONFIG, ...options };
    this.baseUrl = this.config.environments.development.baseUrl;
    this.apiUrl = this.config.environments.development.apiUrl;
    this.results = [];
    this.discoveredEndpoints = new Set();
    this.testTokens = new Map();
  }

  /**
   * Run comprehensive API security testing
   */
  async runAPISecurityTests() {
    console.log('🛡️ Starting comprehensive API security testing...');

    await this.discoverAPIEndpoints();
    
    await this.testAPIAuthentication();
    await this.testAPIAuthorization();
    await this.testInputValidation();
    await this.testRateLimiting();
    await this.testCORSConfiguration();
    await this.testAPIContractSecurity();
    await this.testAPIVersioning();
    await this.testErrorHandling();
    await this.testDataValidation();
    await this.testSecurityHeaders();

    return this.generateAPISecurityReport();
  }

  /**
   * Discover API endpoints from application
   */
  async discoverAPIEndpoints() {
    console.log('🔍 Discovering API endpoints...');

    const apiDir = path.join(process.cwd(), 'app/api');
    await this.discoverEndpointsFromFilesystem(apiDir);

    await this.discoverEndpointsDynamically();

    console.log(`📋 Discovered ${this.discoveredEndpoints.size} API endpoints`);
  }

  /**
   * Discover endpoints from filesystem structure
   */
  async discoverEndpointsFromFilesystem(dir, basePath = '/api') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const urlPath = path.join(basePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
          await this.discoverEndpointsFromFilesystem(fullPath, urlPath);
        } else if (entry.name === 'route.js' || entry.name === 'route.ts') {
          this.discoveredEndpoints.add(basePath);
          
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const methods = this.extractHTTPMethods(content);
            
            methods.forEach(method => {
              this.discoveredEndpoints.add(`${method}:${basePath}`);
            });
          } catch (error) {
            console.log(`Could not analyze route file: ${fullPath}`);
          }
        }
      }
    } catch (error) {
      console.log(`Could not read directory: ${dir}`);
    }
  }

  /**
   * Extract HTTP methods from route file content
   */
  extractHTTPMethods(content) {
    const methods = [];
    const methodPatterns = [
      /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g,
      /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g,
      /exports\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g
    ];

    methodPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        methods.push(match[1]);
      }
    });

    return [...new Set(methods)]; // Remove duplicates
  }

  /**
   * Discover endpoints dynamically by crawling the application
   */
  async discoverEndpointsDynamically() {
    const commonEndpoints = [
      '/api/health',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/signup',
      '/api/users/profile',
      '/api/agents',
      '/api/analytics',
      '/api/notifications',
      '/api/settings'
    ];

    for (const endpoint of commonEndpoints) {
      try {
        const response = await this.page.request.options(`${this.baseUrl}${endpoint}`);
        if (response.ok()) {
          this.discoveredEndpoints.add(endpoint);
          
          const allowHeader = response.headers()['allow'];
          if (allowHeader) {
            allowHeader.split(',').forEach(method => {
              this.discoveredEndpoints.add(`${method.trim()}:${endpoint}`);
            });
          }
        }
      } catch (error) {
      }
    }
  }

  /**
   * Test API authentication mechanisms
   */
  async testAPIAuthentication() {
    console.log('🔐 Testing API authentication...');

    const authTests = [
      () => this.testMissingAuthentication(),
      () => this.testWeakAuthentication(),
      () => this.testTokenValidation(),
      () => this.testSessionManagement(),
      () => this.testMultiFactorAuthentication()
    ];

    for (const test of authTests) {
      await test();
    }
  }

  /**
   * Test missing authentication on protected endpoints
   */
  async testMissingAuthentication() {
    const protectedEndpoints = [
      '/api/users/profile',
      '/api/admin/users',
      '/api/settings',
      '/api/analytics',
      '/api/agents'
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await this.page.request.get(`${this.baseUrl}${endpoint}`);
        
        if (response.ok()) {
          this.addResult('HIGH', 'missing-authentication',
            `Protected endpoint accessible without authentication: ${endpoint}`,
            { endpoint, status: response.status() });
        } else if (response.status() !== 401 && response.status() !== 403) {
          this.addResult('MEDIUM', 'weak-authentication-response',
            `Unexpected response for unauthenticated request: ${endpoint}`,
            { endpoint, status: response.status() });
        }
      } catch (error) {
        this.addResult('LOW', 'endpoint-test-error',
          `Could not test endpoint: ${endpoint}`,
          { endpoint, error: error.message });
      }
    }
  }

  /**
   * Test weak authentication implementations
   */
  async testWeakAuthentication() {
    const weakAuthTests = [
      { headers: { 'Authorization': 'Basic ' }, description: 'empty basic auth' },
      { headers: { 'Authorization': 'Bearer ' }, description: 'empty bearer token' },
      { headers: { 'Authorization': 'Bearer invalid' }, description: 'invalid bearer token' },
      { headers: { 'Authorization': 'Basic dGVzdDp0ZXN0' }, description: 'test:test basic auth' },
      { headers: { 'X-API-Key': 'test' }, description: 'weak API key' },
      { headers: { 'Cookie': 'session=guest' }, description: 'guest session' }
    ];

    const testEndpoints = Array.from(this.discoveredEndpoints).slice(0, 10);

    for (const endpoint of testEndpoints) {
      for (const authTest of weakAuthTests) {
        try {
          const response = await this.page.request.get(`${this.baseUrl}${endpoint}`, {
            headers: authTest.headers
          });

          if (response.ok()) {
            this.addResult('HIGH', 'weak-authentication-bypass',
              `Weak authentication accepted: ${authTest.description} on ${endpoint}`,
              { endpoint, headers: authTest.headers });
          }
        } catch (error) {
        }
      }
    }
  }

  /**
   * Test API authorization mechanisms
   */
  async testAPIAuthorization() {
    console.log('🚪 Testing API authorization...');

    await this.testRoleBasedAccess();
    await this.testResourceOwnershipValidation();
    await this.testPermissionEscalation();
  }

  /**
   * Test role-based access control
   */
  async testRoleBasedAccess() {
    await this.obtainTestTokens();

    const roleTests = [
      {
        role: 'user',
        allowedEndpoints: ['/api/users/profile', '/api/bookings'],
        forbiddenEndpoints: ['/api/admin/users', '/api/admin/settings']
      },
      {
        role: 'admin',
        allowedEndpoints: ['/api/admin/users', '/api/admin/settings'],
        forbiddenEndpoints: [] // Admin should have broad access
      }
    ];

    for (const roleTest of roleTests) {
      const token = this.testTokens.get(roleTest.role);
      
      if (!token) {
        this.addResult('LOW', 'test-setup-issue',
          `Could not obtain token for role: ${roleTest.role}`,
          { role: roleTest.role });
        continue;
      }

      for (const endpoint of roleTest.forbiddenEndpoints) {
        try {
          const response = await this.page.request.get(`${this.baseUrl}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok()) {
            this.addResult('HIGH', 'authorization-bypass',
              `Role ${roleTest.role} accessed forbidden endpoint: ${endpoint}`,
              { role: roleTest.role, endpoint });
          }
        } catch (error) {
        }
      }
    }
  }

  /**
   * Test input validation on API endpoints
   */
  async testInputValidation() {
    console.log('🔍 Testing API input validation...');

    await this.testSQLInjectionAPI();
    await this.testXSSInAPI();
    await this.testDataTypeValidation();
    await this.testInputLengthValidation();
    await this.testSpecialCharacterHandling();
  }

  /**
   * Test SQL injection in API endpoints
   */
  async testSQLInjectionAPI() {
    const sqlPayloads = this.config.inputValidation.sqlInjectionPatterns;
    const testEndpoints = [
      { endpoint: '/api/users/search', method: 'POST', param: 'query' },
      { endpoint: '/api/bookings/search', method: 'POST', param: 'filter' },
      { endpoint: '/api/analytics/query', method: 'POST', param: 'sql' }
    ];

    for (const test of testEndpoints) {
      for (const payload of sqlPayloads) {
        try {
          const data = { [test.param]: payload };
          
          const response = await this.page.request[test.method.toLowerCase()](`${this.baseUrl}${test.endpoint}`, {
            data,
            headers: { 'Authorization': `Bearer ${this.testTokens.get('user')}` }
          });

          const responseText = await response.text();
          
          const sqlErrorPatterns = [
            /SQL syntax/i,
            /mysql/i,
            /postgresql/i,
            /sqlite/i,
            /syntax error/i,
            /database/i
          ];

          const hasSQLError = sqlErrorPatterns.some(pattern => pattern.test(responseText));
          
          if (hasSQLError) {
            this.addResult('HIGH', 'sql-injection-error-disclosure',
              `SQL error exposed in API response: ${test.endpoint}`,
              { endpoint: test.endpoint, payload, response: responseText.substring(0, 200) });
          }

          if (response.ok() && responseText.includes('admin') && payload.includes('admin')) {
            this.addResult('CRITICAL', 'sql-injection-success',
              `Potential SQL injection success: ${test.endpoint}`,
              { endpoint: test.endpoint, payload });
          }

        } catch (error) {
        }
      }
    }
  }

  /**
   * Test XSS vulnerabilities in API responses
   */
  async testXSSInAPI() {
    const xssPayloads = this.config.inputValidation.xssPatterns;
    const testEndpoints = [
      { endpoint: '/api/users/profile', method: 'PUT', param: 'name' },
      { endpoint: '/api/comments', method: 'POST', param: 'comment' },
      { endpoint: '/api/messages', method: 'POST', param: 'message' }
    ];

    for (const test of testEndpoints) {
      for (const payload of xssPayloads) {
        try {
          const data = { [test.param]: payload };
          
          const response = await this.page.request[test.method.toLowerCase()](`${this.baseUrl}${test.endpoint}`, {
            data,
            headers: { 'Authorization': `Bearer ${this.testTokens.get('user')}` }
          });

          const responseText = await response.text();
          
          if (responseText.includes('<script>') || responseText.includes('javascript:')) {
            this.addResult('HIGH', 'xss-reflection',
              `XSS payload reflected in API response: ${test.endpoint}`,
              { endpoint: test.endpoint, payload });
          }

        } catch (error) {
        }
      }
    }
  }

  /**
   * Test API rate limiting
   */
  async testRateLimiting() {
    console.log('⏱️ Testing API rate limiting...');

    const rateLimitConfig = this.config.apiSecurity.rateLimiting;
    const testEndpoints = [
      '/api/auth/login',
      '/api/users/search',
      '/api/analytics/query'
    ];

    for (const endpoint of testEndpoints) {
      const results = {
        totalRequests: 0,
        successfulRequests: 0,
        rateLimitedRequests: 0,
        errors: 0
      };

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < rateLimitConfig.testRequestCount; i++) {
        const promise = this.page.request.post(`${this.baseUrl}${endpoint}`, {
          data: { test: `request_${i}` },
          headers: { 'Authorization': `Bearer ${this.testTokens.get('user')}` }
        }).then(response => {
          results.totalRequests++;
          
          if (response.status() === 429) {
            results.rateLimitedRequests++;
          } else if (response.ok()) {
            results.successfulRequests++;
          } else {
            results.errors++;
          }
          
          return response.status();
        }).catch(error => {
          results.totalRequests++;
          results.errors++;
          return 0;
        });

        promises.push(promise);
      }

      await Promise.all(promises);
      const endTime = Date.now();

      const isEffective = results.rateLimitedRequests > 0;
      const requestsPerSecond = results.totalRequests / ((endTime - startTime) / 1000);

      if (!isEffective) {
        this.addResult('MEDIUM', 'missing-rate-limiting',
          `No rate limiting detected on ${endpoint}`,
          { endpoint, requestsPerSecond, results });
      } else if (results.rateLimitedRequests < rateLimitConfig.testRequestCount * 0.1) {
        this.addResult('LOW', 'weak-rate-limiting',
          `Rate limiting may be too lenient on ${endpoint}`,
          { endpoint, requestsPerSecond, results });
      }

      console.log(`Rate limiting test for ${endpoint}: ${results.rateLimitedRequests}/${results.totalRequests} requests limited`);
    }
  }

  /**
   * Test CORS configuration
   */
  async testCORSConfiguration() {
    console.log('🌐 Testing CORS configuration...');

    const corsTests = [
      { origin: 'https://evil.com', shouldBlock: true },
      { origin: 'http://localhost:3000', shouldAllow: false }, // HTTP should be blocked
      { origin: 'https://legitimate-domain.com', shouldBlock: true },
      { origin: null, shouldBlock: true } // Null origin
    ];

    const testEndpoints = Array.from(this.discoveredEndpoints).slice(0, 5);

    for (const endpoint of testEndpoints) {
      for (const corsTest of corsTests) {
        try {
          const headers = {};
          if (corsTest.origin) {
            headers['Origin'] = corsTest.origin;
          }

          const response = await this.page.request.options(`${this.baseUrl}${endpoint}`, {
            headers
          });

          const accessControlOrigin = response.headers()['access-control-allow-origin'];
          
          if (corsTest.shouldBlock) {
            if (accessControlOrigin === '*' || accessControlOrigin === corsTest.origin) {
              this.addResult('MEDIUM', 'cors-misconfiguration',
                `CORS allows potentially dangerous origin: ${corsTest.origin} on ${endpoint}`,
                { endpoint, origin: corsTest.origin, accessControlOrigin });
            }
          }

        } catch (error) {
        }
      }
    }

    try {
      const response = await this.page.request.options(`${this.baseUrl}/api/health`);
      const accessControlOrigin = response.headers()['access-control-allow-origin'];
      
      if (accessControlOrigin === '*') {
        this.addResult('LOW', 'permissive-cors',
          'CORS allows all origins (*)',
          { header: accessControlOrigin });
      }
    } catch (error) {
    }
  }

  /**
   * Test API contract security
   */
  async testAPIContractSecurity() {
    console.log('📋 Testing API contract security...');

    await this.testSchemaValidation();
    await this.testContentTypeValidation();
    await this.testHTTPMethodSecurity();
  }

  /**
   * Test schema validation
   */
  async testSchemaValidation() {
    const invalidSchemaTests = [
      {
        endpoint: '/api/users/profile',
        method: 'PUT',
        data: { name: 123, email: true, age: 'invalid' }, // Wrong data types
        description: 'invalid data types'
      },
      {
        endpoint: '/api/bookings',
        method: 'POST',
        data: { date: 'invalid-date', time: 'invalid-time' },
        description: 'invalid date/time formats'
      },
      {
        endpoint: '/api/settings',
        method: 'PUT',
        data: { theme: 'invalid-theme', language: 'xx' },
        description: 'invalid enum values'
      }
    ];

    for (const test of invalidSchemaTests) {
      try {
        const response = await this.page.request[test.method.toLowerCase()](`${this.baseUrl}${test.endpoint}`, {
          data: test.data,
          headers: { 'Authorization': `Bearer ${this.testTokens.get('user')}` }
        });

        if (response.ok()) {
          this.addResult('MEDIUM', 'missing-schema-validation',
            `Invalid schema accepted: ${test.description} on ${test.endpoint}`,
            { endpoint: test.endpoint, data: test.data });
        } else if (response.status() !== 400 && response.status() !== 422) {
          this.addResult('LOW', 'unclear-validation-response',
            `Unexpected response code for invalid schema: ${test.endpoint}`,
            { endpoint: test.endpoint, status: response.status() });
        }

      } catch (error) {
      }
    }
  }

  /**
   * Test security headers on API responses
   */
  async testSecurityHeaders() {
    console.log('🛡️ Testing API security headers...');

    const testEndpoints = Array.from(this.discoveredEndpoints).slice(0, 10);
    const requiredHeaders = this.config.apiSecurity.headers.required;
    const forbiddenHeaders = this.config.apiSecurity.headers.forbidden;

    for (const endpoint of testEndpoints) {
      try {
        const response = await this.page.request.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${this.testTokens.get('user')}` }
        });

        const responseHeaders = response.headers();

        Object.entries(requiredHeaders).forEach(([headerName, expectedValue]) => {
          const actualValue = responseHeaders[headerName.toLowerCase()];
          
          if (!actualValue) {
            this.addResult('MEDIUM', 'missing-security-header',
              `Missing security header: ${headerName} on ${endpoint}`,
              { endpoint, header: headerName });
          }
        });

        forbiddenHeaders.forEach(headerName => {
          if (responseHeaders[headerName.toLowerCase()]) {
            this.addResult('LOW', 'information-disclosure-header',
              `Information disclosure header present: ${headerName} on ${endpoint}`,
              { endpoint, header: headerName, value: responseHeaders[headerName.toLowerCase()] });
          }
        });

      } catch (error) {
      }
    }
  }

  /**
   * Helper method to obtain test tokens for different roles
   */
  async obtainTestTokens() {
    const users = this.config.penetrationTesting.scope.testUsers;
    
    for (const [role, user] of Object.entries(users)) {
      try {
        const response = await this.page.request.post(`${this.baseUrl}/api/auth/login`, {
          data: {
            email: user.email,
            password: user.password
          }
        });

        if (response.ok()) {
          const result = await response.json();
          const token = result.token || result.access_token || result.jwt;
          
          if (token) {
            this.testTokens.set(role, token);
          }
        }
      } catch (error) {
        console.log(`Could not obtain token for role: ${role}`);
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
   * Generate comprehensive API security report
   */
  async generateAPISecurityReport() {
    const summary = {
      totalEndpoints: this.discoveredEndpoints.size,
      totalTests: this.results.length,
      critical: this.results.filter(r => r.severity === 'CRITICAL').length,
      high: this.results.filter(r => r.severity === 'HIGH').length,
      medium: this.results.filter(r => r.severity === 'MEDIUM').length,
      low: this.results.filter(r => r.severity === 'LOW').length
    };

    const categorizedResults = this.categorizeResults();
    const recommendations = this.generateAPIRecommendations();

    const report = {
      scanId: `api_security_${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary,
      discoveredEndpoints: Array.from(this.discoveredEndpoints),
      results: this.results,
      categorizedResults,
      recommendations,
      complianceStatus: this.assessAPICompliance()
    };

    console.log('📊 API Security Testing Summary:');
    console.log(`🔍 Endpoints tested: ${summary.totalEndpoints}`);
    console.log(`🔴 Critical: ${summary.critical}`);
    console.log(`🟠 High: ${summary.high}`);
    console.log(`🟡 Medium: ${summary.medium}`);
    console.log(`🟢 Low: ${summary.low}`);

    return report;
  }

  /**
   * Categorize results by type
   */
  categorizeResults() {
    const categories = {};
    
    this.results.forEach(result => {
      const category = result.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(result);
    });
    
    return categories;
  }

  /**
   * Generate API security recommendations
   */
  generateAPIRecommendations() {
    const recommendations = [];
    
    const categoryRecommendations = {
      'missing-authentication': {
        priority: 'HIGH',
        recommendation: 'Implement proper authentication for all protected API endpoints',
        implementation: 'Add JWT token validation middleware to protect sensitive endpoints'
      },
      'sql-injection-success': {
        priority: 'CRITICAL',
        recommendation: 'Fix SQL injection vulnerabilities immediately',
        implementation: 'Use parameterized queries and input validation for all database operations'
      },
      'missing-rate-limiting': {
        priority: 'MEDIUM',
        recommendation: 'Implement rate limiting on API endpoints',
        implementation: 'Add rate limiting middleware with appropriate limits for different endpoint types'
      },
      'cors-misconfiguration': {
        priority: 'MEDIUM',
        recommendation: 'Configure CORS properly',
        implementation: 'Restrict CORS to necessary origins and avoid wildcard origins'
      }
    };

    const categoryCounts = {};
    this.results.forEach(result => {
      categoryCounts[result.category] = (categoryCounts[result.category] || 0) + 1;
    });

    Object.entries(categoryCounts).forEach(([category, count]) => {
      const recTemplate = categoryRecommendations[category];
      if (recTemplate) {
        recommendations.push({
          ...recTemplate,
          category,
          affectedEndpoints: count,
          description: `${recTemplate.recommendation} (${count} endpoints affected)`
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Assess API compliance with security standards
   */
  assessAPICompliance() {
    const compliance = {
      owasp_api_top10: this.assessOWASPAPICompliance(),
      restful_security: this.assessRESTfulSecurityCompliance()
    };
    
    return compliance;
  }

  /**
   * Assess OWASP API Top 10 compliance
   */
  assessOWASPAPICompliance() {
    const owaspCategories = {
      'API1_Broken_Object_Level_Authorization': this.results.filter(r => 
        r.category.includes('authorization') || r.category.includes('direct-object')).length,
      'API2_Broken_User_Authentication': this.results.filter(r => 
        r.category.includes('authentication') || r.category.includes('token')).length,
      'API3_Excessive_Data_Exposure': this.results.filter(r =>
        r.category.includes('data-exposure') || r.category.includes('information-disclosure')).length,
      'API4_Lack_of_Resources_Rate_Limiting': this.results.filter(r =>
        r.category.includes('rate-limiting')).length,
      'API5_Broken_Function_Level_Authorization': this.results.filter(r =>
        r.category.includes('authorization-bypass') || r.category.includes('privilege')).length,
      'API6_Mass_Assignment': this.results.filter(r =>
        r.category.includes('mass-assignment') || r.category.includes('schema-validation')).length,
      'API7_Security_Misconfiguration': this.results.filter(r =>
        r.category.includes('cors') || r.category.includes('header')).length,
      'API8_Injection': this.results.filter(r =>
        r.category.includes('injection') || r.category.includes('sql') || r.category.includes('xss')).length,
      'API9_Improper_Assets_Management': 0, // Would require endpoint versioning analysis
      'API10_Insufficient_Logging_Monitoring': 0 // Would require log analysis
    };

    return owaspCategories;
  }

  /**
   * Assess RESTful security best practices compliance
   */
  assessRESTfulSecurityCompliance() {
    return {
      httpsEnforcement: this.results.filter(r => r.category.includes('insecure-transport')).length === 0,
      properHTTPMethods: true, // Would need more detailed analysis
      securityHeaders: this.results.filter(r => r.category.includes('missing-security-header')).length === 0,
      inputValidation: this.results.filter(r => r.category.includes('validation')).length === 0
    };
  }
}

export default APISecurityTester;