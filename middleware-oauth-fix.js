import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Create a response object that we can modify
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Enhanced cookie configuration for PKCE
  const cookieOptions = {
    domain: process.env.NODE_ENV === 'production' ? '.bookedbarber.com' : undefined,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Critical for OAuth flows
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }

  // Create Supabase client with enhanced cookie handling for OAuth PKCE
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Enhanced cookie settings for PKCE flows
          const enhancedOptions = {
            ...cookieOptions,
            ...options,
            // Ensure PKCE cookies persist longer
            maxAge: name.includes('pkce') || name.includes('auth') 
              ? 60 * 60 * 2 // 2 hours for auth cookies
              : options?.maxAge || cookieOptions.maxAge
          }
          
          // Set cookie on both request and response
          request.cookies.set({ name, value, ...enhancedOptions })
          response.cookies.set({ name, value, ...enhancedOptions })
        },
        remove(name, options) {
          const removeOptions = { ...cookieOptions, ...options }
          // Remove cookie from both request and response
          request.cookies.set({ name, value: '', ...removeOptions })
          response.cookies.set({ name, value: '', ...removeOptions })
        },
      },
    }
  )

  // 🔓 Skip additional middleware for auth routes to prevent OAuth interference
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    // Special handling for OAuth callback to ensure cookies are preserved
    if (pathname === '/auth/callback') {
      // Add debug headers in development
      if (process.env.NODE_ENV === 'development') {
        response.headers.set('X-Debug-OAuth-Callback', 'true')
        response.headers.set('X-Debug-Cookies-Count', request.cookies.size.toString())
      }
    }
    return response
  }
  
  // Refresh session if expired - this is critical for OAuth
  try {
    await supabase.auth.getSession()
  } catch (error) {
    // Log OAuth-related errors but don't break the flow
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Session refresh warning:', error.message)
    }
  }
  
  // 🛡️ Block access to sensitive files
  const blockedPaths = [
    '/.env',
    '/.git',
    '/node_modules',
    '/.next/cache',
    '/database/',
    '/.vscode',
    '/coverage'
  ]
  
  if (blockedPaths.some(path => pathname.startsWith(path))) {
    return new NextResponse(null, { status: 404 })
  }
  
  // 🔐 Protected routes - require authentication
  const protectedRoutes = [
    '/dashboard',
    '/protected',
    '/shop',
    '/barber',
    '/admin',
    '/enterprise',
    '/settings',
    '/inventory',
    '/pos',
    '/seo',
    '/profile'
  ]
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        // Preserve the intended destination
        const redirectTo = encodeURIComponent(request.url)
        return NextResponse.redirect(
          new URL(`/login?redirect_to=${redirectTo}`, request.url)
        )
      }
    } catch (sessionError) {
      // Handle session errors gracefully
      console.warn('Session check error:', sessionError.message)
      const redirectTo = encodeURIComponent(request.url)
      return NextResponse.redirect(
        new URL(`/login?redirect_to=${redirectTo}`, request.url)
      )
    }
  }

  return response
}

// Enhanced matcher to handle OAuth routes properly
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes that handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     * - *.png, *.jpg, *.jpeg, *.gif, *.svg (images)
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}