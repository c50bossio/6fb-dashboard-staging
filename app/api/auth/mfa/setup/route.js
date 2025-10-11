import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret()

    // Create OTP Auth URL for QR code
    const otpauthUrl = authenticator.keyuri(
      user.email,
      '6FB Barbershop',
      secret
    )

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl)

    // Store the secret temporarily in user metadata (will be confirmed after verification)
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        mfa_secret_pending: secret,
        mfa_setup_started_at: new Date().toISOString()
      }
    })

    if (updateError) {
      console.error('Error storing MFA secret:', updateError)
      throw new Error('Failed to initialize MFA setup')
    }

    return NextResponse.json({
      qrCodeUrl,
      manualEntryKey: secret,
      email: user.email
    })
  } catch (error) {
    console.error('MFA Setup API Error:', error)
    return NextResponse.json(
      { error: 'Failed to setup MFA', message: error.message },
      { status: 500 }
    )
  }
}
