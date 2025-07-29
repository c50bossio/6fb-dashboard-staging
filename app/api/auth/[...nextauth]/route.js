/**
 * NextAuth.js API Route Handler
 * Handles all authentication requests including sign-in, sign-out, callbacks, etc.
 */

import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-config"

// Rate limiting store (in-memory, use Redis in production)
const rateLimitStore = new Map()

// Rate limiting middleware
function rateLimit(req) {
  const key = req.ip || req.headers.get('x-forwarded-for') || 'anonymous'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 10 // Allow more attempts for auth endpoints
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { attempts: 1, resetTime: now + windowMs })
    return true
  }
  
  const userData = rateLimitStore.get(key)
  
  if (now > userData.resetTime) {
    // Reset window
    rateLimitStore.set(key, { attempts: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userData.attempts >= maxAttempts) {
    return false
  }
  
  userData.attempts++
  return true
}

// Enhanced error handling
function handleAuthError(error, context = '') {
  console.error(`NextAuth Error ${context}:`, error)
  
  // Map common errors to user-friendly messages
  const errorMap = {
    'CredentialsSignin': 'Invalid email or password',
    'EmailNotVerified': 'Please verify your email address',
    'AccessDenied': 'Access denied. Please contact support.',
    'AccountNotLinked': 'This account is already linked to another provider',
    'OAuthAccountNotLinked': 'This email is already registered with a different provider',
    'SessionRequired': 'Please sign in to access this resource',
    'CallbackRouteError': 'Authentication callback failed',
    'OAuthCallbackError': 'OAuth provider error',
    'EmailSignin': 'Failed to send verification email',
    'TokenRefreshError': 'Session expired. Please sign in again.'
  }
  
  const userMessage = errorMap[error.type] || errorMap[error.name] || 'Authentication failed'
  
  return {
    error: error.type || error.name || 'AuthError',
    message: userMessage,
    timestamp: new Date().toISOString()
  }
}

// Suspicious activity detection
function detectSuspiciousActivity(req) {
  const warnings = []
  
  // Check for rapid requests from same IP
  const ip = req.ip || req.headers.get('x-forwarded-for')
  if (ip && rateLimitStore.has(ip)) {
    const userData = rateLimitStore.get(ip)
    if (userData.attempts > 5) {
      warnings.push('High frequency requests detected')
    }
  }
  
  // Check for unusual user agents
  const userAgent = req.headers.get('user-agent')
  if (!userAgent || userAgent.length < 10) {
    warnings.push('Suspicious user agent')
  }
  
  // Check for missing referrer on sensitive actions
  const referrer = req.headers.get('referer')
  if (!referrer && req.method === 'POST') {
    warnings.push('Missing referrer on POST request')
  }
  
  if (warnings.length > 0) {
    console.warn('Suspicious activity detected:', {
      ip,
      userAgent,
      referrer,
      warnings,
      timestamp: new Date().toISOString()
    })
  }
  
  return warnings
}

// Security headers middleware
function addSecurityHeaders(response) {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Add CSRF protection headers
  response.headers.set('X-CSRF-Protection', 'enabled')
  
  return response
}

// Enhanced NextAuth handler with security middleware
const handler = async (req, context) => {
  try {
    // Apply rate limiting
    if (!rateLimit(req)) {
      console.warn('Rate limit exceeded:', {
        ip: req.ip || req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'TooManyRequests',
          message: 'Too many authentication attempts. Please try again later.'
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Detect suspicious activity
    detectSuspiciousActivity(req)
    
    // Add request context for logging
    const requestContext = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    }
    
    // Handle NextAuth requests
    const response = await NextAuth(req, context, authOptions)
    
    // Add security headers
    return addSecurityHeaders(response)
    
  } catch (error) {
    // Enhanced error handling and logging
    const errorInfo = handleAuthError(error, 'API Handler')
    
    console.error('NextAuth API Error:', {
      error: errorInfo,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    
    // Return user-friendly error
    return new Response(
      JSON.stringify(errorInfo),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
  }
}

// Export for both GET and POST methods
export { handler as GET, handler as POST }

// Handle OPTIONS for CORS preflight
export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, userData] of rateLimitStore.entries()) {
    if (now > userData.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 15 * 60 * 1000) // Clean up every 15 minutes