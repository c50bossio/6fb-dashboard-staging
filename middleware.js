// 🚨 SECURITY AUDIT FIX: Re-enable middleware with proper CORS configuration + Auth
import { NextResponse } from 'next/server'
import { handlePreflightRequest, addCorsHeaders } from './lib/cors-config'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request) {
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

  // CRITICAL: Call Supabase middleware FIRST to refresh session and validate user
  // This follows Supabase 2025 best practices for Next.js 14 App Router
  const { response: supabaseResponse, user, error } = await updateSession(request)

  // Define protected routes that require authentication
  const protectedPaths = [
    '/dashboard',
    '/shop',
    '/admin',
    '/barber',
    '/settings',
    '/profile'
  ]

  // Check if current path is protected
  const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path))

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !user) {
    console.log(`🚫 [Middleware] Blocking unauthenticated access to: ${pathname}`)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname) // Remember where they wanted to go
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/register', '/forgot-password']
  const isAuthRoute = authPaths.some(path => pathname.startsWith(path))

  if (isAuthRoute && user) {
    console.log(`↪️ [Middleware] Redirecting authenticated user from ${pathname} to /dashboard`)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // For API routes, ensure CORS headers are set
  if (pathname.startsWith('/api/')) {
    return addCorsHeaders(supabaseResponse, origin, {
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
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')

  // Add CORS headers if origin is present
  if (origin) {
    return addCorsHeaders(supabaseResponse, origin)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all request paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).)*',
    // Include all API routes
    '/api/(.*)',
  ]
}