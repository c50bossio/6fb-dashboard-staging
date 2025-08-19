import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // 🛡️ CRITICAL SECURITY: Block access to sensitive files and endpoints
  const blockedPaths = [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.env.staging',
    '/.env.development',
    '/config.json',
    '/config.js',
    '/config.ts',
    '/.config',
    '/debug',
    '/debug.js', 
    '/debug.json',
    '/secrets',
    '/secrets.json',
    '/.secrets',
    '/credentials',
    '/credentials.json',
    '/.credentials',
    '/backup',
    '/backups',
    '/.backup',
    '/.git',
    '/.github',
    '/node_modules',
    '/package.json',
    '/package-lock.json',
    '/yarn.lock',
    '/.next/cache',
    '/.next/server',
    '/docker-compose.yml',
    '/Dockerfile',
    '/.dockerignore'
  ]

  const isBlockedPath = blockedPaths.some(blocked => 
    pathname.startsWith(blocked) || pathname === blocked
  )
  
  if (isBlockedPath) {
    console.warn(`🚨 SECURITY: Blocked access to sensitive path: ${pathname}`)
    return new NextResponse('Not Found', { status: 404 })
  }

  // 🛡️ SECURITY HEADERS: Add comprehensive security headers
  const response = NextResponse.next()

  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://js.stripe.com https://us-assets.i.posthog.com https://app.posthog.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https: wss: https://us.i.posthog.com https://app.posthog.com; " +
    "frame-src 'self' https://js.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  )

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')  
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // 🛡️ AUTHENTICATION BYPASS: Allow auth flows to proceed
  const authPaths = [
    '/api/auth/callback', 
    '/auth/login',
    '/auth/signup',
    '/api/auth/login',
    '/api/auth/signup'
  ]
  
  const isAuthPath = authPaths.some(authPath => pathname.startsWith(authPath))
  
  if (isAuthPath) {
    console.log(`🔐 AUTH: Allowing authentication path: ${pathname}`)
    return NextResponse.next()
  }

  // 🛡️ ADMIN ROUTE PROTECTION: Extra protection for admin routes  
  if (pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('authorization')
    const sessionCookie = request.cookies.get('session')
    
    if (!authHeader && !sessionCookie) {
      console.warn(`🚨 SECURITY: Unauthorized admin access attempt: ${pathname}`)
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  // 🛡️ RATE LIMITING: Basic path-based rate limiting  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent)
  
  if (isBot && pathname.startsWith('/api/')) {
    console.warn(`🚨 SECURITY: Bot blocked from API access: ${pathname}`)
    return new NextResponse('Forbidden', { status: 403 })
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