import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client with cookie handling for auth refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Set cookie on both request and response
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          // Remove cookie from both request and response
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session if expired - this is critical for OAuth
  await supabase.auth.getSession()
  
  // 🔓 Skip additional middleware for auth routes to prevent OAuth interference
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    return response
  }
  
  // 🛡️ Block access to sensitive files
  const blockedPaths = [
    '/.env',
    '/.git',
    '/node_modules',
    '/.next/cache',
    '/.next/server'
  ]

  const isBlockedPath = blockedPaths.some(blocked => 
    pathname.startsWith(blocked) || pathname === blocked
  )
  
  if (isBlockedPath) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // 🛡️ Basic security headers (simplified)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')  
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains'
    )
  }

  // 🔐 Admin route protection (keep this - it's useful)
  if (pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('authorization')
    const sessionCookie = request.cookies.get('session')
    
    if (!authHeader && !sessionCookie) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  return response
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