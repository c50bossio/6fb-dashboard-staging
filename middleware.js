// 🚨 SECURITY AUDIT FIX: Re-enable middleware with proper CORS configuration
import { NextResponse } from 'next/server'
import { handlePreflightRequest, addCorsHeaders } from './lib/cors-config'

export function middleware(request) {
  const origin = request.headers.get('origin')
  const pathname = request.nextUrl.pathname

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handlePreflightRequest(request)
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // For API routes, ensure CORS headers are set
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    return addCorsHeaders(response, origin, {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version',
        'X-Request-ID'
      ]
    })
  }

  // Add security headers to all responses
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Add CORS headers if origin is present
  if (origin) {
    return addCorsHeaders(response, origin)
  }
  
  return response
}

export const config = {
  matcher: [
    // Match all request paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).)*',
    // Include all API routes
    '/api/(.*)',
  ]
}