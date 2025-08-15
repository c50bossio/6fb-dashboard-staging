import { NextResponse } from 'next/server'
import { authenticator } from 'otplib'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { token, password } = await request.json()
    
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    })

    if (passwordError) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, mfa_enforced')
      .eq('id', user.id)
      .single()

    if (profile?.mfa_enforced) {
      return NextResponse.json(
        { error: 'MFA cannot be disabled for your account type' },
        { status: 403 }
      )
    }

    const { data: mfaMethod, error: mfaError } = await supabase
      .from('user_mfa_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('method_type', 'totp')
      .eq('is_verified', true)
      .single()

    if (mfaError || !mfaMethod) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this user' },
        { status: 400 }
      )
    }

    const isValidToken = authenticator.verify({
      token,
      secret: mfaMethod.secret_key
    })

    if (!isValidToken) {
      const { data: backupResult } = await supabase.rpc('verify_backup_code', {
        p_user_id: user.id,
        p_code: token
      })
      
      if (!backupResult) {
        await supabase.rpc('log_security_event', {
          p_user_id: user.id,
          p_event_type: 'mfa_disable_failed',
          p_details: { reason: 'invalid_token' },
          p_risk_score: 70
        })

        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        )
      }
    }

    const { error: deleteMfaError } = await supabase
      .from('user_mfa_methods')
      .delete()
      .eq('user_id', user.id)

    if (deleteMfaError) {
      console.error('Error deleting MFA methods:', deleteMfaError)
      return NextResponse.json(
        { error: 'Failed to disable MFA' },
        { status: 500 }
      )
    }

    await supabase
      .from('profiles')
      .update({ 
        mfa_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'mfa_disabled',
      p_details: { method_type: 'totp' },
      p_risk_score: 40
    })

    return NextResponse.json({
      success: true,
      message: 'Multi-factor authentication has been disabled'
    })

  } catch (error) {
    console.error('MFA disable error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}