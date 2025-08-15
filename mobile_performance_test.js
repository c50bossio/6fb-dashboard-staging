#!/usr/bin/env node

/**
 * 6FB AI Agent System - Mobile Performance Analysis
 * Tests mobile responsiveness and touch-optimized workflows
 */

const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

class MobilePerformanceAnalyzer {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            mobile_devices: {},
            touch_interactions: {},
            responsive_design: {},
            recommendations: []
        };
    }

    async runMobileAnalysis() {
        console.log('📱 Starting mobile performance analysis...\n');

        try {
            await this.testMobileDevices();
            
            await this.testTouchInteractions();
            
            await this.testResponsiveDesign();
            
            this.generateMobileRecommendations();
            
            await this.saveMobileResults();
            
            console.log('✅ Mobile performance analysis completed successfully!');
            
        } catch (error) {
            console.error('❌ Mobile performance analysis failed:', error);
            throw error;
        }
    }

    async testMobileDevices() {
        console.log('📱 Testing Mobile Device Performance...');
        
        const testDevices = [
            devices['iPhone 13'],
            devices['iPad Pro'],
            devices['Pixel 5'],
            devices['Galaxy S21']
        ];

        for (const device of testDevices) {
            console.log(`  Testing ${device.name}...`);
            
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({
                ...device,
                locale: 'en-US'
            });
            const page = await context.newPage();

            try {
                const deviceResults = {
                    name: device.name,
                    viewport: device.viewport,
                    userAgent: device.userAgent,
                    pages: {}
                };

                const testPages = [
                    { name: 'Dashboard', url: '/' },
                    { name: 'Analytics', url: '/dashboard/analytics' }
                ];

                for (const testPage of testPages) {
                    const startTime = Date.now();
                    
                    try {
                        await page.goto(`http://localhost:9999${testPage.url}`, { 
                            waitUntil: 'networkidle',
                            timeout: 30000 
                        });
                        
                        const loadTime = Date.now() - startTime;
                        
                        const mobileMetrics = await page.evaluate(() => {
                            const viewport = {
                                width: window.innerWidth,
                                height: window.innerHeight
                            };
                            
                            const mobileElements = {
                                hasTouchTargets: document.querySelectorAll('[role="button"], button, a').length,
                                hasResponsiveImages: document.querySelectorAll('img[srcset], picture').length,
                                hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
                                hasTooltips: document.querySelectorAll('[title], [aria-label]').length
                            };
                            
                            const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
                            let readableTextCount = 0;
                            
                            textElements.forEach(el => {
                                const styles = window.getComputedStyle(el);
                                const fontSize = parseFloat(styles.fontSize);
                                if (fontSize >= 16) readableTextCount++;
                            });
                            
                            return {
                                viewport,
                                mobileElements,
                                readableTextPercentage: textElements.length > 0 ? 
                                    (readableTextCount / textElements.length) * 100 : 0
                            };
                        });
                        
                        deviceResults.pages[testPage.name] = {
                            url: testPage.url,
                            loadTime,
                            mobileMetrics
                        };
                        
                        console.log(`    ✅ ${testPage.name}: ${loadTime}ms`);
                        
                    } catch (error) {
                        console.log(`    ❌ ${testPage.name}: ${error.message}`);
                        deviceResults.pages[testPage.name] = {
                            url: testPage.url,
                            error: error.message
                        };
                    }
                }
                
                this.results.mobile_devices[device.name] = deviceResults;
                
            } finally {
                await browser.close();
            }
        }
    }

    async testTouchInteractions() {
        console.log('👆 Testing Touch Interactions...');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            ...devices['iPhone 13'],
            hasTouch: true
        });
        const page = await context.newPage();

        try {
            await page.goto('http://localhost:9999/', { waitUntil: 'networkidle' });
            
            const touchTargets = await page.evaluate(() => {
                const interactiveElements = document.querySelectorAll(
                    'button, a, [role="button"], input, select, textarea'
                );
                
                const targetData = [];
                interactiveElements.forEach((element, index) => {
                    const rect = element.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(element);
                    
                    targetData.push({
                        index,
                        tagName: element.tagName,
                        width: rect.width,
                        height: rect.height,
                        area: rect.width * rect.height,
                        padding: computedStyle.padding,
                        margin: computedStyle.margin,
                        minTouchSize: Math.min(rect.width, rect.height)
                    });
                });
                
                return targetData;
            });
            
            const compliantTargets = touchTargets.filter(target => target.minTouchSize >= 44);
            const touchTargetScore = touchTargets.length > 0 ? 
                (compliantTargets.length / touchTargets.length) * 100 : 0;
            
            this.results.touch_interactions = {
                totalTargets: touchTargets.length,
                compliantTargets: compliantTargets.length,
                touchTargetScore: Math.round(touchTargetScore),
                averageTargetSize: touchTargets.length > 0 ? 
                    touchTargets.reduce((acc, target) => acc + target.minTouchSize, 0) / touchTargets.length : 0,
                touchTargets: touchTargets
            };
            
            console.log(`  ✅ Touch targets: ${compliantTargets.length}/${touchTargets.length} compliant (${Math.round(touchTargetScore)}%)`);
            
        } finally {
            await browser.close();
        }
    }

    async testResponsiveDesign() {
        console.log('🖥️ Testing Responsive Design...');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            const viewports = [
                { name: 'Mobile', width: 375, height: 667 },
                { name: 'Tablet', width: 768, height: 1024 },
                { name: 'Desktop', width: 1920, height: 1080 }
            ];

            this.results.responsive_design.viewports = {};

            for (const viewport of viewports) {
                console.log(`  Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);
                
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                await page.goto('http://localhost:9999/', { waitUntil: 'networkidle' });
                
                const responsiveMetrics = await page.evaluate(() => {
                    const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
                    
                    const containers = document.querySelectorAll('.container, .wrapper, main, .content');
                    let responsiveContainers = 0;
                    
                    containers.forEach(container => {
                        const styles = window.getComputedStyle(container);
                        if (styles.maxWidth || styles.width.includes('%') || styles.display === 'flex') {
                            responsiveContainers++;
                        }
                    });
                    
                    const images = document.querySelectorAll('img');
                    let responsiveImages = 0;
                    
                    images.forEach(img => {
                        const styles = window.getComputedStyle(img);
                        if (styles.maxWidth === '100%' || img.hasAttribute('srcset')) {
                            responsiveImages++;
                        }
                    });
                    
                    return {
                        hasHorizontalScroll,
                        containerStats: {
                            total: containers.length,
                            responsive: responsiveContainers,
                            responsivePercentage: containers.length > 0 ? 
                                (responsiveContainers / containers.length) * 100 : 0
                        },
                        imageStats: {
                            total: images.length,
                            responsive: responsiveImages,
                            responsivePercentage: images.length > 0 ? 
                                (responsiveImages / images.length) * 100 : 0
                        }
                    };
                });
                
                this.results.responsive_design.viewports[viewport.name] = {
                    ...viewport,
                    metrics: responsiveMetrics
                };
                
                const containerScore = responsiveMetrics.containerStats.responsivePercentage;
                const imageScore = responsiveMetrics.imageStats.responsivePercentage;
                console.log(`    ✅ Containers: ${Math.round(containerScore)}% responsive, Images: ${Math.round(imageScore)}% responsive`);
            }
            
        } finally {
            await browser.close();
        }
    }

    generateMobileRecommendations() {
        const recommendations = [];
        
        if (this.results.touch_interactions.touchTargetScore < 80) {
            recommendations.push({
                category: 'Mobile Usability',
                priority: 'High',
                issue: `Only ${this.results.touch_interactions.touchTargetScore}% of touch targets meet minimum size requirements`,
                recommendation: 'Increase touch target sizes to minimum 44px for better mobile usability'
            });
        }
        
        Object.entries(this.results.mobile_devices).forEach(([deviceName, deviceData]) => {
            Object.entries(deviceData.pages).forEach(([pageName, pageData]) => {
                if (pageData.loadTime > 3000) {
                    recommendations.push({
                        category: 'Mobile Performance',
                        priority: 'Medium',
                        issue: `${pageName} loads slowly on ${deviceName} (${pageData.loadTime}ms)`,
                        recommendation: 'Optimize mobile loading with smaller images, lazy loading, and mobile-first CSS'
                    });
                }
                
                if (pageData.mobileMetrics && pageData.mobileMetrics.readableTextPercentage < 70) {
                    recommendations.push({
                        category: 'Mobile Accessibility',
                        priority: 'Medium',
                        issue: `Text readability is poor on ${deviceName} (${Math.round(pageData.mobileMetrics.readableTextPercentage)}% readable)`,
                        recommendation: 'Increase font sizes to minimum 16px for better mobile readability'
                    });
                }
            });
        });
        
        if (this.results.responsive_design.viewports) {
            Object.entries(this.results.responsive_design.viewports).forEach(([viewportName, viewportData]) => {
                if (viewportData.metrics.hasHorizontalScroll) {
                    recommendations.push({
                        category: 'Responsive Design',
                        priority: 'High',
                        issue: `Horizontal scrolling detected on ${viewportName} viewport`,
                        recommendation: 'Fix responsive layout to prevent horizontal scrolling'
                    });
                }
                
                if (viewportData.metrics.containerStats.responsivePercentage < 80) {
                    recommendations.push({
                        category: 'Responsive Design',
                        priority: 'Medium',
                        issue: `Only ${Math.round(viewportData.metrics.containerStats.responsivePercentage)}% of containers are responsive on ${viewportName}`,
                        recommendation: 'Implement responsive container designs using flexbox or CSS Grid'
                    });
                }
            });
        }
        
        this.results.recommendations = recommendations;
    }

    async saveMobileResults() {
        const reportPath = path.join(__dirname, 'mobile_performance_results.json');
        await fs.promises.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        
        const readableReport = this.generateMobileReport();
        const readableReportPath = path.join(__dirname, 'MOBILE_PERFORMANCE_REPORT.md');
        await fs.promises.writeFile(readableReportPath, readableReport);
        
        console.log(`📊 Mobile reports saved to:`);
        console.log(`   JSON: ${reportPath}`);
        console.log(`   Markdown: ${readableReportPath}`);
    }

    generateMobileReport() {
        return `# 6FB AI Agent System - Mobile Performance Report

**Generated:** ${this.results.timestamp}
**Focus:** Mobile responsiveness, touch interactions, and device compatibility

## Executive Summary

- **Touch Target Compliance:** ${this.results.touch_interactions.touchTargetScore || 0}%
- **Mobile Devices Tested:** ${Object.keys(this.results.mobile_devices).length}
- **Responsive Viewports Tested:** ${Object.keys(this.results.responsive_design.viewports || {}).length}
- **Mobile Issues Found:** ${this.results.recommendations.length}

## Mobile Device Performance

${this.generateMobileDeviceSection()}

## Touch Interaction Analysis

${this.generateTouchInteractionSection()}

## Responsive Design Analysis

${this.generateResponsiveDesignSection()}

## Mobile Optimization Recommendations

### Critical Issues
${this.results.recommendations
  .filter(r => r.priority === 'High')
  .map(r => `- **${r.issue}**\n  ${r.recommendation}`)
  .join('\n\n')}

### Improvements
${this.results.recommendations
  .filter(r => r.priority === 'Medium')
  .map(r => `- **${r.issue}**\n  ${r.recommendation}`)
  .join('\n\n')}

## Mobile Performance Optimization Plan

### Phase 1: Critical Mobile Issues (Week 1)
- Fix horizontal scrolling and viewport issues
- Ensure minimum touch target sizes
- Optimize for mobile load times

### Phase 2: Mobile Experience Enhancement (Weeks 2-3)  
- Improve responsive design patterns
- Optimize images for mobile devices
- Implement mobile-first CSS

### Phase 3: Advanced Mobile Features (Weeks 4-6)
- Add touch gestures and interactions
- Implement progressive web app features
- Optimize for offline mobile usage

---

*Mobile performance report generated by 6FB AI Agent System Performance Analyzer*
`;
    }

    generateMobileDeviceSection() {
        if (!this.results.mobile_devices || Object.keys(this.results.mobile_devices).length === 0) {
            return '**Status:** No mobile device testing data available\n';
        }

        let section = '| Device | Page | Load Time | Mobile Score | Issues |\n';
        section += '|--------|------|-----------|--------------|--------|\n';

        Object.entries(this.results.mobile_devices).forEach(([deviceName, deviceData]) => {
            Object.entries(deviceData.pages).forEach(([pageName, pageData]) => {
                if (pageData.error) {
                    section += `| ${deviceName} | ${pageName} | Error | N/A | ${pageData.error} |\n`;
                } else {
                    const loadTime = `${pageData.loadTime}ms`;
                    const readability = pageData.mobileMetrics ? 
                        Math.round(pageData.mobileMetrics.readableTextPercentage) : 'N/A';
                    const issues = pageData.loadTime > 3000 ? 'Slow loading' : 
                                  readability < 70 ? 'Text readability' : 'None';
                    section += `| ${deviceName} | ${pageName} | ${loadTime} | ${readability}% | ${issues} |\n`;
                }
            });
        });

        return section;
    }

    generateTouchInteractionSection() {
        if (!this.results.touch_interactions) {
            return '**Status:** No touch interaction data available\n';
        }

        const touch = this.results.touch_interactions;
        
        return `
**Touch Target Analysis:**
- Total interactive elements: ${touch.totalTargets}
- Compliant touch targets (≥44px): ${touch.compliantTargets}
- Compliance rate: ${touch.touchTargetScore}%
- Average target size: ${Math.round(touch.averageTargetSize || 0)}px

**Touch Target Recommendations:**
- Minimum touch target size should be 44px × 44px
- Current compliance rate: ${touch.touchTargetScore}%
- ${touch.totalTargets - touch.compliantTargets} elements need size improvements
`;
    }

    generateResponsiveDesignSection() {
        if (!this.results.responsive_design.viewports) {
            return '**Status:** No responsive design data available\n';
        }

        let section = '| Viewport | Size | Horizontal Scroll | Responsive Containers | Responsive Images |\n';
        section += '|----------|------|-------------------|----------------------|-------------------|\n';

        Object.entries(this.results.responsive_design.viewports).forEach(([viewportName, viewportData]) => {
            const size = `${viewportData.width}x${viewportData.height}`;
            const hasScroll = viewportData.metrics.hasHorizontalScroll ? '❌ Yes' : '✅ No';
            const containers = `${Math.round(viewportData.metrics.containerStats.responsivePercentage)}%`;
            const images = `${Math.round(viewportData.metrics.imageStats.responsivePercentage)}%`;
            
            section += `| ${viewportName} | ${size} | ${hasScroll} | ${containers} | ${images} |\n`;
        });

        return section;
    }
}

if (require.main === module) {
    const analyzer = new MobilePerformanceAnalyzer();
    analyzer.runMobileAnalysis().catch(console.error);
}

module.exports = MobilePerformanceAnalyzer;