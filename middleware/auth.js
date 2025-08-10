/**
 * Production-ready authentication middleware
 * Handles authentication for all API routes with proper security
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Create authenticated Supabase client
 */
export async function createAuthenticatedClient() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Server Component context
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Server Component context
          }
        },
      },
    }
  )
  
  return supabase
}

/**
 * Verify user authentication and return user data
 */
export async function verifyAuth(request) {
  try {
    const supabase = await createAuthenticatedClient()
    
    // Get session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      // Check for API key authentication (for service-to-service calls)
      const apiKey = request.headers.get('x-api-key')
      if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
        return {
          authenticated: true,
          user: { id: 'service', role: 'service' },
          isService: true
        }
      }
      
      return {
        authenticated: false,
        error: 'No valid session found'
      }
    }
    
    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, shop_id')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile) {
      return {
        authenticated: false,
        error: 'User profile not found'
      }
    }
    
    return {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: profile.role,
        shop_id: profile.shop_id
      },
      session
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      authenticated: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user, requiredRoles) {
  if (!user || !user.role) return false
  
  const roleHierarchy = {
    'super_admin': 5,
    'shop_owner': 4,
    'barber': 3,
    'receptionist': 2,
    'customer': 1,
    'service': 10 // Special role for service accounts
  }
  
  const userLevel = roleHierarchy[user.role] || 0
  
  // Check if user has any of the required roles
  return requiredRoles.some(role => {
    const requiredLevel = roleHierarchy[role] || 0
    return userLevel >= requiredLevel
  })
}

/**
 * Middleware wrapper for protected routes
 */
export function withAuth(handler, options = {}) {
  const {
    requiredRoles = [],
    allowService = false,
    requireShop = false
  } = options
  
  return async (request, context) => {
    // Verify authentication
    const authResult = await verifyAuth(request)
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      )
    }
    
    // Check if service account is allowed
    if (authResult.isService && !allowService) {
      return NextResponse.json(
        { error: 'Service accounts not allowed for this endpoint' },
        { status: 403 }
      )
    }
    
    // Check role requirements
    if (requiredRoles.length > 0 && !hasRole(authResult.user, requiredRoles)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', required: requiredRoles },
        { status: 403 }
      )
    }
    
    // Check shop requirement
    if (requireShop && !authResult.user.shop_id) {
      return NextResponse.json(
        { error: 'Shop association required' },
        { status: 403 }
      )
    }
    
    // Add auth context to request
    request.auth = authResult
    
    // Call the handler
    return handler(request, context)
  }
}

/**
 * Create admin Supabase client for service operations
 * WARNING: This bypasses RLS - use only for admin operations
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Service role key not configured')
  }
  
  const { createClient } = require('@supabase/supabase-js')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

/**
 * Rate limiting middleware
 */
const rateLimitMap = new Map()

export function withRateLimit(handler, options = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 60, // 60 requests per minute
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || 'anonymous'
  } = options
  
  return async (request, context) => {
    const key = keyGenerator(request)
    const now = Date.now()
    
    // Clean old entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k)
      }
    }
    
    // Check rate limit
    let record = rateLimitMap.get(key)
    if (!record) {
      record = {
        count: 0,
        resetTime: now + windowMs
      }
      rateLimitMap.set(key, record)
    }
    
    if (record.resetTime < now) {
      record.count = 0
      record.resetTime = now + windowMs
    }
    
    record.count++
    
    if (record.count > maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
          }
        }
      )
    }
    
    // Add rate limit headers
    const response = await handler(request, context)
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - record.count).toString())
    response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
    
    return response
  }
}

export default {
  createAuthenticatedClient,
  verifyAuth,
  hasRole,
  withAuth,
  createAdminClient,
  withRateLimit
}