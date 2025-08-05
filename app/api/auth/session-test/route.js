import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('test') === 'true'
    
    const supabase = createClient()
    
    // Test current session
    const sessionTest = {
      timestamp: new Date().toISOString(),
      tests: {},
      session_info: null
    }

    // Test 1: Get current session
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      sessionTest.tests.session_retrieval = {
        status: sessionError ? 'failed' : 'passed',
        error: sessionError?.message,
        has_session: !!session,
        user_id: session?.user?.id,
        expires_at: session?.expires_at
      }
      
      if (session) {
        sessionTest.session_info = {
          user_id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
          expires_at: session.expires_at,
          token_type: session.token_type,
          provider_token: !!session.provider_token,
          refresh_token: !!session.refresh_token
        }
      }
      
    } catch (error) {
      sessionTest.tests.session_retrieval = {
        status: 'error',
        error: error.message
      }
    }

    // Test 2: Get user profile if session exists
    if (sessionTest.session_info?.user_id) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionTest.session_info.user_id)
          .single()
        
        sessionTest.tests.profile_retrieval = {
          status: profileError ? 'failed' : 'passed',
          error: profileError?.message,
          has_profile: !!profile,
          profile_data: profile ? {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            shop_name: profile.shop_name,
            subscription_status: profile.subscription_status,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          } : null
        }
        
      } catch (error) {
        sessionTest.tests.profile_retrieval = {
          status: 'error',
          error: error.message
        }
      }
    } else {
      sessionTest.tests.profile_retrieval = {
        status: 'skipped',
        reason: 'No active session'
      }
    }

    // Test 3: Database connectivity
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      sessionTest.tests.database_connectivity = {
        status: error ? 'failed' : 'passed',
        error: error?.message,
        can_query: !error
      }
      
    } catch (error) {
      sessionTest.tests.database_connectivity = {
        status: 'error',
        error: error.message
      }
    }

    // Test 4: Auth configuration check
    try {
      const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
      
      sessionTest.tests.auth_configuration = {
        status: (hasSupabaseUrl && hasSupabaseKey && hasServiceKey) ? 'passed' : 'failed',
        supabase_url: hasSupabaseUrl ? 'configured' : 'missing',
        anon_key: hasSupabaseKey ? 'configured' : 'missing',
        service_role_key: hasServiceKey ? 'configured' : 'missing',
        url_domain: hasSupabaseUrl ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null
      }
      
    } catch (error) {
      sessionTest.tests.auth_configuration = {
        status: 'error',
        error: error.message
      }
    }

    // Test 5: Session management capabilities
    if (testMode && sessionTest.session_info?.user_id) {
      try {
        // Test session refresh (if needed)
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        sessionTest.tests.session_management = {
          status: refreshError ? 'failed' : 'passed',
          error: refreshError?.message,
          can_refresh: !!refreshData?.session,
          new_expires_at: refreshData?.session?.expires_at
        }
        
      } catch (error) {
        sessionTest.tests.session_management = {
          status: 'error',
          error: error.message
        }
      }
    } else {
      sessionTest.tests.session_management = {
        status: 'skipped',
        reason: testMode ? 'No active session' : 'Test mode not enabled'
      }
    }

    // Calculate overall results
    const testCount = Object.keys(sessionTest.tests).length
    const passedCount = Object.values(sessionTest.tests).filter(t => t.status === 'passed').length
    const failedCount = Object.values(sessionTest.tests).filter(t => t.status === 'failed').length
    const errorCount = Object.values(sessionTest.tests).filter(t => t.status === 'error').length
    
    sessionTest.summary = {
      total_tests: testCount,
      passed: passedCount,
      failed: failedCount,
      errors: errorCount,
      skipped: testCount - passedCount - failedCount - errorCount,
      success_rate: Math.round((passedCount / testCount) * 100),
      has_active_session: !!sessionTest.session_info,
      authentication_status: sessionTest.session_info ? 'authenticated' : 'anonymous'
    }

    // Generate recommendations
    sessionTest.recommendations = generateAuthRecommendations(sessionTest)

    return NextResponse.json(sessionTest, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })

  } catch (error) {
    console.error('Session test failed:', error)
    
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 1,
        authentication_status: 'error'
      }
    }, { status: 500 })
  }
}

// Generate contextual recommendations based on test results
function generateAuthRecommendations(sessionTest) {
  const recommendations = []
  
  // Session-based recommendations
  if (!sessionTest.session_info) {
    recommendations.push('🔒 No active session - user should log in to access protected features')
    recommendations.push('🚀 Development mode: Use devBypassLogin() for testing without authentication')
  } else {
    recommendations.push('✅ User is successfully authenticated')
    
    // Check session expiry
    if (sessionTest.session_info.expires_at) {
      const expiresAt = new Date(sessionTest.session_info.expires_at * 1000)
      const now = new Date()
      const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60)
      
      if (hoursUntilExpiry < 1) {
        recommendations.push('⚠️ Session expires soon - consider implementing automatic refresh')
      } else if (hoursUntilExpiry < 24) {
        recommendations.push(`⏰ Session expires in ${Math.round(hoursUntilExpiry)} hours`)
      }
    }
  }
  
  // Configuration recommendations
  const authConfig = sessionTest.tests.auth_configuration
  if (authConfig?.status === 'failed') {
    if (authConfig.supabase_url === 'missing') {
      recommendations.push('🔑 Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    }
    if (authConfig.anon_key === 'missing') {
      recommendations.push('🔑 Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    }
    if (authConfig.service_role_key === 'missing') {
      recommendations.push('🔑 Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }
  }
  
  // Profile recommendations
  const profileTest = sessionTest.tests.profile_retrieval
  if (profileTest?.status === 'failed' && sessionTest.session_info) {
    recommendations.push('👤 User profile not found - may need to create profile after registration')
  } else if (profileTest?.profile_data) {
    const profile = profileTest.profile_data
    if (!profile.full_name) {
      recommendations.push('📝 User profile incomplete - missing full name')
    }
    if (!profile.shop_name) {
      recommendations.push('🏪 User profile incomplete - missing shop name') 
    }
  }
  
  // Database recommendations
  if (sessionTest.tests.database_connectivity?.status === 'failed') {
    recommendations.push('🗄️ Database connectivity issues - check Supabase project status')
  }
  
  return recommendations
}