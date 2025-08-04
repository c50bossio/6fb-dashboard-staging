/**
 * Automated SAST/DAST Security Scanner
 * Integrates multiple security scanning tools for comprehensive analysis
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { SECURITY_CONFIG } from '../config/security-config.js';

const execAsync = promisify(exec);

export class AutomatedSecurityScanner {
  constructor(options = {}) {
    this.config = { ...SECURITY_CONFIG, ...options };
    this.results = {
      sast: {},
      dast: {},
      dependencies: {},
      summary: {}
    };
    this.scanId = `scan_${Date.now()}`;
    this.reportDir = path.join(process.cwd(), '__tests__/security/reports', this.scanId);
  }

  /**
   * Initialize scanner and prepare environment
   */
  async initialize() {
    console.log(`🔧 Initializing security scanner (ID: ${this.scanId})`);
    
    // Create report directory
    await fs.mkdir(this.reportDir, { recursive: true });
    
    // Validate tool availability
    await this.validateTools();
    
    console.log('✅ Scanner initialized successfully');
  }

  /**
   * Validate that required security tools are available
   */
  async validateTools() {
    const tools = [
      { name: 'semgrep', command: 'semgrep --version', required: true },
      { name: 'nuclei', command: 'nuclei -version', required: true },
      { name: 'npm audit', command: 'npm audit --version', required: true },
      { name: 'bandit', command: 'bandit --version', required: false },
      { name: 'safety', command: 'safety --version', required: false },
      { name: 'snyk', command: 'snyk --version', required: false }
    ];

    const availableTools = [];
    const missingTools = [];

    for (const tool of tools) {
      try {
        await execAsync(tool.command);
        availableTools.push(tool.name);
        console.log(`✅ ${tool.name} is available`);
      } catch (error) {
        if (tool.required) {
          missingTools.push(tool.name);
          console.error(`❌ Required tool ${tool.name} is not available`);
        } else {
          console.log(`⚠️ Optional tool ${tool.name} is not available`);
        }
      }
    }

    if (missingTools.length > 0) {
      throw new Error(`Missing required security tools: ${missingTools.join(', ')}`);
    }

    this.availableTools = availableTools;
  }

  /**
   * Run Static Application Security Testing (SAST)
   */
  async runSAST() {
    console.log('🔍 Running SAST analysis...');
    
    const sastResults = {};

    // Semgrep SAST scan
    if (this.availableTools.includes('semgrep')) {
      console.log('📊 Running Semgrep analysis...');
      sastResults.semgrep = await this.runSemgrep();
    }

    // Bandit for Python (if available)
    if (this.availableTools.includes('bandit')) {
      console.log('🐍 Running Bandit Python analysis...');
      sastResults.bandit = await this.runBandit();
    }

    // Custom JavaScript/TypeScript analysis
    console.log('📝 Running custom JavaScript/TypeScript analysis...');
    sastResults.custom = await this.runCustomSAST();

    this.results.sast = sastResults;
    await this.saveResults('sast', sastResults);
    
    console.log('✅ SAST analysis completed');
    return sastResults;
  }

  /**
   * Run Semgrep static analysis
   */
  async runSemgrep() {
    try {
      const command = `semgrep --config=p/security-audit --json --output=${this.reportDir}/semgrep.json .`;
      const { stdout, stderr } = await execAsync(command, { 
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const results = JSON.parse(await fs.readFile(path.join(this.reportDir, 'semgrep.json'), 'utf8'));
      
      const summary = {
        totalFindings: results.results?.length || 0,
        critical: results.results?.filter(r => r.extra?.severity === 'ERROR').length || 0,
        high: results.results?.filter(r => r.extra?.severity === 'WARNING').length || 0,
        medium: results.results?.filter(r => r.extra?.severity === 'INFO').length || 0,
        categories: this.categorizeFindings(results.results || [])
      };

      return {
        tool: 'semgrep',
        status: 'completed',
        summary,
        rawResults: results,
        reportPath: path.join(this.reportDir, 'semgrep.json')
      };
    } catch (error) {
      console.error('Semgrep scan failed:', error.message);
      return {
        tool: 'semgrep',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Run Bandit Python security analysis
   */
  async runBandit() {
    try {
      const command = `bandit -r . -f json -o ${this.reportDir}/bandit.json`;
      await execAsync(command, { cwd: process.cwd() });

      const results = JSON.parse(await fs.readFile(path.join(this.reportDir, 'bandit.json'), 'utf8'));
      
      const summary = {
        totalFindings: results.results?.length || 0,
        high: results.results?.filter(r => r.issue_severity === 'HIGH').length || 0,
        medium: results.results?.filter(r => r.issue_severity === 'MEDIUM').length || 0,
        low: results.results?.filter(r => r.issue_severity === 'LOW').length || 0
      };

      return {
        tool: 'bandit',
        status: 'completed',
        summary,
        rawResults: results,
        reportPath: path.join(this.reportDir, 'bandit.json')
      };
    } catch (error) {
      return {
        tool: 'bandit',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Run custom SAST analysis for JavaScript/TypeScript specific vulnerabilities
   */
  async runCustomSAST() {
    const findings = [];
    const projectRoot = process.cwd();

    try {
      // Analyze package.json for security issues
      const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
      
      // Check for dangerous dependencies
      const dangerousDeps = [
        'eval', 'vm2', 'serialize-javascript', 'node-serialize',
        'express-fileupload', 'formidable', 'multer'
      ];

      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const [dep, version] of Object.entries(allDeps)) {
        if (dangerousDeps.includes(dep)) {
          findings.push({
            severity: 'HIGH',
            category: 'dangerous-dependency',
            file: 'package.json',
            description: `Potentially dangerous dependency: ${dep}@${version}`,
            recommendation: `Review usage of ${dep} for security implications`
          });
        }
      }

      // Scan for hardcoded secrets
      const secretPatterns = [
        { pattern: /["']?[A-Za-z0-9]{32,}["']?/g, name: 'potential-api-key' },
        { pattern: /password\s*[:=]\s*["'][^"']{6,}["']/gi, name: 'hardcoded-password' },
        { pattern: /secret\s*[:=]\s*["'][^"']{10,}["']/gi, name: 'hardcoded-secret' },
        { pattern: /token\s*[:=]\s*["'][^"']{20,}["']/gi, name: 'hardcoded-token' }
      ];

      const jsFiles = await this.findFiles(projectRoot, /\.(js|ts|jsx|tsx)$/);
      
      for (const file of jsFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        for (const { pattern, name } of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            findings.push({
              severity: 'CRITICAL',
              category: 'hardcoded-secrets',
              file: path.relative(projectRoot, file),
              description: `Potential hardcoded secret found: ${name}`,
              matches: matches.slice(0, 3), // Limit to first 3 matches
              recommendation: 'Move secrets to environment variables or secure secret management'
            });
          }
        }

        // Check for dangerous JavaScript patterns
        const dangerousPatterns = [
          { pattern: /eval\s*\(/g, name: 'eval-usage', severity: 'HIGH' },
          { pattern: /innerHTML\s*=/g, name: 'innerHTML-xss', severity: 'MEDIUM' },
          { pattern: /document\.write\s*\(/g, name: 'document-write', severity: 'MEDIUM' },
          { pattern: /setTimeout\s*\(\s*["'][^"']*["']/g, name: 'setTimeout-string', severity: 'MEDIUM' },
          { pattern: /setInterval\s*\(\s*["'][^"']*["']/g, name: 'setInterval-string', severity: 'MEDIUM' }
        ];

        for (const { pattern, name, severity } of dangerousPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            findings.push({
              severity,
              category: 'dangerous-patterns',
              file: path.relative(projectRoot, file),
              description: `Dangerous JavaScript pattern found: ${name}`,
              matches: matches.slice(0, 3),
              recommendation: `Avoid using ${name} or ensure proper input validation`
            });
          }
        }
      }

      const summary = {
        totalFindings: findings.length,
        critical: findings.filter(f => f.severity === 'CRITICAL').length,
        high: findings.filter(f => f.severity === 'HIGH').length,
        medium: findings.filter(f => f.severity === 'MEDIUM').length,
        categories: this.categorizeFindings(findings)
      };

      return {
        tool: 'custom-sast',
        status: 'completed',
        summary,
        findings,
        reportPath: path.join(this.reportDir, 'custom-sast.json')
      };

    } catch (error) {
      return {
        tool: 'custom-sast',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Run Dynamic Application Security Testing (DAST)
   */
  async runDAST() {
    console.log('🎯 Running DAST analysis...');
    
    const dastResults = {};

    // Nuclei vulnerability scanner
    if (this.availableTools.includes('nuclei')) {
      console.log('🚀 Running Nuclei vulnerability scan...');
      dastResults.nuclei = await this.runNuclei();
    }

    // Custom web application security tests
    console.log('🌐 Running custom web application security tests...');
    dastResults.custom = await this.runCustomDAST();

    this.results.dast = dastResults;
    await this.saveResults('dast', dastResults);
    
    console.log('✅ DAST analysis completed');
    return dastResults;
  }

  /**
   * Run Nuclei vulnerability scanner
   */
  async runNuclei() {
    const baseUrl = this.config.environments.development.baseUrl;
    
    try {
      const command = `nuclei -target ${baseUrl} -json-export ${this.reportDir}/nuclei.json -severity critical,high,medium`;
      await execAsync(command, { 
        cwd: process.cwd(),
        timeout: 300000 // 5 minutes timeout
      });

      const results = await this.parseNucleiResults();
      
      return {
        tool: 'nuclei',
        status: 'completed',
        summary: results.summary,
        findings: results.findings,
        reportPath: path.join(this.reportDir, 'nuclei.json')
      };
    } catch (error) {
      return {
        tool: 'nuclei',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Parse Nuclei results from JSON file
   */
  async parseNucleiResults() {
    try {
      const content = await fs.readFile(path.join(this.reportDir, 'nuclei.json'), 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      const findings = lines.map(line => JSON.parse(line));

      const summary = {
        totalFindings: findings.length,
        critical: findings.filter(f => f.info?.severity === 'critical').length,
        high: findings.filter(f => f.info?.severity === 'high').length,
        medium: findings.filter(f => f.info?.severity === 'medium').length,
        categories: this.categorizeFindings(findings.map(f => ({ category: f.info?.tags?.join(',') || 'unknown' })))
      };

      return { summary, findings };
    } catch (error) {
      return { summary: { totalFindings: 0 }, findings: [] };
    }
  }

  /**
   * Run custom DAST tests
   */
  async runCustomDAST() {
    const findings = [];
    const baseUrl = this.config.environments.development.baseUrl;

    try {
      // Test for security headers
      const securityHeadersTest = await this.testSecurityHeaders(baseUrl);
      findings.push(...securityHeadersTest);

      // Test for information disclosure
      const infoDisclosureTest = await this.testInformationDisclosure(baseUrl);
      findings.push(...infoDisclosureTest);

      // Test for common vulnerabilities
      const commonVulnTest = await this.testCommonVulnerabilities(baseUrl);
      findings.push(...commonVulnTest);

      const summary = {
        totalFindings: findings.length,
        critical: findings.filter(f => f.severity === 'CRITICAL').length,
        high: findings.filter(f => f.severity === 'HIGH').length,
        medium: findings.filter(f => f.severity === 'MEDIUM').length,
        categories: this.categorizeFindings(findings)
      };

      return {
        tool: 'custom-dast',
        status: 'completed',
        summary,
        findings,
        reportPath: path.join(this.reportDir, 'custom-dast.json')
      };

    } catch (error) {
      return {
        tool: 'custom-dast',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders(baseUrl) {
    const findings = [];
    
    try {
      const response = await fetch(baseUrl);
      const headers = Object.fromEntries(response.headers.entries());

      const requiredHeaders = this.config.apiSecurity.headers.required;
      const forbiddenHeaders = this.config.apiSecurity.headers.forbidden;

      // Check for missing required headers
      for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
        const headerValue = headers[headerName.toLowerCase()];
        
        if (!headerValue) {
          findings.push({
            severity: 'HIGH',
            category: 'missing-security-header',
            url: baseUrl,
            description: `Missing security header: ${headerName}`,
            recommendation: `Add ${headerName} header to improve security`
          });
        } else if (Array.isArray(expectedValue) && !expectedValue.includes(headerValue)) {
          findings.push({
            severity: 'MEDIUM',
            category: 'weak-security-header',
            url: baseUrl,
            description: `Weak security header value: ${headerName}: ${headerValue}`,
            recommendation: `Use one of the recommended values: ${expectedValue.join(', ')}`
          });
        }
      }

      // Check for forbidden headers
      for (const headerName of forbiddenHeaders) {
        if (headers[headerName.toLowerCase()]) {
          findings.push({
            severity: 'MEDIUM',
            category: 'information-disclosure',
            url: baseUrl,
            description: `Information disclosure header present: ${headerName}`,
            recommendation: `Remove or obfuscate the ${headerName} header`
          });
        }
      }

    } catch (error) {
      findings.push({
        severity: 'LOW',
        category: 'test-error',
        description: `Failed to test security headers: ${error.message}`
      });
    }

    return findings;
  }

  /**
   * Test for information disclosure vulnerabilities
   */
  async testInformationDisclosure(baseUrl) {
    const findings = [];
    const testPaths = [
      '/.env',
      '/config.json',
      '/package.json',
      '/.git/config',
      '/admin',
      '/debug',
      '/api/debug',
      '/server-status',
      '/info.php',
      '/phpinfo.php'
    ];

    for (const testPath of testPaths) {
      try {
        const response = await fetch(`${baseUrl}${testPath}`);
        
        if (response.ok) {
          const severity = testPath.includes('.env') || testPath.includes('.git') ? 'CRITICAL' : 'HIGH';
          findings.push({
            severity,
            category: 'information-disclosure',
            url: `${baseUrl}${testPath}`,
            description: `Sensitive file or endpoint accessible: ${testPath}`,
            recommendation: `Restrict access to ${testPath} or remove it from public access`
          });
        }
      } catch (error) {
        // Expected for most paths - not a finding
      }
    }

    return findings;
  }

  /**
   * Test for common web vulnerabilities
   */
  async testCommonVulnerabilities(baseUrl) {
    const findings = [];

    try {
      // Test for clickjacking protection
      const response = await fetch(baseUrl);
      const xFrameOptions = response.headers.get('x-frame-options');
      const csp = response.headers.get('content-security-policy');
      
      if (!xFrameOptions && (!csp || !csp.includes('frame-ancestors'))) {
        findings.push({
          severity: 'MEDIUM',
          category: 'clickjacking',
          url: baseUrl,
          description: 'Missing clickjacking protection',
          recommendation: 'Add X-Frame-Options header or frame-ancestors CSP directive'
        });
      }

      // Test for HTTPS redirect
      try {
        const httpUrl = baseUrl.replace('https://', 'http://');
        const httpResponse = await fetch(httpUrl, { redirect: 'manual' });
        
        if (!httpResponse.headers.get('location')?.startsWith('https://')) {
          findings.push({
            severity: 'HIGH',
            category: 'insecure-transport',
            url: httpUrl,
            description: 'HTTP not redirected to HTTPS',
            recommendation: 'Implement HTTPS redirect for all HTTP requests'
          });
        }
      } catch (error) {
        // HTTP might not be available - not necessarily a finding
      }

    } catch (error) {
      findings.push({
        severity: 'LOW',
        category: 'test-error',
        description: `Failed to test common vulnerabilities: ${error.message}`
      });
    }

    return findings;
  }

  /**
   * Run dependency vulnerability analysis
   */
  async runDependencyAnalysis() {
    console.log('📦 Running dependency vulnerability analysis...');
    
    const dependencyResults = {};

    // NPM Audit
    if (this.availableTools.includes('npm audit')) {
      console.log('📊 Running npm audit...');
      dependencyResults.npmAudit = await this.runNpmAudit();
    }

    // Snyk (if available)
    if (this.availableTools.includes('snyk')) {
      console.log('🔍 Running Snyk analysis...');
      dependencyResults.snyk = await this.runSnyk();
    }

    // Safety for Python dependencies (if available)
    if (this.availableTools.includes('safety')) {
      console.log('🐍 Running Safety analysis...');
      dependencyResults.safety = await this.runSafety();
    }

    this.results.dependencies = dependencyResults;
    await this.saveResults('dependencies', dependencyResults);
    
    console.log('✅ Dependency analysis completed');
    return dependencyResults;
  }

  /**
   * Run npm audit for Node.js dependencies
   */
  async runNpmAudit() {
    try {
      const { stdout } = await execAsync('npm audit --json', { cwd: process.cwd() });
      const results = JSON.parse(stdout);

      const summary = {
        totalVulnerabilities: results.metadata?.vulnerabilities?.total || 0,
        critical: results.metadata?.vulnerabilities?.critical || 0,
        high: results.metadata?.vulnerabilities?.high || 0,
        medium: results.metadata?.vulnerabilities?.moderate || 0,
        low: results.metadata?.vulnerabilities?.low || 0
      };

      return {
        tool: 'npm-audit',
        status: 'completed',
        summary,
        rawResults: results,
        reportPath: path.join(this.reportDir, 'npm-audit.json')
      };
    } catch (error) {
      return {
        tool: 'npm-audit',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Run Snyk vulnerability analysis
   */
  async runSnyk() {
    try {
      const { stdout } = await execAsync('snyk test --json', { cwd: process.cwd() });
      const results = JSON.parse(stdout);

      const summary = {
        totalVulnerabilities: results.vulnerabilities?.length || 0,
        critical: results.vulnerabilities?.filter(v => v.severity === 'critical').length || 0,
        high: results.vulnerabilities?.filter(v => v.severity === 'high').length || 0,
        medium: results.vulnerabilities?.filter(v => v.severity === 'medium').length || 0,
        low: results.vulnerabilities?.filter(v => v.severity === 'low').length || 0
      };

      return {
        tool: 'snyk',
        status: 'completed',
        summary,
        rawResults: results,
        reportPath: path.join(this.reportDir, 'snyk.json')
      };
    } catch (error) {
      return {
        tool: 'snyk',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Run Safety analysis for Python dependencies
   */
  async runSafety() {
    try {
      const { stdout } = await execAsync('safety check --json', { cwd: process.cwd() });
      const results = JSON.parse(stdout);

      const summary = {
        totalVulnerabilities: results.length || 0,
        high: results.filter(v => v.vulnerability_id?.startsWith('44')).length || 0, // High severity heuristic
        medium: results.length - (results.filter(v => v.vulnerability_id?.startsWith('44')).length || 0)
      };

      return {
        tool: 'safety',
        status: 'completed',
        summary,
        rawResults: results,
        reportPath: path.join(this.reportDir, 'safety.json')
      };
    } catch (error) {
      return {
        tool: 'safety',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive security report
   */
  async generateReport() {
    console.log('📊 Generating comprehensive security report...');

    const overallSummary = this.calculateOverallSummary();
    const recommendations = this.generateRecommendations();
    
    const report = {
      scanId: this.scanId,
      timestamp: new Date().toISOString(),
      config: {
        environment: 'development',
        tools: this.availableTools
      },
      summary: overallSummary,
      results: this.results,
      recommendations,
      compliance: this.assessCompliance()
    };

    // Save main report
    await this.saveResults('final-report', report);

    // Generate HTML report
    await this.generateHTMLReport(report);

    // Generate SARIF report for integration with security tools
    await this.generateSARIFReport(report);

    console.log(`📋 Security report generated: ${this.reportDir}/final-report.json`);
    console.log(`🌐 HTML report available: ${this.reportDir}/security-report.html`);
    
    return report;
  }

  /**
   * Calculate overall security summary
   */
  calculateOverallSummary() {
    const summary = {
      totalFindings: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      categories: {}
    };

    // Aggregate findings from all tools
    for (const [category, results] of Object.entries(this.results)) {
      for (const [tool, result] of Object.entries(results)) {
        if (result.summary) {
          summary.totalFindings += result.summary.totalFindings || 0;
          summary.critical += result.summary.critical || 0;
          summary.high += result.summary.high || 0;
          summary.medium += result.summary.medium || 0;
          summary.low += result.summary.low || 0;
        }
      }
    }

    // Calculate security score (0-100)
    const maxScore = 100;
    const criticalPenalty = summary.critical * 10;
    const highPenalty = summary.high * 5;
    const mediumPenalty = summary.medium * 2;
    const lowPenalty = summary.low * 1;
    
    summary.securityScore = Math.max(0, maxScore - criticalPenalty - highPenalty - mediumPenalty - lowPenalty);
    summary.riskLevel = this.calculateRiskLevel(summary.securityScore);

    return summary;
  }

  /**
   * Calculate risk level based on security score
   */
  calculateRiskLevel(score) {
    if (score >= 90) return 'LOW';
    if (score >= 70) return 'MEDIUM';
    if (score >= 50) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Analyze results and generate recommendations
    if (this.results.sast) {
      Object.values(this.results.sast).forEach(result => {
        if (result.findings) {
          result.findings.forEach(finding => {
            if (finding.recommendation) {
              recommendations.push({
                priority: finding.severity,
                category: finding.category,
                recommendation: finding.recommendation,
                file: finding.file
              });
            }
          });
        }
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Assess compliance with security frameworks
   */
  assessCompliance() {
    const compliance = {};

    // OWASP Top 10 assessment
    if (this.config.compliance.frameworks.owasp_top10.enabled) {
      compliance.owasp_top10 = this.assessOWASPCompliance();
    }

    return compliance;
  }

  /**
   * Assess OWASP Top 10 compliance
   */
  assessOWASPCompliance() {
    const categories = this.config.compliance.frameworks.owasp_top10.categories;
    const assessment = {};

    categories.forEach(category => {
      assessment[category] = {
        status: 'PARTIAL', // This would be determined by analyzing findings
        findings: 0,
        recommendations: []
      };
    });

    return assessment;
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report - ${report.scanId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .critical { background-color: #dc3545; color: white; }
        .high { background-color: #fd7e14; color: white; }
        .medium { background-color: #ffc107; color: black; }
        .low { background-color: #28a745; color: white; }
        .findings { margin-top: 30px; }
        .finding { background: #fff; border: 1px solid #dee2e6; margin: 10px 0; padding: 15px; border-radius: 4px; }
        .recommendations { margin-top: 30px; }
        .recommendation { background: #e3f2fd; padding: 15px; margin: 10px 0; border-left: 4px solid #2196f3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Security Scan Report</h1>
            <p>Scan ID: ${report.scanId}</p>
            <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Security Score</h3>
                <div style="font-size: 2em; font-weight: bold;">${report.summary.securityScore}/100</div>
                <div>Risk Level: ${report.summary.riskLevel}</div>
            </div>
            <div class="metric critical">
                <h3>Critical</h3>
                <div style="font-size: 2em;">${report.summary.critical}</div>
            </div>
            <div class="metric high">
                <h3>High</h3>
                <div style="font-size: 2em;">${report.summary.high}</div>
            </div>
            <div class="metric medium">
                <h3>Medium</h3>
                <div style="font-size: 2em;">${report.summary.medium}</div>
            </div>
            <div class="metric low">
                <h3>Low</h3>
                <div style="font-size: 2em;">${report.summary.low}</div>
            </div>
        </div>
        
        <div class="recommendations">
            <h2>Top Recommendations</h2>
            ${report.recommendations.slice(0, 10).map(rec => `
                <div class="recommendation">
                    <strong>[${rec.priority}] ${rec.category}</strong><br>
                    ${rec.recommendation}
                    ${rec.file ? `<br><small>File: ${rec.file}</small>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(path.join(this.reportDir, 'security-report.html'), htmlTemplate);
  }

  /**
   * Generate SARIF report for tool integration
   */
  async generateSARIFReport(report) {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: []
    };

    // Convert findings to SARIF format
    for (const [category, results] of Object.entries(report.results)) {
      for (const [tool, result] of Object.entries(results)) {
        if (result.findings) {
          const run = {
            tool: {
              driver: {
                name: tool,
                version: '1.0.0'
              }
            },
            results: result.findings.map(finding => ({
              ruleId: finding.category,
              level: this.severityToSarifLevel(finding.severity),
              message: {
                text: finding.description
              },
              locations: finding.file ? [{
                physicalLocation: {
                  artifactLocation: {
                    uri: finding.file
                  }
                }
              }] : []
            }))
          };
          sarif.runs.push(run);
        }
      }
    }

    await fs.writeFile(path.join(this.reportDir, 'security-report.sarif'), JSON.stringify(sarif, null, 2));
  }

  /**
   * Convert severity to SARIF level
   */
  severityToSarifLevel(severity) {
    const mapping = {
      CRITICAL: 'error',
      HIGH: 'error',
      MEDIUM: 'warning',
      LOW: 'note'
    };
    return mapping[severity] || 'info';
  }

  /**
   * Utility: Find files matching pattern
   */
  async findFiles(dir, pattern) {
    const files = [];
    
    async function walk(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(fullPath);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await walk(dir);
    return files;
  }

  /**
   * Categorize findings by type
   */
  categorizeFindings(findings) {
    const categories = {};
    
    findings.forEach(finding => {
      const category = finding.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return categories;
  }

  /**
   * Save results to file
   */
  async saveResults(name, data) {
    const filePath = path.join(this.reportDir, `${name}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Run complete security scan
   */
  async runCompleteScan() {
    console.log('🚀 Starting comprehensive security scan...');
    
    try {
      await this.initialize();
      
      // Run all security tests
      await this.runSAST();
      await this.runDAST();
      await this.runDependencyAnalysis();
      
      // Generate final report
      const report = await this.generateReport();
      
      console.log('✅ Security scan completed successfully');
      console.log(`📊 Security Score: ${report.summary.securityScore}/100 (${report.summary.riskLevel} risk)`);
      console.log(`🔍 Total Findings: ${report.summary.totalFindings}`);
      console.log(`🔴 Critical: ${report.summary.critical}, 🟠 High: ${report.summary.high}, 🟡 Medium: ${report.summary.medium}, 🟢 Low: ${report.summary.low}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Security scan failed:', error.message);
      throw error;
    }
  }
}

export default AutomatedSecurityScanner;