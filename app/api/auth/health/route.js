import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const startTime = Date.now()
    const supabase = createClient()
    
    const authHealth = {
      timestamp: new Date().toISOString(),
      system_status: 'healthy',
      components: {},
      session_info: null,
      recommendations: []
    }

    try {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
      
      authHealth.components.supabase_config = {
        status: (hasUrl && hasAnonKey && hasServiceKey) ? 'healthy' : 'degraded',
        url_configured: hasUrl,
        anon_key_configured: hasAnonKey,
        service_key_configured: hasServiceKey,
        project_url: hasUrl ? process.env.NEXT_PUBLIC_SUPABASE_URL : null
      }
      
      if (!hasUrl) authHealth.recommendations.push('🔑 Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
      if (!hasAnonKey) authHealth.recommendations.push('🔑 Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
      if (!hasServiceKey) authHealth.recommendations.push('🔑 Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      
    } catch (error) {
      authHealth.components.supabase_config = {
        status: 'error',
        error: error.message
      }
    }

    try {
      const dbStartTime = Date.now()
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      authHealth.components.database = {
        status: error ? 'unhealthy' : 'healthy',
        response_time_ms: Date.now() - dbStartTime,
        can_query: !error,
        error: error?.message
      }
      
      if (error) {
        authHealth.recommendations.push('🗄️ Database connectivity issues - check Supabase project status')
      }
      
    } catch (error) {
      authHealth.components.database = {
        status: 'error',
        error: error.message
      }
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      authHealth.components.session = {
        status: sessionError ? 'error' : 'healthy',
        has_active_session: !!session,
        error: sessionError?.message
      }
      
      if (session) {
        const expiresAt = new Date(session.expires_at * 1000)
        const now = new Date()
        const timeUntilExpiry = expiresAt - now
        const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60)
        
        authHealth.session_info = {
          user_id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider || 'email',
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
          expires_at: expiresAt.toISOString(),
          hours_until_expiry: Math.round(hoursUntilExpiry * 100) / 100,
          needs_refresh: hoursUntilExpiry < 1
        }
        
        if (hoursUntilExpiry < 0.5) {
          authHealth.recommendations.push('⚠️ Session expires very soon - automatic refresh recommended')
        } else if (hoursUntilExpiry < 2) {
          authHealth.recommendations.push('⏰ Session expires within 2 hours')
        }
      } else {
        authHealth.recommendations.push('ℹ️ No active session - user is anonymous')
      }
      
    } catch (error) {
      authHealth.components.session = {
        status: 'error',
        error: error.message
      }
    }

    if (authHealth.session_info?.user_id) {
      try {
        const profileStartTime = Date.now()
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authHealth.session_info.user_id)
          .single()
        
        authHealth.components.user_profile = {
          status: profileError ? 'degraded' : 'healthy',
          response_time_ms: Date.now() - profileStartTime,
          has_profile: !!profile,
          error: profileError?.message
        }
        
        if (profile) {
          authHealth.components.user_profile.profile_completeness = {
            has_full_name: !!profile.full_name,
            has_shop_name: !!profile.shop_name,
            has_role: !!profile.role,
            subscription_status: profile.subscription_status || 'unknown',
            completion_score: calculateProfileCompleteness(profile)
          }
          
          if (authHealth.components.user_profile.profile_completeness.completion_score < 80) {
            authHealth.recommendations.push('📝 User profile is incomplete - encourage user to complete setup')
          }
        } else {
          authHealth.recommendations.push('👤 User profile missing - may need to create after authentication')
        }
        
      } catch (error) {
        authHealth.components.user_profile = {
          status: 'error',
          error: error.message
        }
      }
    } else {
      authHealth.components.user_profile = {
        status: 'skipped',
        reason: 'No active session'
      }
    }

    try {
      const features = {
        email_auth: true,
        password_reset: true,
        email_confirmation: true,
        session_refresh: true,
        profile_updates: true,
        dev_bypass: process.env.NODE_ENV === 'development'
      }
      
      authHealth.components.auth_features = {
        status: 'healthy',
        available_features: features,
        total_features: Object.keys(features).length,
        enabled_features: Object.values(features).filter(Boolean).length
      }
      
    } catch (error) {
      authHealth.components.auth_features = {
        status: 'error',
        error: error.message
      }
    }

    try {
      const security = {
        https_required: process.env.NODE_ENV === 'production',
        cors_configured: true, // Supabase handles CORS
        rate_limiting: true,   // Supabase handles rate limiting
        jwt_validation: true   // Supabase handles JWT validation
      }
      
      authHealth.components.security = {
        status: 'healthy',
        security_features: security,
        environment: process.env.NODE_ENV,
        secure_context: process.env.NODE_ENV === 'production'
      }
      
    } catch (error) {
      authHealth.components.security = {
        status: 'error',
        error: error.message
      }
    }

    const componentStatuses = Object.values(authHealth.components).map(c => c.status)
    const hasErrors = componentStatuses.includes('error')
    const hasUnhealthy = componentStatuses.includes('unhealthy')
    const hasDegraded = componentStatuses.includes('degraded')
    
    if (hasErrors || hasUnhealthy) {
      authHealth.system_status = 'unhealthy'
    } else if (hasDegraded) {
      authHealth.system_status = 'degraded'
    } else {
      authHealth.system_status = 'healthy'
    }

    if (authHealth.system_status === 'healthy') {
      authHealth.recommendations.unshift('✅ Authentication system is fully operational')
    }
    
    if (process.env.NODE_ENV === 'development') {
      authHealth.recommendations.push('🚧 Development mode active - dev bypass authentication available')
    }

    authHealth.performance = {
      total_response_time_ms: Date.now() - startTime,
      database_response_time_ms: authHealth.components.database?.response_time_ms || 0,
      profile_response_time_ms: authHealth.components.user_profile?.response_time_ms || 0
    }

    const httpStatus = authHealth.system_status === 'unhealthy' ? 503 : 
                      authHealth.system_status === 'degraded' ? 206 : 200

    return NextResponse.json(authHealth, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })

  } catch (error) {
    console.error('Authentication health check failed:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      system_status: 'error',
      error: error.message,
      components: {},
      recommendations: [
        '❌ Authentication system health check failed',
        '🔧 Check system configuration and try again'
      ]
    }, { status: 503 })
  }
}

function calculateProfileCompleteness(profile) {
  const fields = [
    'full_name',
    'shop_name', 
    'email',
    'role',
    'subscription_status'
  ]
  
  const completedFields = fields.filter(field => {
    const value = profile[field]
    return value && value.toString().trim().length > 0
  }).length
  
  return Math.round((completedFields / fields.length) * 100)
}