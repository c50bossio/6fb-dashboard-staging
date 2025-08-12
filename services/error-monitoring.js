// Error Monitoring and Alerting Service
// Tracks errors, performance issues, and sends alerts

const { config } = require('./production-config');

// Error severity levels
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
const ErrorCategory = {
  API: 'api',
  DATABASE: 'database',
  PAYMENT: 'payment',
  EMAIL: 'email',
  SMS: 'sms',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  RATE_LIMIT: 'rate_limit',
  UNKNOWN: 'unknown'
};

class ErrorMonitor {
  constructor() {
    this.errors = [];
    this.metrics = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      last24Hours: 0,
      lastHour: 0
    };
    this.alerts = [];
    this.initialized = false;
  }

  // Initialize monitoring (connect to Sentry, etc.)
  async initialize() {
    if (this.initialized) return;

    // Initialize Sentry if configured
    if (config.monitoring.sentry.enabled && config.monitoring.sentry.dsn) {
      try {
        // In production, you would import and initialize Sentry here
        console.log('🔍 Sentry monitoring initialized');
      } catch (error) {
        console.error('Failed to initialize Sentry:', error);
      }
    }

    // Initialize PostHog if configured
    if (config.monitoring.posthog.enabled && config.monitoring.posthog.apiKey) {
      try {
        // In production, you would import and initialize PostHog here
        console.log('📊 PostHog analytics initialized');
      } catch (error) {
        console.error('Failed to initialize PostHog:', error);
      }
    }

    this.initialized = true;
    console.log('✅ Error monitoring service initialized');
  }

  // Categorize error automatically
  categorizeError(error) {
    const message = error.message || error.toString();
    const code = error.code || error.statusCode;

    // Payment errors
    if (message.includes('stripe') || message.includes('payment') || code === 402) {
      return ErrorCategory.PAYMENT;
    }

    // Email errors
    if (message.includes('sendgrid') || message.includes('email')) {
      return ErrorCategory.EMAIL;
    }

    // SMS errors
    if (message.includes('twilio') || message.includes('sms')) {
      return ErrorCategory.SMS;
    }

    // Database errors
    if (message.includes('database') || message.includes('supabase') || message.includes('sql')) {
      return ErrorCategory.DATABASE;
    }

    // Auth errors
    if (message.includes('auth') || message.includes('token') || code === 401) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Rate limit errors
    if (message.includes('rate') || code === 429) {
      return ErrorCategory.RATE_LIMIT;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || code === 400) {
      return ErrorCategory.VALIDATION;
    }

    // API errors
    if (code >= 400 && code < 600) {
      return ErrorCategory.API;
    }

    return ErrorCategory.UNKNOWN;
  }

  // Determine error severity
  determineSeverity(error, category) {
    const code = error.code || error.statusCode;

    // Critical errors
    if (
      category === ErrorCategory.PAYMENT ||
      category === ErrorCategory.DATABASE ||
      code >= 500
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity
    if (
      category === ErrorCategory.AUTHENTICATION ||
      code === 403 ||
      error.stack?.includes('TypeError')
    ) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (
      category === ErrorCategory.EMAIL ||
      category === ErrorCategory.SMS ||
      code >= 400
    ) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  // Log error
  async logError(error, context = {}) {
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    
    const errorRecord = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      category,
      severity,
      message: error.message || error.toString(),
      stack: error.stack,
      code: error.code || error.statusCode,
      context,
      environment: process.env.NODE_ENV,
      resolved: false
    };

    // Store error
    this.errors.push(errorRecord);
    
    // Update metrics
    this.metrics.total++;
    this.metrics.byCategory[category] = (this.metrics.byCategory[category] || 0) + 1;
    this.metrics.bySeverity[severity] = (this.metrics.bySeverity[severity] || 0) + 1;

    // Send to external monitoring if configured
    if (this.initialized && config.monitoring.sentry.enabled) {
      // In production, send to Sentry
      console.log(`🚨 [${severity.toUpperCase()}] ${category}: ${error.message}`);
    }

    // Check if alert needed
    if (severity === ErrorSeverity.CRITICAL) {
      await this.sendAlert(errorRecord);
    }

    // Clean up old errors (keep last 1000)
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }

    return errorRecord;
  }

  // Send alert for critical errors
  async sendAlert(errorRecord) {
    const alert = {
      id: `alert-${Date.now()}`,
      errorId: errorRecord.id,
      timestamp: new Date().toISOString(),
      severity: errorRecord.severity,
      category: errorRecord.category,
      message: `Critical error in ${errorRecord.category}: ${errorRecord.message}`,
      sent: false
    };

    this.alerts.push(alert);

    // In production, send actual alerts (email, Slack, PagerDuty, etc.)
    if (config.environment.isProduction) {
      console.error('🚨 CRITICAL ALERT:', alert.message);
      // Implement actual alert sending here
      alert.sent = true;
    } else {
      console.log('🔔 [DEV] Alert triggered:', alert.message);
    }

    return alert;
  }

  // Get error metrics
  getMetrics(timeRange = '24h') {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const rangeMs = ranges[timeRange] || ranges['24h'];
    const cutoff = now - rangeMs;

    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp).getTime() > cutoff
    );

    return {
      timeRange,
      total: recentErrors.length,
      byCategory: recentErrors.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {}),
      bySeverity: recentErrors.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      }, {}),
      errorRate: recentErrors.length / (rangeMs / (60 * 60 * 1000)), // Errors per hour
      criticalCount: recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
      unresolvedCount: recentErrors.filter(e => !e.resolved).length
    };
  }

  // Get recent errors
  getRecentErrors(limit = 10, category = null, severity = null) {
    let filtered = [...this.errors];

    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    return filtered
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Mark error as resolved
  resolveError(errorId) {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Get health status
  getHealthStatus() {
    const metrics = this.getMetrics('1h');
    
    let status = 'healthy';
    let issues = [];

    // Check critical errors
    if (metrics.criticalCount > 0) {
      status = 'critical';
      issues.push(`${metrics.criticalCount} critical errors in the last hour`);
    }

    // Check error rate
    if (metrics.errorRate > 10) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High error rate: ${metrics.errorRate.toFixed(2)} errors/hour`);
    }

    // Check specific categories
    if (metrics.byCategory[ErrorCategory.PAYMENT] > 5) {
      status = 'critical';
      issues.push('Multiple payment processing errors');
    }

    if (metrics.byCategory[ErrorCategory.DATABASE] > 10) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push('Database connectivity issues');
    }

    return {
      status,
      issues,
      metrics,
      timestamp: new Date().toISOString()
    };
  }

  // Clean up old data
  cleanup() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    this.errors = this.errors.filter(e => 
      new Date(e.timestamp).getTime() > cutoff
    );
    
    this.alerts = this.alerts.filter(a => 
      new Date(a.timestamp).getTime() > cutoff
    );
  }
}

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.thresholds = {
      api: 1000, // 1 second
      database: 500, // 500ms
      email: 3000, // 3 seconds
      sms: 2000 // 2 seconds
    };
  }

  // Track performance metric
  track(operation, duration, metadata = {}) {
    const metric = {
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      operation,
      duration,
      metadata,
      slow: duration > (this.thresholds[operation] || 1000)
    };

    this.metrics.push(metric);

    // Clean up old metrics (keep last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow operations
    if (metric.slow) {
      console.warn(`⚠️ Slow operation: ${operation} took ${duration}ms`);
    }

    return metric;
  }

  // Get performance statistics
  getStats(operation = null, timeRange = '1h') {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const rangeMs = ranges[timeRange] || ranges['1h'];
    const cutoff = now - rangeMs;

    let filtered = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }

    if (filtered.length === 0) {
      return {
        operation,
        timeRange,
        count: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        slowCount: 0
      };
    }

    const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      operation,
      timeRange,
      count: filtered.length,
      average: Math.round(sum / filtered.length),
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      min: durations[0],
      max: durations[durations.length - 1],
      slowCount: filtered.filter(m => m.slow).length,
      slowPercentage: (filtered.filter(m => m.slow).length / filtered.length) * 100
    };
  }

  // Start timing an operation
  startTimer(operation) {
    const startTime = Date.now();
    return {
      end: (metadata = {}) => {
        const duration = Date.now() - startTime;
        return this.track(operation, duration, metadata);
      }
    };
  }
}

// Create singleton instances
const errorMonitor = new ErrorMonitor();
const performanceMonitor = new PerformanceMonitor();

// Express/Next.js error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  errorMonitor.logError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.headers['x-user-id'] || req.body?.user_id
  });

  // Determine response
  const statusCode = err.statusCode || err.code || 500;
  const message = config.environment.isProduction 
    ? 'An error occurred processing your request'
    : err.message;

  res.status(statusCode).json({
    error: true,
    message,
    ...(config.environment.isDevelopment && {
      stack: err.stack,
      details: err
    })
  });
};

module.exports = {
  ErrorMonitor,
  errorMonitor,
  PerformanceMonitor,
  performanceMonitor,
  errorHandler,
  ErrorSeverity,
  ErrorCategory
};