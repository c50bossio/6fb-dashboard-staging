import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

// Enhanced security headers middleware
function addSecurityHeaders(response) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Content Security Policy - Strict but functional
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${isDevelopment ? "'unsafe-inline' 'unsafe-eval'" : "'nonce-${generateNonce()}'"} https://js.stripe.com https://checkout.stripe.com https://unpkg.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://*.posthog.com https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' http://localhost:* http://127.0.0.1:* https://*.supabase.co https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com wss://*.supabase.co https://*.posthog.com",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
    "upgrade-insecure-requests"
  ].join('; ')

  // Security headers
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), midi=(), sync-xhr=(), battery=(), display-capture=()')
  
  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // Remove server information
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  
  // Add custom security headers
  response.headers.set('X-Request-ID', generateRequestId())
  response.headers.set('X-Security-Policy', 'enabled')
  
  return response
}

// Generate CSP nonce for inline scripts
function generateNonce() {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map()

function isRateLimited(ip, endpoint, limit = 60, window = 60000) {
  const key = `${ip}:${endpoint}`
  const now = Date.now()
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + window })
    return false
  }
  
  const data = rateLimitStore.get(key)
  
  if (now > data.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + window })
    return false
  }
  
  if (data.count >= limit) {
    return true
  }
  
  data.count++
  return false
}

// Security event logging
function logSecurityEvent(type, details, ip) {
  const timestamp = new Date().toISOString()
  console.log(`[SECURITY] ${timestamp} - ${type} from ${ip}:`, details)
  
  // In production, send to monitoring service
  // await sendToMonitoring({ type, details, ip, timestamp })
}

export async function middleware(request) {
  const startTime = Date.now()
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
  
  try {
    // Rate limiting for authentication endpoints
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      if (isRateLimited(ip, 'auth', 10, 60000)) { // 10 requests per minute
        logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          endpoint: request.nextUrl.pathname,
          method: request.method
        }, ip)
        
        return new Response('Too Many Requests', { 
          status: 429, 
          headers: { 'Retry-After': '60' }
        })
      }
    }

    // Enhanced CORS for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin')
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:9999',
        'https://your-production-domain.com'
      ]
      
      // Strict origin validation
      if (origin && !allowedOrigins.includes(origin)) {
        logSecurityEvent('CORS_VIOLATION', {
          origin,
          endpoint: request.nextUrl.pathname
        }, ip)
        
        return new Response('Forbidden', { status: 403 })
      }
    }

    // Update Supabase session
    const response = await updateSession(request)
    
    // Add security headers to all responses
    const enhancedResponse = addSecurityHeaders(response || NextResponse.next())
    
    // Add CORS headers for allowed origins
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin')
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:9999']
      
      if (origin && allowedOrigins.includes(origin)) {
        enhancedResponse.headers.set('Access-Control-Allow-Origin', origin)
        enhancedResponse.headers.set('Access-Control-Allow-Credentials', 'true')
        enhancedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        enhancedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      }
    }

    // Performance monitoring
    const duration = Date.now() - startTime
    if (duration > 1000) {
      logSecurityEvent('SLOW_REQUEST', {
        endpoint: request.nextUrl.pathname,
        duration: `${duration}ms`
      }, ip)
    }
    
    return enhancedResponse
    
  } catch (error) {
    console.error('Middleware error:', error)
    
    // Log security error
    logSecurityEvent('MIDDLEWARE_ERROR', {
      error: error.message,
      endpoint: request.nextUrl.pathname
    }, ip)
    
    // Return basic response to avoid breaking the app
    return addSecurityHeaders(NextResponse.next())
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
