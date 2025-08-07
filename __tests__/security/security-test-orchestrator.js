/**
 * Security Test Orchestrator
 * Main orchestrator for all security testing workflows
 */

import { test, expect } from '@playwright/test';
import AutomatedSecurityScanner from './sast-dast/automated-scanner.js';
import AutomatedPenetrationTester from './penetration-testing/automated-pentest.js';
import APISecurityTester from './api-security/api-security-tests.js';
import GDPRComplianceTester from './gdpr-compliance/gdpr-compliance-tests.js';
import ContinuousSecurityMonitor from './monitoring/continuous-security-monitor.js';
import SecurityReportingDashboard from './reporting/security-dashboard.js';
import { SECURITY_CONFIG } from './config/security-config.js';
import fs from 'fs/promises';
import path from 'path';

export class SecurityTestOrchestrator {
  constructor(options = {}) {
    this.config = { ...SECURITY_CONFIG, ...options };
    this.results = {
      sast: null,
      dast: null,
      penetration: null,
      api: null,
      gdpr: null,
      monitoring: null
    };
    this.reportDir = path.join(process.cwd(), '__tests__/security/reports');
    this.startTime = Date.now();
  }

  /**
   * Run complete security testing suite
   */
  async runCompleteSuite(page, testTypes = ['all']) {
    console.log('🚀 Starting comprehensive security testing suite...');
    console.log(`📋 Test types: ${testTypes.join(', ')}`);

    try {
      // Ensure report directory exists
      await fs.mkdir(this.reportDir, { recursive: true });

      // Create execution plan
      const executionPlan = this.createExecutionPlan(testTypes);
      console.log(`📅 Execution plan created with ${executionPlan.length} test phases`);

      // Execute security tests according to plan
      for (const phase of executionPlan) {
        console.log(`\n🔄 Executing phase: ${phase.name}`);
        await this.executePhase(phase, page);
      }

      // Generate comprehensive reports
      const finalReport = await this.generateFinalReport();

      // Calculate overall security posture
      const securityPosture = this.calculateSecurityPosture();

      console.log('\n✅ Security testing suite completed successfully');
      console.log(`📊 Overall Security Score: ${securityPosture.overallScore}/100`);
      console.log(`🎯 Risk Level: ${securityPosture.riskLevel}`);
      console.log(`📈 Total Findings: ${securityPosture.totalFindings}`);

      return {
        results: this.results,
        finalReport,
        securityPosture,
        executionTime: Date.now() - this.startTime
      };

    } catch (error) {
      console.error('❌ Security testing suite failed:', error.message);
      throw error;
    }
  }

