import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'
// Simple console-based logging to prevent circular dependencies during auth initialization
const authLogger = {
  error: (...args) => console.error('[AUTH]', ...args),
  warn: (...args) => console.warn('[AUTH]', ...args), 
  info: (...args) => console.info('[AUTH]', ...args)
}

const dbLogger = {
  error: (...args) => console.error('[DB]', ...args),
  warn: (...args) => console.warn('[DB]', ...args),
  info: (...args) => console.info('[DB]', ...args)
}
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const includeProfile = searchParams.get('profile') === 'true'
  const validateConsistency = searchParams.get('validate') === 'true'
  const includeTokens = searchParams.get('tokens') === 'true'
  
  // Use the enhanced server client with proper cookie handling
  const supabase = await createServerSupabaseClient()
  
  try {
    
    // Enhanced session retrieval with multiple checks
    const { data: { session }, error } = await supabase.auth.getSession()
    const timestamp = new Date().toISOString()
    
    if (error) {
      authLogger.error('Session retrieval error', error, {
        context: 'session_api_get',
        endpoint: 'GET /api/auth/session',
        include_profile: includeProfile,
        validate_consistency: validateConsistency
      })
      return NextResponse.json({ 
        authenticated: false, 
        error: error.message,
        timestamp,
        source: 'session_retrieval'
      })
    }
    
    if (session?.user) {
      
      const responseData = {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata,
          email_confirmed: session.user.email_confirmed_at !== null,
          phone_confirmed: session.user.phone_confirmed_at !== null,
          last_sign_in: session.user.last_sign_in_at
        },
        session: {
          access_token: !!session.access_token,
          refresh_token: !!session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_at ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000)) : null
        },
        timestamp,
        source: 'valid_session'
      }

      // Include full session data with tokens if requested (for session sync)
      if (includeTokens) {
        authLogger.info('Including full session tokens for sync', {
          context: 'session_token_sync',
          user_id: session.user.id
        })
        responseData.session_data = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type || 'bearer',
          user: session.user
        }
      }
      
      // Include profile data if requested
      if (includeProfile) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            dbLogger.warn('Profile fetch error in session API', profileError, {
              context: 'session_profile_fetch',
              user_id: session.user.id
            })
            responseData.profile_error = profileError.message
          } else if (profile) {
            responseData.profile = profile
          }
        } catch (profileErr) {
          dbLogger.error('Profile fetch exception in session API', profileErr, {
            context: 'session_profile_exception',
            user_id: session.user.id
          })
          responseData.profile_error = profileErr.message
        }
      }
      
      // Perform consistency validation if requested
      if (validateConsistency) {
        try {
          
          // Check if user exists in auth.users
          const { data: authUser, error: authError } = await supabase.auth.getUser()
          
          responseData.consistency_check = {
            auth_user_exists: !authError && !!authUser?.user,
            session_user_match: !authError && authUser?.user?.id === session.user.id,
            timestamp: new Date().toISOString()
          }
          
          if (authError) {
            authLogger.warn('Auth user check error in consistency validation', authError, {
              context: 'session_consistency_check',
              user_id: session.user.id
            })
            responseData.consistency_check.auth_error = authError.message
          }
        } catch (consistencyErr) {
          authLogger.error('Consistency check failed in session API', consistencyErr, {
            context: 'session_consistency_exception',
            user_id: session.user.id
          })
          responseData.consistency_check = {
            error: consistencyErr.message,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      return NextResponse.json(responseData)
    }
    
    return NextResponse.json({ 
      authenticated: false,
      message: 'No active session',
      timestamp,
      source: 'no_session'
    })
    
  } catch (err) {
    authLogger.error('Unexpected error in session API', err, {
      context: 'session_api_exception',
      endpoint: 'GET /api/auth/session',
      include_profile: includeProfile,
      validate_consistency: validateConsistency
    })
    return NextResponse.json({ 
      authenticated: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      source: 'exception'
    }, { status: 500 })
  }
}

// Add POST endpoint for session recovery operations
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body
    
    // Use the enhanced server client with proper cookie handling
    const supabase = await createServerSupabaseClient()
    
    switch (action) {
      case 'refresh':
        const { data, error } = await supabase.auth.refreshSession()
        
        if (error) {
          return NextResponse.json({
            success: false,
            error: error.message,
            action: 'refresh'
          })
        }
        
        return NextResponse.json({
          success: true,
          session: {
            user: data.session?.user,
            expires_at: data.session?.expires_at
          },
          action: 'refresh'
        })
      
      case 'validate':
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        return NextResponse.json({
          success: !sessionError,
          authenticated: !!session?.user,
          error: sessionError?.message,
          action: 'validate'
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          validActions: ['refresh', 'validate']
        }, { status: 400 })
    }
    
  } catch (err) {
    authLogger.error('Unexpected error in session API POST', err, {
      context: 'session_api_post_exception',
      endpoint: 'POST /api/auth/session',
      action: body?.action
    })
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 })
  }
}