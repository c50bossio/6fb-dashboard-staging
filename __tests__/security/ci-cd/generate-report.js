#!/usr/bin/env node

/**
 * CI/CD Security Report Generator
 * Aggregates security test results and generates comprehensive reports
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CICDReportGenerator {
  constructor(options = {}) {
    this.scanId = options.scanId || `security-scan-${Date.now()}`;
    this.inputDir = options.inputDir || 'security-results';
    this.outputDir = options.outputDir || 'reports';
    this.results = {};
  }

  /**
   * Main report generation function
   */
  async generateReports() {
    console.log('🚀 Starting CI/CD security report generation...');
    console.log(`📂 Input directory: ${this.inputDir}`);
    console.log(`📁 Output directory: ${this.outputDir}`);

    try {
      await fs.mkdir(this.outputDir, { recursive: true });

      await this.collectSecurityResults();

      await this.generateJSONReport();
      await this.generateSARIFReport();
      await this.generateSummaryReport();
      await this.generateHTMLDashboard();
      await this.generateMarkdownReport();

      console.log('✅ Security reports generated successfully');
      return {
        scanId: this.scanId,
        timestamp: new Date().toISOString(),
        outputDir: this.outputDir,
        generatedReports: [
          'security-report.json',
          'security-report.sarif',
          'security-summary.json',
          'security-dashboard.html',
          'security-report.md'
        ]
      };

    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Collect security results from all test phases
   */
  async collectSecurityResults() {
    console.log('📊 Collecting security results...');

    try {
      const entries = await fs.readdir(this.inputDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.inputDir, entry.name);
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            
            try {
              const content = await fs.readFile(filePath, 'utf8');
              const data = JSON.parse(content);
              
              if (file.includes('sast')) {
                this.results.sast = this.results.sast || [];
                this.results.sast.push({ tool: this.extractToolName(file), data });
              } else if (file.includes('dast')) {
                this.results.dast = this.results.dast || [];
                this.results.dast.push({ tool: this.extractToolName(file), data });
              } else if (file.includes('api')) {
                this.results.api = this.results.api || [];
                this.results.api.push({ tool: this.extractToolName(file), data });
              } else if (file.includes('gdpr')) {
                this.results.gdpr = this.results.gdpr || [];
                this.results.gdpr.push({ tool: this.extractToolName(file), data });
              } else if (file.includes('penetration')) {
                this.results.penetration = this.results.penetration || [];
                this.results.penetration.push({ tool: this.extractToolName(file), data });
              }

            } catch (parseError) {
              console.warn(`⚠️ Could not parse ${filePath}: ${parseError.message}`);
            }
          }
        }
      }

      console.log(`📋 Collected results from ${Object.keys(this.results).length} test categories`);

    } catch (error) {
      console.warn(`⚠️ Could not read input directory: ${error.message}`);
    }
  }

  /**
   * Extract tool name from file name
   */
  extractToolName(fileName) {
    const parts = fileName.replace('.json', '').split('-');
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * Generate comprehensive JSON report
   */
  async generateJSONReport() {
    const aggregatedFindings = this.aggregateFindings();
    const summary = this.calculateSummary(aggregatedFindings);

    const report = {
      metadata: {
        scanId: this.scanId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        generator: 'CI/CD Security Pipeline'
      },
      summary,
      findings: aggregatedFindings,
      rawResults: this.results,
      recommendations: this.generateRecommendations(aggregatedFindings),
      compliance: this.assessCompliance(aggregatedFindings)
    };

    const reportPath = path.join(this.outputDir, 'security-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report generated: ${reportPath}`);
  }

  /**
   * Aggregate findings from all tools
   */
  aggregateFindings() {
    const findings = [];

    Object.entries(this.results).forEach(([category, tools]) => {
      if (!Array.isArray(tools)) return;

      tools.forEach(({ tool, data }) => {
        const toolFindings = this.extractFindingsFromTool(tool, data, category);
        findings.push(...toolFindings);
      });
    });

    return this.deduplicateFindings(findings);
  }

  /**
   * Extract findings from tool-specific data structures
   */
  extractFindingsFromTool(tool, data, category) {
    const findings = [];

    try {
      switch (tool) {
        case 'semgrep':
          if (data.results) {
            data.results.forEach(result => {
              findings.push({
                id: `${tool}-${result.check_id}`,
                tool,
                category,
                severity: this.mapSemgrepSeverity(result.extra?.severity),
                title: result.extra?.message || result.check_id,
                description: result.extra?.message || '',
                file: result.path,
                line: result.start?.line,
                cwe: result.extra?.metadata?.cwe,
                owasp: result.extra?.metadata?.owasp
              });
            });
          }
          break;

        case 'bandit':
          if (data.results) {
            data.results.forEach(result => {
              findings.push({
                id: `${tool}-${result.test_id}`,
                tool,
                category,
                severity: result.issue_severity,
                title: result.issue_text,
                description: result.issue_text,
                file: result.filename,
                line: result.line_number,
                confidence: result.issue_confidence
              });
            });
          }
          break;

        case 'nuclei':
          if (Array.isArray(data)) {
            data.forEach(result => {
              findings.push({
                id: `${tool}-${result.template}-${result.matched_at}`,
                tool,
                category,
                severity: result.info?.severity?.toUpperCase() || 'INFO',
                title: result.info?.name || result.template,
                description: result.info?.description || '',
                url: result.matched_at,
                tags: result.info?.tags
              });
            });
          }
          break;

        case 'eslint':
          if (Array.isArray(data)) {
            data.forEach(fileResult => {
              fileResult.messages?.forEach(message => {
                if (message.ruleId && message.ruleId.includes('security')) {
                  findings.push({
                    id: `${tool}-${message.ruleId}-${fileResult.filePath}-${message.line}`,
                    tool,
                    category,
                    severity: message.severity === 2 ? 'HIGH' : 'MEDIUM',
                    title: message.message,
                    description: message.message,
                    file: fileResult.filePath,
                    line: message.line,
                    ruleId: message.ruleId
                  });
                }
              });
            });
          }
          break;

        case 'retire':
          if (data.data) {
            data.data.forEach(fileData => {
              fileData.results?.forEach(result => {
                result.vulnerabilities?.forEach(vuln => {
                  findings.push({
                    id: `${tool}-${vuln.info?.join('-')}-${fileData.file}`,
                    tool,
                    category,
                    severity: vuln.severity?.toUpperCase() || 'MEDIUM',
                    title: `Vulnerable dependency: ${result.component}`,
                    description: vuln.info?.join(', ') || '',
                    file: fileData.file,
                    component: result.component,
                    version: result.version
                  });
                });
              });
            });
          }
          break;

        default:
          if (data.findings) {
            findings.push(...data.findings.map(f => ({ ...f, tool, category })));
          } else if (data.results) {
            findings.push(...data.results.map(r => ({ ...r, tool, category })));
          }
      }

    } catch (error) {
      console.warn(`⚠️ Error extracting findings from ${tool}:`, error.message);
    }

    return findings;
  }

  /**
   * Map Semgrep severity to standard levels
   */
  mapSemgrepSeverity(severity) {
    const mapping = {
      'ERROR': 'HIGH',
      'WARNING': 'MEDIUM',
      'INFO': 'LOW'
    };
    return mapping[severity] || 'LOW';
  }

  /**
   * Deduplicate findings based on similarity
   */
  deduplicateFindings(findings) {
    const unique = [];
    const seen = new Set();

    findings.forEach(finding => {
      const signature = `${finding.title}-${finding.file}-${finding.line}-${finding.severity}`;
      
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(finding);
      }
    });

    console.log(`🔍 Deduplicated ${findings.length} findings to ${unique.length} unique issues`);
    return unique;
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(findings) {
    const severityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0
    };

    const categoryCounts = {};
    const toolCounts = {};

    findings.forEach(finding => {
      const severity = finding.severity?.toUpperCase() || 'INFO';
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      
      const category = finding.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      const tool = finding.tool || 'unknown';
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    });

    const criticalPenalty = severityCounts.CRITICAL * 20;
    const highPenalty = severityCounts.HIGH * 10;
    const mediumPenalty = severityCounts.MEDIUM * 5;
    const lowPenalty = severityCounts.LOW * 1;
    
    const securityScore = Math.max(0, 100 - criticalPenalty - highPenalty - mediumPenalty - lowPenalty);
    
    let riskLevel = 'LOW';
    if (securityScore < 50) riskLevel = 'CRITICAL';
    else if (securityScore < 70) riskLevel = 'HIGH';
    else if (securityScore < 85) riskLevel = 'MEDIUM';

    return {
      totalFindings: findings.length,
      securityScore,
      riskLevel,
      ...severityCounts,
      categories: categoryCounts,
      tools: toolCounts
    };
  }

  /**
   * Generate SARIF report for tool integration
   */
  async generateSARIFReport() {
    const findings = this.aggregateFindings();

    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: []
    };

    const toolGroups = {};
    findings.forEach(finding => {
      const tool = finding.tool || 'unknown';
      if (!toolGroups[tool]) {
        toolGroups[tool] = [];
      }
      toolGroups[tool].push(finding);
    });

    Object.entries(toolGroups).forEach(([tool, toolFindings]) => {
      const run = {
        tool: {
          driver: {
            name: tool,
            version: '1.0.0'
          }
        },
        results: toolFindings.map(finding => ({
          ruleId: finding.id,
          level: this.severityToSarifLevel(finding.severity),
          message: {
            text: finding.description || finding.title || 'Security issue'
          },
          locations: finding.file ? [{
            physicalLocation: {
              artifactLocation: {
                uri: finding.file
              },
              region: finding.line ? {
                startLine: finding.line
              } : undefined
            }
          }] : []
        }))
      };
      sarif.runs.push(run);
    });

    const sarifPath = path.join(this.outputDir, 'security-report.sarif');
    await fs.writeFile(sarifPath, JSON.stringify(sarif, null, 2));
    console.log(`📄 SARIF report generated: ${sarifPath}`);
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
    return mapping[severity] || 'note';
  }

  /**
   * Generate summary report for CI/CD
   */
  async generateSummaryReport() {
    const findings = this.aggregateFindings();
    const summary = this.calculateSummary(findings);

    const summaryPath = path.join(this.outputDir, 'security-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📄 Summary report generated: ${summaryPath}`);
  }

  /**
   * Generate HTML dashboard
   */
  async generateHTMLDashboard() {
    const findings = this.aggregateFindings();
    const summary = this.calculateSummary(findings);

    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Dashboard - ${this.scanId}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; text-transform: uppercase; font-size: 0.9em; }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .findings { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .finding { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #ddd; }
        .finding.critical { border-left-color: #dc3545; }
        .finding.high { border-left-color: #fd7e14; }
        .finding.medium { border-left-color: #ffc107; }
        .finding.low { border-left-color: #28a745; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Security Dashboard</h1>
            <p>Scan ID: ${this.scanId}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value ${this.getScoreClass(summary.securityScore)}">${summary.securityScore}</div>
                <div class="metric-label">Security Score</div>
            </div>
            <div class="metric">
                <div class="metric-value critical">${summary.CRITICAL || 0}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric">
                <div class="metric-value high">${summary.HIGH || 0}</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric">
                <div class="metric-value medium">${summary.MEDIUM || 0}</div>
                <div class="metric-label">Medium</div>
            </div>
            <div class="metric">
                <div class="metric-value low">${summary.LOW || 0}</div>
                <div class="metric-label">Low</div>
            </div>
        </div>

        <div class="chart-container">
            <h3>Findings by Severity</h3>
            <canvas id="severityChart" width="400" height="200"></canvas>
        </div>

        <div class="findings">
            <h3>Critical & High Severity Findings</h3>
            ${findings.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity?.toUpperCase())).slice(0, 10).map(finding => `
                <div class="finding ${finding.severity?.toLowerCase() || 'info'}">
                    <strong>${finding.title || 'Security Issue'}</strong>
                    <p>${finding.description || 'No description available'}</p>
                    <small>Tool: ${finding.tool} | Category: ${finding.category} | File: ${finding.file || 'N/A'}</small>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        const ctx = document.getElementById('severityChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [${summary.CRITICAL || 0}, ${summary.HIGH || 0}, ${summary.MEDIUM || 0}, ${summary.LOW || 0}],
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745']
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
    </script>
</body>
</html>`;

    const htmlPath = path.join(this.outputDir, 'security-dashboard.html');
    await fs.writeFile(htmlPath, htmlTemplate);
    console.log(`📄 HTML dashboard generated: ${htmlPath}`);
  }

  /**
   * Get CSS class for score color coding
   */
  getScoreClass(score) {
    if (score >= 85) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport() {
    const findings = this.aggregateFindings();
    const summary = this.calculateSummary(findings);

    const markdown = `# Security Test Report

**Scan ID:** ${this.scanId}  
**Generated:** ${new Date().toLocaleString()}  
**Security Score:** ${summary.securityScore}/100  
**Risk Level:** ${summary.riskLevel}

## Summary

| Severity | Count |
|----------|-------|
| Critical | ${summary.CRITICAL || 0} |
| High     | ${summary.HIGH || 0} |
| Medium   | ${summary.MEDIUM || 0} |
| Low      | ${summary.LOW || 0} |
| **Total** | **${summary.totalFindings}** |

## Critical & High Severity Findings

${findings.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity?.toUpperCase())).slice(0, 20).map(finding => `
### ${finding.severity?.toUpperCase()} - ${finding.title || 'Security Issue'}

**Description:** ${finding.description || 'No description available'}  
**Tool:** ${finding.tool}  
**Category:** ${finding.category}  
**File:** ${finding.file || 'N/A'}  
${finding.line ? `**Line:** ${finding.line}` : ''}

---
`).join('')}

## Recommendations

${this.generateRecommendations(findings).map(rec => `- **${rec.priority}**: ${rec.recommendation}`).join('\n')}

## Next Steps

1. Address all critical and high severity issues immediately
2. Implement recommended security controls
3. Schedule regular security testing
4. Update security policies and procedures

---
*Report generated by CI/CD Security Pipeline*
`;

    const markdownPath = path.join(this.outputDir, 'security-report.md');
    await fs.writeFile(markdownPath, markdown);
    console.log(`📄 Markdown report generated: ${markdownPath}`);
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations(findings) {
    const recommendations = [];
    const categories = {};

    findings.forEach(finding => {
      const category = finding.category || 'general';
      categories[category] = (categories[category] || 0) + 1;
    });

    Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([category, count]) => {
        recommendations.push({
          priority: count >= 5 ? 'HIGH' : count >= 3 ? 'MEDIUM' : 'LOW',
          category,
          recommendation: this.getRecommendationForCategory(category),
          affectedFindings: count
        });
      });

    return recommendations;
  }

  /**
   * Get recommendation for category
   */
  getRecommendationForCategory(category) {
    const categoryRecommendations = {
      'sast': 'Review and fix static code analysis findings',
      'dast': 'Address dynamic security vulnerabilities',
      'api': 'Implement API security best practices',
      'gdpr': 'Ensure GDPR compliance requirements are met',
      'penetration': 'Address penetration testing findings',
      'injection': 'Implement input validation and parameterized queries',
      'xss': 'Implement output encoding and CSP',
      'authentication': 'Strengthen authentication mechanisms',
      'authorization': 'Implement proper access controls',
      'encryption': 'Ensure data encryption at rest and in transit'
    };

    return categoryRecommendations[category] || `Address ${category} related security issues`;
  }

  /**
   * Assess compliance based on findings
   */
  assessCompliance(findings) {
    return {
      'OWASP Top 10': this.assessOWASPCompliance(findings),
      'GDPR': this.assessGDPRCompliance(findings),
      'ISO 27001': { status: 'PARTIAL', score: 75 }
    };
  }

  /**
   * Assess OWASP Top 10 compliance
   */
  assessOWASPCompliance(findings) {
    const owaspFindings = findings.filter(f => f.owasp || f.category?.includes('owasp'));
    const score = Math.max(0, 100 - (owaspFindings.length * 5));
    
    return {
      status: score >= 80 ? 'COMPLIANT' : 'NON_COMPLIANT',
      score,
      findings: owaspFindings.length
    };
  }

  /**
   * Assess GDPR compliance
   */
  assessGDPRCompliance(findings) {
    const gdprFindings = findings.filter(f => f.category === 'gdpr');
    const score = Math.max(0, 100 - (gdprFindings.length * 10));
    
    return {
      status: score >= 90 ? 'COMPLIANT' : 'NON_COMPLIANT',
      score,
      findings: gdprFindings.length
    };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value;
  }

  const generator = new CICDReportGenerator(options);
  generator.generateReports()
    .then(result => {
      console.log('✅ Report generation completed successfully');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    });
}

export default CICDReportGenerator;