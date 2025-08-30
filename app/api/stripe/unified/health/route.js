import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/**
 * GET /api/stripe/unified/health
 * 
 * Comprehensive health check for all Stripe systems
 * Validates connectivity and status across Connect, Terminal, and Financial systems
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barberbarberbarbershopId = searchParams.get('barberbarberbarbershop_id')

    if (!barberbarberbarbershopId) {
      return NextResponse.json(
        { error: 'barberbarberbarbershop_id is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Perform comprehensive health check
    const healthCheck = await performComprehensiveHealthCheck(supabase, barberbarberbarbershopId)

    return NextResponse.json({
      success: true,
      barberbarberbarbershop_id: barberbarberbarbershopId,
      overall_health: healthCheck.overall_health,
      status: healthCheck.status,
      checks: healthCheck.checks,
      recommendations: healthCheck.recommendations,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error performing health check:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Health check failed',
        overall_health: 'unhealthy'
      },
      { status: 500 }
    )
  }
}

/**
 * Perform comprehensive health check across all Stripe systems
 */
async function performComprehensiveHealthCheck(supabase, barberbarberbarbershopId) {
  const checks = {
    database_connectivity: { status: 'unknown', details: null },
    connect_account: { status: 'unknown', details: null },
    stripe_api: { status: 'unknown', details: null },
    terminal_setup: { status: 'unknown', details: null },
    financial_integration: { status: 'unknown', details: null }
  }

  const recommendations = []
  let overallHealth = 'healthy'

  try {
    // 1. Database connectivity check
    const { data: barbershop, error: dbError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('id', barberbarberbarbershopId)
      .single()

    if (dbError || !barbershop) {
      checks.database_connectivity.status = 'unhealthy'
      checks.database_connectivity.details = 'Cannot access barbershop data'
      overallHealth = 'unhealthy'
    } else {
      checks.database_connectivity.status = 'healthy'
      checks.database_connectivity.details = 'Database accessible'
    }

    // 2. Connect account check
    const { data: connectAccount, error: connectError } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('barberbarberbarbershop_id', barberbarberbarbershopId)
      .single()

    if (connectError || !connectAccount) {
      checks.connect_account.status = 'not_configured'
      checks.connect_account.details = 'No Connect account found'
      recommendations.push('Create Stripe Connect account to accept payments')
    } else {
      // Verify account with Stripe API
      try {
        const stripeAccount = await stripe.accounts.retrieve(connectAccount.stripe_account_id)
        
        const accountHealth = {
          exists: true,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          requirements_count: stripeAccount.requirements?.currently_due?.length || 0
        }

        if (accountHealth.charges_enabled && accountHealth.payouts_enabled) {
          checks.connect_account.status = 'healthy'
          checks.connect_account.details = 'Connect account fully functional'
        } else if (accountHealth.details_submitted) {
          checks.connect_account.status = 'pending'
          checks.connect_account.details = 'Account under review by Stripe'
          if (overallHealth === 'healthy') overallHealth = 'pending'
        } else {
          checks.connect_account.status = 'needs_attention'
          checks.connect_account.details = 'Onboarding incomplete'
          recommendations.push('Complete Stripe Connect onboarding')
          if (overallHealth === 'healthy') overallHealth = 'needs_attention'
        }

        if (accountHealth.requirements_count > 0) {
          recommendations.push(`Address ${accountHealth.requirements_count} outstanding requirements`)
        }

      } catch (stripeError) {
        checks.connect_account.status = 'unhealthy'
        checks.connect_account.details = `Stripe API error: ${stripeError.message}`
        overallHealth = 'unhealthy'
      }
    }

    // 3. Stripe API connectivity check
    try {
      await stripe.products.list({ limit: 1 })
      checks.stripe_api.status = 'healthy'
      checks.stripe_api.details = 'Stripe API accessible'
    } catch (apiError) {
      checks.stripe_api.status = 'unhealthy'
      checks.stripe_api.details = `API error: ${apiError.message}`
      overallHealth = 'unhealthy'
    }

    // 4. Terminal setup check
    const { data: terminalConfig } = await supabase
      .from('stripe_terminal_config')
      .select('*')
      .eq('barberbarberbarbershop_id', barberbarberbarbershopId)
      .single()

    if (!terminalConfig) {
      checks.terminal_setup.status = 'not_configured'
      checks.terminal_setup.details = 'Terminal not configured'
      if (connectAccount?.charges_enabled) {
        recommendations.push('Configure Stripe Terminal for in-person payments')
      }
    } else {
      if (terminalConfig.terminal_configured && terminalConfig.location_id) {
        checks.terminal_setup.status = 'healthy'
        checks.terminal_setup.details = 'Terminal fully configured'
      } else {
        checks.terminal_setup.status = 'partial'
        checks.terminal_setup.details = 'Terminal partially configured'
        recommendations.push('Complete Terminal setup')
        if (overallHealth === 'healthy') overallHealth = 'needs_attention'
      }
    }

    // 5. Financial integration check
    const { data: financialArrangements } = await supabase
      .from('financial_arrangements')
      .select('*')
      .eq('barberbarberbarbershop_id', barberbarberbarbershopId)
      .not('stripe_account_id', 'is', null)

    if (!financialArrangements || financialArrangements.length === 0) {
      checks.financial_integration.status = 'not_configured'
      checks.financial_integration.details = 'No financial arrangements with Stripe'
      if (connectAccount?.payouts_enabled) {
        recommendations.push('Configure automatic payment splits')
      }
    } else {
      checks.financial_integration.status = 'healthy'
      checks.financial_integration.details = `${financialArrangements.length} arrangements configured`
    }

  } catch (error) {
    console.error('Error in health check:', error)
    overallHealth = 'unhealthy'
  }

  // Calculate unified status based on health check
  const status = await calculateStatusFromHealth(checks, connectAccount)

  return {
    overall_health: overallHealth,
    status: status,
    checks: checks,
    recommendations: recommendations
  }
}

/**
 * Calculate unified status from health check results
 */
async function calculateStatusFromHealth(checks, connectAccount) {
  const status = {
    overall_status: 'unknown',
    connect_account: {
      exists: checks.connect_account.status !== 'not_configured',
      account_id: connectAccount?.stripe_account_id || null,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      onboarding_completed: false
    },
    terminal_setup: {
      configured: checks.terminal_setup.status === 'healthy',
      location_id: null,
      reader_configured: false,
      test_mode: true
    },
    financial_integration: {
      arrangements_with_stripe: 0,
      split_payments_enabled: checks.financial_integration.status === 'healthy',
      commission_automation: checks.financial_integration.status === 'healthy'
    },
    capabilities: {
      online_payments: checks.connect_account.status === 'healthy',
      in_person_payments: checks.connect_account.status === 'healthy' && 
                         checks.terminal_setup.status === 'healthy',
      automatic_splits: checks.financial_integration.status === 'healthy',
      direct_payouts: checks.connect_account.status === 'healthy'
    },
    last_updated: new Date().toISOString()
  }

  // Determine overall status
  if (checks.connect_account.status === 'not_configured') {
    status.overall_status = 'not_started'
  } else if (checks.connect_account.status === 'healthy' && 
             checks.terminal_setup.status === 'healthy' &&
             checks.financial_integration.status === 'healthy') {
    status.overall_status = 'completed'
  } else if (checks.connect_account.status === 'unhealthy' ||
             checks.stripe_api.status === 'unhealthy' ||
             checks.database_connectivity.status === 'unhealthy') {
    status.overall_status = 'error'
  } else {
    status.overall_status = 'in_progress'
  }

  return status
}