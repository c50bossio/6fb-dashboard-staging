/**
 * Core Web Vitals and Performance Optimization Utilities
 * Comprehensive performance monitoring and optimization for 6FB AI Agent System
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

// Performance thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  LCP: { good: 2.5, needsImprovement: 4.0 }, // Largest Contentful Paint
  INP: { good: 0.2, needsImprovement: 0.5 }, // Interaction to Next Paint (replaces FID)
  CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1.8, needsImprovement: 3.0 }, // First Contentful Paint
  TTFB: { good: 0.8, needsImprovement: 1.8 }, // Time to First Byte
};

// Performance metrics store
const performanceMetrics = {
  pageLoadTime: 0,
  navigationStart: 0,
  vitals: {},
  resources: [],
  errors: [],
};

/**
 * Initialize Core Web Vitals monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Record navigation start time
  performanceMetrics.navigationStart = performance.now();

  // Monitor Core Web Vitals
  onCLS(onVitalsUpdate);
  onINP(onVitalsUpdate);
  onFCP(onVitalsUpdate);
  onLCP(onVitalsUpdate);
  onTTFB(onVitalsUpdate);

  // Monitor resource loading
  monitorResourcePerformance();

  // Monitor JavaScript errors that affect performance
  monitorPerformanceErrors();

  // Monitor memory usage if available
  monitorMemoryUsage();

  console.log('🚀 Performance monitoring initialized');
}

/**
 * Handle Core Web Vitals updates
 */
function onVitalsUpdate(metric) {
  const { name, value, rating } = metric;
  
  performanceMetrics.vitals[name] = {
    value: Math.round(value * 1000) / 1000,
    rating,
    timestamp: Date.now(),
  };

  // Send to analytics if configured
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: rating,
      non_interaction: true,
    });
  }

  // Log poor performance
  if (rating === 'poor') {
    console.warn(`⚠️ Poor ${name}: ${value} (threshold: ${getThreshold(name, 'needsImprovement')})`);
    
    // Send performance alert for critical metrics
    if (name === 'LCP' || name === 'INP' || name === 'CLS') {
      sendPerformanceAlert(name, value, rating);
    }
  }
}

/**
 * Monitor resource loading performance
 */
function monitorResourcePerformance() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Track slow resources
        if (entry.duration > 1000) { // Resources taking more than 1 second
          performanceMetrics.resources.push({
            name: entry.name,
            type: entry.entryType,
            duration: Math.round(entry.duration),
            size: entry.transferSize || 0,
            timestamp: entry.startTime,
          });

          console.warn(`🐌 Slow resource: ${entry.name} (${Math.round(entry.duration)}ms)`);
        }

        // Track large resources
        if (entry.transferSize > 500000) { // Resources larger than 500KB
          console.warn(`📦 Large resource: ${entry.name} (${Math.round(entry.transferSize / 1024)}KB)`);
        }
      }
    });

    observer.observe({ entryTypes: ['resource', 'navigation'] });
  } catch (error) {
    console.error('Failed to initialize resource monitoring:', error);
  }
}

/**
 * Monitor JavaScript errors that affect performance
 */
function monitorPerformanceErrors() {
  if (typeof window === 'undefined') return;

  // Monitor unhandled errors
  window.addEventListener('error', (event) => {
    performanceMetrics.errors.push({
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      timestamp: Date.now(),
    });

    // Check if error affects Core Web Vitals
    if (isPerformanceCriticalError(event.error)) {
      console.error('🚨 Performance-critical error detected:', event.message);
    }
  });

  // Monitor promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    performanceMetrics.errors.push({
      type: 'promise',
      message: event.reason?.message || 'Unhandled promise rejection',
      timestamp: Date.now(),
    });
  });
}

/**
 * Monitor memory usage
 */
function monitorMemoryUsage() {
  if (typeof window === 'undefined' || !window.performance?.memory) return;

  const checkMemory = () => {
    const memory = window.performance.memory;
    const usage = {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
    };

    // Alert on high memory usage
    if (usage.percentage > 80) {
      console.warn(`🧠 High memory usage: ${usage.used}MB (${usage.percentage}%)`);
    }

    return usage;
  };

  // Check memory usage every 30 seconds
  setInterval(checkMemory, 30000);
}

/**
 * Get performance threshold for a metric
 */
function getThreshold(metric, level) {
  return THRESHOLDS[metric]?.[level] || 0;
}

/**
 * Check if error is performance-critical
 */
function isPerformanceCriticalError(error) {
  const criticalPatterns = [
    /chunk/i,
    /loading/i,
    /fetch/i,
    /network/i,
    /timeout/i,
    /memory/i,
  ];

  const errorMessage = error?.message || '';
  return criticalPatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Send performance alert
 */
async function sendPerformanceAlert(metric, value, rating) {
  if (process.env.NODE_ENV !== 'production') return;

  try {
    await fetch('/api/performance/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric,
        value,
        rating,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error('Failed to send performance alert:', error);
  }
}

/**
 * Get comprehensive performance report
 */
export function getPerformanceReport() {
  const report = {
    ...performanceMetrics,
    pageLoadTime: performance.now() - performanceMetrics.navigationStart,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  // Calculate performance score
  report.score = calculatePerformanceScore(report.vitals);

  return report;
}

/**
 * Calculate overall performance score (0-100)
 */
function calculatePerformanceScore(vitals) {
  const scores = [];

  for (const [metric, data] of Object.entries(vitals)) {
    const threshold = THRESHOLDS[metric];
    if (!threshold) continue;

    let score;
    if (data.value <= threshold.good) {
      score = 100;
    } else if (data.value <= threshold.needsImprovement) {
      score = 50;
    } else {
      score = 0;
    }

    scores.push(score);
  }

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

/**
 * Optimize images for better performance
 */
export function optimizeImageLoading() {
  if (typeof window === 'undefined') return;

  // Add intersection observer for lazy loading
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      }
    });
  });

  // Observe all lazy images
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;

  const criticalResources = [
    '/api/auth/session',
    '/api/health',
  ];

  criticalResources.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Optimize third-party scripts
 */
export function optimizeThirdPartyScripts() {
  if (typeof window === 'undefined') return;

  // Defer non-critical third-party scripts
  const thirdPartyScripts = document.querySelectorAll('script[src*="google"], script[src*="facebook"], script[src*="twitter"]');
  
  thirdPartyScripts.forEach(script => {
    if (!script.async && !script.defer) {
      script.defer = true;
    }
  });
}

/**
 * Clean up performance monitoring
 */
export function cleanupPerformanceMonitoring() {
  // Clear any intervals or observers
  if (typeof window !== 'undefined') {
    // Performance monitoring cleanup would go here
  }
}

// Export performance metrics for external use
export { performanceMetrics };

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Wait for page load to initialize monitoring
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPerformanceMonitoring);
  } else {
    initPerformanceMonitoring();
  }
}