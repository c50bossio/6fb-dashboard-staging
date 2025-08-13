import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'

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

    // Get user's MFA methods
    const { data: mfaMethods, error: mfaError } = await supabase
      .from('user_mfa_methods')
      .select('*')
      .eq('user_id', user.id)

    if (mfaError) {
      console.error('Error fetching MFA methods:', mfaError)
      return NextResponse.json(
        { error: 'Failed to check MFA status' },
        { status: 500 }
      )
    }

    // Get user profile for role-based requirements
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, mfa_enabled, mfa_enforced')
      .eq('id', user.id)
      .single()

    // Check if MFA is required for this user's role
    const { data: mfaRequired } = await supabase.rpc('mfa_required_for_user', {
      p_user_id: user.id
    })

    // Process MFA methods
    const activeMethods = mfaMethods?.filter(method => method.is_verified) || []
    const totpMethod = activeMethods.find(method => method.method_type === 'totp')
    const backupCodesMethod = activeMethods.find(method => method.method_type === 'backup_codes')

    // Get recent security events
    const { data: recentEvents } = await supabase
      .from('security_events')
      .select('event_type, created_at, event_details')
      .eq('user_id', user.id)
      .in('event_type', ['mfa_setup_completed', 'mfa_disabled', 'mfa_verify_success', 'mfa_verify_failed'])
      .order('created_at', { ascending: false })
      .limit(5)

    const response = {
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'CLIENT'
      },
      mfa: {
        enabled: profile?.mfa_enabled || false,
        required: mfaRequired || false,
        enforced: profile?.mfa_enforced || false,
        methods: {
          totp: {
            enabled: !!totpMethod,
            verified: totpMethod?.is_verified || false,
            isPrimary: totpMethod?.is_primary || false,
            setupDate: totpMethod?.created_at || null
          },
          backupCodes: {
            enabled: !!backupCodesMethod,
            remaining: backupCodesMethod?.backup_codes?.length || 0,
            lastGenerated: backupCodesMethod?.updated_at || null
          }
        },
        totalActiveMethods: activeMethods.length
      },
      security: {
        recentEvents: recentEvents || [],
        lastMfaActivity: recentEvents?.[0]?.created_at || null
      },
      recommendations: []
    }

    // Add recommendations based on status
    if (!response.mfa.enabled && response.mfa.required) {
      response.recommendations.push({
        type: 'warning',
        message: 'Multi-factor authentication is required for your account type.',
        action: 'Enable MFA immediately for security compliance.'
      })
    } else if (!response.mfa.enabled) {
      response.recommendations.push({
        type: 'info',
        message: 'Enhance your account security by enabling multi-factor authentication.',
        action: 'Consider setting up MFA for better protection.'
      })
    }

    if (response.mfa.enabled && response.mfa.methods.backupCodes.remaining < 3) {
      response.recommendations.push({
        type: 'warning',
        message: `You have ${response.mfa.methods.backupCodes.remaining} backup codes remaining.`,
        action: 'Generate new backup codes to ensure account recovery options.'
      })
    }

    // Check for suspicious activity
    const failedAttempts = recentEvents?.filter(event => 
      event.event_type === 'mfa_verify_failed' && 
      new Date(event.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    ) || []

    if (failedAttempts.length > 3) {
      response.recommendations.push({
        type: 'alert',
        message: `${failedAttempts.length} failed MFA attempts detected in the last 24 hours.`,
        action: 'Review your account security and consider changing your password.'
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('MFA status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}