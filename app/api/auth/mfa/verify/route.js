import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * Generate backup codes for MFA recovery
 * @param {number} count - Number of backup codes to generate
 * @returns {string[]} Array of backup codes
 */
function generateBackupCodes(count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }
  return codes
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { token, isSetup } = body

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the pending MFA secret from user metadata
    const { data: userData } = await supabase.auth.getUser()
    const secret = userData.user?.user_metadata?.mfa_secret_pending

    if (!secret && isSetup) {
      return NextResponse.json(
        { error: 'MFA setup not initialized. Please start setup first.' },
        { status: 400 }
      )
    }

    // Verify the TOTP token
    const isValid = authenticator.verify({
      token,
      secret
    })

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      )
    }

    // If this is initial setup, confirm and enable MFA
    if (isSetup) {
      // Generate backup codes
      const backupCodes = generateBackupCodes(10)

      // Hash backup codes for storage
      const hashedBackupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
      )

      // Move secret from pending to active and store backup codes
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          mfa_enabled: true,
          mfa_secret: secret,
          mfa_secret_pending: null,
          mfa_backup_codes: hashedBackupCodes,
          mfa_enabled_at: new Date().toISOString()
        }
      })

      if (updateError) {
        console.error('Error enabling MFA:', updateError)
        throw new Error('Failed to enable MFA')
      }

      return NextResponse.json({
        success: true,
        message: 'MFA has been successfully enabled',
        backupCodes
      })
    }

    // For login verification (not setup)
    return NextResponse.json({
      success: true,
      message: 'Code verified successfully'
    })
  } catch (error) {
    console.error('MFA Verify API Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify MFA code', message: error.message },
      { status: 500 }
    )
  }
}
