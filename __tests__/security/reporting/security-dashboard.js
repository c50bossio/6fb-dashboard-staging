/**
 * Security Test Reporting and Dashboard System
 * Comprehensive security reporting with interactive dashboards
 */

import fs from 'fs/promises';
import path from 'path';
import { SECURITY_CONFIG } from '../config/security-config.js';

export class SecurityReportingDashboard {
  constructor(options = {}) {
    this.config = { ...SECURITY_CONFIG, ...options };
    this.reportDir = path.join(process.cwd(), '__tests__/security/reports');
    this.dashboardDir = path.join(this.reportDir, 'dashboards');
  }

  /**
   * Generate comprehensive security dashboard
   */
  async generateSecurityDashboard(scanResults = {}) {
    console.log('📊 Generating security dashboard...');

    await fs.mkdir(this.dashboardDir, { recursive: true });

    const dashboardData = await this.aggregateSecurityData(scanResults);
    
    // Generate different dashboard formats
    await this.generateHTMLDashboard(dashboardData);
    await this.generateJSONReport(dashboardData);
    await this.generateSARIFReport(dashboardData);
    await this.generatePDFReport(dashboardData);
    await this.generateCSVReport(dashboardData);

    console.log(`✅ Security dashboard generated at: ${this.dashboardDir}`);
    return dashboardData;
  }

  /**
   * Aggregate security data from multiple sources
   */
  async aggregateSecurityData(scanResults) {
    const aggregatedData = {
      timestamp: new Date().toISOString(),
      overview: {
        totalScans: 0,
        totalFindings: 0,
        securityScore: 0,
        complianceScore: 0,
        riskLevel: 'UNKNOWN'
      },
      vulnerabilities: {
        critical: [],
        high: [],
        medium: [],
        low: [],
        info: []
      },
      categories: {},
      trends: [],
      compliance: {},
      recommendations: [],
      metrics: {
        scanHistory: [],
        responseMetrics: {},
        coverageMetrics: {}
      }
    };

    // Process scan results
    if (scanResults.sast) {
      await this.processSASTResults(scanResults.sast, aggregatedData);
    }

    if (scanResults.dast) {
      await this.processDASTResults(scanResults.dast, aggregatedData);
    }

    if (scanResults.api) {
      await this.processAPIResults(scanResults.api, aggregatedData);
    }

    if (scanResults.gdpr) {
      await this.processGDPRResults(scanResults.gdpr, aggregatedData);
    }

    if (scanResults.penetration) {
      await this.processPenetrationResults(scanResults.penetration, aggregatedData);
    }

    // Calculate overall metrics
    this.calculateOverallMetrics(aggregatedData);

    return aggregatedData;
  }

  /**
   * Process SAST scan results
   */
  async processSASTResults(sastResults, aggregatedData) {
    Object.values(sastResults).forEach(tool => {
      if (tool.summary) {
        aggregatedData.overview.totalFindings += tool.summary.totalFindings || 0;
      }

      if (tool.findings) {
        tool.findings.forEach(finding => {
          const severity = finding.severity?.toLowerCase() || 'info';
          if (aggregatedData.vulnerabilities[severity]) {
            aggregatedData.vulnerabilities[severity].push({
              ...finding,
              source: 'SAST',
              tool: tool.tool
            });
          }
        });
      }
    });
  }

  /**
   * Process DAST scan results
   */
  async processDASTResults(dastResults, aggregatedData) {
    Object.values(dastResults).forEach(tool => {
      if (tool.summary) {
        aggregatedData.overview.totalFindings += tool.summary.totalFindings || 0;
      }

      if (tool.findings) {
        tool.findings.forEach(finding => {
          const severity = finding.severity?.toLowerCase() || 'info';
          if (aggregatedData.vulnerabilities[severity]) {
            aggregatedData.vulnerabilities[severity].push({
              ...finding,
              source: 'DAST',
              tool: tool.tool
            });
          }
        });
      }
    });
  }

