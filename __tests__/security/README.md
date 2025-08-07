# Comprehensive Security Testing Pipeline

## Overview

This security testing pipeline provides enterprise-grade security testing capabilities for the 6FB AI Agent System. It includes automated Static Application Security Testing (SAST), Dynamic Application Security Testing (DAST), API security testing, penetration testing, GDPR compliance verification, and continuous security monitoring.

## Features

### 🔍 Static Application Security Testing (SAST)
- **Semgrep** - Advanced static analysis with security rules
- **Bandit** - Python security linter 
- **ESLint Security Plugin** - JavaScript/TypeScript security rules
- **Custom SAST** - Hardcoded secrets detection and dangerous patterns

### 🎯 Dynamic Application Security Testing (DAST)
- **Nuclei** - Fast vulnerability scanner with 4000+ templates
- **Custom DAST** - Security headers, information disclosure, common vulnerabilities
- **SSL/TLS Testing** - Certificate validation and configuration
- **DNS Security** - DNS configuration assessment

### 🛡️ API Security Testing
- **Endpoint Discovery** - Automatic API endpoint enumeration
- **Authentication Testing** - JWT, OAuth, session management
- **Authorization Testing** - Role-based access control validation
- **Input Validation** - SQL injection, XSS, parameter pollution
- **Rate Limiting** - DDoS protection and abuse prevention
- **CORS Configuration** - Cross-origin resource sharing security

### 🎯 Penetration Testing
- **Authentication Bypass** - SQL injection, header manipulation, JWT attacks
- **Session Management** - Session fixation, hijacking, timeout testing
- **Privilege Escalation** - Horizontal and vertical privilege escalation
- **Business Logic Flaws** - Price manipulation, workflow bypass
- **Injection Vulnerabilities** - SQL, NoSQL, LDAP, command injection

### 🇪🇺 GDPR Compliance Testing
- **Consent Management** - Cookie consent, granular permissions
- **Data Subject Rights** - Access, rectification, erasure, portability
- **Data Minimization** - Excessive data collection detection
- **Lawful Basis** - Processing justification documentation
- **Privacy by Design** - Built-in privacy controls

### 🔄 Continuous Security Monitoring
- **Real-time Scanning** - Automated vulnerability detection
- **Alert Management** - Threshold-based notifications
- **Metrics Collection** - Security score tracking
- **Incident Response** - Automated alerting and reporting

### 📊 Security Reporting & Dashboards
- **Interactive HTML Dashboard** - Visual security metrics
- **Comprehensive JSON Reports** - Machine-readable results
- **SARIF Format** - Tool integration compatibility
- **Executive Summaries** - Business-friendly reporting
- **Remediation Plans** - Prioritized action items

## Quick Start

### Prerequisites

```bash
# Install Node.js dependencies
npm install

# Install Python security tools
pip install bandit safety semgrep

# Install Nuclei
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Install additional tools
npm install -g retire audit-ci
```

### Running Tests

```bash
# Run complete security suite
npm run test:security

# Run specific test categories
npm run test:security:sast      # Static analysis only
npm run test:security:dast      # Dynamic analysis only
npm run test:security:api       # API security only
npm run test:security:gdpr      # GDPR compliance only
npm run test:security:pentest   # Penetration testing only

# Run with Playwright
npx playwright test __tests__/security/comprehensive-security-test.spec.js

# Quick health check
npx playwright test __tests__/security/comprehensive-security-test.spec.js -g "Quick Security Health Check"
```

## Directory Structure

```
__tests__/security/
├── config/
│   └── security-config.js              # Main configuration
├── sast-dast/
│   └── automated-scanner.js            # SAST/DAST scanner
├── penetration-testing/
│   └── automated-pentest.js            # Penetration testing
├── api-security/
│   └── api-security-tests.js           # API security testing
├── gdpr-compliance/
│   └── gdpr-compliance-tests.js        # GDPR compliance
├── monitoring/
│   └── continuous-security-monitor.js  # Security monitoring
├── reporting/
│   └── security-dashboard.js           # Reporting system
├── ci-cd/
│   ├── security-pipeline.yml           # GitHub Actions workflow
│   └── generate-report.js              # CI/CD report generator
├── reports/                             # Generated reports
├── security-test-orchestrator.js       # Main orchestrator
├── comprehensive-security-test.spec.js # Main test file
└── README.md                           # This file
```

## Configuration

### Environment Variables

```bash
# Required for full functionality
SECURITY_WEBHOOK_URL=          # Security alerts webhook
DEFECTDOJO_URL=               # DefectDojo integration
DEFECTDOJO_TOKEN=             # DefectDojo API token
SLACK_WEBHOOK_URL=            # Slack notifications
SMTP_SERVER=                  # Email notifications
MONITORING_WEBHOOK_URL=       # Monitoring alerts

# Optional integrations
SONAR_HOST=                   # SonarQube server
SONAR_TOKEN=                  # SonarQube token
ZAP_API_KEY=                  # OWASP ZAP API key
```

### Security Configuration

Edit `config/security-config.js` to customize:

- **Authentication settings** - Password requirements, session timeouts
- **Input validation patterns** - SQL injection, XSS, LDAP patterns
- **API security rules** - Rate limiting, CORS, headers
- **Vulnerability scanning** - Tool configurations, severity thresholds
- **GDPR requirements** - Data categories, retention policies
- **Monitoring alerts** - Threshold levels, notification channels

## CI/CD Integration

### GitHub Actions

The pipeline includes a comprehensive GitHub Actions workflow:

```yaml
# .github/workflows/security.yml
name: Security Testing Pipeline
on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
```

### Pipeline Stages

