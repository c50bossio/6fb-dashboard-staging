import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'
// Simple console-based logging to prevent circular dependencies during auth initialization
const authLogger = {
  error: (...args) => console.error('[AUTH]', ...args),
  warn: (...args) => console.warn('[AUTH]', ...args), 
  info: (...args) => console.info('[AUTH]', ...args)
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      authLogger.warn('Login attempt with missing credentials', null, {
        context: 'login_api',
        has_email: !!email,
        has_password: !!password
      })
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      authLogger.error('Password login failed', error, {
        context: 'login_api',
        email: email,
        supabase_error: error.message
      })
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    if (data.user) {
      authLogger.info('Password login successful', {
        user_id: data.user.id,
        email: data.user.email
      }, {
        context: 'login_api_success'
      })
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
      message: 'Login successful'
    })
  } catch (error) {
    authLogger.error('Unexpected error in login API', error, {
      context: 'login_api_exception'
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}