  /**
   * Create execution plan based on test types
   */
  createExecutionPlan(testTypes) {
    const allPhases = [
      {
        name: 'Static Analysis (SAST)',
        type: 'sast',
        priority: 1,
        parallel: false,
        estimatedTime: 300000, // 5 minutes
        dependencies: []
      },
      {
        name: 'Dynamic Analysis (DAST)',
        type: 'dast',
        priority: 2,
        parallel: false,
        estimatedTime: 600000, // 10 minutes
        dependencies: []
      },
      {
        name: 'API Security Testing',
        type: 'api',
        priority: 3,
        parallel: false,
        estimatedTime: 480000, // 8 minutes
        dependencies: []
      },
      {
        name: 'Penetration Testing',
        type: 'penetration',
        priority: 4,
        parallel: false,
        estimatedTime: 900000, // 15 minutes
        dependencies: ['sast', 'dast']
      },
      {
        name: 'GDPR Compliance Testing',
        type: 'gdpr',
        priority: 5,
        parallel: true,
        estimatedTime: 300000, // 5 minutes
        dependencies: []
      },
      {
        name: 'Security Monitoring Setup',
        type: 'monitoring',
        priority: 6,
        parallel: true,
        estimatedTime: 120000, // 2 minutes
        dependencies: []
      }
    ];

    // Filter phases based on requested test types
    let selectedPhases = allPhases;
    
    if (!testTypes.includes('all')) {
      selectedPhases = allPhases.filter(phase => testTypes.includes(phase.type));
    }

    // Sort by priority
    return selectedPhases.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute a test phase
   */
  async executePhase(phase, page) {
    const startTime = Date.now();
    
    try {
      console.log(`⏱️ Starting ${phase.name} (estimated: ${Math.round(phase.estimatedTime / 60000)} minutes)`);

      switch (phase.type) {
        case 'sast':
          this.results.sast = await this.runSASTTests();
          break;
        case 'dast':
          this.results.dast = await this.runDASTTests();
          break;
        case 'api':
          this.results.api = await this.runAPISecurityTests(page);
          break;
        case 'penetration':
          this.results.penetration = await this.runPenetrationTests(page);
          break;
        case 'gdpr':
          this.results.gdpr = await this.runGDPRComplianceTests(page);
          break;
        case 'monitoring':
          this.results.monitoring = await this.setupSecurityMonitoring();
          break;
        default:
          console.warn(`Unknown test type: ${phase.type}`);
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ ${phase.name} completed in ${Math.round(executionTime / 1000)}s`);

      // Save intermediate results
      await this.saveIntermediateResults(phase.type, this.results[phase.type]);

    } catch (error) {
      console.error(`❌ ${phase.name} failed:`, error.message);
      this.results[phase.type] = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run SAST tests
   */
  async runSASTTests() {
    console.log('🔍 Running Static Application Security Testing (SAST)...');
    
    const scanner = new AutomatedSecurityScanner();
    const sastResults = await scanner.runSAST();
    
    console.log(`✅ SAST completed - ${this.countFindings(sastResults)} findings`);
    return sastResults;
  }

  /**
   * Run DAST tests
   */
  async runDASTTests() {
    console.log('🎯 Running Dynamic Application Security Testing (DAST)...');
    
    const scanner = new AutomatedSecurityScanner();
    const dastResults = await scanner.runDAST();
    
    console.log(`✅ DAST completed - ${this.countFindings(dastResults)} findings`);
    return dastResults;
  }

  /**
   * Run API security tests
   */
  async runAPISecurityTests(page) {
    console.log('🛡️ Running API Security Testing...');
    
    const apiTester = new APISecurityTester(page);
    const apiResults = await apiTester.runAPISecurityTests();
    
    console.log(`✅ API Security Testing completed - ${apiResults.summary?.totalTests || 0} tests run`);
    return apiResults;
  }

  /**
   * Run penetration tests
   */
  async runPenetrationTests(page) {
    console.log('🎯 Running Automated Penetration Testing...');
    
    const penTester = new AutomatedPenetrationTester(page);
    const penResults = await penTester.runPenetrationTests();
    
    console.log(`✅ Penetration Testing completed - ${penResults.summary?.totalTests || 0} tests run`);
    return penResults;
  }

  /**
   * Run GDPR compliance tests
   */
  async runGDPRComplianceTests(page) {
    console.log('🇪🇺 Running GDPR Compliance Testing...');
    
    const gdprTester = new GDPRComplianceTester(page);
    const gdprResults = await gdprTester.runGDPRComplianceTests();
    
    console.log(`✅ GDPR Compliance Testing completed - ${gdprResults.summary?.totalTests || 0} tests run`);
    return gdprResults;
  }

  /**
   * Setup security monitoring
   */
  async setupSecurityMonitoring() {
    console.log('🔄 Setting up Security Monitoring...');
    
    const monitor = new ContinuousSecurityMonitor();
    
    // For testing purposes, we'll just initialize and get configuration
    const monitoringResults = {
      status: 'configured',
      timestamp: new Date().toISOString(),
      configuration: {
        scanInterval: this.config.monitoring.continuousMonitoring.scanInterval,
        alertThresholds: this.config.monitoring.alerts,
        reportingEnabled: true
      },
      recommendations: [
        'Enable continuous monitoring in production environment',
        'Configure alert webhooks for immediate notification',
        'Set up log aggregation for security event correlation',
        'Implement automated response procedures for critical alerts'
      ]
    };
    
    console.log('✅ Security Monitoring configuration completed');
    return monitoringResults;
  }

  /**
   * Generate final comprehensive report
   */
  async generateFinalReport() {
    console.log('📊 Generating comprehensive security report...');
    
    const dashboard = new SecurityReportingDashboard();
    const dashboardData = await dashboard.generateSecurityDashboard(this.results);
    
    // Create executive summary
    const executiveSummary = await this.createExecutiveSummary();
    
    // Create remediation plan
    const remediationPlan = await this.createRemediationPlan();
    
    // Create compliance assessment
    const complianceAssessment = await this.createComplianceAssessment();
    
    const finalReport = {
      metadata: {
        scanId: `security_suite_${Date.now()}`,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - this.startTime,
        testTypes: Object.keys(this.results).filter(key => this.results[key] !== null),
        version: '1.0.0'
      },
      executiveSummary,
      dashboardData,
      results: this.results,
      remediationPlan,
      complianceAssessment,
      recommendations: this.generateTopRecommendations(),
      nextSteps: this.generateNextSteps()
    };

    // Save final report
    const reportPath = path.join(this.reportDir, 'final-security-report.json');
    await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
    
    console.log(`📋 Final security report saved: ${reportPath}`);
    return finalReport;
  }

  /**
   * Create executive summary
   */
  async createExecutiveSummary() {
    const securityPosture = this.calculateSecurityPosture();
    const testTypes = Object.keys(this.results).filter(key => this.results[key] !== null);
    
    return {
      overallScore: securityPosture.overallScore,
      riskLevel: securityPosture.riskLevel,
      totalFindings: securityPosture.totalFindings,
      criticalIssues: securityPosture.critical,
      highIssues: securityPosture.high,
      testsConducted: testTypes.length,
      executionTime: Math.round((Date.now() - this.startTime) / 60000), // minutes
      keyFindings: securityPosture.keyFindings,
      immediateActions: securityPosture.immediateActions,
      summary: this.generateSummaryText(securityPosture)
    };
  }

  /**
   * Generate summary text
   */
  generateSummaryText(posture) {
    let summary = `Security assessment of the 6FB AI Agent System has been completed. `;
    
    if (posture.totalFindings === 0) {
      summary += `No security vulnerabilities were identified across all tested components. The system demonstrates excellent security posture.`;
    } else {
      summary += `A total of ${posture.totalFindings} security finding${posture.totalFindings > 1 ? 's' : ''} were identified. `;
      
      if (posture.critical > 0) {
        summary += `⚠️ ${posture.critical} critical issue${posture.critical > 1 ? 's' : ''} require immediate remediation. `;
      }
      
      if (posture.high > 0) {
        summary += `${posture.high} high-severity issue${posture.high > 1 ? 's' : ''} should be addressed within 7 days. `;
      }
      
      if (posture.medium > 0) {
        summary += `${posture.medium} medium-severity issue${posture.medium > 1 ? 's' : ''} should be addressed within 30 days. `;
      }
    }
    
    summary += `The overall security score is ${posture.overallScore}/100, indicating ${posture.riskLevel.toLowerCase()} risk level.`;
    
    return summary;
  }

  /**
   * Create remediation plan
   */
  async createRemediationPlan() {
    const allFindings = this.getAllFindings();
    const prioritizedFindings = this.prioritizeFindings(allFindings);
    
    return {
      immediate: prioritizedFindings.filter(f => f.priority === 'IMMEDIATE').slice(0, 5),
      shortTerm: prioritizedFindings.filter(f => f.priority === 'SHORT_TERM').slice(0, 10),
      longTerm: prioritizedFindings.filter(f => f.priority === 'LONG_TERM').slice(0, 15),
      timeline: {
        immediate: '24 hours',
        shortTerm: '7 days',
        longTerm: '30 days'
      },
      estimatedEffort: this.estimateRemediationEffort(prioritizedFindings)
    };
  }

  /**
   * Create compliance assessment
   */
  async createComplianceAssessment() {
    const frameworks = {
      'OWASP Top 10': this.assessOWASPCompliance(),
      'GDPR': this.assessGDPRCompliance(),
      'ISO 27001': this.assessISO27001Compliance(),
      'NIST Cybersecurity Framework': this.assessNISTCompliance()
    };

    return {
      frameworks,
      overallCompliance: this.calculateOverallCompliance(frameworks),
      gaps: this.identifyComplianceGaps(frameworks),
      recommendations: this.generateComplianceRecommendations(frameworks)
    };
  }

  /**
   * Calculate security posture
   */
  calculateSecurityPosture() {
    const allFindings = this.getAllFindings();
    const criticalCount = allFindings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = allFindings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = allFindings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = allFindings.filter(f => f.severity === 'LOW').length;

    // Calculate overall security score
    const criticalPenalty = criticalCount * 25;
    const highPenalty = highCount * 15;
    const mediumPenalty = mediumCount * 8;
    const lowPenalty = lowCount * 3;
    
    const overallScore = Math.max(0, 100 - criticalPenalty - highPenalty - mediumPenalty - lowPenalty);
    
    // Determine risk level
    let riskLevel = 'LOW';
    if (overallScore < 50) riskLevel = 'CRITICAL';
    else if (overallScore < 70) riskLevel = 'HIGH';
    else if (overallScore < 85) riskLevel = 'MEDIUM';

    // Identify key findings
    const keyFindings = allFindings
      .filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
      .slice(0, 5)
      .map(f => ({
        severity: f.severity,
        description: f.description || f.title || 'Security issue',
        category: f.category,
        source: f.source
      }));

    // Generate immediate actions
    const immediateActions = [];
    if (criticalCount > 0) {
      immediateActions.push(`Address ${criticalCount} critical security issue${criticalCount > 1 ? 's' : ''}`);
    }
    if (highCount > 0) {
      immediateActions.push(`Remediate ${highCount} high-severity vulnerability${highCount > 1 ? 'ies' : 'y'}`);
    }
    if (immediateActions.length === 0) {
      immediateActions.push('Continue regular security monitoring and assessment');
    }

    return {
      overallScore,
      riskLevel,
      totalFindings: allFindings.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      keyFindings,
      immediateActions
    };
  }

  /**
   * Get all findings from all test results
   */
  getAllFindings() {
    const allFindings = [];

    // Extract findings from each test type
    Object.entries(this.results).forEach(([testType, result]) => {
      if (!result) return;

      // Handle different result structures
      if (result.findings) {
        allFindings.push(...result.findings.map(f => ({ ...f, source: testType })));
      }
      
      if (result.results && Array.isArray(result.results)) {
        allFindings.push(...result.results.map(f => ({ ...f, source: testType })));
      }
      
      if (result.vulnerabilities) {
        Object.entries(result.vulnerabilities).forEach(([severity, vulns]) => {
          allFindings.push(...vulns.map(v => ({ ...v, severity: severity.toUpperCase(), source: testType })));
        });
      }

      // Handle nested results structure
      if (result.results && typeof result.results === 'object') {
        Object.values(result.results).forEach(category => {
          if (typeof category === 'object') {
            Object.values(category).forEach(tool => {
              if (tool.findings) {
                allFindings.push(...tool.findings.map(f => ({ ...f, source: testType })));
              }
            });
          }
        });
      }
    });

    return allFindings;
  }

  /**
   * Prioritize findings for remediation
   */
  prioritizeFindings(findings) {
    return findings.map(finding => {
      let priority = 'LONG_TERM';
      
      if (finding.severity === 'CRITICAL') {
        priority = 'IMMEDIATE';
      } else if (finding.severity === 'HIGH') {
        priority = 'SHORT_TERM';
      } else if (finding.category && ['authentication', 'authorization', 'injection'].includes(finding.category.toLowerCase())) {
        priority = 'SHORT_TERM';
      }
      
      return { ...finding, priority };
    }).sort((a, b) => {
      const priorityOrder = { IMMEDIATE: 3, SHORT_TERM: 2, LONG_TERM: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate top recommendations
   */
  generateTopRecommendations() {
    const allFindings = this.getAllFindings();
    const categories = {};

    // Group findings by category
    allFindings.forEach(finding => {
      const category = finding.category || 'general';
      categories[category] = (categories[category] || 0) + 1;
    });

    // Generate recommendations based on most common categories
    const topCategories = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const recommendations = topCategories.map(([category, count]) => ({
      category,
      priority: count >= 5 ? 'HIGH' : count >= 3 ? 'MEDIUM' : 'LOW',
      recommendation: this.getRecommendationForCategory(category),
      affectedFindings: count
    }));

    return recommendations;
  }

  /**
   * Get recommendation for category
   */
  getRecommendationForCategory(category) {
    const categoryRecommendations = {
      'sql-injection': 'Implement parameterized queries and input validation',
      'xss': 'Implement proper output encoding and Content Security Policy',
      'authentication': 'Strengthen authentication mechanisms and session management',
      'authorization': 'Implement proper access controls and permission checks',
      'cors': 'Configure CORS policy to restrict cross-origin requests',
      'security-headers': 'Implement comprehensive security headers',
      'input-validation': 'Implement comprehensive input validation and sanitization',
      'encryption': 'Implement proper encryption for data at rest and in transit',
      'logging': 'Enhance security logging and monitoring capabilities',
      'configuration': 'Review and harden security configuration settings'
    };

    return categoryRecommendations[category] || `Review and address ${category} related security issues`;
  }

  /**
   * Generate next steps
   */
  generateNextSteps() {
    const posture = this.calculateSecurityPosture();
    const steps = [
      'Review and prioritize all identified security findings',
      'Implement remediation plan according to established timeline',
      'Set up continuous security monitoring and alerting',
      'Schedule regular security assessments and penetration testing',
      'Provide security training for development and operations teams'
    ];

    if (posture.critical > 0) {
      steps.unshift('URGENT: Address all critical security vulnerabilities immediately');
    }

    if (posture.high > 0) {
      steps.splice(1, 0, 'Address high-severity vulnerabilities within 7 days');
    }

    return steps;
  }

  /**
   * Assess GDPR compliance
   */
  assessGDPRCompliance() {
    const gdprResult = this.results.gdpr;
    if (!gdprResult) return { status: 'NOT_TESTED', score: 0 };

    const totalTests = gdprResult.summary?.totalTests || 0;
    const passedTests = gdprResult.summary?.passed || 0;
    
    return {
      status: passedTests / totalTests >= 0.8 ? 'COMPLIANT' : 'NON_COMPLIANT',
      score: Math.round((passedTests / totalTests) * 100),
      gaps: gdprResult.summary?.high + gdprResult.summary?.medium || 0
    };
  }

  /**
   * Utility methods
   */
  
  countFindings(results) {
    if (!results) return 0;
    if (results.summary?.totalFindings) return results.summary.totalFindings;
    if (results.findings) return results.findings.length;
    return 0;
  }

  async saveIntermediateResults(testType, results) {
    const filename = `${testType}-results-${Date.now()}.json`;
    const filepath = path.join(this.reportDir, 'intermediate', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
  }

  assessOWASPCompliance() {
    // Placeholder implementation
    return { status: 'PARTIAL', score: 75 };
  }

  assessISO27001Compliance() {
    // Placeholder implementation
    return { status: 'PARTIAL', score: 70 };
  }

  assessNISTCompliance() {
    // Placeholder implementation
    return { status: 'PARTIAL', score: 72 };
  }

  calculateOverallCompliance(frameworks) {
    const scores = Object.values(frameworks).map(f => f.score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  identifyComplianceGaps(frameworks) {
    return Object.entries(frameworks).map(([name, assessment]) => ({
      framework: name,
      status: assessment.status,
      score: assessment.score,
      gaps: assessment.gaps || 0
    }));
  }

  generateComplianceRecommendations(frameworks) {
    return [
      'Implement comprehensive security policy framework',
      'Establish regular compliance assessment schedule',
      'Provide compliance training for all personnel',
      'Document all security procedures and controls',
      'Implement continuous compliance monitoring'
    ];
  }

  estimateRemediationEffort(findings) {
    const effortMap = {
      'IMMEDIATE': 1, // 1 day per finding
      'SHORT_TERM': 3, // 3 days per finding
      'LONG_TERM': 1 // 1 day per finding
    };

    const effort = findings.reduce((total, finding) => {
      return total + (effortMap[finding.priority] || 1);
    }, 0);

    return {
      totalDays: effort,
      totalWeeks: Math.ceil(effort / 5),
      distribution: {
        immediate: findings.filter(f => f.priority === 'IMMEDIATE').length,
        shortTerm: findings.filter(f => f.priority === 'SHORT_TERM').length,
        longTerm: findings.filter(f => f.priority === 'LONG_TERM').length
      }
    };
  }
}

export default SecurityTestOrchestrator;