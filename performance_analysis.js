#!/usr/bin/env node

/**
 * 6FB AI Agent System - Comprehensive Performance Analysis
 * Tests frontend performance, backend API performance, and full-stack workflows
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            system: {
                frontend_url: 'http://localhost:9999',
                backend_url: 'http://localhost:8001',
                test_environment: 'development'
            },
            frontend: {},
            backend: {},
            workflows: {},
            recommendations: []
        };
    }

    async runComprehensiveAnalysis() {
        console.log('🚀 Starting comprehensive performance analysis...\n');

        try {
            // 1. Frontend Performance Analysis
            await this.analyzeFrontendPerformance();
            
            // 2. Backend API Performance Testing
            await this.analyzeBackendPerformance();
            
            // 3. Full-stack Workflow Testing
            await this.analyzeWorkflowPerformance();
            
            // 4. Generate Report
            await this.generateReport();
            
            console.log('✅ Performance analysis completed successfully!');
            
        } catch (error) {
            console.error('❌ Performance analysis failed:', error);
            throw error;
        }
    }

    async analyzeFrontendPerformance() {
        console.log('📊 Analyzing Frontend Performance...');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Enable performance metrics collection
        await page.addInitScript(() => {
            window.performanceObserver = new PerformanceObserver((list) => {
                window.performanceEntries = window.performanceEntries || [];
                window.performanceEntries.push(...list.getEntries());
            });
            window.performanceObserver.observe({ entryTypes: ['navigation', 'resource', 'measure', 'paint'] });
        });

        try {
            // Test main pages
            const pages = [
                { name: 'Dashboard', url: '/' },
                { name: 'AI Chat', url: '/ai-chat' },
                { name: 'Analytics', url: '/dashboard/analytics' },
                { name: 'Appointments', url: '/appointments' }
            ];

            this.results.frontend.pages = {};
            
            for (const pageInfo of pages) {
                console.log(`  Testing ${pageInfo.name} (${pageInfo.url})`);
                
                const startTime = Date.now();
                const response = await page.goto(`http://localhost:9999${pageInfo.url}`, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                
                if (!response.ok()) {
                    console.log(`    ⚠️  ${pageInfo.name} returned ${response.status()}`);
                    continue;
                }

                // Wait for page to be fully interactive
                await page.waitForLoadState('networkidle');
                
                // Collect Core Web Vitals and performance metrics
                const metrics = await page.evaluate(() => {
                    return new Promise((resolve) => {
                        // Get Web Vitals
                        if (typeof window.webVitals !== 'undefined') {
                            // Use web-vitals library if available
                            resolve(window.webVitals);
                        } else {
                            // Fallback to manual measurement
                            const navigation = performance.getEntriesByType('navigation')[0];
                            const paint = performance.getEntriesByType('paint');
                            const resources = performance.getEntriesByType('resource');
                            
                            const lcp = paint.find(entry => entry.name === 'largest-contentful-paint')?.startTime || 0;
                            const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
                            
                            resolve({
                                // Navigation timing
                                domainLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
                                connection: navigation.connectEnd - navigation.connectStart,
                                request: navigation.responseStart - navigation.requestStart,
                                response: navigation.responseEnd - navigation.responseStart,
                                domProcessing: navigation.domContentLoadedEventStart - navigation.responseEnd,
                                domComplete: navigation.domComplete - navigation.domContentLoadedEventStart,
                                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                                
                                // Core Web Vitals (estimated)
                                lcp: lcp,
                                fcp: fcp,
                                ttfb: navigation.responseStart - navigation.requestStart,
                                
                                // Resource analysis
                                totalResources: resources.length,
                                totalSize: resources.reduce((acc, resource) => acc + (resource.transferSize || 0), 0),
                                javascriptResources: resources.filter(r => r.name.includes('.js')).length,
                                cssResources: resources.filter(r => r.name.includes('.css')).length,
                                imageResources: resources.filter(r => r.initiatorType === 'img').length,
                                
                                // Memory usage
                                jsHeapSizeUsed: performance.memory?.usedJSHeapSize || 0,
                                jsHeapSizeTotal: performance.memory?.totalJSHeapSize || 0,
                                jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0
                            });
                        }
                    });
                });

                const loadTime = Date.now() - startTime;
                
                this.results.frontend.pages[pageInfo.name] = {
                    url: pageInfo.url,
                    status: response.status(),
                    loadTime: loadTime,
                    metrics: metrics
                };

                // Performance scoring
                const score = this.calculatePerformanceScore(metrics);
                this.results.frontend.pages[pageInfo.name].performanceScore = score;

                console.log(`    ✅ Load time: ${loadTime}ms, Score: ${score}/100`);
            }

            // Bundle size analysis
            console.log('  Analyzing JavaScript bundle size...');
            await this.analyzeBundleSize(page);

        } catch (error) {
            console.error('  ❌ Frontend analysis error:', error.message);
            this.results.frontend.error = error.message;
        } finally {
            await browser.close();
        }
    }

    async analyzeBundleSize(page) {
        // Navigate to any page to load the bundles
        await page.goto('http://localhost:9999/', { waitUntil: 'networkidle' });
        
        const bundleAnalysis = await page.evaluate(() => {
            const resources = performance.getEntriesByType('resource');
            const jsResources = resources.filter(r => 
                (r.name.includes('_next/static') || r.name.includes('.js')) && 
                r.transferSize > 0
            );
            
            const bundleSizes = jsResources.map(resource => ({
                name: resource.name.split('/').pop(),
                size: resource.transferSize,
                uncompressedSize: resource.decodedBodySize || resource.transferSize,
                loadTime: resource.responseEnd - resource.responseStart
            }));
            
            const totalBundleSize = bundleSizes.reduce((acc, bundle) => acc + bundle.size, 0);
            const totalUncompressedSize = bundleSizes.reduce((acc, bundle) => acc + bundle.uncompressedSize, 0);
            
            return {
                bundles: bundleSizes,
                totalSize: totalBundleSize,
                totalUncompressedSize: totalUncompressedSize,
                compressionRatio: totalUncompressedSize > 0 ? totalBundleSize / totalUncompressedSize : 0
            };
        });

        this.results.frontend.bundleAnalysis = bundleAnalysis;
        console.log(`    Bundle size: ${(bundleAnalysis.totalSize / 1024).toFixed(2)}KB (compressed)`);
        console.log(`    Uncompressed: ${(bundleAnalysis.totalUncompressedSize / 1024).toFixed(2)}KB`);
    }

    async analyzeBackendPerformance() {
        console.log('🔧 Analyzing Backend Performance...');
        
        // Test key API endpoints
        const endpoints = [
            { name: 'Health Check', url: '/health', method: 'GET' },
            { name: 'AI Orchestrator', url: '/ai/orchestrator/status', method: 'GET' },
            { name: 'Business Recommendations', url: '/business-recommendations/metrics', method: 'GET' },
            { name: 'Analytics Data', url: '/analytics/dashboard-data', method: 'GET' }
        ];

        this.results.backend.endpoints = {};
        
        for (const endpoint of endpoints) {
            console.log(`  Testing ${endpoint.name} (${endpoint.method} ${endpoint.url})`);
            
            const times = [];
            const errors = [];
            
            // Test each endpoint 5 times for average
            for (let i = 0; i < 5; i++) {
                try {
                    const startTime = Date.now();
                    const response = await fetch(`http://localhost:8001${endpoint.url}`, {
                        method: endpoint.method,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const endTime = Date.now();
                    
                    const responseTime = endTime - startTime;
                    times.push(responseTime);
                    
                    if (!response.ok) {
                        errors.push(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                } catch (error) {
                    errors.push(error.message);
                }
            }
            
            if (times.length > 0) {
                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                const minTime = Math.min(...times);
                const maxTime = Math.max(...times);
                
                this.results.backend.endpoints[endpoint.name] = {
                    url: endpoint.url,
                    method: endpoint.method,
                    averageResponseTime: Math.round(avgTime),
                    minResponseTime: minTime,
                    maxResponseTime: maxTime,
                    successfulRequests: times.length,
                    totalRequests: 5,
                    errors: errors
                };
                
                console.log(`    ✅ Avg: ${Math.round(avgTime)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);
                if (errors.length > 0) {
                    console.log(`    ⚠️  Errors: ${errors.length}/5`);
                }
            } else {
                console.log(`    ❌ All requests failed`);
                this.results.backend.endpoints[endpoint.name] = {
                    url: endpoint.url,
                    method: endpoint.method,
                    errors: errors,
                    allFailed: true
                };
            }
        }
    }

    async analyzeWorkflowPerformance() {
        console.log('🔄 Analyzing Workflow Performance...');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            // Test key barbershop workflows
            const workflows = [
                {
                    name: 'Dashboard Load and Navigation',
                    steps: async () => {
                        const startTime = Date.now();
                        await page.goto('http://localhost:9999/', { waitUntil: 'networkidle' });
                        
                        // Navigate to different sections
                        const navigationTime = Date.now();
                        await page.click('text=Analytics', { timeout: 5000 }).catch(() => {});
                        await page.waitForTimeout(1000);
                        
                        const endTime = Date.now();
                        return {
                            totalTime: endTime - startTime,
                            navigationTime: endTime - navigationTime
                        };
                    }
                },
                {
                    name: 'AI Chat Interface Load',
                    steps: async () => {
                        const startTime = Date.now();
                        await page.goto('http://localhost:9999/ai-chat', { waitUntil: 'networkidle' });
                        
                        // Wait for AI chat interface to be ready
                        await page.waitForSelector('[data-testid="chat-interface"], .chat-container, #chat-messages', 
                            { timeout: 10000 }).catch(() => {});
                        
                        const endTime = Date.now();
                        return {
                            totalTime: endTime - startTime
                        };
                    }
                },
                {
                    name: 'Analytics Dashboard Load',
                    steps: async () => {
                        const startTime = Date.now();
                        await page.goto('http://localhost:9999/dashboard/analytics', { waitUntil: 'networkidle' });
                        
                        // Wait for charts to load
                        await page.waitForSelector('canvas, .recharts-wrapper, .chart-container', 
                            { timeout: 10000 }).catch(() => {});
                        
                        const endTime = Date.now();
                        return {
                            totalTime: endTime - startTime
                        };
                    }
                }
            ];

            this.results.workflows.tests = {};
            
            for (const workflow of workflows) {
                console.log(`  Testing ${workflow.name}...`);
                
                try {
                    const result = await workflow.steps();
                    this.results.workflows.tests[workflow.name] = {
                        success: true,
                        ...result
                    };
                    console.log(`    ✅ Completed in ${result.totalTime}ms`);
                } catch (error) {
                    console.log(`    ❌ Failed: ${error.message}`);
                    this.results.workflows.tests[workflow.name] = {
                        success: false,
                        error: error.message
                    };
                }
            }

        } finally {
            await browser.close();
        }
    }

    calculatePerformanceScore(metrics) {
        let score = 100;
        
        // Penalize slow Core Web Vitals
        if (metrics.lcp > 2500) score -= 20; // LCP > 2.5s
        else if (metrics.lcp > 1200) score -= 10; // LCP > 1.2s
        
        if (metrics.fcp > 1800) score -= 15; // FCP > 1.8s
        else if (metrics.fcp > 1000) score -= 8; // FCP > 1s
        
        if (metrics.ttfb > 800) score -= 15; // TTFB > 800ms
        else if (metrics.ttfb > 500) score -= 8; // TTFB > 500ms
        
        // Penalize large bundle sizes (estimated from resource count)
        if (metrics.totalSize > 2000000) score -= 20; // > 2MB
        else if (metrics.totalSize > 1000000) score -= 10; // > 1MB
        
        // Penalize high memory usage
        if (metrics.jsHeapSizeUsed > 50000000) score -= 15; // > 50MB
        else if (metrics.jsHeapSizeUsed > 25000000) score -= 8; // > 25MB
        
        return Math.max(0, Math.round(score));
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Frontend recommendations
        if (this.results.frontend.pages) {
            Object.entries(this.results.frontend.pages).forEach(([pageName, pageData]) => {
                if (pageData.loadTime > 3000) {
                    recommendations.push({
                        category: 'Frontend Performance',
                        priority: 'High',
                        issue: `${pageName} page load time is slow (${pageData.loadTime}ms)`,
                        recommendation: 'Implement code splitting, lazy loading, and optimize images'
                    });
                }
                
                if (pageData.metrics && pageData.metrics.totalSize > 1500000) {
                    recommendations.push({
                        category: 'Bundle Optimization',
                        priority: 'Medium',
                        issue: `${pageName} has large resource size (${Math.round(pageData.metrics.totalSize / 1024)}KB)`,
                        recommendation: 'Optimize bundle splitting and implement tree shaking'
                    });
                }
            });
        }

        // Backend recommendations
        if (this.results.backend.endpoints) {
            Object.entries(this.results.backend.endpoints).forEach(([endpointName, endpointData]) => {
                if (endpointData.averageResponseTime > 1000) {
                    recommendations.push({
                        category: 'Backend Performance',
                        priority: 'High',
                        issue: `${endpointName} API response time is slow (${endpointData.averageResponseTime}ms)`,
                        recommendation: 'Optimize database queries, implement caching, and consider async processing'
                    });
                }
                
                if (endpointData.errors && endpointData.errors.length > 0) {
                    recommendations.push({
                        category: 'API Reliability',
                        priority: 'Critical',
                        issue: `${endpointName} has ${endpointData.errors.length} errors`,
                        recommendation: 'Investigate and fix API endpoint errors'
                    });
                }
            });
        }

        // Workflow recommendations
        if (this.results.workflows.tests) {
            Object.entries(this.results.workflows.tests).forEach(([workflowName, workflowData]) => {
                if (!workflowData.success) {
                    recommendations.push({
                        category: 'User Experience',
                        priority: 'Critical',
                        issue: `${workflowName} workflow failed`,
                        recommendation: 'Fix broken workflow and implement proper error handling'
                    });
                }
                
                if (workflowData.totalTime > 5000) {
                    recommendations.push({
                        category: 'User Experience',
                        priority: 'Medium',
                        issue: `${workflowName} workflow is slow (${workflowData.totalTime}ms)`,
                        recommendation: 'Optimize workflow performance and add loading states'
                    });
                }
            });
        }

        // General system recommendations
        if (this.results.system) {
            recommendations.push({
                category: 'Monitoring',
                priority: 'Medium',
                issue: 'Performance monitoring not comprehensive',
                recommendation: 'Implement Real User Monitoring (RUM) and synthetic monitoring'
            });
            
            recommendations.push({
                category: 'Caching',
                priority: 'Medium',
                issue: 'No advanced caching strategy detected',
                recommendation: 'Implement Redis caching for API responses and database queries'
            });
        }

        return recommendations;
    }

    async generateReport() {
        console.log('📋 Generating Performance Report...');
        
        this.results.recommendations = this.generateRecommendations();
        this.results.summary = this.generateSummary();
        
        // Save detailed results to JSON
        const reportPath = path.join(__dirname, 'performance_analysis_results.json');
        await fs.promises.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        
        // Generate human-readable report
        const readableReport = this.generateReadableReport();
        const readableReportPath = path.join(__dirname, 'PERFORMANCE_ANALYSIS_REPORT.md');
        await fs.promises.writeFile(readableReportPath, readableReport);
        
        console.log(`✅ Reports saved to:`);
        console.log(`   📊 JSON: ${reportPath}`);
        console.log(`   📝 Markdown: ${readableReportPath}`);
    }

    generateSummary() {
        const summary = {
            overallScore: 0,
            criticalIssues: 0,
            warnings: 0,
            passedTests: 0,
            totalTests: 0
        };

        // Calculate overall score from frontend pages
        if (this.results.frontend.pages) {
            const scores = Object.values(this.results.frontend.pages)
                .filter(page => page.performanceScore)
                .map(page => page.performanceScore);
            
            if (scores.length > 0) {
                summary.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
        }

        // Count issues
        this.results.recommendations.forEach(rec => {
            if (rec.priority === 'Critical') summary.criticalIssues++;
            else if (rec.priority === 'High') summary.warnings++;
        });

        // Count test results
        if (this.results.workflows.tests) {
            Object.values(this.results.workflows.tests).forEach(test => {
                summary.totalTests++;
                if (test.success) summary.passedTests++;
            });
        }

        return summary;
    }

    generateReadableReport() {
        const summary = this.results.summary;
        
        return `# 6FB AI Agent System - Performance Analysis Report

**Generated:** ${this.results.timestamp}
**Environment:** ${this.results.system.test_environment}

## Executive Summary

- **Overall Performance Score:** ${summary.overallScore}/100
- **Critical Issues:** ${summary.criticalIssues}
- **Warnings:** ${summary.warnings}
- **Workflow Tests:** ${summary.passedTests}/${summary.totalTests} passed

## Frontend Performance Analysis

${this.generateFrontendSection()}

## Backend Performance Analysis

${this.generateBackendSection()}

## Workflow Performance Analysis

${this.generateWorkflowSection()}

## Recommendations

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

## Performance Optimization Roadmap

### Phase 1: Critical Fixes (Week 1)
- Fix any failing workflows or API endpoints
- Resolve critical performance bottlenecks
- Implement basic monitoring

### Phase 2: Performance Optimization (Weeks 2-3)
- Optimize slow-loading pages and API endpoints
- Implement caching strategies
- Optimize JavaScript bundles

### Phase 3: Advanced Optimization (Weeks 4-6)
- Implement comprehensive monitoring
- Set up performance budgets
- Advanced caching and CDN implementation

### Phase 4: Scalability Preparation (Weeks 7-8)
- Load testing and capacity planning
- Database optimization
- Infrastructure scaling preparation

## Monitoring Recommendations

1. **Real User Monitoring (RUM):** Implement PostHog or similar for real user performance tracking
2. **Synthetic Monitoring:** Set up automated performance testing
3. **API Monitoring:** Monitor backend API performance and error rates
4. **Infrastructure Monitoring:** Track server resources and database performance

---

*This report was generated automatically by the 6FB AI Agent System Performance Analyzer*
`;
    }

    generateFrontendSection() {
        if (!this.results.frontend.pages) {
            return '**Status:** Unable to analyze frontend performance\n';
        }

        let section = '| Page | Load Time | Performance Score | Status |\n';
        section += '|------|-----------|------------------|--------|\n';
        
        Object.entries(this.results.frontend.pages).forEach(([pageName, pageData]) => {
            const status = pageData.loadTime < 3000 ? '✅ Good' : pageData.loadTime < 5000 ? '⚠️ Slow' : '❌ Very Slow';
            section += `| ${pageName} | ${pageData.loadTime}ms | ${pageData.performanceScore || 'N/A'}/100 | ${status} |\n`;
        });

        if (this.results.frontend.bundleAnalysis) {
            const bundle = this.results.frontend.bundleAnalysis;
            section += `\n**Bundle Analysis:**\n`;
            section += `- Total compressed size: ${(bundle.totalSize / 1024).toFixed(2)}KB\n`;
            section += `- Uncompressed size: ${(bundle.totalUncompressedSize / 1024).toFixed(2)}KB\n`;
            section += `- Compression ratio: ${(bundle.compressionRatio * 100).toFixed(1)}%\n`;
        }

        return section;
    }

    generateBackendSection() {
        if (!this.results.backend.endpoints) {
            return '**Status:** Unable to analyze backend performance\n';
        }

        let section = '| Endpoint | Avg Response Time | Status |\n';
        section += '|----------|-------------------|--------|\n';
        
        Object.entries(this.results.backend.endpoints).forEach(([endpointName, endpointData]) => {
            if (endpointData.allFailed) {
                section += `| ${endpointName} | N/A | ❌ All Failed |\n`;
            } else {
                const avgTime = endpointData.averageResponseTime;
                const status = avgTime < 500 ? '✅ Fast' : avgTime < 1000 ? '⚠️ Moderate' : '❌ Slow';
                section += `| ${endpointName} | ${avgTime}ms | ${status} |\n`;
            }
        });

        return section;
    }

    generateWorkflowSection() {
        if (!this.results.workflows.tests) {
            return '**Status:** Unable to analyze workflow performance\n';
        }

        let section = '| Workflow | Duration | Status |\n';
        section += '|----------|----------|--------|\n';
        
        Object.entries(this.results.workflows.tests).forEach(([workflowName, workflowData]) => {
            if (workflowData.success) {
                const status = workflowData.totalTime < 3000 ? '✅ Fast' : workflowData.totalTime < 5000 ? '⚠️ Moderate' : '❌ Slow';
                section += `| ${workflowName} | ${workflowData.totalTime}ms | ${status} |\n`;
            } else {
                section += `| ${workflowName} | N/A | ❌ Failed |\n`;
            }
        });

        return section;
    }
}

// Run the analysis
if (require.main === module) {
    const analyzer = new PerformanceAnalyzer();
    analyzer.runComprehensiveAnalysis().catch(console.error);
}

module.exports = PerformanceAnalyzer;