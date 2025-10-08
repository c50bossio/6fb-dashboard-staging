// Diagnostic endpoint to test Supabase auth connectivity
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env_check: {},
    api_connectivity: {},
    cookie_check: {},
    session_check: {}
  }

  try {
    // 1. Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    diagnostics.env_check = {
      has_url: !!supabaseUrl,
      has_anon_key: !!supabaseAnonKey,
      has_service_key: !!serviceRoleKey,
      url_format: supabaseUrl?.startsWith('https://') && supabaseUrl?.includes('.supabase.co')
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      diagnostics.error = 'Missing environment variables'
      return Response.json(diagnostics, { status: 500 })
    }

    // 2. Check API connectivity
    const healthCheck = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey }
    })

    diagnostics.api_connectivity = {
      health_status: healthCheck.status,
      health_ok: healthCheck.ok,
      response_time: healthCheck.headers.get('x-response-time') || 'N/A'
    }

    // 3. Check cookies
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'))

    diagnostics.cookie_check = {
      total_cookies: allCookies.length,
      supabase_cookies: supabaseCookies.length,
      cookie_names: supabaseCookies.map(c => c.name)
    }

    // 4. Try to get user session server-side
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    try {
      const { data, error } = await supabase.auth.getUser()
      diagnostics.session_check = {
        has_user: !!data?.user,
        user_id: data?.user?.id,
        error: error?.message
      }
    } catch (err) {
      diagnostics.session_check = {
        error: err.message,
        type: 'exception'
      }
    }

    return Response.json(diagnostics)

  } catch (error) {
    diagnostics.error = error.message
    return Response.json(diagnostics, { status: 500 })
  }
}
