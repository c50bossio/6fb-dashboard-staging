#!/usr/bin/env node

/**
 * AI Performance Monitoring System Test
 * Tests the comprehensive AI performance monitoring capabilities
 */

const puppeteer = require('puppeteer');

async function testAIPerformanceSystem() {

    const browser = await puppeteer.launch({
        headless: false, // Show browser for visual testing
        defaultViewport: { width: 1400, height: 900 },
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        
        await page.goto('http://localhost:9999', { waitUntil: 'networkidle0' });
        
        await page.screenshot({ path: 'test-results/ai-performance-01-home.png', fullPage: true });

        await page.waitForTimeout(2000);
        
        const isAuthenticated = await page.evaluate(() => {
            return !!(document.querySelector('[data-testid="user-profile"]') || 
                     document.querySelector('.user-menu') ||
                     document.body.textContent.includes('Dashboard') ||
                     localStorage.getItem('supabase.auth.token'));
        });

        if (!isAuthenticated) {

            await page.goto('http://localhost:9999/ai-performance', { waitUntil: 'networkidle0' });
            await page.screenshot({ path: 'test-results/ai-performance-02-auth-required.png', fullPage: true });
            
            const currentUrl = page.url();

        } else {
            
        }

        await page.goto('http://localhost:9999/ai-performance', { waitUntil: 'networkidle0' });
        
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'test-results/ai-performance-03-main-page.png', fullPage: true });

        const hasMainHeading = await page.evaluate(() => {
            return !!(document.querySelector('h1') && 
                     document.querySelector('h1').textContent.includes('AI Performance'));
        });

        const metricsCards = await page.$$eval('[class*="grid"]', elements => {
            return elements.filter(el => 
                el.textContent.includes('response_time') || 
                el.textContent.includes('confidence') ||
                el.textContent.includes('success_rate')
            ).length;
        });

        const tabs = await page.$$eval('button', buttons => {
            return buttons.filter(btn => 
                btn.textContent.includes('Real-time') ||
                btn.textContent.includes('Component Health') ||
                btn.textContent.includes('Optimization')
            ).map(btn => btn.textContent.trim());
        });
        }`);

        if (tabs.length > 0) {
            try {
                await page.click('button:has-text("Component Health"), button:contains("Health")');
                await page.waitForTimeout(1000);
                await page.screenshot({ path: 'test-results/ai-performance-04-health-tab.png', fullPage: true });
                
            } catch (e) {
                
                const healthTabClicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const healthTab = buttons.find(btn => btn.textContent.includes('Health'));
                    if (healthTab) {
                        healthTab.click();
                        return true;
                    }
                    return false;
                });
                if (healthTabClicked) {
                    await page.waitForTimeout(1000);
                    await page.screenshot({ path: 'test-results/ai-performance-04-health-tab.png', fullPage: true });
                    
                }
            }

            try {
                await page.waitForTimeout(500);
                const optimizationClicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const optTab = buttons.find(btn => btn.textContent.includes('Optimization'));
                    if (optTab) {
                        optTab.click();
                        return true;
                    }
                    return false;
                });
                if (optimizationClicked) {
                    await page.waitForTimeout(1000);
                    await page.screenshot({ path: 'test-results/ai-performance-05-optimization-tab.png', fullPage: true });
                    
                }
            } catch (e) {
                
            }
        }

        const refreshClicked = await page.evaluate(() => {
            const refreshBtn = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Refresh') || btn.querySelector('[class*="arrow-path"]')
            );
            if (refreshBtn) {
                refreshBtn.click();
                return true;
            }
            return false;
        });
        
        if (refreshClicked) {
            
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/ai-performance-06-after-refresh.png', fullPage: true });
        }

        const fastApiStatus = await page.evaluate(async () => {
            try {
                const response = await fetch('http://localhost:8001/api/v1/ai/performance/status');
                const data = await response.json();
                return { success: response.ok, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        if (fastApiStatus.success) {

        }

        const realtimeMetrics = await page.evaluate(async () => {
            try {
                const response = await fetch('http://localhost:8001/api/v1/ai/performance/realtime');
                const data = await response.json();
                return { success: response.ok, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        if (realtimeMetrics.success) {
            const metrics = realtimeMetrics.data?.realtime_metrics?.metrics || {};
            .length}`);
        }

        const visualElements = await page.evaluate(() => {
            const elements = {
                metricCards: document.querySelectorAll('[class*="border-l-4"]').length,
                charts: document.querySelectorAll('[class*="chart"], canvas, svg').length,
                statusIndicators: document.querySelectorAll('[class*="bg-green"], [class*="bg-blue"], [class*="bg-yellow"], [class*="bg-red"]').length,
                progressBars: document.querySelectorAll('[class*="progress"], [role="progressbar"]').length
            };
            return elements;
        });

        await page.setViewport({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/ai-performance-07-mobile-view.png', fullPage: true });

        await page.setViewport({ width: 768, height: 1024 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/ai-performance-08-tablet-view.png', fullPage: true });

        await page.setViewport({ width: 1400, height: 900 });
        await page.waitForTimeout(1000);

        const finalScreenshot = await page.screenshot({ 
            path: 'test-results/ai-performance-09-final-state.png', 
            fullPage: true 
        });
        
        const pageErrors = await page.evaluate(() => {
            const errors = [];
            const brokenImages = Array.from(document.querySelectorAll('img')).filter(img => !img.complete);
            if (brokenImages.length > 0) errors.push(`${brokenImages.length} broken images`);
            
            const emptyContainers = Array.from(document.querySelectorAll('[class*="empty"], [class*="no-data"]'));
            if (emptyContainers.length > 0) errors.push(`${emptyContainers.length} empty containers found`);
            
            return errors;
        });
        
        if (pageErrors.length === 0) {
            
        } else {
            }`);
        }

        const recommendations = [];
        if (!fastApiStatus.success) {
            recommendations.push('- Fix FastAPI performance monitoring endpoints');
        }
        if (fastApiStatus.data?.monitoring_status?.components_monitored === 0) {
            recommendations.push('- Initialize AI component monitoring');
        }
        if (pageErrors.length > 0) {
            recommendations.push('- Address page loading issues: ' + pageErrors.join(', '));
        }
        
        if (recommendations.length > 0) {
            
            recommendations.forEach(rec => );
        }

    } catch (error) {
        console.error('❌ Test error:', error);
        await page.screenshot({ path: 'test-results/ai-performance-error.png', fullPage: true });
    } finally {
        await browser.close();
        
    }
}

const fs = require('fs');
if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results');
}

testAIPerformanceSystem().catch(console.error);