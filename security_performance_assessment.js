/**
 * Comprehensive Security and Performance Assessment
 * 6FB AI Agent System Production Readiness Test
 */

const http = require('http');
const https = require('https');
const url = require('url');
const { performance } = require('perf_hooks');

class SecurityPerformanceAssessment {
  constructor() {
    this.results = {
      security: {
        endpoints: {},
        headers: {},
        vulnerabilities: [],
        score: 100
      },
      performance: {
        responseTimesMs: {},
        coreWebVitals: {},
        loadTests: {},
        score: 100
      },
      infrastructure: {
        services: {},
        connectivity: {},
        score: 100
      },
      overall: {
        score: 0,
        riskLevel: 'LOW',
        recommendations: []
      }
    };
  }

  async runComprehensiveAssessment() {
    console.log('🚀 Starting Comprehensive Security & Performance Assessment');
    console.log('==========================================================');
    
    try {
      // 1. Security Assessment
      await this.runSecurityTests();
      
      // 2. Performance Testing
      await this.runPerformanceTests();
      
      // 3. Infrastructure Testing
      await this.runInfrastructureTests();
      
      // 4. Calculate overall scores
      this.calculateOverallScore();
      
      // 5. Generate recommendations
      this.generateRecommendations();
      
      // 6. Generate report
      this.generateReport();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Assessment failed:', error.message);
      throw error;
    }
  }

  async runSecurityTests() {
    console.log('\n🛡️ Running Security Assessment...');
    console.log('===================================');
    
    const testEndpoints = [
      'http://localhost:9999/',
      'http://localhost:9999/api/health',
      'http://localhost:8001/health',
      'http://localhost:9999/.env',
      'http://localhost:9999/config.json',
      'http://localhost:9999/.git/config',
      'http://localhost:9999/admin',
      'http://localhost:9999/debug'
    ];

    // Test each endpoint for security
    for (const endpoint of testEndpoints) {
      await this.testEndpointSecurity(endpoint);
    }

    // Calculate security score
    this.calculateSecurityScore();
  }

