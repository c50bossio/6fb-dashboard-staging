import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Create a response object that we can modify
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create Supabase client for middleware following best practices
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Only set cookie in request if not already set
            if (!request.cookies.get(name)) {
              request.cookies.set(name, value)
            }
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  
  // API routes should never be protected - they handle their own logic  
  const isApiRoute = pathname.startsWith('/api/')
  
  // Public routes that don't need auth
  const publicRoutes = ['/login', '/signup', '/', '/auth', '/terms', '/privacy', '/contact']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // OAuth callback routes that need special handling
  const isAuthCallback = pathname.includes('/callback') || pathname.includes('/auth/')
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/(protected)']
  
  // Specific enterprise routes that should be protected (not public enterprise portals)
  const protectedEnterpriseRoutes = ['/enterprise/locations', '/enterprise/organization', '/enterprise/settings']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route.replace('(protected)', '')) || 
    pathname.includes('/(protected)/')
  ) || protectedEnterpriseRoutes.some(route => pathname.startsWith(route))
  
  // Allow OAuth callbacks to proceed without authentication check
  if (isAuthCallback) {
    return supabaseResponse
  }
  
  // Skip auth check for public routes and API routes - MAJOR PERFORMANCE OPTIMIZATION
  if (isPublicRoute || isApiRoute || !isProtectedRoute) {
    return supabaseResponse
  }
  
  // ONLY call getUser() for protected routes that actually need it
  // This eliminates the blocking network call for most requests
  let user = null
  let userError = null
  
  try {
    const result = await supabase.auth.getUser()
    user = result.data?.user
    userError = result.error
    
    // Only log unexpected authentication errors
    if (userError && userError.message !== 'Auth session missing!') {
      console.error('Middleware auth error:', userError.message, 'for path:', pathname)
    }
  } catch (error) {
    console.error('Middleware auth check failed:', error.message)
    userError = error
  }
  
  // If accessing a protected route without user, redirect to login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access login page, redirect to dashboard
  if (user && pathname === '/login') {
    const urlSearchParams = new URLSearchParams(request.nextUrl.search)
    const next = urlSearchParams.get('next') || '/dashboard'
    return NextResponse.redirect(new URL(next, request.url))
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)',
  ],
}