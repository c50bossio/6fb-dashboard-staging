/**
 * Performance Analyzer
 * 
 * Measures and analyzes performance metrics including:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Network performance
 * - Bundle size analysis
 * - Memory usage
 * - Rendering performance
 */

class PerformanceAnalyzer {
  constructor() {
    this.metrics = {};
    this.thresholds = {
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      ttfb: { good: 800, needsImprovement: 1800 },
      fcp: { good: 1800, needsImprovement: 3000 },
      bundleSize: { good: 250000, needsImprovement: 500000 } // 250KB, 500KB
    };
  }

  /**
   * Analyze performance metrics for a route
   */
  async analyze(page, route) {

    const metrics = {
      route: route.path,
      timestamp: new Date().toISOString(),
      
      // Core Web Vitals
      coreWebVitals: await this.measureCoreWebVitals(page),
      
      // Network performance
      networkMetrics: await this.measureNetworkPerformance(page),
      
      // Bundle analysis
      bundleMetrics: await this.analyzeBundleSize(page),
      
      // Memory usage
      memoryMetrics: await this.measureMemoryUsage(page),
      
      // Resource loading
      resourceMetrics: await this.analyzeResourceLoading(page),
      
      // Runtime performance
      runtimeMetrics: await this.measureRuntimePerformance(page)
    };
    
    // Calculate performance score
    metrics.performanceScore = this.calculatePerformanceScore(metrics);
    
    // Generate recommendations
    metrics.recommendations = this.generatePerformanceRecommendations(metrics);
    
    return metrics;
  }

  /**
   * Measure Core Web Vitals
   */
  async measureCoreWebVitals(page) {
    try {
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {};
          
          // Largest Contentful Paint (LCP)
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay (FID) - use First Contentful Paint as approximation
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              metrics.fcp = entries[0].startTime;
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
          
          // Cumulative Layout Shift (CLS)
          let clsScore = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsScore += entry.value;
              }
            }
            metrics.cls = clsScore;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          // Time to First Byte (TTFB)
          const navigationEntry = performance.getEntriesByType('navigation')[0];
          if (navigationEntry) {
            metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
          }
          
