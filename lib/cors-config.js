/**
 * CORS Configuration Utility
 * Provides environment-based CORS configuration with enhanced security
 */

/**
 * Get allowed origins based on environment
 * @returns {string[]} Array of allowed origins
 */
export function getAllowedOrigins() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const deploymentEnv = process.env.DEPLOYMENT_ENV || 'development'
  
  const envOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || []
  
  const defaultOrigins = getDefaultOrigins(nodeEnv, deploymentEnv)
  
  const allOrigins = [...new Set([...envOrigins, ...defaultOrigins])]
  
  return allOrigins
    .filter(origin => origin && origin.length > 0)
    .filter(isValidOrigin)
}

/**
 * Get default origins based on environment
 * @param {string} nodeEnv - Node environment (development, production)
 * @param {string} deploymentEnv - Deployment environment (development, staging, production)
 * @returns {string[]} Default origins for the environment
 */
function getDefaultOrigins(nodeEnv, deploymentEnv) {
  if (nodeEnv === 'development') {
    return [
      'http://localhost:9999',      // Frontend dev server
      'http://localhost:3000',      // Alternative dev port
      'http://127.0.0.1:9999',     // Localhost variant
      'http://127.0.0.1:3000'      // Alternative localhost
    ]
  }
  
  switch (deploymentEnv) {
    case 'staging':
      return [
        'https://staging.6fb-ai.com',
        'https://staging-6fb-ai.vercel.app',
        'https://6fb-ai-staging.netlify.app'
      ]
    
    case 'production':
      return [
        'https://6fb-ai.com',
        'https://www.6fb-ai.com',
        'https://app.6fb-ai.com',
        'https://6fb-ai.vercel.app'
      ]
    
    default:
      return [
        'http://localhost:9999',
        'https://localhost:9999'
      ]
  }
}

/**
 * Validate if origin is properly formatted
 * @param {string} origin - Origin to validate
 * @returns {boolean} True if valid origin
 */
function isValidOrigin(origin) {
  try {
    const url = new URL(origin)
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }
    
    if (!url.hostname) {
      return false
    }
    
    const maliciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i,
      /<script/i,
      /on\w+=/i
    ]
    
    return !maliciousPatterns.some(pattern => pattern.test(origin))
    
  } catch (error) {
    return false
  }
}

/**
 * Check if origin is allowed
 * @param {string} origin - Origin to check
 * @param {string[]} allowedOrigins - Array of allowed origins
 * @returns {boolean} True if origin is allowed
 */
export function isOriginAllowed(origin, allowedOrigins = null) {
  if (!origin) {
    return true
  }
  
  const allowed = allowedOrigins || getAllowedOrigins()
  
  if (allowed.includes(origin)) {
    return true
  }
  
  if (process.env.NODE_ENV === 'development') {
    try {
      const url = new URL(origin)
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return true
      }
    } catch (error) {
      return false
    }
  }
  
  return false
}

/**
 * Get CORS headers for response
 * @param {string} origin - Request origin
 * @param {Object} options - CORS options
 * @returns {Object} CORS headers
 */
export function getCorsHeaders(origin, options = {}) {
  const {
    credentials = true,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    headers = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-Client-Version',
      'X-Request-ID'
    ],
    maxAge = 86400, // 24 hours
    exposedHeaders = [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
      'X-Response-Time'
    ]
  } = options
  
  const corsHeaders = {}
  
  if (isOriginAllowed(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
  }
  
  if (credentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true'
  }
  
  corsHeaders['Access-Control-Allow-Methods'] = methods.join(', ')
  
  corsHeaders['Access-Control-Allow-Headers'] = headers.join(', ')
  
  if (exposedHeaders.length > 0) {
    corsHeaders['Access-Control-Expose-Headers'] = exposedHeaders.join(', ')
  }
  
  corsHeaders['Access-Control-Max-Age'] = maxAge.toString()
  
  return corsHeaders
}

/**
 * Handle preflight OPTIONS request
 * @param {Request} request - The incoming request
 * @returns {Response} CORS preflight response
 */
export function handlePreflightRequest(request) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Length': '0'
    }
  })
}

/**
 * Add CORS headers to existing response
 * @param {Response} response - Existing response
 * @param {string} origin - Request origin
 * @param {Object} options - CORS options
 * @returns {Response} Response with CORS headers
 */
export function addCorsHeaders(response, origin, options = {}) {
  const corsHeaders = getCorsHeaders(origin, options)
  
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  })
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })
  
  return newResponse
}

/**
 * Get CORS configuration status for debugging
 * @returns {Object} CORS configuration status
 */
export function getCorsStatus() {
  const allowedOrigins = getAllowedOrigins()
  
  return {
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      deploymentEnv: process.env.DEPLOYMENT_ENV || 'development'
    },
    configuration: {
      envOriginsConfigured: !!(process.env.CORS_ORIGINS),
      envOrigins: process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [],
      totalAllowedOrigins: allowedOrigins.length
    },
    allowedOrigins: allowedOrigins,
    security: {
      strictValidation: true,
      developmentMode: process.env.NODE_ENV === 'development',
      localhostAllowed: process.env.NODE_ENV === 'development'
    }
  }
}

/**
 * Log CORS configuration (development only)
 */
export function logCorsConfig() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  
  const status = getCorsStatus()
  
  status.allowedOrigins.forEach((origin, index) => {
  })
  
  if (status.security.developmentMode) {
  }
}

export default {
  getAllowedOrigins,
  isOriginAllowed,
  getCorsHeaders,
  handlePreflightRequest,
  addCorsHeaders,
  getCorsStatus,
  logCorsConfig
}