import { NextResponse } from 'next/server'
import rateLimiter from '@/lib/redis-rate-limiter'

/**
 * Rate Limiter Health Check Endpoint
 * Provides status information about the rate limiting system
 */

export async function GET(request) {
  try {
    // Get rate limiter status
    const status = rateLimiter.getStatus()
    
    // Get current time for reference
    const timestamp = new Date().toISOString()
    
    // Determine health status
    const isHealthy = status.redisAvailable || status.memoryEntries >= 0
    const healthStatus = isHealthy ? 'healthy' : 'degraded'
    
    // Performance metrics
    const metrics = {
      source: status.source,
      redisAvailable: status.redisAvailable,
      connectionAttempts: status.connectionAttempts,
      memoryEntries: status.memoryEntries,
      fallbackMode: !status.redisAvailable
    }
    
    // Warnings based on status
    const warnings = []
    if (!status.redisAvailable) {
      warnings.push('Redis unavailable - using in-memory fallback')
    }
    if (status.connectionAttempts > 0) {
      warnings.push(`Redis connection attempts: ${status.connectionAttempts}`)
    }
    if (status.memoryEntries > 10000) {
      warnings.push('High memory usage for rate limiting storage')
    }
    
    const response = {
      status: healthStatus,
      timestamp,
      service: 'rate-limiter',
      metrics,
      warnings: warnings.length > 0 ? warnings : undefined,
      details: {
        description: 'Redis-based rate limiter with in-memory fallback',
        currentSource: status.source,
        features: [
          'Per-IP rate limiting',
          'Per-endpoint rate limiting',
          'Redis persistence',
          'Memory fallback',
          'Sliding window algorithm'
        ]
      }
    }
    
    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'rate-limiter',
        'X-Timestamp': timestamp
      }
    })
    
  } catch (error) {
    console.error('Rate limiter health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'rate-limiter',
      error: {
        message: 'Health check failed',
        details: error.message
      }
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'rate-limiter',
        'X-Error': 'health-check-failed'
      }
    })
  }
}

// Also support HEAD requests for basic health checks
export async function HEAD(request) {
  try {
    const status = rateLimiter.getStatus()
    const isHealthy = status.redisAvailable || status.memoryEntries >= 0
    
    return new Response(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Health-Status': isHealthy ? 'healthy' : 'degraded',
        'X-Rate-Limiter-Source': status.source,
        'X-Redis-Available': status.redisAvailable.toString()
      }
    })
  } catch (error) {
    return new Response(null, {
      status: 500,
      headers: {
        'X-Health-Status': 'error',
        'X-Error': 'health-check-failed'
      }
    })
  }
}