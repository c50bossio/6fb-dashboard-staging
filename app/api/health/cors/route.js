import { NextResponse } from 'next/server'
import { getCorsStatus } from '@/lib/cors-config'

/**
 * CORS Configuration Health Check Endpoint
 * Provides status information about CORS configuration
 */

export async function GET(request) {
  try {
    // Get CORS configuration status
    const corsStatus = getCorsStatus()
    
    // Get current time for reference
    const timestamp = new Date().toISOString()
    
    // Determine health status
    const hasValidOrigins = corsStatus.configuration.totalAllowedOrigins > 0
    const isProperlyConfigured = corsStatus.configuration.envOriginsConfigured || 
                                corsStatus.environment.nodeEnv === 'development'
    
    const healthStatus = hasValidOrigins && isProperlyConfigured ? 'healthy' : 'warning'
    
    // Check for potential issues
    const warnings = []
    const recommendations = []
    
    if (!corsStatus.configuration.envOriginsConfigured && corsStatus.environment.nodeEnv === 'production') {
      warnings.push('CORS_ORIGINS environment variable not configured for production')
      recommendations.push('Set CORS_ORIGINS environment variable with production domains')
    }
    
    if (corsStatus.security.developmentMode && corsStatus.environment.deploymentEnv === 'production') {
      warnings.push('Development mode CORS settings in production environment')
      recommendations.push('Ensure NODE_ENV=production for production deployments')
    }
    
    if (corsStatus.configuration.totalAllowedOrigins > 20) {
      warnings.push('Large number of allowed origins may impact security')
      recommendations.push('Review and minimize allowed origins for better security')
    }
    
    // Security analysis
    const securityAnalysis = {
      strictValidation: corsStatus.security.strictValidation,
      developmentMode: corsStatus.security.developmentMode,
      localhostAllowed: corsStatus.security.localhostAllowed,
      wildcardOrigins: corsStatus.allowedOrigins.some(origin => origin.includes('*')),
      httpsEnforced: corsStatus.environment.nodeEnv === 'production' ? 
        corsStatus.allowedOrigins.every(origin => origin.startsWith('https://') || origin.startsWith('http://localhost')) :
        null
    }
    
    const response = {
      status: healthStatus,
      timestamp,
      service: 'cors-configuration',
      configuration: corsStatus.configuration,
      environment: corsStatus.environment,
      security: securityAnalysis,
      allowedOrigins: corsStatus.allowedOrigins,
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      details: {
        description: 'Environment-based CORS configuration with security validation',
        features: [
          'Environment-aware origin validation',
          'Development localhost support',
          'Strict production validation',
          'Origin format validation',
          'Security pattern detection'
        ]
      }
    }
    
    return NextResponse.json(response, {
      status: healthStatus === 'healthy' ? 200 : 206, // 206 = Partial Content for warnings
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'cors-configuration',
        'X-CORS-Status': healthStatus,
        'X-Timestamp': timestamp
      }
    })
    
  } catch (error) {
    console.error('CORS health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'cors-configuration',
      error: {
        message: 'Health check failed',
        details: error.message
      }
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'cors-configuration',
        'X-Error': 'health-check-failed'
      }
    })
  }
}

// Support HEAD requests for basic health checks
export async function HEAD(request) {
  try {
    const corsStatus = getCorsStatus()
    const hasValidOrigins = corsStatus.configuration.totalAllowedOrigins > 0
    const isHealthy = hasValidOrigins
    
    return new Response(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy',
        'X-CORS-Origins-Count': corsStatus.configuration.totalAllowedOrigins.toString(),
        'X-Environment': corsStatus.environment.nodeEnv
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

// Support OPTIONS for CORS testing
export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-CORS-Test': 'preflight-success'
    }
  })
}