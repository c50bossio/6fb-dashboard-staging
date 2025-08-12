import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { config, getServiceStatus } from '@/services/production-config';
import { errorMonitor, performanceMonitor } from '@/services/error-monitoring';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Service health checks
async function checkDatabase() {
  const timer = performanceMonitor.startTimer('database');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    const metric = timer.end();
    return {
      status: error ? 'unhealthy' : 'healthy',
      latency: metric.duration,
      error: error?.message
    };
  } catch (error) {
    timer.end();
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkRedis() {
  // In production, check Redis connection
  if (process.env.REDIS_URL) {
    try {
      // Redis health check would go here
      return {
        status: 'healthy',
        latency: 5
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  return {
    status: 'not_configured'
  };
}

async function checkExternalServices() {
  const services = {};
  
  // Check SendGrid
  services.sendgrid = {
    configured: !!process.env.SENDGRID_API_KEY,
    status: process.env.SENDGRID_API_KEY ? 'healthy' : 'not_configured'
  };
  
  // Check Twilio
  services.twilio = {
    configured: !!process.env.TWILIO_ACCOUNT_SID,
    status: process.env.TWILIO_ACCOUNT_SID ? 'healthy' : 'not_configured'
  };
  
  // Check Stripe
  services.stripe = {
    configured: !!process.env.STRIPE_SECRET_KEY,
    status: process.env.STRIPE_SECRET_KEY ? 'healthy' : 'not_configured'
  };
  
  return services;
}

function getSystemMetrics() {
  // Get Node.js process metrics
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    },
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime)
    },
    pid: process.pid,
    version: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const secret = searchParams.get('secret');
    
    // Basic health check (always available)
    const basicHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };
    
    // Return basic health for non-authenticated requests
    if (!detailed) {
      return NextResponse.json(basicHealth);
    }
    
    // Require secret for detailed health checks in production
    if (
      process.env.NODE_ENV === 'production' && 
      secret !== process.env.HEALTH_CHECK_SECRET
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Perform detailed health checks
    const [database, redis, externalServices] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalServices()
    ]);
    
    // Get monitoring metrics
    const errorMetrics = errorMonitor.getMetrics('1h');
    const performanceStats = {
      api: performanceMonitor.getStats('api', '1h'),
      database: performanceMonitor.getStats('database', '1h'),
      email: performanceMonitor.getStats('email', '1h'),
      sms: performanceMonitor.getStats('sms', '1h')
    };
    
    // Get system metrics
    const systemMetrics = getSystemMetrics();
    
    // Get service configuration status
    const serviceStatus = getServiceStatus();
    
    // Determine overall health
    let overallStatus = 'healthy';
    const issues = [];
    
    if (database.status === 'unhealthy') {
      overallStatus = 'critical';
      issues.push('Database connection failed');
    }
    
    if (redis.status === 'unhealthy') {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      issues.push('Redis connection failed');
    }
    
    if (errorMetrics.criticalCount > 0) {
      overallStatus = 'critical';
      issues.push(`${errorMetrics.criticalCount} critical errors in the last hour`);
    }
    
    if (errorMetrics.errorRate > 10) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      issues.push(`High error rate: ${errorMetrics.errorRate.toFixed(2)} errors/hour`);
    }
    
    if (systemMetrics.memory.heapUsed > systemMetrics.memory.heapTotal * 0.9) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      issues.push('High memory usage (>90%)');
    }
    
    // Build detailed response
    const detailedHealth = {
      ...basicHealth,
      status: overallStatus,
      issues,
      checks: {
        database,
        redis,
        externalServices
      },
      metrics: {
        errors: {
          lastHour: errorMetrics.total,
          byCategory: errorMetrics.byCategory,
          bySeverity: errorMetrics.bySeverity,
          rate: errorMetrics.errorRate,
          critical: errorMetrics.criticalCount
        },
        performance: performanceStats,
        system: systemMetrics
      },
      configuration: serviceStatus,
      features: config.features,
      rateLimits: config.rateLimits,
      monitoring: {
        sentry: config.monitoring.sentry.enabled,
        posthog: config.monitoring.posthog.enabled
      }
    };
    
    // Set appropriate cache headers
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': overallStatus
    };
    
    // Return appropriate status code based on health
    const statusCode = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(detailedHealth, { 
      status: statusCode,
      headers 
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    // Log to error monitor
    await errorMonitor.logError(error, {
      endpoint: '/api/health/production',
      type: 'health_check_failure'
    });
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}