  /**
   * Generate HTML dashboard
   */
  async generateHTMLDashboard(data) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Dashboard - 6FB AI Agent System</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8f9fa;
            color: #333;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .metric-card { 
            background: white; 
            padding: 25px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.2s;
        }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-value { 
            font-size: 2.5em; 
            font-weight: bold; 
            margin-bottom: 10px; 
        }
        .metric-label { 
            font-size: 1.1em; 
            color: #666; 
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .score-good { color: #28a745; }
        .score-fair { color: #ffc107; }
        .score-poor { color: #dc3545; }
        .charts-section { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 30px; 
            margin-bottom: 30px; 
        }
        .chart-container { 
            background: white; 
            padding: 25px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .chart-title { 
            font-size: 1.3em; 
            margin-bottom: 20px; 
            color: #333;
            text-align: center;
        }
        .vulnerabilities-section { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .section-title { 
            font-size: 1.8em; 
            margin-bottom: 25px; 
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .vulnerability-item { 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 15px 0; 
            border-radius: 8px;
            border-left: 4px solid #ddd;
        }
        .vulnerability-item.critical { border-left-color: #dc3545; }
        .vulnerability-item.high { border-left-color: #fd7e14; }
        .vulnerability-item.medium { border-left-color: #ffc107; }
        .vulnerability-item.low { border-left-color: #28a745; }
        .vuln-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 10px;
        }
        .vuln-title { font-weight: bold; font-size: 1.1em; }
        .vuln-severity { 
            padding: 5px 10px; 
            border-radius: 15px; 
            font-size: 0.8em; 
            font-weight: bold;
            text-transform: uppercase;
        }
        .vuln-severity.critical { background: #dc3545; color: white; }
        .vuln-severity.high { background: #fd7e14; color: white; }
        .vuln-severity.medium { background: #ffc107; color: black; }
        .vuln-severity.low { background: #28a745; color: white; }
        .vuln-description { margin-bottom: 10px; color: #666; }
        .vuln-meta { font-size: 0.9em; color: #888; }
        .recommendations-section { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .recommendation-item { 
            background: #e3f2fd; 
            padding: 20px; 
            margin: 15px 0; 
            border-radius: 8px;
            border-left: 4px solid #2196f3;
        }
        .rec-priority { 
            font-weight: bold; 
            color: #1976d2; 
            margin-bottom: 10px;
        }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 20px; 
            color: #666;
            border-top: 1px solid #ddd;
        }
        @media (max-width: 768px) {
            .charts-section { grid-template-columns: 1fr; }
            .container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Security Dashboard</h1>
            <p>6FB AI Agent System - Comprehensive Security Analysis</p>
            <p>Generated: ${new Date(data.timestamp).toLocaleString()}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value ${this.getScoreClass(data.overview.securityScore)}">${data.overview.securityScore}</div>
                <div class="metric-label">Security Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value critical">${data.vulnerabilities.critical.length}</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value high">${data.vulnerabilities.high.length}</div>
                <div class="metric-label">High Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value medium">${data.vulnerabilities.medium.length}</div>
                <div class="metric-label">Medium Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value low">${data.vulnerabilities.low.length}</div>
                <div class="metric-label">Low Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${this.getScoreClass(data.overview.complianceScore)}">${data.overview.complianceScore}%</div>
                <div class="metric-label">Compliance Score</div>
            </div>
        </div>

        <div class="charts-section">
            <div class="chart-container">
                <div class="chart-title">Vulnerability Distribution</div>
                <canvas id="vulnerabilityChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">Security Score Trend</div>
                <canvas id="trendChart" width="400" height="300"></canvas>
            </div>
        </div>

        <div class="vulnerabilities-section">
            <h2 class="section-title">🔍 Critical & High Severity Vulnerabilities</h2>
            ${this.generateVulnerabilityList([...data.vulnerabilities.critical, ...data.vulnerabilities.high].slice(0, 10))}
        </div>

        <div class="recommendations-section">
            <h2 class="section-title">💡 Security Recommendations</h2>
            ${this.generateRecommendationList(data.recommendations.slice(0, 10))}
        </div>

        <div class="footer">
            <p>Security Dashboard for 6FB AI Agent System</p>
            <p>For detailed reports and remediation guidance, consult the security team</p>
        </div>
    </div>

    <script>
        // Vulnerability Distribution Chart
        const ctx1 = document.getElementById('vulnerabilityChart').getContext('2d');
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [
                        ${data.vulnerabilities.critical.length},
                        ${data.vulnerabilities.high.length},
                        ${data.vulnerabilities.medium.length},
                        ${data.vulnerabilities.low.length}
                    ],
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Security Score Trend Chart
        const ctx2 = document.getElementById('trendChart').getContext('2d');
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(data.trends.map(t => new Date(t.timestamp).toLocaleDateString()) || ['Today'])},
                datasets: [{
                    label: 'Security Score',
                    data: ${JSON.stringify(data.trends.map(t => t.securityScore) || [data.overview.securityScore])},
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    </script>
</body>
</html>`;

    const htmlPath = path.join(this.dashboardDir, 'security-dashboard.html');
    await fs.writeFile(htmlPath, htmlTemplate);
    console.log(`📄 HTML dashboard generated: ${htmlPath}`);
  }

  /**
   * Generate vulnerability list HTML
   */
  generateVulnerabilityList(vulnerabilities) {
    return vulnerabilities.map(vuln => `
      <div class="vulnerability-item ${vuln.severity?.toLowerCase() || 'info'}">
        <div class="vuln-header">
          <div class="vuln-title">${vuln.description || vuln.title || 'Security Issue'}</div>
          <div class="vuln-severity ${vuln.severity?.toLowerCase() || 'info'}">${vuln.severity || 'INFO'}</div>
        </div>
        <div class="vuln-description">${vuln.recommendation || 'No description available'}</div>
        <div class="vuln-meta">
          Source: ${vuln.source || 'Unknown'} | 
          Tool: ${vuln.tool || 'Unknown'} |
          ${vuln.file ? `File: ${vuln.file}` : ''}
          ${vuln.category ? `Category: ${vuln.category}` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Generate recommendation list HTML
   */
  generateRecommendationList(recommendations) {
    return recommendations.map(rec => `
      <div class="recommendation-item">
        <div class="rec-priority">[${rec.priority || 'MEDIUM'}] ${rec.category || 'Security'}</div>
        <div>${rec.recommendation || rec.description || 'No recommendation available'}</div>
        ${rec.implementation ? `<div style="margin-top: 10px; font-style: italic;">Implementation: ${rec.implementation}</div>` : ''}
      </div>
    `).join('');
  }

  /**
   * Get CSS class for score color coding
   */
  getScoreClass(score) {
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-fair';
    return 'score-poor';
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(data) {
    const jsonPath = path.join(this.dashboardDir, 'security-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
    console.log(`📄 JSON report generated: ${jsonPath}`);
  }

  /**
   * Generate SARIF report for tool integration
   */
  async generateSARIFReport(data) {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: []
    };

    // Convert vulnerabilities to SARIF format
    const allVulns = [
      ...data.vulnerabilities.critical,
      ...data.vulnerabilities.high,
      ...data.vulnerabilities.medium,
      ...data.vulnerabilities.low
    ];

    if (allVulns.length > 0) {
      const run = {
        tool: {
          driver: {
            name: '6FB Security Scanner',
            version: '1.0.0',
            informationUri: 'https://6fb-ai-agent.com/security'
          }
        },
        results: allVulns.map(vuln => ({
          ruleId: vuln.category || 'security-issue',
          level: this.severityToSarifLevel(vuln.severity),
          message: {
            text: vuln.description || 'Security vulnerability detected'
          },
          locations: vuln.file ? [{
            physicalLocation: {
              artifactLocation: {
                uri: vuln.file
              }
            }
          }] : [],
          properties: {
            source: vuln.source,
            tool: vuln.tool,
            category: vuln.category
          }
        }))
      };
      sarif.runs.push(run);
    }

    const sarifPath = path.join(this.dashboardDir, 'security-report.sarif');
    await fs.writeFile(sarifPath, JSON.stringify(sarif, null, 2));
    console.log(`📄 SARIF report generated: ${sarifPath}`);
  }

  /**
   * Generate PDF report (simplified HTML version)
   */
  async generatePDFReport(data) {
    const pdfTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Security Report - 6FB AI Agent System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #667eea; }
        .summary { background: #f8f9fa; padding: 20px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: white; border-radius: 5px; }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .vulnerability { margin: 15px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #ddd; }
        .vulnerability.critical { border-left-color: #dc3545; }
        .vulnerability.high { border-left-color: #fd7e14; }
        .vulnerability.medium { border-left-color: #ffc107; }
        .vulnerability.low { border-left-color: #28a745; }
    </style>
</head>
<body>
    <h1>🛡️ Security Report - 6FB AI Agent System</h1>
    <p><strong>Generated:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
    
    <div class="summary">
        <h2>Executive Summary</h2>
        <div class="metric">Security Score: <strong>${data.overview.securityScore}/100</strong></div>
        <div class="metric critical">Critical: <strong>${data.vulnerabilities.critical.length}</strong></div>
        <div class="metric high">High: <strong>${data.vulnerabilities.high.length}</strong></div>
        <div class="metric medium">Medium: <strong>${data.vulnerabilities.medium.length}</strong></div>
        <div class="metric low">Low: <strong>${data.vulnerabilities.low.length}</strong></div>
    </div>

    <h2>Critical & High Severity Issues</h2>
    ${[...data.vulnerabilities.critical, ...data.vulnerabilities.high].slice(0, 20).map(vuln => `
      <div class="vulnerability ${vuln.severity?.toLowerCase() || 'info'}">
        <h3>${vuln.description || 'Security Issue'} [${vuln.severity || 'INFO'}]</h3>
        <p>${vuln.recommendation || 'No recommendation available'}</p>
        <p><small>Source: ${vuln.source || 'Unknown'} | Tool: ${vuln.tool || 'Unknown'}</small></p>
      </div>
    `).join('')}

    <h2>Recommendations</h2>
    ${data.recommendations.slice(0, 10).map(rec => `
      <div style="margin: 15px 0; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196f3;">
        <h4>[${rec.priority || 'MEDIUM'}] ${rec.category || 'Security'}</h4>
        <p>${rec.recommendation || 'No recommendation available'}</p>
      </div>
    `).join('')}
</body>
</html>`;

    const pdfPath = path.join(this.dashboardDir, 'security-report.html');
    await fs.writeFile(pdfPath, pdfTemplate);
    console.log(`📄 PDF-ready report generated: ${pdfPath}`);
  }

  /**
   * Generate CSV report for data analysis
   */
  async generateCSVReport(data) {
    const allVulns = [
      ...data.vulnerabilities.critical,
      ...data.vulnerabilities.high,
      ...data.vulnerabilities.medium,
      ...data.vulnerabilities.low
    ];

    const csvHeaders = [
      'Timestamp',
      'Severity',
      'Category',
      'Description',
      'Source',
      'Tool',
      'File',
      'Recommendation'
    ];

    const csvRows = allVulns.map(vuln => [
      data.timestamp,
      vuln.severity || 'INFO',
      vuln.category || 'Unknown',
      `"${(vuln.description || 'Security issue').replace(/"/g, '""')}"`,
      vuln.source || 'Unknown',
      vuln.tool || 'Unknown',
      vuln.file || '',
      `"${(vuln.recommendation || 'No recommendation').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const csvPath = path.join(this.dashboardDir, 'security-vulnerabilities.csv');
    await fs.writeFile(csvPath, csvContent);
    console.log(`📄 CSV report generated: ${csvPath}`);
  }

  /**
   * Calculate overall security metrics
   */
  calculateOverallMetrics(data) {
    const totalVulns = Object.values(data.vulnerabilities).reduce((sum, vulns) => sum + vulns.length, 0);
    
    // Calculate security score based on vulnerability severity
    const criticalPenalty = data.vulnerabilities.critical.length * 20;
    const highPenalty = data.vulnerabilities.high.length * 10;
    const mediumPenalty = data.vulnerabilities.medium.length * 5;
    const lowPenalty = data.vulnerabilities.low.length * 1;
    
    const securityScore = Math.max(0, 100 - criticalPenalty - highPenalty - mediumPenalty - lowPenalty);
    
    data.overview.totalFindings = totalVulns;
    data.overview.securityScore = securityScore;
    data.overview.riskLevel = this.calculateRiskLevel(securityScore);
    
    // Calculate compliance score (placeholder)
    data.overview.complianceScore = Math.max(0, 100 - (data.vulnerabilities.critical.length * 15) - (data.vulnerabilities.high.length * 8));
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
   * Convert severity to SARIF level
   */
  severityToSarifLevel(severity) {
    const mapping = {
      CRITICAL: 'error',
      HIGH: 'error',
      MEDIUM: 'warning',
      LOW: 'note',
      INFO: 'note'
    };
    return mapping[severity?.toUpperCase()] || 'info';
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(data) {
    const totalVulns = data.overview.totalFindings;
    const criticalCount = data.vulnerabilities.critical.length;
    const highCount = data.vulnerabilities.high.length;
    
    let summary = `Security assessment completed for the 6FB AI Agent System. `;
    
    if (totalVulns === 0) {
      summary += `No security vulnerabilities were identified. The system demonstrates strong security posture.`;
    } else {
      summary += `${totalVulns} security issue${totalVulns > 1 ? 's' : ''} identified. `;
      
      if (criticalCount > 0) {
        summary += `⚠️ ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} require immediate attention. `;
      }
      
      if (highCount > 0) {
        summary += `${highCount} high-severity issue${highCount > 1 ? 's' : ''} should be addressed promptly. `;
      }
    }
    
    summary += `Overall security score: ${data.overview.securityScore}/100 (${data.overview.riskLevel} risk).`;
    
    return summary;
  }

  /**
   * Generate trend analysis
   */
  async generateTrendAnalysis(historicalData = []) {
    const trends = {
      securityScoreTrend: 'stable',
      vulnerabilityTrend: 'stable',
      complianceTrend: 'stable',
      recommendations: []
    };

    if (historicalData.length >= 2) {
      const latest = historicalData[historicalData.length - 1];
      const previous = historicalData[historicalData.length - 2];
      
      // Security score trend
      if (latest.securityScore > previous.securityScore + 5) {
        trends.securityScoreTrend = 'improving';
      } else if (latest.securityScore < previous.securityScore - 5) {
        trends.securityScoreTrend = 'declining';
      }
      
      // Vulnerability trend
      if (latest.totalFindings < previous.totalFindings) {
        trends.vulnerabilityTrend = 'improving';
      } else if (latest.totalFindings > previous.totalFindings) {
        trends.vulnerabilityTrend = 'worsening';
      }
    }

    return trends;
  }

  /**
   * Generate comprehensive report summary
   */
  async generateReportSummary(data) {
    return {
      executiveSummary: this.generateExecutiveSummary(data),
      keyMetrics: {
        securityScore: data.overview.securityScore,
        totalVulnerabilities: data.overview.totalFindings,
        criticalIssues: data.vulnerabilities.critical.length,
        complianceScore: data.overview.complianceScore,
        riskLevel: data.overview.riskLevel
      },
      topRecommendations: data.recommendations.slice(0, 5),
      nextSteps: [
        'Address all critical and high-severity vulnerabilities',
        'Implement continuous security monitoring',
        'Schedule regular security assessments',
        'Update security policies and procedures',
        'Provide security training for development team'
      ]
    };
  }

  /**
   * Export dashboard data in multiple formats
   */
  async exportDashboard(data, formats = ['html', 'json', 'sarif', 'csv']) {
    const exports = {};
    
    if (formats.includes('html')) {
      await this.generateHTMLDashboard(data);
      exports.html = path.join(this.dashboardDir, 'security-dashboard.html');
    }
    
    if (formats.includes('json')) {
      await this.generateJSONReport(data);
      exports.json = path.join(this.dashboardDir, 'security-report.json');
    }
    
    if (formats.includes('sarif')) {
      await this.generateSARIFReport(data);
      exports.sarif = path.join(this.dashboardDir, 'security-report.sarif');
    }
    
    if (formats.includes('csv')) {
      await this.generateCSVReport(data);
      exports.csv = path.join(this.dashboardDir, 'security-vulnerabilities.csv');
    }
    
    return exports;
  }
}

export default SecurityReportingDashboard;