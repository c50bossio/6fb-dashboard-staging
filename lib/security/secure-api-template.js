// Example secure API route template
import { NextResponse } from 'next/server'

import { SecurityLogger } from '../monitoring/security-logger.js'

import { SecureAuthUtils } from './auth-utils.js'
import { InputValidator, withInputValidation } from './input-validator.js'

// Rate limiting helper
const rateLimiter = new Map()

function checkRateLimit(ip, limit = 10, window = 60000) {
  const key = ip
  const now = Date.now()
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, resetTime: now + window })
    return true
  }
  
  const data = rateLimiter.get(key)
  
  if (now > data.resetTime) {
    rateLimiter.set(key, { count: 1, resetTime: now + window })
    return true
  }
  
  if (data.count >= limit) {
    return false
  }
  
  data.count++
  return true
}

async function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  
  const token = authHeader.substring(7)
  return SecureAuthUtils.verifyJWT(token)
}

export function createSecureAPIRoute(handler, options = {}) {
  const {
    requireAuth = true,
    rateLimit = { requests: 10, window: 60000 },
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
    validateInput = true
  } = options
  
  return withInputValidation(async (request) => {
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown'
    
    try {
      // Method validation
      if (!allowedMethods.includes(request.method)) {
        SecurityLogger.warning('METHOD_NOT_ALLOWED', `${request.method} not allowed`, {
          ip,
          endpoint: request.url,
          method: request.method
        })
        
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        )
      }
      
      // Rate limiting
      if (!checkRateLimit(ip, rateLimit.requests, rateLimit.window)) {
        SecurityLogger.warning('RATE_LIMIT_EXCEEDED', 'API rate limit exceeded', {
          ip,
          endpoint: request.url,
          limit: rateLimit.requests
        })
        
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
      
      // Authentication
      let user = null
      if (requireAuth) {
        try {
          user = await authenticateRequest(request)
        } catch (authError) {
          SecurityLogger.warning('AUTH_FAILURE', 'Authentication failed', {
            ip,
            endpoint: request.url,
            error: authError.message
          })
          
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }
      }
      
      // Call the actual handler
      return await handler(request, { user, ip })
      
    } catch (error) {
      SecurityLogger.error('API_ERROR', 'API request failed', {
        ip,
        endpoint: request.url,
        error: error.message
      })
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}