  async testEndpointSecurity(endpoint) {
    return new Promise((resolve) => {
      const parsedUrl = url.parse(endpoint);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET',
        timeout: 5000
      };

      const startTime = performance.now();
      const req = client.request(options, (res) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        const headers = res.headers;
        const securityHeaders = {
          'x-content-type-options': headers['x-content-type-options'] || 'Missing',
          'x-frame-options': headers['x-frame-options'] || 'Missing',
          'x-xss-protection': headers['x-xss-protection'] || 'Missing',
          'content-security-policy': headers['content-security-policy'] || 'Missing',
          'strict-transport-security': headers['strict-transport-security'] || 'Missing'
        };

        this.results.security.endpoints[endpoint] = {
          status: res.statusCode,
          responseTime: Math.round(responseTime),
          headers: securityHeaders,
          accessible: res.statusCode < 400,
          secure: isHttps
        };

        // Check for sensitive endpoints
        const sensitivePatterns = ['/.env', '/config.json', '/.git', '/admin', '/debug'];
        const isSensitive = sensitivePatterns.some(pattern => endpoint.includes(pattern));
        
        if (isSensitive && res.statusCode === 200) {
          this.results.security.vulnerabilities.push({
            severity: 'CRITICAL',
            endpoint: endpoint,
            issue: 'Sensitive endpoint exposed',
            description: `Endpoint ${endpoint} is accessible and may expose sensitive information`
          });
          console.log(`⚠️  CRITICAL: ${endpoint} is exposed`);
        } else if (isSensitive) {
          console.log(`✅ PROTECTED: ${endpoint} is not accessible`);
        } else {
          // Check security headers for normal endpoints
          const missingHeaders = Object.entries(securityHeaders)
            .filter(([key, value]) => value === 'Missing')
            .map(([key]) => key);
          
          if (missingHeaders.length > 0) {
            this.results.security.vulnerabilities.push({
              severity: 'MEDIUM',
              endpoint: endpoint,
              issue: 'Missing security headers',
              description: `Missing headers: ${missingHeaders.join(', ')}`
            });
            console.log(`⚠️  MEDIUM: ${endpoint} missing security headers: ${missingHeaders.join(', ')}`);
          } else {
            console.log(`✅ SECURE: ${endpoint} has proper security headers`);
          }
        }

        resolve();
      });

      req.on('error', (error) => {
        this.results.security.endpoints[endpoint] = {
          status: 'Error',
          accessible: false,
          error: error.message
        };
        console.log(`❌ ERROR: ${endpoint} - ${error.message}`);
        resolve();
      });

      req.on('timeout', () => {
        this.results.security.endpoints[endpoint] = {
          status: 'Timeout',
          accessible: false,
          error: 'Request timeout'
        };
        console.log(`⏱️ TIMEOUT: ${endpoint}`);
        req.destroy();
        resolve();
      });

      req.end();
    });
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Assessment...');
    console.log('====================================');
    
    const performanceEndpoints = [
      'http://localhost:9999/',
      'http://localhost:9999/api/health',
      'http://localhost:8001/health'
    ];

    // Test response times
    for (const endpoint of performanceEndpoints) {
      await this.testEndpointPerformance(endpoint);
    }

    // Run load test
    await this.runLoadTest();

    this.calculatePerformanceScore();
  }

  async testEndpointPerformance(endpoint) {
    const runs = 5;
    const responseTimes = [];

    console.log(`📊 Testing ${endpoint} performance (${runs} runs)...`);

    for (let i = 0; i < runs; i++) {
      const startTime = performance.now();
      
      try {
        await new Promise((resolve, reject) => {
          const parsedUrl = url.parse(endpoint);
          const client = parsedUrl.protocol === 'https:' ? https : http;
          
          const req = client.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'GET',
            timeout: 10000
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve());
          });

          req.on('error', reject);
          req.on('timeout', () => reject(new Error('Timeout')));
          req.end();
        });

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      } catch (error) {
        responseTimes.push(10000); // Penalty for failed requests
      }
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    this.results.performance.responseTimesMs[endpoint] = {
      average: Math.round(avgResponseTime),
      min: Math.round(minResponseTime),
      max: Math.round(maxResponseTime),
      runs: runs
    };

    console.log(`   Average: ${Math.round(avgResponseTime)}ms`);
    console.log(`   Range: ${Math.round(minResponseTime)}ms - ${Math.round(maxResponseTime)}ms`);

    // Evaluate performance
    if (avgResponseTime > 3000) {
      this.results.performance.score -= 20;
      console.log('   ❌ SLOW: Response time > 3 seconds');
    } else if (avgResponseTime > 1000) {
      this.results.performance.score -= 10;
      console.log('   ⚠️ MODERATE: Response time > 1 second');
    } else if (avgResponseTime > 500) {
      this.results.performance.score -= 5;
      console.log('   ⏱️ ACCEPTABLE: Response time > 500ms');
    } else {
      console.log('   ✅ FAST: Good response time');
    }
  }

  async runLoadTest() {
    console.log('\n🔥 Running Load Test (10 concurrent requests)...');
    
    const endpoint = 'http://localhost:9999/api/health';
    const concurrentRequests = 10;
    const promises = [];

    const startTime = performance.now();

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(this.makeRequest(endpoint));
    }

    try {
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successfulRequests = results.filter(r => r.success).length;
      const failedRequests = results.length - successfulRequests;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      this.results.performance.loadTests = {
        concurrentRequests,
        successfulRequests,
        failedRequests,
        totalTime: Math.round(totalTime),
        avgResponseTime: Math.round(avgResponseTime),
        requestsPerSecond: Math.round(concurrentRequests / (totalTime / 1000))
      };

      console.log(`   Successful: ${successfulRequests}/${concurrentRequests}`);
      console.log(`   Failed: ${failedRequests}`);
      console.log(`   Total time: ${Math.round(totalTime)}ms`);
      console.log(`   Avg response time: ${Math.round(avgResponseTime)}ms`);
      console.log(`   Requests/sec: ${Math.round(concurrentRequests / (totalTime / 1000))}`);

      if (failedRequests > 0) {
        this.results.performance.score -= failedRequests * 10;
        console.log('   ❌ FAILED REQUESTS: System failed under load');
      } else {
        console.log('   ✅ STABLE: System handled concurrent load');
      }

    } catch (error) {
      console.log('   ❌ LOAD TEST FAILED:', error.message);
      this.results.performance.score -= 30;
    }
  }

  async makeRequest(endpoint) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const parsedUrl = url.parse(endpoint);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET',
        timeout: 5000
      }, (res) => {
        const endTime = performance.now();
        resolve({
          success: res.statusCode < 400,
          responseTime: endTime - startTime,
          status: res.statusCode
        });
      });

      req.on('error', () => {
        resolve({
          success: false,
          responseTime: 5000,
          error: 'Request failed'
        });
      });

      req.on('timeout', () => {
        resolve({
          success: false,
          responseTime: 5000,
          error: 'Timeout'
        });
        req.destroy();
      });

      req.end();
    });
  }

  async runInfrastructureTests() {
    console.log('\n🏗️ Running Infrastructure Assessment...');
    console.log('========================================');
    
    // Test Docker services
    await this.testDockerServices();
    
    // Test database connectivity
    await this.testDatabaseConnectivity();
    
    this.calculateInfrastructureScore();
  }

  async testDockerServices() {
    console.log('🐳 Testing Docker services...');
    
    const services = {
      'Frontend (port 9999)': 'http://localhost:9999/api/health',
      'Backend (port 8001)': 'http://localhost:8001/health'
    };

    for (const [serviceName, healthEndpoint] of Object.entries(services)) {
      try {
        const result = await this.makeRequest(healthEndpoint);
        if (result.success) {
          this.results.infrastructure.services[serviceName] = {
            status: 'Healthy',
            responseTime: Math.round(result.responseTime)
          };
          console.log(`   ✅ ${serviceName}: Healthy (${Math.round(result.responseTime)}ms)`);
        } else {
          this.results.infrastructure.services[serviceName] = {
            status: 'Unhealthy',
            error: result.error
          };
          console.log(`   ❌ ${serviceName}: Unhealthy`);
          this.results.infrastructure.score -= 25;
        }
      } catch (error) {
        this.results.infrastructure.services[serviceName] = {
          status: 'Error',
          error: error.message
        };
        console.log(`   ❌ ${serviceName}: Error - ${error.message}`);
        this.results.infrastructure.score -= 25;
      }
    }
  }

  async testDatabaseConnectivity() {
    console.log('🗃️ Testing database connectivity...');
    
    // This would typically test database connections
    // For now, we'll just check if the health endpoints report database status
    
    try {
      const healthResponse = await this.makeHealthRequest('http://localhost:9999/api/health');
      if (healthResponse && healthResponse.includes('supabase')) {
        console.log('   ✅ Database: Supabase connection configured');
        this.results.infrastructure.connectivity['Database'] = {
          status: 'Configured',
          type: 'Supabase'
        };
      } else {
        console.log('   ⚠️ Database: Status unknown');
        this.results.infrastructure.connectivity['Database'] = {
          status: 'Unknown',
          type: 'Unknown'
        };
        this.results.infrastructure.score -= 10;
      }
    } catch (error) {
      console.log('   ❌ Database: Connection test failed');
      this.results.infrastructure.connectivity['Database'] = {
        status: 'Error',
        error: error.message
      };
      this.results.infrastructure.score -= 20;
    }
  }

  async makeHealthRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(endpoint);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });
  }

  calculateSecurityScore() {
    const vulnerabilities = this.results.security.vulnerabilities;
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'CRITICAL':
          this.results.security.score -= 25;
          break;
        case 'HIGH':
          this.results.security.score -= 15;
          break;
        case 'MEDIUM':
          this.results.security.score -= 8;
          break;
        case 'LOW':
          this.results.security.score -= 3;
          break;
      }
    });

    this.results.security.score = Math.max(0, this.results.security.score);
  }

  calculatePerformanceScore() {
    // Performance score is already calculated during testing
    this.results.performance.score = Math.max(0, this.results.performance.score);
  }

  calculateInfrastructureScore() {
    // Infrastructure score is already calculated during testing
    this.results.infrastructure.score = Math.max(0, this.results.infrastructure.score);
  }

  calculateOverallScore() {
    const scores = [
      this.results.security.score,
      this.results.performance.score,
      this.results.infrastructure.score
    ];
    
    this.results.overall.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    // Determine risk level
    if (this.results.overall.score < 50) {
      this.results.overall.riskLevel = 'CRITICAL';
    } else if (this.results.overall.score < 70) {
      this.results.overall.riskLevel = 'HIGH';
    } else if (this.results.overall.score < 85) {
      this.results.overall.riskLevel = 'MEDIUM';
    } else {
      this.results.overall.riskLevel = 'LOW';
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Security recommendations
    const criticalVulns = this.results.security.vulnerabilities.filter(v => v.severity === 'CRITICAL');
    if (criticalVulns.length > 0) {
      recommendations.push({
        priority: 'IMMEDIATE',
        category: 'Security',
        action: `Address ${criticalVulns.length} critical security vulnerabilities immediately`,
        impact: 'High'
      });
    }

    const missingHeaders = this.results.security.vulnerabilities.filter(v => v.issue.includes('security headers'));
    if (missingHeaders.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security',
        action: 'Implement missing security headers (CSP, X-Frame-Options, etc.)',
        impact: 'Medium'
      });
    }

    // Performance recommendations
    if (this.results.performance.score < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Performance',
        action: 'Optimize response times - target < 500ms for critical endpoints',
        impact: 'Medium'
      });
    }

    // Infrastructure recommendations
    if (this.results.infrastructure.score < 90) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Infrastructure',
        action: 'Improve service reliability and monitoring',
        impact: 'Medium'
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Monitoring',
      action: 'Set up comprehensive production monitoring and alerting',
      impact: 'High'
    });

    recommendations.push({
      priority: 'LOW',
      category: 'Testing',
      action: 'Implement automated security and performance testing in CI/CD',
      impact: 'Medium'
    });

    this.results.overall.recommendations = recommendations;
  }

  generateReport() {
    console.log('\n📊 FINAL PRODUCTION READINESS ASSESSMENT');
    console.log('=========================================');
    
    console.log(`\n🎯 Overall Score: ${this.results.overall.score}/100`);
    console.log(`🚨 Risk Level: ${this.results.overall.riskLevel}`);
    
    console.log('\n📈 Component Scores:');
    console.log(`   🛡️ Security: ${this.results.security.score}/100`);
    console.log(`   ⚡ Performance: ${this.results.performance.score}/100`);
    console.log(`   🏗️ Infrastructure: ${this.results.infrastructure.score}/100`);
    
    console.log('\n🔍 Security Assessment:');
    console.log(`   Vulnerabilities: ${this.results.security.vulnerabilities.length}`);
    console.log(`   Critical: ${this.results.security.vulnerabilities.filter(v => v.severity === 'CRITICAL').length}`);
    console.log(`   High: ${this.results.security.vulnerabilities.filter(v => v.severity === 'HIGH').length}`);
    console.log(`   Medium: ${this.results.security.vulnerabilities.filter(v => v.severity === 'MEDIUM').length}`);
    
    console.log('\n⚡ Performance Assessment:');
    const healthEndpoint = this.results.performance.responseTimesMs['http://localhost:9999/api/health'];
    if (healthEndpoint) {
      console.log(`   Health endpoint avg response: ${healthEndpoint.average}ms`);
    }
    
    if (this.results.performance.loadTests.concurrentRequests) {
      console.log(`   Load test success rate: ${this.results.performance.loadTests.successfulRequests}/${this.results.performance.loadTests.concurrentRequests}`);
    }
    
    console.log('\n🏗️ Infrastructure Assessment:');
    const serviceCount = Object.keys(this.results.infrastructure.services).length;
    const healthyServices = Object.values(this.results.infrastructure.services).filter(s => s.status === 'Healthy').length;
    console.log(`   Healthy services: ${healthyServices}/${serviceCount}`);
    
    console.log('\n🎯 Top Recommendations:');
    this.results.overall.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority}] ${rec.action}`);
    });
    
    console.log('\n✅ Production Readiness Assessment Complete');
    
    // Determine production readiness
    if (this.results.overall.score >= 85 && this.results.overall.riskLevel === 'LOW') {
      console.log('🚀 READY FOR PRODUCTION DEPLOYMENT');
    } else if (this.results.overall.score >= 70) {
      console.log('⚠️ CONDITIONAL DEPLOYMENT - Address high priority issues first');
    } else {
      console.log('❌ NOT READY FOR PRODUCTION - Critical issues must be resolved');
    }
  }
}

// Run the assessment
const assessment = new SecurityPerformanceAssessment();
assessment.runComprehensiveAssessment()
  .then((results) => {
    console.log('\n📁 Assessment completed successfully');
    // Optionally save results to file
    require('fs').writeFileSync('production-readiness-assessment.json', JSON.stringify(results, null, 2));
    console.log('📄 Detailed results saved to: production-readiness-assessment.json');
  })
  .catch((error) => {
    console.error('❌ Assessment failed:', error);
    process.exit(1);
  });