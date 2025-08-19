import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  
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
  const response = NextResponse.next()
  
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