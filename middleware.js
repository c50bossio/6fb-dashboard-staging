import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

// Sentry performance tracking
function captureRequestMetrics(request, response, startTime) {
  try {
    if (typeof window === 'undefined' && process.env.SENTRY_DSN) {
      // Server-side Sentry tracking
      const duration = Date.now() - startTime
      const status = response?.status || 200
      
      // Only import Sentry on server-side to avoid client bundle bloat
      import('@sentry/nextjs').then(({ captureMessage, setTag, setContext }) => {
        setTag('route', request.nextUrl.pathname)
        setTag('method', request.method)
        setTag('status', status.toString())
        
        setContext('request', {
          url: request.nextUrl.href,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          duration: duration
        })

        // Log slow requests
        if (duration > 1000) {
          captureMessage(`Slow request: ${request.method} ${request.nextUrl.pathname} (${duration}ms)`, 'warning')
        }

        // Log errors
        if (status >= 400) {
          captureMessage(`HTTP ${status}: ${request.method} ${request.nextUrl.pathname}`, 'error')
        }
      }).catch(() => {
        // Silently fail if Sentry is not available
      })
    }
  } catch (error) {
    // Silently fail to avoid breaking the middleware
    console.warn('Sentry middleware error:', error.message)
  }
}

// PostHog analytics tracking
function trackPageView(request) {
  try {
    if (typeof window === 'undefined' && process.env.POSTHOG_API_KEY) {
      // Server-side PostHog tracking for page views
      const pathname = request.nextUrl.pathname
      const userAgent = request.headers.get('user-agent') || ''
      const referer = request.headers.get('referer') || ''
      
      // Only track actual page requests, not API calls or static assets
      if (!pathname.startsWith('/api/') && 
          !pathname.startsWith('/_next/') && 
          !pathname.includes('.')) {
        
        // Dynamic import to avoid client bundle bloat
        import('posthog-node').then(({ PostHog }) => {
          const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
            host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
          })

          const distinctId = request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || 
                           'anonymous'

          posthog.capture({
            distinctId,
            event: '$pageview',
            properties: {
              $current_url: request.nextUrl.href,
              $pathname: pathname,
              $referrer: referer,
              $user_agent: userAgent,
              $timestamp: new Date().toISOString(),
              middleware_tracked: true
            }
          })

          // Ensure events are sent
          posthog.shutdown()
        }).catch(() => {
          // Silently fail if PostHog is not available
        })
      }
    }
  } catch (error) {
    // Silently fail to avoid breaking the middleware
    console.warn('PostHog middleware error:', error.message)
  }
}

export async function middleware(request) {
  const startTime = Date.now()
  
  try {
    // Track page view for analytics
    trackPageView(request)
    
    // Update Supabase session
    const response = await updateSession(request)
    
    // Add security headers
    const enhancedResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Security headers
    enhancedResponse.headers.set('X-Frame-Options', 'SAMEORIGIN')
    enhancedResponse.headers.set('X-Content-Type-Options', 'nosniff')
    enhancedResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    enhancedResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // CORS headers for API routes
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

    // Capture metrics for monitoring
    captureRequestMetrics(request, response || enhancedResponse, startTime)
    
    return response || enhancedResponse
    
  } catch (error) {
    console.error('Middleware error:', error)
    
    // Capture error to Sentry
    if (process.env.SENTRY_DSN) {
      import('@sentry/nextjs').then(({ captureException }) => {
        captureException(error)
      }).catch(() => {
        // Silently fail if Sentry is not available
      })
    }
    
    // Return basic response to avoid breaking the app
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}