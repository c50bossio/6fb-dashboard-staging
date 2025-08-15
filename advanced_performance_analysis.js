#!/usr/bin/env node

/**
 * 6FB AI Agent System - Advanced Performance Analysis
 * Includes load testing, database performance, and real-world scenarios
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class AdvancedPerformanceAnalyzer {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            system: {
                frontend_url: 'http://localhost:9999',
                backend_url: 'http://localhost:8001',
                test_environment: 'development'
            },
            load_testing: {},
            database_performance: {},
            real_world_scenarios: {},
            concurrent_user_testing: {},
            recommendations: []
        };
    }

    async runAdvancedAnalysis() {
        console.log('🚀 Starting advanced performance analysis...\n');

        try {
            // 1. Database Performance Analysis
            await this.analyzeDatabasePerformance();
            
            // 2. Load Testing with Real Endpoints
            await this.performLoadTesting();
            
            // 3. Concurrent User Testing
            await this.testConcurrentUsers();
            
            // 4. Real-world Barbershop Scenarios
            await this.testBarbershopScenarios();
            
            // 5. Generate Advanced Report
            await this.generateAdvancedReport();
            
            console.log('✅ Advanced performance analysis completed successfully!');
            
        } catch (error) {
            console.error('❌ Advanced performance analysis failed:', error);
            throw error;
        }
    }

    async analyzeDatabasePerformance() {
        console.log('🗄️ Analyzing Database Performance...');
        
        const dbTests = [
            { name: 'Database Health', endpoint: '/api/v1/database/health' },
            { name: 'Database Info', endpoint: '/api/v1/database/info' },
            { name: 'Database Stats', endpoint: '/api/v1/database/stats' }
        ];

        this.results.database_performance.tests = {};
        
        for (const test of dbTests) {
            console.log(`  Testing ${test.name}...`);
            
            const times = [];
            const results = [];
            
            for (let i = 0; i < 10; i++) {
                try {
                    const startTime = Date.now();
                    const response = await fetch(`${this.results.system.backend_url}${test.endpoint}`);
                    const endTime = Date.now();
                    
                    const responseTime = endTime - startTime;
                    times.push(responseTime);
                    
                    if (response.ok) {
                        const data = await response.json();
                        results.push(data);
                    }
                } catch (error) {
                    console.log(`    ⚠️ Error: ${error.message}`);
                }
            }
            
            if (times.length > 0) {
                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                const minTime = Math.min(...times);
                const maxTime = Math.max(...times);
                const p95 = this.calculatePercentile(times, 95);
                
                this.results.database_performance.tests[test.name] = {
                    endpoint: test.endpoint,
                    averageResponseTime: Math.round(avgTime),
                    minResponseTime: minTime,
                    maxResponseTime: maxTime,
                    p95ResponseTime: Math.round(p95),
                    successfulRequests: results.length,
                    totalRequests: 10,
                    lastResult: results[results.length - 1] || null
                };
                
                console.log(`    ✅ Avg: ${Math.round(avgTime)}ms, P95: ${Math.round(p95)}ms`);
            }
        }
    }

    async performLoadTesting() {
        console.log('📊 Performing Load Testing...');
        
        const endpoints = [
            { name: 'Health Check', url: '/health', method: 'GET' },
            { name: 'Dashboard Stats', url: '/api/v1/dashboard/stats', method: 'GET' },
            { name: 'AI Agents Status', url: '/api/v1/ai/agents/status', method: 'GET' },
            { name: 'AI Performance Status', url: '/api/v1/ai/performance/status', method: 'GET' },
            { name: 'Business Recommendations Status', url: '/api/v1/business/recommendations/status', method: 'GET' }
        ];

        this.results.load_testing.endpoints = {};
        
        for (const endpoint of endpoints) {
            console.log(`  Load testing ${endpoint.name}...`);
            
            const loadLevels = [1, 5, 10, 25]; // concurrent requests
            this.results.load_testing.endpoints[endpoint.name] = {};
            
            for (const concurrent of loadLevels) {
                console.log(`    Testing with ${concurrent} concurrent requests...`);
                
                const promises = [];
                const startTime = Date.now();
                
                for (let i = 0; i < concurrent; i++) {
                    promises.push(this.makeTimedRequest(endpoint.url, endpoint.method));
                }
                
                try {
                    const results = await Promise.all(promises);
                    const endTime = Date.now();
                    
                    const successful = results.filter(r => r.success);
                    const responseTimes = successful.map(r => r.responseTime);
                    
                    const stats = {
                        concurrentRequests: concurrent,
                        totalTime: endTime - startTime,
                        successfulRequests: successful.length,
                        failedRequests: concurrent - successful.length,
                        averageResponseTime: responseTimes.length > 0 ? 
                            Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
                        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
                        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
                        p95ResponseTime: responseTimes.length > 0 ? 
                            Math.round(this.calculatePercentile(responseTimes, 95)) : 0,
                        requestsPerSecond: successful.length / ((endTime - startTime) / 1000)
                    };
                    
                    this.results.load_testing.endpoints[endpoint.name][concurrent] = stats;
                    
                    console.log(`      ✅ ${successful.length}/${concurrent} successful, Avg: ${stats.averageResponseTime}ms, RPS: ${stats.requestsPerSecond.toFixed(2)}`);
                    
                } catch (error) {
                    console.log(`      ❌ Load test failed: ${error.message}`);
                    this.results.load_testing.endpoints[endpoint.name][concurrent] = {
                        error: error.message,
                        concurrentRequests: concurrent
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    async testConcurrentUsers() {
        console.log('👥 Testing Concurrent Users...');
        
        const userConcurrencyLevels = [1, 3, 5, 10];
        this.results.concurrent_user_testing.scenarios = {};
        
        for (const userCount of userConcurrencyLevels) {
            console.log(`  Testing ${userCount} concurrent users...`);
            
            try {
                const browsers = [];
                const results = [];
                
                for (let i = 0; i < userCount; i++) {
                    const browser = await chromium.launch({ headless: true });
                    browsers.push(browser);
                }
                
                const startTime = Date.now();
                
                const userPromises = browsers.map((browser, index) => 
                    this.simulateUserWorkflow(browser, index)
                );
                
                const userResults = await Promise.all(userPromises);
                const endTime = Date.now();
                
                await Promise.all(browsers.map(browser => browser.close()));
                
                const successful = userResults.filter(r => r.success);
                const totalTime = endTime - startTime;
                
                this.results.concurrent_user_testing.scenarios[userCount] = {
                    userCount: userCount,
                    totalTime: totalTime,
                    successfulUsers: successful.length,
                    failedUsers: userCount - successful.length,
                    averageUserTime: successful.length > 0 ? 
                        Math.round(successful.reduce((acc, user) => acc + user.totalTime, 0) / successful.length) : 0,
                    userResults: userResults
                };
                
                console.log(`    ✅ ${successful.length}/${userCount} users completed successfully`);
                console.log(`    Total time: ${totalTime}ms, Avg user time: ${this.results.concurrent_user_testing.scenarios[userCount].averageUserTime}ms`);
                
            } catch (error) {
                console.log(`    ❌ Concurrent user test failed: ${error.message}`);
                this.results.concurrent_user_testing.scenarios[userCount] = {
                    error: error.message,
                    userCount: userCount
                };
            }
        }
    }

    async simulateUserWorkflow(browser, userIndex) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            const startTime = Date.now();
            
            const workflow = [
                { action: 'Load Dashboard', url: '/' },
                { action: 'View Analytics', url: '/dashboard/analytics' },
                { action: 'Navigate Back to Dashboard', url: '/' }
            ];
            
            const steps = [];
            
            for (const step of workflow) {
                const stepStart = Date.now();
                
                try {
                    await page.goto(`${this.results.system.frontend_url}${step.url}`, { 
                        waitUntil: 'networkidle',
                        timeout: 30000 
                    });
                    
                    await page.waitForLoadState('networkidle');
                    
                    const stepEnd = Date.now();
                    steps.push({
                        action: step.action,
                        success: true,
                        time: stepEnd - stepStart
                    });
                    
                } catch (error) {
                    const stepEnd = Date.now();
                    steps.push({
                        action: step.action,
                        success: false,
                        time: stepEnd - stepStart,
                        error: error.message
                    });
                }
            }
            
            const endTime = Date.now();
            
            return {
                userIndex: userIndex,
                success: steps.every(step => step.success),
                totalTime: endTime - startTime,
                steps: steps
            };
            
        } catch (error) {
            return {
                userIndex: userIndex,
                success: false,
                error: error.message
            };
        } finally {
            await context.close();
        }
    }

    async testBarbershopScenarios() {
        console.log('💈 Testing Real-world Barbershop Scenarios...');
        
        const scenarios = [
            {
                name: 'Morning Dashboard Check',
                description: 'Shop owner checks dashboard and analytics first thing in the morning',
                workflow: async () => {
                    const browser = await chromium.launch({ headless: true });
                    const page = await browser.newPage();
                    
                    try {
                        const startTime = Date.now();
                        
                        await page.goto(`${this.results.system.frontend_url}/`, { waitUntil: 'networkidle' });
                        const dashboardLoadTime = Date.now() - startTime;
                        
                        const dashboardElements = await page.evaluate(() => {
                            return {
                                hasHeader: !!document.querySelector('header, nav, .navbar'),
                                hasMainContent: !!document.querySelector('main, .main-content, .dashboard'),
                                hasMetrics: !!document.querySelector('.metric, .stat, .card'),
                                hasNavigation: !!document.querySelector('nav, .navigation, .sidebar')
                            };
                        });
                        
                        const analyticsStart = Date.now();
                        await page.goto(`${this.results.system.frontend_url}/dashboard/analytics`, { waitUntil: 'networkidle' });
                        const analyticsLoadTime = Date.now() - analyticsStart;
                        
                        const analyticsElements = await page.evaluate(() => {
                            return {
                                hasCharts: !!document.querySelector('canvas, .recharts-wrapper, .chart'),
                                hasAnalytics: !!document.querySelector('.analytics, .chart-container'),
                                hasData: !!document.querySelector('.data, .metrics, .stats')
                            };
                        });
                        
                        const totalTime = Date.now() - startTime;
                        
                        return {
                            success: true,
                            dashboardLoadTime,
                            analyticsLoadTime,
                            totalTime,
                            dashboardElements,
                            analyticsElements
                        };
                        
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message
                        };
                    } finally {
                        await browser.close();
                    }
                }
            },
            {
                name: 'AI Assistant Consultation',
                description: 'Shop owner asks AI for business recommendations',
                workflow: async () => {
                    const startTime = Date.now();
                    
                    try {
                        const aiTests = [
                            '/api/v1/ai/agents/status',
                            '/api/v1/business/recommendations/status',
                            '/api/v1/ai/performance/status'
                        ];
                        
                        const results = {};
                        
                        for (const endpoint of aiTests) {
                            const testStart = Date.now();
                            try {
                                const response = await fetch(`${this.results.system.backend_url}${endpoint}`);
                                const testEnd = Date.now();
                                
                                results[endpoint] = {
                                    success: response.ok,
                                    status: response.status,
                                    responseTime: testEnd - testStart
                                };
                                
                                if (response.ok) {
                                    results[endpoint].data = await response.json();
                                }
                            } catch (error) {
                                results[endpoint] = {
                                    success: false,
                                    error: error.message
                                };
                            }
                        }
                        
                        const totalTime = Date.now() - startTime;
                        
                        return {
                            success: Object.values(results).some(r => r.success),
                            totalTime,
                            aiEndpointResults: results
                        };
                        
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }
                }
            }
        ];

        this.results.real_world_scenarios.tests = {};
        
        for (const scenario of scenarios) {
            console.log(`  Testing ${scenario.name}...`);
            
            try {
                const result = await scenario.workflow();
                this.results.real_world_scenarios.tests[scenario.name] = {
                    description: scenario.description,
                    ...result
                };
                
                if (result.success) {
                    console.log(`    ✅ Completed successfully in ${result.totalTime}ms`);
                } else {
                    console.log(`    ❌ Failed: ${result.error || 'Unknown error'}`);
                }
                
            } catch (error) {
                console.log(`    ❌ Test error: ${error.message}`);
                this.results.real_world_scenarios.tests[scenario.name] = {
                    description: scenario.description,
                    success: false,
                    error: error.message
                };
            }
        }
    }

    async makeTimedRequest(url, method = 'GET') {
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${this.results.system.backend_url}${url}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const endTime = Date.now();
            
            return {
                success: response.ok,
                status: response.status,
                responseTime: endTime - startTime
            };
            
        } catch (error) {
            const endTime = Date.now();
            
            return {
                success: false,
                error: error.message,
                responseTime: endTime - startTime
            };
        }
    }

    calculatePercentile(values, percentile) {
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * percentile / 100) - 1;
        return sorted[index] || 0;
    }

    generateAdvancedRecommendations() {
        const recommendations = [];
        
        if (this.results.database_performance.tests) {
            Object.entries(this.results.database_performance.tests).forEach(([testName, testData]) => {
                if (testData.averageResponseTime > 200) {
                    recommendations.push({
                        category: 'Database Performance',
                        priority: 'High',
                        issue: `${testName} database queries are slow (${testData.averageResponseTime}ms avg)`,
                        recommendation: 'Optimize database queries, add indexes, and consider connection pooling'
                    });
                }
            });
        }

        if (this.results.load_testing.endpoints) {
            Object.entries(this.results.load_testing.endpoints).forEach(([endpointName, loadData]) => {
                Object.entries(loadData).forEach(([concurrency, stats]) => {
                    if (stats.failedRequests && stats.failedRequests > 0) {
                        recommendations.push({
                            category: 'Scalability',
                            priority: 'Critical',
                            issue: `${endpointName} fails under ${concurrency} concurrent requests (${stats.failedRequests} failures)`,
                            recommendation: 'Implement proper error handling, rate limiting, and connection pooling'
                        });
                    }
                    
                    if (stats.averageResponseTime > 1000) {
                        recommendations.push({
                            category: 'Performance Under Load',
                            priority: 'High',
                            issue: `${endpointName} response time degrades under load (${stats.averageResponseTime}ms at ${concurrency} concurrent)`,
                            recommendation: 'Implement caching, optimize queries, and consider horizontal scaling'
                        });
                    }
                });
            });
        }

        if (this.results.concurrent_user_testing.scenarios) {
            Object.entries(this.results.concurrent_user_testing.scenarios).forEach(([userCount, scenario]) => {
                if (scenario.failedUsers > 0) {
                    recommendations.push({
                        category: 'User Experience',
                        priority: 'Critical',
                        issue: `${scenario.failedUsers} out of ${userCount} concurrent users failed`,
                        recommendation: 'Improve error handling, implement graceful degradation, and add retry mechanisms'
                    });
                }
                
                if (scenario.averageUserTime > 10000) {
                    recommendations.push({
                        category: 'User Experience',
                        priority: 'Medium',
                        issue: `Average user workflow time is slow (${scenario.averageUserTime}ms) with ${userCount} users`,
                        recommendation: 'Optimize frontend loading, implement lazy loading, and add loading indicators'
                    });
                }
            });
        }

        if (this.results.real_world_scenarios.tests) {
            Object.entries(this.results.real_world_scenarios.tests).forEach(([scenarioName, scenarioData]) => {
                if (!scenarioData.success) {
                    recommendations.push({
                        category: 'Business Critical',
                        priority: 'Critical',
                        issue: `${scenarioName} scenario failed`,
                        recommendation: 'Fix critical business workflow to ensure barbershop operations are not disrupted'
                    });
                }
            });
        }

        return recommendations;
    }

    async generateAdvancedReport() {
        console.log('📋 Generating Advanced Performance Report...');
        
        this.results.recommendations = this.generateAdvancedRecommendations();
        this.results.summary = this.generateAdvancedSummary();
        
        const reportPath = path.join(__dirname, 'advanced_performance_results.json');
        await fs.promises.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        
        const readableReport = this.generateAdvancedReadableReport();
        const readableReportPath = path.join(__dirname, 'ADVANCED_PERFORMANCE_REPORT.md');
        await fs.promises.writeFile(readableReportPath, readableReport);
        
        console.log(`✅ Advanced reports saved to:`);
        console.log(`   📊 JSON: ${reportPath}`);
        console.log(`   📝 Markdown: ${readableReportPath}`);
    }

    generateAdvancedSummary() {
        const summary = {
            databasePerformanceScore: 0,
            loadTestingScore: 0,
            concurrentUserScore: 0,
            realWorldScenarioScore: 0,
            overallAdvancedScore: 0,
            criticalIssues: 0,
            recommendations: this.results.recommendations.length
        };

        if (this.results.database_performance.tests) {
            const dbTests = Object.values(this.results.database_performance.tests);
            if (dbTests.length > 0) {
                const avgResponseTime = dbTests.reduce((acc, test) => acc + test.averageResponseTime, 0) / dbTests.length;
                summary.databasePerformanceScore = Math.max(0, 100 - avgResponseTime);
            }
        }

        if (this.results.load_testing.endpoints) {
            let totalScore = 0;
            let testCount = 0;
            
            Object.values(this.results.load_testing.endpoints).forEach(endpoint => {
                Object.values(endpoint).forEach(stats => {
                    if (!stats.error) {
                        const successRate = stats.successfulRequests / stats.totalRequests;
                        const responseTimeScore = Math.max(0, 100 - stats.averageResponseTime / 10);
                        totalScore += (successRate * 100 + responseTimeScore) / 2;
                        testCount++;
                    }
                });
            });
            
            if (testCount > 0) {
                summary.loadTestingScore = Math.round(totalScore / testCount);
            }
        }

        if (this.results.concurrent_user_testing.scenarios) {
            const scenarios = Object.values(this.results.concurrent_user_testing.scenarios);
            if (scenarios.length > 0) {
                const avgSuccessRate = scenarios.reduce((acc, scenario) => {
                    return acc + (scenario.successfulUsers || 0) / (scenario.userCount || 1);
                }, 0) / scenarios.length;
                summary.concurrentUserScore = Math.round(avgSuccessRate * 100);
            }
        }

        if (this.results.real_world_scenarios.tests) {
            const scenarios = Object.values(this.results.real_world_scenarios.tests);
            const successfulScenarios = scenarios.filter(s => s.success).length;
            summary.realWorldScenarioScore = Math.round((successfulScenarios / scenarios.length) * 100);
        }

        const scores = [
            summary.databasePerformanceScore,
            summary.loadTestingScore,
            summary.concurrentUserScore,
            summary.realWorldScenarioScore
        ].filter(score => score > 0);
        
        if (scores.length > 0) {
            summary.overallAdvancedScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }

        summary.criticalIssues = this.results.recommendations.filter(r => r.priority === 'Critical').length;

        return summary;
    }

    generateAdvancedReadableReport() {
        const summary = this.results.summary;
        
        return `# 6FB AI Agent System - Advanced Performance Analysis Report

**Generated:** ${this.results.timestamp}
**Environment:** ${this.results.system.test_environment}
**Analysis Type:** Load Testing, Database Performance, Concurrent Users, Real-world Scenarios

## Executive Summary

- **Overall Advanced Performance Score:** ${summary.overallAdvancedScore}/100
- **Database Performance Score:** ${summary.databasePerformanceScore}/100
- **Load Testing Score:** ${summary.loadTestingScore}/100
- **Concurrent User Score:** ${summary.concurrentUserScore}/100
- **Real-world Scenario Score:** ${summary.realWorldScenarioScore}/100
- **Critical Issues:** ${summary.criticalIssues}
- **Total Recommendations:** ${summary.recommendations}

## Database Performance Analysis

${this.generateDatabaseSection()}

## Load Testing Results

${this.generateLoadTestingSection()}

## Concurrent User Testing

${this.generateConcurrentUserSection()}

## Real-world Barbershop Scenarios

${this.generateRealWorldSection()}

## Advanced Recommendations

### Critical Issues (Immediate Action Required)
${this.results.recommendations
  .filter(r => r.priority === 'Critical')
  .map(r => `- **${r.issue}**\n  ${r.recommendation}`)
  .join('\n\n')}

### High Priority Issues
${this.results.recommendations
  .filter(r => r.priority === 'High')
  .map(r => `- **${r.issue}**\n  ${r.recommendation}`)
  .join('\n\n')}

### Medium Priority Improvements
${this.results.recommendations
  .filter(r => r.priority === 'Medium')
  .map(r => `- **${r.issue}**\n  ${r.recommendation}`)
  .join('\n\n')}

## Scalability Assessment

### Current System Capacity
- **Maximum Concurrent API Requests:** ${this.assessMaxConcurrency()}
- **Database Query Performance:** ${this.assessDatabaseCapacity()}
- **Frontend Concurrent Users:** ${this.assessFrontendCapacity()}

### Scaling Recommendations
1. **Database Scaling:** Implement connection pooling and query optimization
2. **API Scaling:** Add rate limiting and caching layers
3. **Frontend Scaling:** Implement CDN and static asset optimization
4. **Infrastructure Scaling:** Consider containerization and horizontal scaling

## Performance Monitoring Implementation Plan

### Phase 1: Basic Monitoring (Week 1)
- Implement health checks and basic metrics collection
- Set up error tracking and alerting
- Create performance dashboards

### Phase 2: Advanced Monitoring (Weeks 2-3)
- Implement Real User Monitoring (RUM)
- Set up synthetic monitoring and automated testing
- Create performance budgets and alerts

### Phase 3: Predictive Monitoring (Weeks 4-6)
- Implement capacity planning and trend analysis
- Set up automated scaling triggers
- Create comprehensive performance reports

---

*This advanced report was generated automatically by the 6FB AI Agent System Performance Analyzer*
`;
    }

    generateDatabaseSection() {
        if (!this.results.database_performance.tests) {
            return '**Status:** No database performance data available\n';
        }

        let section = '| Test | Avg Response Time | P95 Response Time | Success Rate | Status |\n';
        section += '|------|-------------------|-------------------|--------------|--------|\n';
        
        Object.entries(this.results.database_performance.tests).forEach(([testName, testData]) => {
            const successRate = `${testData.successfulRequests}/${testData.totalRequests}`;
            const status = testData.averageResponseTime < 100 ? '✅ Excellent' : 
                          testData.averageResponseTime < 200 ? '✅ Good' : 
                          testData.averageResponseTime < 500 ? '⚠️ Moderate' : '❌ Slow';
            
            section += `| ${testName} | ${testData.averageResponseTime}ms | ${testData.p95ResponseTime}ms | ${successRate} | ${status} |\n`;
        });

        return section;
    }

    generateLoadTestingSection() {
        if (!this.results.load_testing.endpoints) {
            return '**Status:** No load testing data available\n';
        }

        let section = '';
        
        Object.entries(this.results.load_testing.endpoints).forEach(([endpointName, loadData]) => {
            section += `\n### ${endpointName}\n`;
            section += '| Concurrent Requests | Success Rate | Avg Response Time | Requests/Second | Status |\n';
            section += '|-------------------|--------------|-------------------|----------------|--------|\n';
            
            Object.entries(loadData).forEach(([concurrency, stats]) => {
                if (!stats.error) {
                    const successRate = `${stats.successfulRequests}/${stats.concurrentRequests}`;
                    const rps = stats.requestsPerSecond.toFixed(2);
                    const status = stats.failedRequests === 0 ? '✅ Stable' : '⚠️ Unstable';
                    
                    section += `| ${concurrency} | ${successRate} | ${stats.averageResponseTime}ms | ${rps} | ${status} |\n`;
                }
            });
        });

        return section;
    }

    generateConcurrentUserSection() {
        if (!this.results.concurrent_user_testing.scenarios) {
            return '**Status:** No concurrent user testing data available\n';
        }

        let section = '| Concurrent Users | Success Rate | Avg User Time | Total Time | Status |\n';
        section += '|------------------|--------------|---------------|------------|--------|\n';
        
        Object.entries(this.results.concurrent_user_testing.scenarios).forEach(([userCount, scenario]) => {
            if (!scenario.error) {
                const successRate = `${scenario.successfulUsers}/${scenario.userCount}`;
                const status = scenario.failedUsers === 0 ? '✅ Stable' : '⚠️ Issues';
                
                section += `| ${userCount} | ${successRate} | ${scenario.averageUserTime}ms | ${scenario.totalTime}ms | ${status} |\n`;
            }
        });

        return section;
    }

    generateRealWorldSection() {
        if (!this.results.real_world_scenarios.tests) {
            return '**Status:** No real-world scenario testing data available\n';
        }

        let section = '| Scenario | Description | Duration | Status |\n';
        section += '|----------|-------------|----------|--------|\n';
        
        Object.entries(this.results.real_world_scenarios.tests).forEach(([scenarioName, scenarioData]) => {
            const duration = scenarioData.totalTime ? `${scenarioData.totalTime}ms` : 'N/A';
            const status = scenarioData.success ? '✅ Success' : '❌ Failed';
            
            section += `| ${scenarioName} | ${scenarioData.description} | ${duration} | ${status} |\n`;
        });

        return section;
    }

    assessMaxConcurrency() {
        let maxStableConcurrency = 1;
        
        if (this.results.load_testing.endpoints) {
            Object.values(this.results.load_testing.endpoints).forEach(endpoint => {
                Object.entries(endpoint).forEach(([concurrency, stats]) => {
                    if (!stats.error && stats.failedRequests === 0 && parseInt(concurrency) > maxStableConcurrency) {
                        maxStableConcurrency = parseInt(concurrency);
                    }
                });
            });
        }
        
        return `${maxStableConcurrency} concurrent requests (tested)`;
    }

    assessDatabaseCapacity() {
        if (!this.results.database_performance.tests) return 'Not assessed';
        
        const dbTests = Object.values(this.results.database_performance.tests);
        if (dbTests.length === 0) return 'Not assessed';
        
        const avgResponseTime = dbTests.reduce((acc, test) => acc + test.averageResponseTime, 0) / dbTests.length;
        
        if (avgResponseTime < 100) return 'Excellent (< 100ms avg)';
        if (avgResponseTime < 200) return 'Good (< 200ms avg)';
        if (avgResponseTime < 500) return 'Moderate (< 500ms avg)';
        return 'Needs optimization (> 500ms avg)';
    }

    assessFrontendCapacity() {
        if (!this.results.concurrent_user_testing.scenarios) return 'Not assessed';
        
        let maxStableUsers = 1;
        Object.entries(this.results.concurrent_user_testing.scenarios).forEach(([userCount, scenario]) => {
            if (!scenario.error && scenario.failedUsers === 0 && parseInt(userCount) > maxStableUsers) {
                maxStableUsers = parseInt(userCount);
            }
        });
        
        return `${maxStableUsers} concurrent users (tested)`;
    }
}

if (require.main === module) {
    const analyzer = new AdvancedPerformanceAnalyzer();
    analyzer.runAdvancedAnalysis().catch(console.error);
}

module.exports = AdvancedPerformanceAnalyzer;