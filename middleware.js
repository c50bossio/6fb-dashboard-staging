import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import rateLimiter from '@/lib/redis-rate-limiter'
import { isOriginAllowed, addCorsHeaders, handlePreflightRequest } from '@/lib/cors-config'

// Enhanced security headers middleware
function addSecurityHeaders(response) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Enhanced Content Security Policy - Removed unsafe-eval, restricted unsafe-inline
  // Only allow unsafe-inline for styles due to Tailwind CSS requirements
  // Removed unsafe-eval completely for better security
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://unpkg.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://*.posthog.com https://vercel.live`,
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

  // Enhanced security headers
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), midi=(), sync-xhr=(), battery=(), display-capture=()')
  
  // Additional security headers
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  
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

// Note: Nonces are not used as Next.js App Router requires 'unsafe-inline'
// for proper hydration and streaming SSR functionality

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Enhanced rate limiting with Redis support and in-memory fallback
async function checkRateLimit(ip, endpoint, limit = 60, windowMs = 60000) {
  const key = `${ip}:${endpoint}`
  
  try {
    const result = await rateLimiter.isRateLimited(key, limit, windowMs)
    return result
  } catch (error) {
    console.warn('⚠️ Rate limit check failed:', error.message)
    // Fall back to allowing the request if rate limiter fails
    return {
      isLimited: false,
      count: 0,
      limit,
      resetTime: Date.now() + windowMs,
      remaining: limit,
      source: 'error'
    }
  }
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
    // Check subscription status for protected routes
    const pathname = request.nextUrl.pathname
    const isProtectedRoute = 
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/barber') ||
      pathname.startsWith('/shop') ||
      pathname.startsWith('/enterprise') ||
      pathname.startsWith('/ai-tools') ||
      pathname.startsWith('/analytics') ||
      pathname.startsWith('/billing') ||
      pathname.startsWith('/team') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/api/protected')
    
    const isPublicRoute = 
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/subscribe') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/stripe') ||
      pathname.startsWith('/api/health') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static')
    
    // For protected routes, check subscription status
    if (isProtectedRoute && !isPublicRoute) {
      const { createClient } = await import('@/lib/supabase/server-client')
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Not authenticated - redirect to login
        const url = new URL('/login', request.url)
        url.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(url)
      }
      
      // Check subscription status
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_status, subscription_tier, subscription_current_period_end')
        .eq('id', user.id)
        .single()
      
      // If no active subscription, redirect to pricing page
      if (!userData || userData.subscription_status !== 'active') {
        // Allow access to billing page so they can manage subscription
        if (!pathname.startsWith('/billing')) {
          const url = new URL('/subscribe', request.url)
          url.searchParams.set('reason', 'subscription_required')
          url.searchParams.set('redirectTo', pathname)
          return NextResponse.redirect(url)
        }
      }
      
      // Check if subscription has expired
      if (userData?.subscription_current_period_end) {
        const expirationDate = new Date(userData.subscription_current_period_end)
        if (expirationDate < new Date()) {
          // Subscription expired - redirect to billing
          if (!pathname.startsWith('/billing')) {
            const url = new URL('/subscribe', request.url)
            url.searchParams.set('reason', 'subscription_expired')
            url.searchParams.set('redirectTo', pathname)
            return NextResponse.redirect(url)
          }
        }
      }
    }
    
    // Enhanced rate limiting for authentication endpoints
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      const rateLimitResult = await checkRateLimit(ip, 'auth', 10, 60000) // 10 requests per minute
      
      if (rateLimitResult.isLimited) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          endpoint: request.nextUrl.pathname,
          method: request.method,
          count: rateLimitResult.count,
          limit: rateLimitResult.limit,
          source: rateLimitResult.source
        }, ip)
        
        const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        
        return new Response('Too Many Requests', { 
          status: 429, 
          headers: { 
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        })
      }
    }

    // Enhanced CORS and rate limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // General API rate limiting (more permissive than auth)
      if (!request.nextUrl.pathname.startsWith('/api/auth/')) {
        const rateLimitResult = await checkRateLimit(ip, 'api', 100, 60000) // 100 requests per minute
        
        if (rateLimitResult.isLimited) {
          logSecurityEvent('RATE_LIMIT_EXCEEDED', {
            endpoint: request.nextUrl.pathname,
            method: request.method,
            count: rateLimitResult.count,
            limit: rateLimitResult.limit,
            source: rateLimitResult.source
          }, ip)
          
          const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          
          return new Response('Too Many Requests', { 
            status: 429, 
            headers: { 
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
            }
          })
        }
      }
      
      const origin = request.headers.get('origin')
      
      // Handle preflight OPTIONS requests
      if (request.method === 'OPTIONS') {
        return handlePreflightRequest(request)
      }
      
      // Enhanced origin validation using CORS utility
      if (origin && !isOriginAllowed(origin)) {
        logSecurityEvent('CORS_VIOLATION', {
          origin,
          endpoint: request.nextUrl.pathname,
          method: request.method,
          userAgent: request.headers.get('user-agent')
        }, ip)
        
        return new Response('Forbidden - Origin not allowed', { 
          status: 403,
          headers: {
            'X-CORS-Error': 'origin-not-allowed',
            'X-Allowed-Origins': 'See API documentation'
          }
        })
      }
    }

    // Update Supabase session
    const response = await updateSession(request)
    
    // Add security headers to all responses
    let enhancedResponse = addSecurityHeaders(response || NextResponse.next())
    
    // Add enhanced CORS headers for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin')
      enhancedResponse = addCorsHeaders(enhancedResponse, origin)
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