          // Wait for measurements to complete
          setTimeout(() => {
            lcpObserver.disconnect();
            fcpObserver.disconnect();
            clsObserver.disconnect();
            
            // Get final navigation timing
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
              metrics.domContentLoaded = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart;
              metrics.loadComplete = nav.loadEventEnd - nav.loadEventStart;
              metrics.totalLoadTime = nav.loadEventEnd - nav.fetchStart;
            }
            
            resolve(metrics);
          }, 2000);
        });
      });
      
      return webVitals;
      
    } catch (error) {
      console.warn('⚠️ Error measuring Core Web Vitals:', error.message);
      return {};
    }
  }

  /**
   * Measure network performance
   */
  async measureNetworkPerformance(page) {
    try {
      const requests = [];
      
      // Capture network requests
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
          timestamp: Date.now()
        });
      });
      
      page.on('response', response => {
        const request = requests.find(req => req.url === response.url());
        if (request) {
          request.status = response.status();
          request.size = response.headers()['content-length'] || 0;
          request.responseTime = Date.now() - request.timestamp;
        }
      });
      
      // Wait for network activity to settle
      await page.waitForLoadState('networkidle');
      
      // Analyze network metrics
      const totalRequests = requests.length;
      const failedRequests = requests.filter(req => req.status >= 400).length;
      const totalSize = requests.reduce((sum, req) => sum + parseInt(req.size || 0), 0);
      const avgResponseTime = requests.length > 0 
        ? requests.reduce((sum, req) => sum + (req.responseTime || 0), 0) / requests.length 
        : 0;
      
      // Group by resource type
      const resourceTypes = {};
      requests.forEach(req => {
        if (!resourceTypes[req.resourceType]) {
          resourceTypes[req.resourceType] = { count: 0, size: 0 };
        }
        resourceTypes[req.resourceType].count++;
        resourceTypes[req.resourceType].size += parseInt(req.size || 0);
      });
      
      return {
        totalRequests,
        failedRequests,
        totalSize,
        avgResponseTime,
        resourceTypes,
        requests: requests.slice(0, 20) // Limit detailed request data
      };
      
    } catch (error) {
      console.warn('⚠️ Error measuring network performance:', error.message);
      return {};
    }
  }

  /**
   * Analyze bundle size
   */
  async analyzeBundleSize(page) {
    try {
      const bundleInfo = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        
        const scriptSizes = scripts.map(script => ({
          src: script.src,
          async: script.async,
          defer: script.defer
        }));
        
        const stylesheetSizes = stylesheets.map(link => ({
          href: link.href,
          media: link.media
        }));
        
        return {
          scriptCount: scripts.length,
          stylesheetCount: stylesheets.length,
          scripts: scriptSizes,
          stylesheets: stylesheetSizes
        };
      });
      
      return bundleInfo;
      
    } catch (error) {
      console.warn('⚠️ Error analyzing bundle size:', error.message);
      return {};
    }
  }

  /**
   * Measure memory usage
   */
  async measureMemoryUsage(page) {
    try {
      const memoryInfo = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      return memoryInfo || {};
      
    } catch (error) {
      console.warn('⚠️ Error measuring memory usage:', error.message);
      return {};
    }
  }

  /**
   * Analyze resource loading
   */
  async analyzeResourceLoading(page) {
    try {
      const resourceTiming = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        
        const analysis = {
          totalResources: resources.length,
          slowResources: [],
          largeResources: [],
          blockedResources: []
        };
        
        resources.forEach(resource => {
          const loadTime = resource.responseEnd - resource.startTime;
          const size = resource.transferSize || 0;
          
          // Identify slow resources (>1s)
          if (loadTime > 1000) {
            analysis.slowResources.push({
              name: resource.name,
              loadTime: Math.round(loadTime),
              type: resource.initiatorType
            });
          }
          
          // Identify large resources (>100KB)
          if (size > 100000) {
            analysis.largeResources.push({
              name: resource.name,
              size: Math.round(size / 1024) + 'KB',
              type: resource.initiatorType
            });
          }
          
          // Identify potentially blocking resources
          if (resource.renderBlockingStatus === 'blocking') {
            analysis.blockedResources.push({
              name: resource.name,
              type: resource.initiatorType
            });
          }
        });
        
        return analysis;
      });
      
      return resourceTiming;
      
    } catch (error) {
      console.warn('⚠️ Error analyzing resource loading:', error.message);
      return {};
    }
  }

  /**
   * Measure runtime performance
   */
  async measureRuntimePerformance(page) {
    try {
      const runtimeMetrics = await page.evaluate(() => {
        const measures = performance.getEntriesByType('measure');
        const marks = performance.getEntriesByType('mark');
        
        // Measure JavaScript execution time
        const scriptExecutionTime = measures
          .filter(measure => measure.name.includes('script') || measure.name.includes('js'))
          .reduce((total, measure) => total + measure.duration, 0);
        
        // Count React hydration time (if available)
        const reactMarks = marks.filter(mark => 
          mark.name.includes('react') || mark.name.includes('hydrate')
        );
        
        return {
          scriptExecutionTime,
          markCount: marks.length,
          measureCount: measures.length,
          reactMarks: reactMarks.length,
          longTasks: performance.getEntriesByType('longtask').length
        };
      });
      
      return runtimeMetrics;
      
    } catch (error) {
      console.warn('⚠️ Error measuring runtime performance:', error.message);
      return {};
    }
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(metrics) {
    let score = 100;
    const weights = {
      lcp: 25,
      fid: 25,
      cls: 25,
      ttfb: 10,
      fcp: 10,
      bundle: 5
    };
    
    // LCP scoring
    if (metrics.coreWebVitals?.lcp) {
      const lcp = metrics.coreWebVitals.lcp;
      if (lcp > this.thresholds.lcp.needsImprovement) {
        score -= weights.lcp;
      } else if (lcp > this.thresholds.lcp.good) {
        score -= weights.lcp * 0.5;
      }
    }
    
    // FID approximation (using FCP)
    if (metrics.coreWebVitals?.fcp) {
      const fcp = metrics.coreWebVitals.fcp;
      if (fcp > this.thresholds.fcp.needsImprovement) {
        score -= weights.fid;
      } else if (fcp > this.thresholds.fcp.good) {
        score -= weights.fid * 0.5;
      }
    }
    
    // CLS scoring
    if (metrics.coreWebVitals?.cls) {
      const cls = metrics.coreWebVitals.cls;
      if (cls > this.thresholds.cls.needsImprovement) {
        score -= weights.cls;
      } else if (cls > this.thresholds.cls.good) {
        score -= weights.cls * 0.5;
      }
    }
    
    // TTFB scoring
    if (metrics.coreWebVitals?.ttfb) {
      const ttfb = metrics.coreWebVitals.ttfb;
      if (ttfb > this.thresholds.ttfb.needsImprovement) {
        score -= weights.ttfb;
      } else if (ttfb > this.thresholds.ttfb.good) {
        score -= weights.ttfb * 0.5;
      }
    }
    
    // Bundle size penalty
    if (metrics.networkMetrics?.totalSize > this.thresholds.bundleSize.needsImprovement) {
      score -= weights.bundle;
    } else if (metrics.networkMetrics?.totalSize > this.thresholds.bundleSize.good) {
      score -= weights.bundle * 0.5;
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(metrics) {
    const recommendations = [];
    
    // LCP recommendations
    if (metrics.coreWebVitals?.lcp > this.thresholds.lcp.good) {
      recommendations.push({
        type: 'core-web-vitals',
        metric: 'LCP',
        severity: metrics.coreWebVitals.lcp > this.thresholds.lcp.needsImprovement ? 'high' : 'medium',
        issue: `Poor Largest Contentful Paint: ${Math.round(metrics.coreWebVitals.lcp)}ms`,
        recommendations: [
          'Optimize images with next/image component',
          'Implement proper lazy loading',
          'Reduce bundle size with code splitting',
          'Use CDN for static assets',
          'Preload critical resources'
        ]
      });
    }
    
    // CLS recommendations
    if (metrics.coreWebVitals?.cls > this.thresholds.cls.good) {
      recommendations.push({
        type: 'core-web-vitals',
        metric: 'CLS',
        severity: metrics.coreWebVitals.cls > this.thresholds.cls.needsImprovement ? 'high' : 'medium',
        issue: `High Cumulative Layout Shift: ${metrics.coreWebVitals.cls.toFixed(3)}`,
        recommendations: [
          'Add explicit width/height to images and videos',
          'Reserve space for dynamically loaded content',
          'Avoid inserting content above existing content',
          'Use CSS aspect-ratio for responsive media'
        ]
      });
    }
    
    // Bundle size recommendations
    if (metrics.networkMetrics?.totalSize > this.thresholds.bundleSize.good) {
      recommendations.push({
        type: 'bundle-optimization',
        severity: metrics.networkMetrics.totalSize > this.thresholds.bundleSize.needsImprovement ? 'high' : 'medium',
        issue: `Large bundle size: ${Math.round(metrics.networkMetrics.totalSize / 1024)}KB`,
        recommendations: [
          'Implement code splitting with dynamic imports',
          'Remove unused dependencies',
          'Use tree shaking to eliminate dead code',
          'Compress and minify assets',
          'Consider lazy loading non-critical components'
        ]
      });
    }
    
    // Network recommendations
    if (metrics.networkMetrics?.totalRequests > 50) {
      recommendations.push({
        type: 'network-optimization',
        severity: 'medium',
        issue: `High number of requests: ${metrics.networkMetrics.totalRequests}`,
        recommendations: [
          'Combine and minify CSS/JS files',
          'Use HTTP/2 server push for critical resources',
          'Implement resource bundling',
          'Use image sprites for small icons',
          'Enable resource preloading'
        ]
      });
    }
    
    // Memory recommendations
    if (metrics.memoryMetrics?.usedJSHeapSize > 50000000) { // 50MB
      recommendations.push({
        type: 'memory-optimization',
        severity: 'medium',
        issue: `High memory usage: ${Math.round(metrics.memoryMetrics.usedJSHeapSize / 1000000)}MB`,
        recommendations: [
          'Implement proper component cleanup',
          'Use React.memo to prevent unnecessary re-renders',
          'Remove event listeners in useEffect cleanup',
          'Optimize large data structures',
          'Consider virtual scrolling for large lists'
        ]
      });
    }
    
    // Resource loading recommendations
    if (metrics.resourceMetrics?.slowResources?.length > 0) {
      recommendations.push({
        type: 'resource-optimization',
        severity: 'medium',
        issue: `Slow loading resources detected: ${metrics.resourceMetrics.slowResources.length}`,
        recommendations: [
          'Optimize slow loading resources',
          'Implement resource preloading',
          'Use appropriate image formats (WebP, AVIF)',
          'Enable compression (gzip, brotli)',
          'Consider using a CDN'
        ]
      });
    }
    
    return recommendations;
  }
}

module.exports = PerformanceAnalyzer;