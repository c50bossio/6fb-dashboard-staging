/**
 * UNIFIED AUTHENTICATION HANDLER
 * Consolidates 22+ auth endpoints into a single, maintainable system
 * 
 * Endpoints:
 * GET  /api/auth/callback/[provider] - OAuth callback
 * GET  /api/auth/session - Current session
 * GET  /api/auth/user - Current user profile  
 * GET  /api/auth/health - Auth system health
 * POST /api/auth/login - Email/password login
 * POST /api/auth/signup - User registration
 * POST /api/auth/logout - Session termination
 * POST /api/auth/refresh - Refresh session
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['CLIENT', 'BARBER', 'SHOP_OWNER']).optional().default('CLIENT')
})

// Rate limiting (simple in-memory - use Redis in production)
const rateLimitMap = new Map()

function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, [])
  }
  
  const requests = rateLimitMap.get(identifier)
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart)
  
  if (validRequests.length >= maxRequests) {
    return false // Rate limited
  }
  
  validRequests.push(now)
  rateLimitMap.set(identifier, validRequests)
  return true
}

// Create Supabase client with proper cookie handling
function createSupabaseClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Enhanced cookie configuration for session persistence
              const isSessionCookie = name.includes('auth-token') || name.includes('sb-')
              
              const enhancedOptions = {
                name,
                value,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false, // Required for client-side Supabase access
                maxAge: isSessionCookie ? 60 * 60 * 24 * 7 : (options?.maxAge || 60 * 60), // 7 days for session cookies
                ...options
              }
              
              console.log(`🍪 Setting cookie [${name}] (session: ${isSessionCookie})`)
              cookieStore.set(enhancedOptions)
            })
          } catch (error) {
            console.error('🚨 Cookie setting error:', error)
          }
        },
      },
    }
  )
}

// OAuth Callback Handler  
async function handleOAuthCallback(request, provider = 'google') {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const error = requestUrl.searchParams.get('error')

  console.log(`🔄 OAuth callback [${provider}]:`, {
    code: code ? 'present' : 'missing',
    next,
    error
  })

  if (error) {
    console.error(`❌ OAuth error [${provider}]:`, error)
    return NextResponse.redirect(
      new URL(`/login?error=oauth_${error}`, requestUrl.origin)
    )
  }

  if (!code) {
    console.error(`❌ OAuth callback [${provider}] - No authorization code`)
    return NextResponse.redirect(
      new URL('/login?error=no_auth_code', requestUrl.origin)
    )
  }

  try {
    const supabase = createSupabaseClient()
    
    // Exchange code for session
    console.log(`🔄 Exchanging OAuth code for session [${provider}]...`)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error(`❌ OAuth session exchange error [${provider}]:`, exchangeError)
      return NextResponse.redirect(
        new URL('/login?error=session_exchange_failed', requestUrl.origin)
      )
    }

    if (!data.user) {
      console.error(`❌ OAuth callback [${provider}] - No user data`)
      return NextResponse.redirect(
        new URL('/login?error=no_user_data', requestUrl.origin)
      )
    }

    console.log(`✅ OAuth success [${provider}]:`, {
      userId: data.user.id,
      email: data.user.email
    })

    // Verify session was properly established
    console.log(`🔍 Verifying session establishment [${provider}]...`)
    const { data: { session: verifySession }, error: sessionVerifyError } = await supabase.auth.getSession()
    
    if (sessionVerifyError || !verifySession) {
      console.error(`❌ Session verification failed [${provider}]:`, sessionVerifyError)
      return NextResponse.redirect(
        new URL('/login?error=session_verification_failed', requestUrl.origin)
      )
    }
    
    console.log(`✅ Session verified [${provider}]:`, {
      sessionId: verifySession.access_token ? 'present' : 'missing',
      expiresAt: verifySession.expires_at ? new Date(verifySession.expires_at * 1000).toISOString() : 'none'
    })

    // Ensure user profile exists
    await ensureUserProfile(supabase, data.user)

    console.log(`🎯 Redirecting to dashboard [${provider}]: ${next}`)
    
    // Redirect to intended destination
    return NextResponse.redirect(new URL(next, requestUrl.origin))

  } catch (error) {
    console.error(`❌ OAuth callback error [${provider}]:`, error)
    return NextResponse.redirect(
      new URL('/login?error=oauth_callback_failed', requestUrl.origin)
    )
  }
}

// Session Management
async function getCurrentSession(request) {
  try {
    const supabase = createSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({ 
      session,
      user: session?.user || null 
    })

  } catch (error) {
    console.error('Session retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' }, 
      { status: 500 }
    )
  }
}

// User Profile Management
async function getCurrentUser(request) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get full profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ user }, { status: 200 }) // Return basic auth user
    }

    return NextResponse.json({ 
      user: {
        ...user,
        profile
      }
    })

  } catch (error) {
    console.error('User retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve user' }, 
      { status: 500 }
    )
  }
}

// Login Handler
async function handleLogin(request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
  
  // Rate limiting
  if (!checkRateLimit(`login_${clientIp}`, 5, 300000)) { // 5 attempts per 5 minutes
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const supabase = createSupabaseClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Login error:', error.message)
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }

    // Ensure profile exists
    await ensureUserProfile(supabase, data.user)

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login handler error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

// Signup Handler
async function handleSignup(request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
  
  // Rate limiting
  if (!checkRateLimit(`signup_${clientIp}`, 3, 600000)) { // 3 attempts per 10 minutes
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email, password, full_name, role } = signupSchema.parse(body)

    const supabase = createSupabaseClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role
        }
      }
    })

    if (error) {
      console.error('Signup error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
      message: data.user?.email_confirmed_at ? 
        'Account created successfully' : 
        'Please check your email to confirm your account'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Signup handler error:', error)
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}

// Logout Handler
async function handleLogout(request) {
  try {
    const supabase = createSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Logout handler error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}

// Session Refresh Handler
async function refreshSession(request) {
  try {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('Session refresh error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      session: data.session,
      user: data.user
    })

  } catch (error) {
    console.error('Refresh handler error:', error)
    return NextResponse.json(
      { error: 'Session refresh failed' },
      { status: 500 }
    )
  }
}

// Health Check
async function getAuthHealth(request) {
  try {
    const supabase = createSupabaseClient()
    
    // Test basic connectivity
    const { error } = await supabase.from('profiles').select('count').limit(1)
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database_connection: error ? 'error' : 'ok',
      environment: process.env.NODE_ENV || 'development'
    })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}

// Utility: Ensure user profile exists in profiles table
async function ensureUserProfile(supabase, user) {
  if (!user) return null

  try {
    console.log('🔍 Ensuring profile for user:', user.id, user.email)
    
    // Check if profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Profile select error:', selectError)
      // Don't return here - try to create the profile anyway
    }

    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile.id)
      return existingProfile
    }

    // Extract user metadata from OAuth provider
    const metadata = user.user_metadata || {}
    const appMetadata = user.app_metadata || {}
    
    // Determine full name from various sources
    const fullName = metadata.full_name || 
                    metadata.name || 
                    `${metadata.given_name || ''} ${metadata.family_name || ''}`.trim() ||
                    user.email?.split('@')[0] || 
                    'User'

    // Create comprehensive profile with all fields
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: fullName,
      role: metadata.role || 'CLIENT',
      avatar_url: metadata.avatar_url || metadata.picture || null,
      phone: metadata.phone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Subscription fields with defaults
      subscription_tier: 'individual',
      subscription_status: 'active',
      trial_end_date: null,
      
      // Shop association fields (will be set during onboarding)
      shop_id: null,
      barbershop_id: null,
      
      // Onboarding tracking
      onboarding_completed: false,
      onboarding_step: 'welcome',
      
      // OAuth provider info
      oauth_provider: appMetadata.provider || 'email',
      last_sign_in_at: user.last_sign_in_at || new Date().toISOString()
    }

    console.log('📝 Creating profile with data:', {
      id: profileData.id,
      email: profileData.email,
      full_name: profileData.full_name,
      role: profileData.role,
      oauth_provider: profileData.oauth_provider
    })

    // Use upsert to handle any race conditions
    const { data: newProfile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (upsertError) {
      console.error('❌ Profile upsert error:', upsertError)
      console.error('Error details:', {
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint
      })
      
      // Try a simpler insert as fallback
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: 'CLIENT'
        })
        .select()
        .single()
        
      if (fallbackError) {
        console.error('❌ Fallback profile creation also failed:', fallbackError)
        return null
      }
      
      console.log('✅ Profile created via fallback:', fallbackProfile.id)
      return fallbackProfile
    }

    console.log('✅ Profile created successfully:', newProfile.id)
    return newProfile
    
  } catch (error) {
    console.error('❌ Profile ensure error:', error)
    return null
  }
}

// Main Route Handlers
export async function GET(request, { params }) {
  try {
    const { auth } = params

    if (!auth || auth.length === 0) {
      return NextResponse.json({ error: 'Missing auth operation' }, { status: 400 })
    }

    switch (auth[0]) {
      case 'callback':
        return handleOAuthCallback(request, auth[1])
      case 'session':
        return getCurrentSession(request)
      case 'user':
        return getCurrentUser(request)
      case 'health':
        return getAuthHealth(request)
      default:
        return NextResponse.json({ error: 'Unknown auth operation' }, { status: 404 })
    }

  } catch (error) {
    console.error('Auth GET handler error:', error)
    return NextResponse.json(
      { error: 'Authentication request failed' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const { auth } = params

    if (!auth || auth.length === 0) {
      return NextResponse.json({ error: 'Missing auth operation' }, { status: 400 })
    }

    switch (auth[0]) {
      case 'login':
        return handleLogin(request)
      case 'signup':
        return handleSignup(request)
      case 'logout':
        return handleLogout(request)
      case 'refresh':
        return refreshSession(request)
      default:
        return NextResponse.json({ error: 'Unknown auth operation' }, { status: 404 })
    }

  } catch (error) {
    console.error('Auth POST handler error:', error)
    return NextResponse.json(
      { error: 'Authentication request failed' },
      { status: 500 }
    )
  }
}