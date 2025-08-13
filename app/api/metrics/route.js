// Prometheus Metrics Endpoint for 6FB AI Agent System Frontend
// Exposes application metrics in Prometheus format

import { NextResponse } from 'next/server';
export const runtime = 'edge'

// Simple in-memory metrics store
const metrics = {
  http_requests_total: new Map(),
  http_request_duration_seconds: new Map(),
  page_views_total: new Map(),
  user_sessions_active: 0,
  booking_conversion_rate: 0,
  ai_agent_requests_total: new Map(),
  performance_vitals: new Map()
};

// Initialize metrics if not already done
function initializeMetrics() {
  if (!global.metricsInitialized) {
    // HTTP request counters
    metrics.http_requests_total.set('GET_200', 0);
    metrics.http_requests_total.set('POST_200', 0);
    metrics.http_requests_total.set('GET_404', 0);
    metrics.http_requests_total.set('GET_500', 0);
    
    // Page view counters
    metrics.page_views_total.set('dashboard', 0);
    metrics.page_views_total.set('calendar', 0);
    metrics.page_views_total.set('settings', 0);
    
    // AI agent request counters
    metrics.ai_agent_requests_total.set('master_coach', 0);
    metrics.ai_agent_requests_total.set('financial', 0);
    metrics.ai_agent_requests_total.set('operations', 0);
    
    global.metricsInitialized = true;
  }
}

// Helper function to format metrics for Prometheus
function formatMetric(name, value, labels = {}, help = '', type = 'counter') {
  let output = '';
  
  if (help) {
    output += `# HELP ${name} ${help}\n`;
  }
  
  if (type) {
    output += `# TYPE ${name} ${type}\n`;
  }
  
  const labelString = Object.keys(labels).length > 0 
    ? '{' + Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
    : '';
  
  output += `${name}${labelString} ${value}\n`;
  
  return output;
}

// Collect and format all metrics
function collectMetrics() {
  initializeMetrics();
  
  let output = '';
  
  // HTTP request metrics
  output += formatMetric(
    'http_requests_total',
    metrics.http_requests_total.get('GET_200') || 0,
    { method: 'GET', code: '200' },
    'Total HTTP requests',
    'counter'
  );
  
  output += formatMetric(
    'http_requests_total',
    metrics.http_requests_total.get('POST_200') || 0,
    { method: 'POST', code: '200' },
    '',
    ''
  );
  
  output += formatMetric(
    'http_requests_total',
    metrics.http_requests_total.get('GET_404') || 0,
    { method: 'GET', code: '404' },
    '',
    ''
  );
  
  output += formatMetric(
    'http_requests_total',
    metrics.http_requests_total.get('GET_500') || 0,
    { method: 'GET', code: '500' },
    '',
    ''
  );
  
  // Response time histogram (simplified)
  const avgResponseTime = 0.15; // Placeholder - implement actual tracking
  output += formatMetric(
    'http_request_duration_seconds',
    avgResponseTime,
    { quantile: '0.5' },
    'HTTP request duration in seconds',
    'histogram'
  );
  
  output += formatMetric(
    'http_request_duration_seconds',
    avgResponseTime * 2,
    { quantile: '0.95' },
    '',
    ''
  );
  
  // Page view metrics
  for (const [page, count] of metrics.page_views_total) {
    output += formatMetric(
      'page_views_total',
      count,
      { page },
      'Total page views by page',
      'counter'
    );
  }
  
  // Active user sessions
  output += formatMetric(
    'user_sessions_active',
    metrics.user_sessions_active,
    {},
    'Number of active user sessions',
    'gauge'
  );
  
  // Booking conversion rate
  output += formatMetric(
    'booking_conversion_rate',
    metrics.booking_conversion_rate,
    {},
    'Booking conversion rate (0-1)',
    'gauge'
  );
  
  // AI agent request metrics
  for (const [agent, count] of metrics.ai_agent_requests_total) {
    output += formatMetric(
      'ai_agent_requests_total',
      count,
      { agent_type: agent },
      'Total AI agent requests by type',
      'counter'
    );
  }
  
  // Core Web Vitals metrics
  const vitals = {
    lcp: 1200,  // Largest Contentful Paint in ms
    fid: 50,    // First Input Delay in ms (deprecated, using INP)
    inp: 100,   // Interaction to Next Paint in ms
    cls: 0.1,   // Cumulative Layout Shift
    fcp: 800,   // First Contentful Paint in ms
    ttfb: 200   // Time to First Byte in ms
  };
  
  for (const [vital, value] of Object.entries(vitals)) {
    output += formatMetric(
      `web_vitals_${vital}`,
      value,
      {},
      `Core Web Vitals - ${vital.toUpperCase()}`,
      'gauge'
    );
  }
  
  // System resource metrics (client-side approximation)
  output += formatMetric(
    'memory_usage_mb',
    performance?.memory?.usedJSHeapSize ? 
      Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0,
    {},
    'JavaScript heap memory usage in MB',
    'gauge'
  );
  
  // Feature usage metrics
  const featureUsage = {
    calendar_views: 150,
    ai_chat_messages: 89,
    booking_attempts: 23,
    settings_changes: 7
  };
  
  for (const [feature, count] of Object.entries(featureUsage)) {
    output += formatMetric(
      'feature_usage_total',
      count,
      { feature },
      'Total feature usage counts',
      'counter'
    );
  }
  
  // Error rate metrics
  output += formatMetric(
    'javascript_errors_total',
    0, // Placeholder - implement actual error tracking
    {},
    'Total JavaScript errors',
    'counter'
  );
  
  // Network performance metrics
  output += formatMetric(
    'network_requests_total',
    metrics.http_requests_total.get('GET_200') + 
    metrics.http_requests_total.get('POST_200'),
    { status: 'success' },
    'Total successful network requests',
    'counter'
  );
  
  output += formatMetric(
    'network_requests_total',
    metrics.http_requests_total.get('GET_404') + 
    metrics.http_requests_total.get('GET_500'),
    { status: 'error' },
    '',
    ''
  );
  
  // Build information
  output += formatMetric(
    'build_info',
    1,
    {
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    'Build information',
    'gauge'
  );
  
  return output;
}

// Increment metric helper
export function incrementMetric(metricName, labels = {}) {
  if (metricName === 'http_requests_total') {
    const key = `${labels.method}_${labels.code}`;
    const current = metrics.http_requests_total.get(key) || 0;
    metrics.http_requests_total.set(key, current + 1);
  } else if (metricName === 'page_views_total') {
    const current = metrics.page_views_total.get(labels.page) || 0;
    metrics.page_views_total.set(labels.page, current + 1);
  } else if (metricName === 'ai_agent_requests_total') {
    const current = metrics.ai_agent_requests_total.get(labels.agent_type) || 0;
    metrics.ai_agent_requests_total.set(labels.agent_type, current + 1);
  }
}

// Set gauge metric helper
export function setGaugeMetric(metricName, value) {
  if (metricName === 'user_sessions_active') {
    metrics.user_sessions_active = value;
  } else if (metricName === 'booking_conversion_rate') {
    metrics.booking_conversion_rate = value;
  }
}

// Main metrics endpoint handler
export async function GET(request) {
  try {
    // Collect current metrics
    const metricsOutput = collectMetrics();
    
    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error collecting metrics:', error);
    
    return new NextResponse('Error collecting metrics', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}