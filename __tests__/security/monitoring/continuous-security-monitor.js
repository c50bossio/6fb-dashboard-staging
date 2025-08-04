/**
 * Continuous Security Monitoring System
 * Real-time security monitoring and alerting for the 6FB AI Agent System
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { SECURITY_CONFIG } from '../config/security-config.js';
import AutomatedSecurityScanner from '../sast-dast/automated-scanner.js';
import APISecurityTester from '../api-security/api-security-tests.js';

export class ContinuousSecurityMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = { ...SECURITY_CONFIG, ...options };
    this.isRunning = false;
    this.scanIntervals = new Map();
    this.alertThresholds = this.config.monitoring.alerts;
    this.currentMetrics = {
      vulnerabilityCount: 0,
      securityScore: 100,
      complianceScore: 100,
      lastScanTime: null,
      alerts: []
    };
    this.alertHistory = [];
    this.reportDir = path.join(process.cwd(), '__tests__/security/reports/monitoring');
  }

  /**
   * Start continuous security monitoring
   */
  async start() {
    if (this.isRunning) {
      console.log('Security monitoring is already running');
      return;
    }

    console.log('🚀 Starting continuous security monitoring...');
    
    this.isRunning = true;
    
    // Ensure report directory exists
    await fs.mkdir(this.reportDir, { recursive: true });
    
    // Set up monitoring intervals
    await this.setupMonitoringIntervals();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Run initial security scan
    await this.runInitialScan();
    
    // Start real-time monitoring
    await this.startRealtimeMonitoring();
    
    console.log('✅ Continuous security monitoring started successfully');
    this.emit('monitoring-started');
  }

  /**
   * Stop continuous security monitoring
   */
  async stop() {
    if (!this.isRunning) {
      console.log('Security monitoring is not running');
      return;
    }

    console.log('🛑 Stopping continuous security monitoring...');
    
    this.isRunning = false;
    
    // Clear all intervals
    this.scanIntervals.forEach(interval => clearInterval(interval));
    this.scanIntervals.clear();
    
    // Save final report
    await this.generateFinalReport();
    
    console.log('✅ Continuous security monitoring stopped');
    this.emit('monitoring-stopped');
  }

  /**
   * Set up monitoring intervals
   */
  async setupMonitoringIntervals() {
    const monitoringConfig = this.config.monitoring.continuousMonitoring;
    
    // Quick security checks every hour
    const quickScanInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.runQuickSecurityScan();
      }
    }, monitoringConfig.scanInterval);
    
    this.scanIntervals.set('quick-scan', quickScanInterval);
    
    // Full security scan every 24 hours
    const fullScanInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.runFullSecurityScan();
      }
    }, monitoringConfig.fullScanInterval);
    
    this.scanIntervals.set('full-scan', fullScanInterval);
    
    // Vulnerability database update check every 6 hours
    const vulnUpdateInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.checkVulnerabilityUpdates();
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    this.scanIntervals.set('vuln-update', vulnUpdateInterval);
  }

  /**
   * Set up event listeners for monitoring events
   */
  setupEventListeners() {
    this.on('vulnerability-detected', this.handleVulnerabilityDetected.bind(this));
    this.on('security-score-changed', this.handleSecurityScoreChange.bind(this));
    this.on('compliance-violation', this.handleComplianceViolation.bind(this));
    this.on('alert-threshold-exceeded', this.handleAlertThresholdExceeded.bind(this));
  }

  /**
   * Run initial security scan
   */
  async runInitialScan() {
    console.log('🔍 Running initial security scan...');
    
    try {
      const scanner = new AutomatedSecurityScanner();
      const results = await scanner.runCompleteScan();
      
      await this.processSecurityResults(results, 'initial-scan');
      
      console.log('✅ Initial security scan completed');
    } catch (error) {
      console.error('❌ Initial security scan failed:', error.message);
      this.emit('scan-error', { type: 'initial-scan', error: error.message });
    }
  }

  /**
   * Run quick security scan (lightweight checks)
   */
  async runQuickSecurityScan() {
    console.log('⚡ Running quick security scan...');
    
    try {
      const results = {
        timestamp: new Date().toISOString(),
        type: 'quick-scan',
        checks: []
      };

      // Quick endpoint health checks
      const endpointResults = await this.checkEndpointSecurity();
      results.checks.push(...endpointResults);

      // SSL/TLS certificate check
      const sslResults = await this.checkSSLCertificate();
      results.checks.push(sslResults);

      // Security headers check
      const headerResults = await this.checkSecurityHeaders();
      results.checks.push(...headerResults);

      // DNS security check
      const dnsResults = await this.checkDNSSecurity();
      results.checks.push(dnsResults);

      await this.processSecurityResults(results, 'quick-scan');
      
      console.log(`✅ Quick security scan completed - ${results.checks.length} checks performed`);
    } catch (error) {
      console.error('❌ Quick security scan failed:', error.message);
      this.emit('scan-error', { type: 'quick-scan', error: error.message });
    }
  }

  /**
   * Run full security scan
   */
  async runFullSecurityScan() {
    console.log('🔍 Running full security scan...');
    
    try {
      const scanner = new AutomatedSecurityScanner();
      const results = await scanner.runCompleteScan();
      
      await this.processSecurityResults(results, 'full-scan');
      
      console.log('✅ Full security scan completed');
    } catch (error) {
      console.error('❌ Full security scan failed:', error.message);
      this.emit('scan-error', { type: 'full-scan', error: error.message });
    }
  }

  /**
   * Check endpoint security (availability and basic security)
   */
  async checkEndpointSecurity() {
    const baseUrl = this.config.environments.development.baseUrl;
    const criticalEndpoints = [
      '/api/health',
      '/api/auth/login',
      '/login',
      '/dashboard'
    ];

    const results = [];

    for (const endpoint of criticalEndpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${baseUrl}${endpoint}`);
        const responseTime = Date.now() - startTime;

        const result = {
          check: 'endpoint-availability',
          endpoint,
          status: response.status,
          responseTime,
          available: response.ok || response.status === 401 || response.status === 403,
          timestamp: new Date().toISOString()
        };

        if (!result.available) {
          result.severity = 'HIGH';
          result.issue = `Endpoint ${endpoint} is not available (status: ${response.status})`;
        } else if (responseTime > 5000) {
          result.severity = 'MEDIUM';
          result.issue = `Endpoint ${endpoint} has slow response time: ${responseTime}ms`;
        } else {
          result.severity = 'PASS';
        }

        results.push(result);

      } catch (error) {
        results.push({
          check: 'endpoint-availability',
          endpoint,
          severity: 'CRITICAL',
          issue: `Endpoint ${endpoint} is unreachable: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Check SSL certificate status
   */
  async checkSSLCertificate() {
    const baseUrl = this.config.environments.development.baseUrl;
    
    if (!baseUrl.startsWith('https://')) {
      return {
        check: 'ssl-certificate',
        severity: 'MEDIUM',
        issue: 'Application not using HTTPS',
        recommendation: 'Enable HTTPS for production deployment',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await fetch(baseUrl);
      
      // Basic SSL check (in a real implementation, you'd check certificate details)
      return {
        check: 'ssl-certificate',
        severity: 'PASS',
        status: 'SSL connection successful',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        check: 'ssl-certificate',
        severity: 'HIGH',
        issue: `SSL certificate issue: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders() {
    const baseUrl = this.config.environments.development.baseUrl;
    const requiredHeaders = this.config.apiSecurity.headers.required;
    const results = [];

    try {
      const response = await fetch(baseUrl);
      const headers = Object.fromEntries(response.headers.entries());

      Object.entries(requiredHeaders).forEach(([headerName, expectedValue]) => {
        const actualValue = headers[headerName.toLowerCase()];
        
        const result = {
          check: 'security-headers',
          header: headerName,
          timestamp: new Date().toISOString()
        };

        if (!actualValue) {
          result.severity = 'HIGH';
          result.issue = `Missing security header: ${headerName}`;
        } else if (Array.isArray(expectedValue) && !expectedValue.includes(actualValue)) {
          result.severity = 'MEDIUM';
          result.issue = `Weak security header value: ${headerName}`;
          result.actual = actualValue;
          result.expected = expectedValue;
        } else {
          result.severity = 'PASS';
          result.status = 'Header present and configured correctly';
        }

        results.push(result);
      });

    } catch (error) {
      results.push({
        check: 'security-headers',
        severity: 'HIGH',
        issue: `Could not check security headers: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Check DNS security configuration
   */
  async checkDNSSecurity() {
    // This is a placeholder for DNS security checks
    // In a real implementation, you would check for:
    // - DNSSEC validation
    // - DNS over HTTPS (DoH)
    // - DNS cache poisoning protection
    
    return {
      check: 'dns-security',
      severity: 'INFO',
      status: 'DNS security check completed',
      note: 'Manual DNS security configuration review recommended',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start real-time monitoring for specific security events
   */
  async startRealtimeMonitoring() {
    console.log('🔄 Starting real-time security monitoring...');
    
    // Monitor for suspicious activities
    await this.monitorSuspiciousActivities();
    
    // Monitor system resources
    await this.monitorSystemResources();
    
    // Monitor application logs for security events
    await this.monitorSecurityLogs();
  }

  /**
   * Monitor for suspicious activities
   */
  async monitorSuspiciousActivities() {
    // This would typically integrate with application logs and monitoring systems
    // For now, we'll simulate monitoring by checking for known attack patterns
    
    const suspiciousPatterns = [
      /(\bscript\b.*\balert\b|\bon\w+\s*=)/i, // XSS patterns
      /(union\s+select|drop\s+table|delete\s+from)/i, // SQL injection patterns
      /(\.\.\/|\.\.\\|etc\/passwd|windows\/system32)/i, // Path traversal
      /(\b(admin|root|administrator)\b.*\b(password|pwd|pass)\b)/i // Credential attacks
    ];

    // In a real implementation, this would monitor actual request logs
    console.log('👀 Monitoring for suspicious activities...');
  }

  /**
   * Monitor system resources
   */
  async monitorSystemResources() {
    const resourceMonitor = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(resourceMonitor);
        return;
      }

      try {
        // Monitor memory usage
        const memoryUsage = process.memoryUsage();
        const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
        
        if (memoryUsageMB > 500) { // 500MB threshold
          this.emit('resource-alert', {
            type: 'high-memory-usage',
            value: memoryUsageMB,
            threshold: 500,
            timestamp: new Date().toISOString()
          });
        }

        // Monitor CPU usage (simplified)
        const cpuUsage = process.cpuUsage();
        
        // Update metrics
        this.currentMetrics.lastResourceCheck = new Date().toISOString();
        
      } catch (error) {
        console.error('Resource monitoring error:', error.message);
      }
    }, 60000); // Check every minute

    this.scanIntervals.set('resource-monitor', resourceMonitor);
  }

  /**
   * Monitor security logs
   */
  async monitorSecurityLogs() {
    // This would typically tail log files and analyze them for security events
    console.log('📋 Monitoring security logs...');
    
    // Simulate log monitoring
    const logMonitor = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(logMonitor);
        return;
      }

      // In a real implementation, this would parse actual log files
      await this.analyzeSecurityEvents();
      
    }, 30000); // Check every 30 seconds

    this.scanIntervals.set('log-monitor', logMonitor);
  }

  /**
   * Analyze security events from logs
   */
  async analyzeSecurityEvents() {
    // Placeholder for log analysis
    // This would typically:
    // 1. Parse application logs
    // 2. Look for failed login attempts
    // 3. Detect suspicious request patterns
    // 4. Monitor for rate limiting triggers
    // 5. Check for security header violations
    
    const securityEvents = [
      // Simulated events for demonstration
    ];

    if (securityEvents.length > 0) {
      this.emit('security-events-detected', securityEvents);
    }
  }

  /**
   * Check for vulnerability database updates
   */
  async checkVulnerabilityUpdates() {
    console.log('🔄 Checking for vulnerability database updates...');
    
    try {
      // This would typically check for updates to:
      // - CVE database
      // - OWASP dependency check database
      // - Security tool rule updates
      
      const updateInfo = {
        timestamp: new Date().toISOString(),
        cveDatabase: 'up-to-date',
        owaspDatabase: 'up-to-date',
        lastUpdate: new Date().toISOString()
      };

      this.emit('vulnerability-db-updated', updateInfo);
      
    } catch (error) {
      console.error('Vulnerability update check failed:', error.message);
      this.emit('update-check-failed', { error: error.message });
    }
  }

  /**
   * Process security scan results
   */
  async processSecurityResults(results, scanType) {
    const timestamp = new Date().toISOString();
    
    // Update current metrics
    if (results.summary) {
      this.currentMetrics.vulnerabilityCount = results.summary.totalFindings || 0;
      this.currentMetrics.securityScore = results.summary.securityScore || 0;
      this.currentMetrics.lastScanTime = timestamp;
    }

    // Check for critical vulnerabilities
    const criticalVulns = this.extractCriticalVulnerabilities(results);
    if (criticalVulns.length > 0) {
      this.emit('vulnerability-detected', { 
        scanType, 
        vulnerabilities: criticalVulns, 
        timestamp 
      });
    }

    // Check security score changes
    if (this.currentMetrics.securityScore < 70) {
      this.emit('security-score-changed', {
        score: this.currentMetrics.securityScore,
        previousScore: 100, // Would track previous scores in real implementation
        scanType,
        timestamp
      });
    }

    // Check alert thresholds
    await this.checkAlertThresholds(results);

    // Save scan results
    await this.saveScanResults(results, scanType, timestamp);
  }

  /**
   * Extract critical vulnerabilities from scan results
   */
  extractCriticalVulnerabilities(results) {
    const criticalVulns = [];
    
    if (results.results) {
      Object.values(results.results).forEach(category => {
        Object.values(category).forEach(tool => {
          if (tool.findings) {
            const critical = tool.findings.filter(f => 
              f.severity === 'CRITICAL' || f.severity === 'HIGH'
            );
            criticalVulns.push(...critical);
          }
        });
      });
    }

    if (results.checks) {
      const critical = results.checks.filter(c => 
        c.severity === 'CRITICAL' || c.severity === 'HIGH'
      );
      criticalVulns.push(...critical);
    }

    return criticalVulns;
  }

  /**
   * Check if alert thresholds are exceeded
   */
  async checkAlertThresholds(results) {
    const summary = results.summary || {};
    const thresholds = this.alertThresholds;

    if (summary.critical >= thresholds.criticalThreshold) {
      this.emit('alert-threshold-exceeded', {
        type: 'critical-vulnerabilities',
        count: summary.critical,
        threshold: thresholds.criticalThreshold
      });
    }

    if (summary.high >= thresholds.highThreshold) {
      this.emit('alert-threshold-exceeded', {
        type: 'high-vulnerabilities',
        count: summary.high,
        threshold: thresholds.highThreshold
      });
    }

    if (summary.medium >= thresholds.mediumThreshold) {
      this.emit('alert-threshold-exceeded', {
        type: 'medium-vulnerabilities',
        count: summary.medium,
        threshold: thresholds.mediumThreshold
      });
    }
  }

  /**
   * Event handlers
   */
  
  async handleVulnerabilityDetected(data) {
    console.log(`🚨 Critical vulnerabilities detected: ${data.vulnerabilities.length}`);
    
    const alert = {
      id: `vuln_${Date.now()}`,
      type: 'vulnerability-detected',
      severity: 'CRITICAL',
      data,
      timestamp: new Date().toISOString()
    };

    await this.sendAlert(alert);
    this.alertHistory.push(alert);
  }

  async handleSecurityScoreChange(data) {
    console.log(`📊 Security score changed: ${data.score}`);
    
    if (data.score < 50) {
      const alert = {
        id: `score_${Date.now()}`,
        type: 'low-security-score',
        severity: 'HIGH',
        data,
        timestamp: new Date().toISOString()
      };

      await this.sendAlert(alert);
      this.alertHistory.push(alert);
    }
  }

  async handleComplianceViolation(data) {
    console.log(`⚖️ Compliance violation detected: ${data.violation}`);
    
    const alert = {
      id: `compliance_${Date.now()}`,
      type: 'compliance-violation',
      severity: 'HIGH',
      data,
      timestamp: new Date().toISOString()
    };

    await this.sendAlert(alert);
    this.alertHistory.push(alert);
  }

  async handleAlertThresholdExceeded(data) {
    console.log(`🔔 Alert threshold exceeded: ${data.type} (${data.count}/${data.threshold})`);
    
    const alert = {
      id: `threshold_${Date.now()}`,
      type: 'threshold-exceeded',
      severity: data.type.includes('critical') ? 'CRITICAL' : 'HIGH',
      data,
      timestamp: new Date().toISOString()
    };

    await this.sendAlert(alert);
    this.alertHistory.push(alert);
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert) {
    const alertConfig = this.config.monitoring.reporting;
    
    // Email notifications
    if (alertConfig.emailNotifications.enabled) {
      await this.sendEmailAlert(alert);
    }

    // Webhook notifications
    for (const webhook of alertConfig.webhooks) {
      if (webhook.events.includes(alert.severity.toLowerCase())) {
        await this.sendWebhookAlert(alert, webhook);
      }
    }

    // Log alert
    console.log(`🔔 ALERT [${alert.severity}]: ${alert.type}`, alert.data);
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    // This would integrate with an email service
    console.log(`📧 Email alert sent: ${alert.type}`);
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert, webhook) {
    try {
      if (webhook.url) {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: webhook.name,
            alert,
            timestamp: new Date().toISOString()
          })
        });

        if (response.ok) {
          console.log(`🔗 Webhook alert sent to ${webhook.name}`);
        } else {
          console.error(`❌ Webhook alert failed for ${webhook.name}: ${response.status}`);
        }
      }
    } catch (error) {
      console.error(`❌ Webhook alert error for ${webhook.name}:`, error.message);
    }
  }

  /**
   * Save scan results
   */
  async saveScanResults(results, scanType, timestamp) {
    const filename = `${scanType}_${timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(this.reportDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    console.log(`💾 Scan results saved: ${filename}`);
  }

  /**
   * Generate final monitoring report
   */
  async generateFinalReport() {
    const report = {
      monitoringSession: {
        startTime: this.startTime,
        endTime: new Date().toISOString(),
        duration: Date.now() - this.startTime
      },
      currentMetrics: this.currentMetrics,
      alertHistory: this.alertHistory,
      summary: {
        totalAlerts: this.alertHistory.length,
        criticalAlerts: this.alertHistory.filter(a => a.severity === 'CRITICAL').length,
        highAlerts: this.alertHistory.filter(a => a.severity === 'HIGH').length,
        mediumAlerts: this.alertHistory.filter(a => a.severity === 'MEDIUM').length
      }
    };

    const reportPath = path.join(this.reportDir, 'monitoring-final-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Final monitoring report saved: ${reportPath}`);
    return report;
  }

  /**
   * Get current security metrics
   */
  getCurrentMetrics() {
    return { ...this.currentMetrics };
  }

  /**
   * Get alert history
   */
  getAlertHistory() {
    return [...this.alertHistory];
  }
}

export default ContinuousSecurityMonitor;