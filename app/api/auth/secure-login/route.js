import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import crypto from 'crypto'

const loginAttempts = new Map()

function getClientIP(request) {
  const headersList = headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIP = headersList.get('x-real-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return '127.0.0.1'
}

function checkRateLimit(ip, email) {
  const now = Date.now()
  const key = `${ip}:${email}`
  const attempts = loginAttempts.get(key) || []
  
  const recentAttempts = attempts.filter(time => now - time < 5 * 60 * 1000)
  
  if (recentAttempts.length >= 5) {
    return false
  }
  
  recentAttempts.push(now)
  loginAttempts.set(key, recentAttempts)
  
  return true
}

function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex')
}

function validateLoginInput(email, password) {
  const errors = []
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format')
  } else if (email.length > 254) {
    errors.push('Email too long')
  }
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required')
  } else if (password.length < 8) {
    errors.push('Password too short')
  } else if (password.length > 128) {
    errors.push('Password too long')
  }
  
  return errors
}

export async function POST(request) {
  const startTime = Date.now()
  const clientIP = getClientIP(request)
  const userAgent = headers().get('user-agent') || 'unknown'
  
  try {
    const body = await request.json()
    const { email, password, csrfToken } = body
    
    
    const validationErrors = validateLoginInput(email, password)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: validationErrors 
        },
        { 
          status: 400,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
          }
        }
      )
    }
    
    if (!checkRateLimit(clientIP, email)) {
      console.error(`[SECURITY] Rate limit exceeded for ${email} from ${clientIP}`)
      
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: 300 // 5 minutes
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '300',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + 300000)
          }
        }
      )
    }
    
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    })
    
    if (error) {
      console.error(`[SECURITY] Login failed for ${email} from ${clientIP}: ${error.message}`)
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { 
          status: 401,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
          }
        }
      )
    }
    
    const { user, session } = data
    
    const newCSRFToken = generateCSRFToken()
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'CLIENT'
      },
      csrfToken: newCSRFToken,
      sessionExpiry: session.expires_at
    })
    
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    response.cookies.set('session', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
    
    response.cookies.set('csrf-token', newCSRFToken, {
      httpOnly: false, // Needs to be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
    
    console.log(`[SECURITY] Successful login for ${email} from ${clientIP}`)
    
    const duration = Date.now() - startTime
    if (duration > 1000) {
      console.warn(`[PERFORMANCE] Slow login request: ${duration}ms`)
    }
    
    return response
    
  } catch (error) {
    console.error('[SECURITY] Login error:', error)
    
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { 
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        }
      }
    )
  }
}