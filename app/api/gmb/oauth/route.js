import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Determine the base URL based on environment
const getBaseUrl = (request) => {
  // Check if we're in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_URL) {
    return 'https://bookedbarber.com'
  }
  
  // Use the request URL if available
  if (request && request.headers) {
    const host = request.headers.get('host')
    if (host && host.includes('bookedbarber.com')) {
      return `https://${host}`
    }
    // Fix for Docker environment - never use internal backend URL
    if (host && (host.includes('backend') || host.includes(':8000') || host.includes(':8001'))) {
      return 'http://localhost:9999'
    }
  }
  
  // Default to environment variable or localhost
  // Always use frontend URL for OAuth redirects
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'
}

// Google OAuth 2.0 configuration for Google My Business API
const getGoogleOAuthConfig = (request) => ({
  client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  redirect_uri: `${getBaseUrl(request)}/api/gmb/oauth/callback`,
  scope: 'https://www.googleapis.com/auth/business.manage',
  access_type: 'offline',
  prompt: 'consent',
  include_granted_scopes: 'true'
})

/**
 * GET /api/gmb/oauth
 * Initialize Google My Business OAuth flow
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const userId = searchParams.get('user_id')
    
    // Get OAuth config with proper redirect URI
    const GOOGLE_OAUTH_CONFIG = getGoogleOAuthConfig(request)
    
    if (!barbershopId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: barbershop_id and user_id'
      }, { status: 400 })
    }
    
    // Verify user has permission to connect GMB for this barbershop
    const { data: permission, error: permissionError } = await supabase
      .from('barbershop_staff')
      .select('role, barbershop_id')
      .eq('user_id', userId)
      .eq('barbershop_id', barbershopId)
      .single()
    
    if (permissionError || !permission) {
      // Check if user is the barbershop owner
      const { data: ownership, error: ownershipError } = await supabase
        .from('barbershops')
        .select('id, owner_id')
        .eq('id', barbershopId)
        .eq('owner_id', userId)
        .single()
      
      if (ownershipError || !ownership) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized: User does not have permission to connect GMB for this barbershop'
        }, { status: 403 })
      }
    }
    
    // Generate state parameter for CSRF protection
    const state = generateSecureState({
      barbershop_id: barbershopId,
      user_id: userId,
      timestamp: Date.now()
    })
    
    // Try to store state in database for verification (skip if table doesn't exist)
    try {
      await supabase
        .from('oauth_states')
        .insert({
          state_token: state,
          barbershop_id: barbershopId,
          user_id: userId,
          provider: 'google_mybusiness',
          expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        })
    } catch (error) {
      console.log('Could not store OAuth state (table may not exist):', error.message)
      // Continue anyway for development
    }
    
    // Check if Google OAuth credentials are configured
    if (!GOOGLE_OAUTH_CONFIG.client_id || GOOGLE_OAUTH_CONFIG.client_id === 'your-google-client-id') {
      console.error('Google OAuth Client ID not configured')
      return NextResponse.json({
        success: false,
        error: 'Google OAuth is not configured. Please set up Google Cloud credentials.',
        setup_instructions: 'Visit https://console.cloud.google.com to create OAuth 2.0 credentials'
      }, { status: 500 })
    }
    
    console.log('Google OAuth Config:', {
      client_id: GOOGLE_OAUTH_CONFIG.client_id?.substring(0, 20) + '...',
      has_secret: !!GOOGLE_OAUTH_CONFIG.client_secret,
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirect_uri,
      env_check: {
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET
      }
    })
    
    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.append('client_id', GOOGLE_OAUTH_CONFIG.client_id)
    authUrl.searchParams.append('redirect_uri', GOOGLE_OAUTH_CONFIG.redirect_uri)
    authUrl.searchParams.append('scope', GOOGLE_OAUTH_CONFIG.scope)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('access_type', GOOGLE_OAUTH_CONFIG.access_type)
    authUrl.searchParams.append('prompt', GOOGLE_OAUTH_CONFIG.prompt)
    authUrl.searchParams.append('include_granted_scopes', GOOGLE_OAUTH_CONFIG.include_granted_scopes)
    authUrl.searchParams.append('state', state)
    
    return NextResponse.json({
      success: true,
      auth_url: authUrl.toString(),
      state: state
    })
    
  } catch (error) {
    console.error('GMB OAuth initialization error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize OAuth flow'
    }, { status: 500 })
  }
}

/**
 * Generate secure state parameter for OAuth CSRF protection
 */
function generateSecureState(data) {
  const crypto = require('crypto')
  const payload = JSON.stringify(data)
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET_KEY)
  hmac.update(payload)
  const signature = hmac.digest('hex')
  
  return Buffer.from(JSON.stringify({
    data: payload,
    signature: signature
  })).toString('base64')
}

/**
 * Verify state parameter
 */
function verifyState(state) {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET_KEY)
    hmac.update(decoded.data)
    const expectedSignature = hmac.digest('hex')
    
    if (decoded.signature !== expectedSignature) {
      throw new Error('Invalid state signature')
    }
    
    return JSON.parse(decoded.data)
  } catch (error) {
    throw new Error('Invalid state parameter')
  }
}