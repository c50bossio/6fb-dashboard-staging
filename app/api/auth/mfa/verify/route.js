import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'

export async function POST(request) {
  try {
    const { token, isSetup = false } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    const { data: rateLimitCheck } = await supabase.rpc('check_mfa_rate_limit', {
      p_user_id: user.id
    })

    if (!rateLimitCheck) {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'mfa_rate_limit_exceeded',
        p_risk_score: 80
      })
      
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { data: mfaMethod, error: mfaError } = await supabase
      .from('user_mfa_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('method_type', 'totp')
      .single()

    if (mfaError || !mfaMethod) {
      return NextResponse.json(
        { error: 'MFA not set up for this user' },
        { status: 400 }
      )
    }

    let isValidToken = false
    let isBackupCode = false

    if (mfaMethod.secret_key) {
      isValidToken = authenticator.verify({
        token,
        secret: mfaMethod.secret_key
      })
    }

    if (!isValidToken && mfaMethod.is_verified) {
      const { data: backupResult } = await supabase.rpc('verify_backup_code', {
        p_user_id: user.id,
        p_code: token
      })
      
      if (backupResult) {
        isValidToken = true
        isBackupCode = true
      }
    }

    await supabase
      .from('mfa_verification_attempts')
      .insert({
        user_id: user.id,
        method_id: mfaMethod.id,
        attempt_code: token.substring(0, 2) + '****', // Partial code for logging
        success: isValidToken
      })

    if (!isValidToken) {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'mfa_verify_failed',
        p_details: { method_type: 'totp', is_setup: isSetup },
        p_risk_score: 60
      })

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    let backupCodes = null
    if (isSetup && !mfaMethod.is_verified) {
      await supabase
        .from('user_mfa_methods')
        .update({ 
          is_verified: true,
          is_primary: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', mfaMethod.id)

      const { data: generatedCodes } = await supabase.rpc('generate_backup_codes', {
        p_user_id: user.id
      })
      
      backupCodes = generatedCodes

      await supabase
        .from('profiles')
        .update({ 
          mfa_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'mfa_setup_completed',
        p_details: { method_type: 'totp' }
      })
    } else {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'mfa_verify_success',
        p_details: { 
          method_type: isBackupCode ? 'backup_code' : 'totp',
          is_backup_code: isBackupCode
        }
      })
    }

    const response = {
      success: true,
      message: isSetup ? 'MFA has been successfully enabled' : 'Verification successful',
      isSetupComplete: isSetup,
      backupCodes: backupCodes,
      usedBackupCode: isBackupCode
    }

    if (isBackupCode) {
      response.warning = 'You used a backup code. Consider regenerating backup codes for security.'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('MFA verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}