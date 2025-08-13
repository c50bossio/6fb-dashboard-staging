import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
export const runtime = 'edge'

export async function POST(request) {
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

    // Check if user already has TOTP setup
    const { data: existingMFA } = await supabase
      .from('user_mfa_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('method_type', 'totp')
      .single()

    if (existingMFA && existingMFA.is_verified) {
      return NextResponse.json(
        { error: 'MFA already enabled for this user' },
        { status: 400 }
      )
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret()
    const userEmail = user.email
    const serviceName = '6FB AI Agent System'
    
    // Create TOTP URI for QR code
    const otpauthUrl = authenticator.keyuri(userEmail, serviceName, secret)
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    // Store or update MFA method (unverified initially)
    const { data: mfaMethod, error: mfaError } = await supabase
      .from('user_mfa_methods')
      .upsert({
        user_id: user.id,
        method_type: 'totp',
        secret_key: secret, // In production, encrypt this
        is_verified: false
      }, {
        onConflict: 'user_id,method_type'
      })
      .select()
      .single()

    if (mfaError) {
      console.error('MFA setup error:', mfaError)
      return NextResponse.json(
        { error: 'Failed to setup MFA' },
        { status: 500 }
      )
    }

    // Log security event
    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'mfa_setup_initiated',
      p_details: { method_type: 'totp' }
    })

    return NextResponse.json({
      secret,
      qrCodeUrl: qrCodeDataUrl,
      manualEntryKey: secret,
      backupCodes: null, // Generated after verification
      message: 'Scan the QR code with your authenticator app'
    })

  } catch (error) {
    console.error('MFA setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}