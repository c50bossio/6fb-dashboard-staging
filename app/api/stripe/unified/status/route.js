import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkBarbershopAccess } from '../../../../../lib/tenant-resolver.js'

/**
 * GET /api/stripe/unified/status
 * 
 * Unified endpoint for comprehensive Stripe status checking
 * Replaces multiple status endpoints across different components
 * 
 * Query Parameters:
 * - barberbarbershop_id: Required barbershop ID
 * - force_refresh: Optional, bypass cache
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barberbarbershop_id')
    const forceRefresh = searchParams.get('force_refresh') === 'true'

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barberbarbershop_id is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user has access to this barbershop
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify barbershop access using unified tenant resolver
    const accessResult = await checkBarbershopAccess(session.user.id, barbershopId, { supabase })
    
    // Also check for SUPER_ADMIN role
    if (!accessResult.hasAccess) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (profile?.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ 
          error: 'Access denied',
          details: accessResult.metadata 
        }, { status: 403 })
      }
    }

    // Get comprehensive Stripe status
    const status = await getUnifiedStripeStatus(supabase, barbershopId)

    return NextResponse.json({
      success: true,
      barberbarbershop_id: barbershopId,
      status: status,
      cached: !forceRefresh,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting unified Stripe status:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get unified Stripe status from all related tables
 * Consolidates status checking logic from multiple components
 */
async function getUnifiedStripeStatus(supabase, barbershopId) {
  // Get Stripe Connect account information
  const { data: connectAccount, error: connectError } = await supabase
    .from('stripe_connected_accounts')
    .select(`
      *,
      barbershops(name, owner_id)
    `)
    .eq('barberbarbershop_id', barbershopId)
    .single()

  // Get terminal configuration if it exists
  const { data: terminalConfig } = await supabase
    .from('stripe_terminal_config')
    .select('*')
    .eq('barberbarbershop_id', barbershopId)
    .single()

  // Get financial arrangements using Stripe Connect
  const { data: financialArrangements } = await supabase
    .from('financial_arrangements')
    .select('barber_id, stripe_account_id, stripe_onboarding_complete')
    .eq('barberbarbershop_id', barbershopId)
    .not('stripe_account_id', 'is', null)

  // Calculate unified status
  const status = {
    overall_status: 'not_started',
    connect_account: {
      exists: !!connectAccount && !connectError,
      account_id: connectAccount?.stripe_account_id || null,
      charges_enabled: connectAccount?.charges_enabled || false,
      payouts_enabled: connectAccount?.payouts_enabled || false,
      details_submitted: connectAccount?.details_submitted || false,
      requirements_due: connectAccount?.requirements_due || [],
      onboarding_completed: false
    },
    terminal_setup: {
      configured: !!terminalConfig?.terminal_configured,
      location_id: terminalConfig?.location_id || null,
      reader_configured: !!terminalConfig?.reader_id,
      test_mode: terminalConfig?.test_mode !== false
    },
    financial_integration: {
      arrangements_with_stripe: financialArrangements?.length || 0,
      split_payments_enabled: false,
      commission_automation: false
    },
    setup_progress: {
      connect_setup: 0,
      terminal_setup: 0,
      financial_integration: 0,
      overall: 0
    },
    capabilities: {
      online_payments: false,
      in_person_payments: false,
      automatic_splits: false,
      direct_payouts: false
    },
    next_steps: [],
    warnings: [],
    last_updated: new Date().toISOString()
  }

  // If no Connect account exists
  if (!connectAccount || connectError) {
    status.overall_status = 'not_started'
    status.next_steps = [
      'Create Stripe Connect account',
      'Complete onboarding process', 
      'Configure payment settings'
    ]
    return status
  }

  // Calculate Connect setup progress
  let connectProgress = 0
  if (connectAccount.stripe_account_id) connectProgress += 25
  if (connectAccount.details_submitted) connectProgress += 25
  if (connectAccount.charges_enabled) connectProgress += 25
  if (connectAccount.payouts_enabled) connectProgress += 25

  status.setup_progress.connect_setup = connectProgress
  status.connect_account.onboarding_completed = connectProgress === 100

  // Add warnings for Connect issues
  if (connectAccount.requirements_due?.length > 0) {
    status.warnings.push({
      type: 'requirements_due',
      message: `${connectAccount.requirements_due.length} requirements need attention`,
      details: connectAccount.requirements_due
    })
  }

  // Calculate Terminal setup progress
  let terminalProgress = 0
  if (terminalConfig?.location_id) terminalProgress += 50
  if (terminalConfig?.terminal_configured) terminalProgress += 50

  status.setup_progress.terminal_setup = terminalProgress

  // Calculate Financial integration progress
  let financialProgress = 0
  if (financialArrangements?.length > 0) financialProgress += 50
  if (connectAccount.charges_enabled && connectAccount.payouts_enabled) {
    financialProgress += 50
  }

  status.setup_progress.financial_integration = financialProgress
  status.financial_integration.split_payments_enabled = financialProgress >= 50
  status.financial_integration.commission_automation = financialProgress === 100

  // Calculate overall progress  
  const overallProgress = Math.round(
    (status.setup_progress.connect_setup + 
     status.setup_progress.terminal_setup + 
     status.setup_progress.financial_integration) / 3
  )
  status.setup_progress.overall = overallProgress

  // Determine capabilities
  status.capabilities.online_payments = connectAccount.charges_enabled
  status.capabilities.in_person_payments = connectAccount.charges_enabled && 
                                          terminalConfig?.terminal_configured
  status.capabilities.automatic_splits = financialArrangements?.length > 0
  status.capabilities.direct_payouts = connectAccount.payouts_enabled

  // Determine overall status
  if (overallProgress === 0) {
    status.overall_status = 'not_started'
  } else if (overallProgress === 100) {
    status.overall_status = 'completed'
  } else {
    status.overall_status = 'in_progress'
  }

  // Generate next steps
  status.next_steps = generateNextSteps(status)

  return status
}

/**
 * Generate contextual next steps based on current status
 */
function generateNextSteps(status) {
  const steps = []

  // Connect account steps
  if (!status.connect_account.exists) {
    steps.push('Create Stripe Connect account')
  } else if (!status.connect_account.details_submitted) {
    steps.push('Complete Stripe onboarding')
  } else if (!status.connect_account.charges_enabled) {
    steps.push('Verify business information with Stripe')
  } else if (!status.connect_account.payouts_enabled) {
    steps.push('Complete bank account verification')
  }

  // Terminal steps
  if (status.connect_account.charges_enabled && !status.terminal_setup.configured) {
    steps.push('Set up Stripe Terminal for in-person payments')
  }

  // Financial integration steps
  if (status.connect_account.payouts_enabled && 
      status.financial_integration.arrangements_with_stripe === 0) {
    steps.push('Configure automatic payment splits')
  }

  // Default completion message
  if (steps.length === 0 && status.overall_status === 'completed') {
    steps.push('All payment systems configured successfully')
  }

  return steps
}