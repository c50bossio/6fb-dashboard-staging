import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'

export async function POST(request) {
  try {
    const { token, regenerate = false } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has MFA enabled
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

    // Verify the MFA token
    const isValidToken = authenticator.verify({
      token,
      secret: mfaMethod.secret_key
    })

    if (!isValidToken) {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'backup_codes_access_failed',
        p_details: { action: regenerate ? 'regenerate' : 'view' },
        p_risk_score: 50
      })

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    let backupCodes = null

    if (regenerate) {
      // Generate new backup codes
      const { data: generatedCodes, error: generateError } = await supabase
        .rpc('generate_backup_codes', {
          p_user_id: user.id
        })

      if (generateError) {
        console.error('Error generating backup codes:', generateError)
        return NextResponse.json(
          { error: 'Failed to generate backup codes' },
          { status: 500 }
        )
      }

      backupCodes = generatedCodes

      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'backup_codes_regenerated',
        p_details: { codes_count: generatedCodes?.length || 0 }
      })

    } else {
      // Get existing backup codes method
      const { data: backupMethod } = await supabase
        .from('user_mfa_methods')
        .select('backup_codes')
        .eq('user_id', user.id)
        .eq('method_type', 'backup_codes')
        .single()

      if (backupMethod?.backup_codes) {
        // Return count of remaining codes (not the actual codes for security)
        return NextResponse.json({
          success: true,
          remainingCodes: backupMethod.backup_codes.length,
          message: `You have ${backupMethod.backup_codes.length} backup codes remaining`
        })
      } else {
        return NextResponse.json(
          { error: 'No backup codes found' },
          { status: 404 }
        )
      }
    }

    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'backup_codes_accessed',
      p_details: { 
        action: regenerate ? 'regenerate' : 'view',
        codes_count: backupCodes?.length || 0
      }
    })

    return NextResponse.json({
      success: true,
      backupCodes: backupCodes,
      message: regenerate 
        ? 'New backup codes generated. Please save them securely.' 
        : 'Backup codes retrieved',
      warning: 'These codes can only be used once each. Store them securely and do not share them.'
    })

  } catch (error) {
    console.error('Backup codes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check backup codes status
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get backup codes method
    const { data: backupMethod } = await supabase
      .from('user_mfa_methods')
      .select('backup_codes, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('method_type', 'backup_codes')
      .single()

    if (!backupMethod) {
      return NextResponse.json({
        hasBackupCodes: false,
        remainingCodes: 0
      })
    }

    return NextResponse.json({
      hasBackupCodes: true,
      remainingCodes: backupMethod.backup_codes?.length || 0,
      lastGenerated: backupMethod.updated_at,
      createdAt: backupMethod.created_at
    })

  } catch (error) {
    console.error('Backup codes status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}