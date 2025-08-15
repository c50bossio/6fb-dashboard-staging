export const authConfig = {
  session: {
    maxAge: 30 * 24 * 60 * 60,
    refreshThreshold: 7 * 24 * 60 * 60,
    autoRefreshInterval: 5 * 60 * 1000,
  },
  
  cookies: {
    names: {
      session: 'sb-auth-token',
      refresh: 'sb-refresh-token',
      provider: 'sb-provider-token'
    },
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // 30 days in seconds
      maxAge: 30 * 24 * 60 * 60
    }
  },
  
  routes: {
    public: [
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/api/health',
      '/api/public'
    ],
    protected: [
      '/dashboard',
      '/protected',
      '/api/protected'
    ],
    auth: [
      '/login',
      '/register'
    ],
    redirects: {
      afterLogin: '/dashboard',
      afterLogout: '/login',
      unauthorized: '/login'
    }
  },
  
  development: {
    enableBypass: process.env.NODE_ENV === 'development',
    bypassCookie: 'dev_auth',
    sessionKey: 'dev_session',
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
  
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
}

export function isProtectedRoute(pathname) {
  return authConfig.routes.protected.some(route => 
    pathname.startsWith(route)
  )
}

export function isPublicRoute(pathname) {
  return authConfig.routes.public.some(route => 
    pathname === route || pathname.startsWith(route)
  )
}

export function isAuthRoute(pathname) {
  return authConfig.routes.auth.some(route => 
    pathname.startsWith(route)
  )
}

export function getRedirectUrl(redirectTo) {
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo
  }
  return authConfig.routes.redirects.afterLogin
}

export function getCookieOptions(overrides = {}) {
  return {
    ...authConfig.cookies.options,
    ...overrides
  }
}