// Production-ready authentication configuration
export const authConfig = {
  // Session configuration
  session: {
    // Session duration in seconds (30 days)
    maxAge: 30 * 24 * 60 * 60,
    // Refresh threshold - refresh session when less than this time remains (7 days)
    refreshThreshold: 7 * 24 * 60 * 60,
    // Auto-refresh interval in milliseconds (check every 5 minutes)
    autoRefreshInterval: 5 * 60 * 1000,
  },
  
  // Cookie configuration for production
  cookies: {
    // Cookie names
    names: {
      session: 'sb-auth-token',
      refresh: 'sb-refresh-token',
      provider: 'sb-provider-token'
    },
    // Cookie options
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // 30 days in seconds
      maxAge: 30 * 24 * 60 * 60
    }
  },
  
  // Routes configuration
  routes: {
    // Public routes that don't require authentication
    public: [
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/api/health',
      '/api/public'
    ],
    // Protected routes that require authentication
    protected: [
      '/dashboard',
      '/protected',
      '/api/protected'
    ],
    // Auth routes - redirect to dashboard if already logged in
    auth: [
      '/login',
      '/register'
    ],
    // Default redirects
    redirects: {
      afterLogin: '/dashboard',
      afterLogout: '/login',
      unauthorized: '/login'
    }
  },
  
  // Development mode configuration
  development: {
    // Enable development bypass
    enableBypass: process.env.NODE_ENV === 'development',
    // Development cookie name
    bypassCookie: 'dev_auth',
    // Development session storage key
    sessionKey: 'dev_session',
    // Mock user for development
    mockUser: {
      id: 'dev-user-001',
      email: 'dev@6fb-ai.com',
      name: 'Development User',
      role: 'SHOP_OWNER',
      metadata: {
        shop_id: 'demo-shop-001',
        shop_name: 'Demo Barbershop'
      }
    }
  },
  
  // Retry configuration for API calls
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
}

// Helper function to check if a route is protected
export function isProtectedRoute(pathname) {
  return authConfig.routes.protected.some(route => 
    pathname.startsWith(route)
  )
}

// Helper function to check if a route is public
export function isPublicRoute(pathname) {
  return authConfig.routes.public.some(route => 
    pathname === route || pathname.startsWith(route)
  )
}

// Helper function to check if a route is an auth route
export function isAuthRoute(pathname) {
  return authConfig.routes.auth.some(route => 
    pathname.startsWith(route)
  )
}

// Helper function to get redirect URL after login
export function getRedirectUrl(redirectTo) {
  // Validate redirect URL to prevent open redirects
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo
  }
  return authConfig.routes.redirects.afterLogin
}

// Helper function to format cookie options
export function getCookieOptions(overrides = {}) {
  return {
    ...authConfig.cookies.options,
    ...overrides
  }
}