1. **Preparation** - Tool installation and environment setup
2. **Static Analysis** - Code security scanning
3. **Dynamic Analysis** - Runtime vulnerability testing
4. **API Security** - Endpoint security validation
5. **Penetration Testing** - Simulated attacks
6. **GDPR Compliance** - Privacy regulation compliance
7. **Reporting** - Comprehensive report generation
8. **Notifications** - Alert distribution

### Integration Commands

```bash
# Manual CI/CD execution
node __tests__/security/ci-cd/generate-report.js \
  --scan-id="manual-scan-$(date +%Y%m%d)" \
  --input-dir="security-results/" \
  --output-dir="reports/"

# Docker execution
docker run -v $(pwd):/app -w /app node:20 \
  npm run test:security
```

## Security Testing Categories

### OWASP Top 10 Coverage

- ✅ **A01 - Broken Access Control** - Authorization testing
- ✅ **A02 - Cryptographic Failures** - Encryption validation  
- ✅ **A03 - Injection** - SQL, XSS, command injection testing
- ✅ **A04 - Insecure Design** - Business logic flaw detection
- ✅ **A05 - Security Misconfiguration** - Headers, CORS, SSL
- ✅ **A06 - Vulnerable Components** - Dependency scanning
- ✅ **A07 - Authentication Failures** - Auth bypass testing
- ✅ **A08 - Software Integrity Failures** - Supply chain security
- ✅ **A09 - Logging Failures** - Security event monitoring
- ✅ **A10 - SSRF** - Server-side request forgery testing

### GDPR Article Coverage

- ✅ **Article 6** - Lawful Basis documentation
- ✅ **Article 7** - Consent management
- ✅ **Article 15** - Right to Access (data export)
- ✅ **Article 16** - Right to Rectification (data editing)
- ✅ **Article 17** - Right to Erasure (account deletion)
- ✅ **Article 20** - Data Portability (structured export)
- ✅ **Article 25** - Privacy by Design validation
- ✅ **Article 32** - Security of Processing

## Security Metrics

### Security Score Calculation

```javascript
const securityScore = Math.max(0, 100 - 
  (criticalIssues * 25) - 
  (highIssues * 15) - 
  (mediumIssues * 8) - 
  (lowIssues * 3)
);
```

### Risk Levels

- **LOW** (85-100): Excellent security posture
- **MEDIUM** (70-84): Good security, minor improvements needed
- **HIGH** (50-69): Significant security issues requiring attention
- **CRITICAL** (0-49): Severe security vulnerabilities requiring immediate action

### Key Performance Indicators

- **Vulnerability Count** - Total security issues identified
- **Mean Time to Remediation** - Average fix time for issues
- **Security Coverage** - Percentage of code/endpoints tested
- **Compliance Score** - Regulatory compliance percentage

## Best Practices

### Development Integration

1. **Pre-commit Hooks** - Basic security checks before code commit
2. **Pull Request Gating** - Security validation before merge
3. **Daily Scans** - Automated nightly security testing
4. **Release Gates** - Security approval required for production

### Remediation Workflow

1. **Immediate** (Critical) - Fix within 24 hours
2. **Short-term** (High) - Fix within 7 days  
3. **Medium-term** (Medium) - Fix within 30 days
4. **Long-term** (Low) - Fix within 90 days

### Security Training

- **Secure Coding** - OWASP guidelines and best practices
- **Threat Modeling** - Risk assessment techniques
- **Incident Response** - Security breach procedures
- **Compliance** - GDPR, SOC2, ISO27001 requirements

## Troubleshooting

### Common Issues

**Tests failing with network errors:**
```bash
# Check application is running
curl http://localhost:9999/api/health

# Start application if needed
npm run dev
```

**Security tools not found:**
```bash
# Install tools manually
pip install semgrep bandit safety
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

**False positives in results:**
```bash
# Configure exclusions in security-config.js
excludePaths: ['/test/', '/docs/']
falsePositivePatterns: ['test-pattern']
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=security:* npm run test:security

# Run single test with verbose output
npx playwright test __tests__/security/comprehensive-security-test.spec.js --headed --debug
```

## Integration Examples

### DefectDojo Integration

```bash
curl -X POST "$DEFECTDOJO_URL/api/v2/import-scan/" \
  -H "Authorization: Token $DEFECTDOJO_TOKEN" \
  -F "scan_type=Generic Findings Import" \
  -F "file=@reports/security-report.json"
```

### Slack Notifications

```bash
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Security scan completed",
    "attachments": [{
      "color": "warning",
      "fields": [
        {"title": "Critical", "value": "2", "short": true},
        {"title": "High", "value": "5", "short": true}
      ]
    }]
  }'
```

### SonarQube Integration

```bash
sonar-scanner \
  -Dsonar.projectKey=6fb-ai-agent-system \
  -Dsonar.sources=. \
  -Dsonar.host.url=$SONAR_HOST \
  -Dsonar.login=$SONAR_TOKEN
```

## Contributing

### Adding New Security Tests

1. **Create test file** in appropriate category directory
2. **Follow naming convention** - `*-security-tests.js`
3. **Use security config** - Import from `config/security-config.js`
4. **Document findings** - Clear descriptions and remediation
5. **Update orchestrator** - Add to test execution flow

### Adding New Security Tools

1. **Tool integration** - Add to `automated-scanner.js`
2. **Result parsing** - Handle tool-specific output format
3. **Configuration** - Add tool settings to security config
4. **CI/CD integration** - Update pipeline with tool installation
5. **Documentation** - Update README with tool information

## Support

For questions, issues, or contributions:

1. **GitHub Issues** - Bug reports and feature requests
2. **Security Team** - security@6fb-ai-agent.com
3. **Documentation** - Additional guides in `/docs/security/`
4. **Training** - Security workshop materials available

## License

This security testing pipeline is part of the 6FB AI Agent System and follows the same licensing terms.