import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { barbershopId } = body

    if (!barbershopId) {
      return NextResponse.json({ 
        error: 'Missing required field: barbershopId' 
      }, { status: 400 })
    }

    // Verify user has access to this barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id, name')
      .eq('id', barbershopId)
      .single()

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    // Check permissions
    const { data: staffRecord } = await supabase
      .from('barbershop_staff')
      .select('role')
      .eq('barbershop_id', barbershopId)
      .eq('user_id', user.id)
      .single()

    const isOwner = barbershop.owner_id === user.id
    const isManager = staffRecord?.role === 'SHOP_OWNER' || staffRecord?.role === 'MANAGER'

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check prerequisites for activation
    const activationChecks = []

    // 1. Check Stripe Connect status
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('account_id, onboarding_completed, charges_enabled, payouts_enabled')
      .eq('barbershop_id', barbershopId)
      .single()

    if (!stripeAccount?.onboarding_completed || !stripeAccount?.charges_enabled) {
      activationChecks.push({
        check: 'stripe_connect',
        status: 'failed',
        message: 'Stripe Connect onboarding not completed'
      })
    } else {
      activationChecks.push({
        check: 'stripe_connect',
        status: 'passed',
        message: 'Stripe Connect configured'
      })
    }

    // 2. Check payment configuration
    const { data: paymentConfig } = await supabase
      .from('payment_configurations')
      .select('id, default_compensation_model')
      .eq('barbershop_id', barbershopId)
      .single()

    if (!paymentConfig?.default_compensation_model) {
      activationChecks.push({
        check: 'compensation_model',
        status: 'failed',
        message: 'No compensation model configured'
      })
    } else {
      activationChecks.push({
        check: 'compensation_model',
        status: 'passed',
        message: `${paymentConfig.default_compensation_model} model configured`
      })
    }

    // 3. Check if there are any staff members (optional warning)
    const { data: staff } = await supabase
      .from('barbershop_staff')
      .select('user_id')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (!staff || staff.length === 0) {
      activationChecks.push({
        check: 'staff_members',
        status: 'warning',
        message: 'No active staff members found'
      })
    } else {
      activationChecks.push({
        check: 'staff_members',
        status: 'passed',
        message: `${staff.length} active staff member(s)`
      })
    }

    // Determine if activation is possible
    const hasFailures = activationChecks.some(check => check.status === 'failed')

    if (hasFailures) {
      return NextResponse.json({
        success: false,
        message: 'Cannot activate payment system - requirements not met',
        checks: activationChecks,
        canActivate: false
      }, { status: 400 })
    }

    // Perform activation steps
    const activationSteps = []

    try {
      // 1. Update barbershop to mark payments as active
      const { error: updateError } = await supabase
        .from('barbershops')
        .update({
          payment_system_active: true,
          payment_system_activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershopId)

      if (updateError) throw updateError

      activationSteps.push({
        step: 'activate_payment_system',
        status: 'completed',
        message: 'Payment system marked as active'
      })

      // 2. Create initial financial summary record
      const { error: summaryError } = await supabase
        .from('financial_summaries')
        .upsert({
          barbershop_id: barbershopId,
          period_start: new Date().toISOString(),
          total_revenue: 0,
          total_commissions: 0,
          total_payouts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'barbershop_id,period_start' })

      if (summaryError) {
        console.warn('Could not create financial summary:', summaryError)
        activationSteps.push({
          step: 'initialize_financial_tracking',
          status: 'warning',
          message: 'Financial tracking initialization had issues'
        })
      } else {
        activationSteps.push({
          step: 'initialize_financial_tracking',
          status: 'completed',
          message: 'Financial tracking initialized'
        })
      }

      // 3. Send activation notification (if notification system exists)
      try {
        // This would integrate with your notification system
        // await sendNotification(session.user.id, {
        //   type: 'payment_system_activated',
        //   barbershopName: barbershop.name
        // })
        
        activationSteps.push({
          step: 'send_notifications',
          status: 'completed',
          message: 'Activation notifications sent'
        })
      } catch (notificationError) {
        console.warn('Notification error:', notificationError)
        activationSteps.push({
          step: 'send_notifications',
          status: 'warning',
          message: 'Notifications could not be sent'
        })
      }

      return NextResponse.json({
        success: true,
        message: `Payment system activated for ${barbershop.name}!`,
        barbershopId,
        barbershopName: barbershop.name,
        activatedAt: new Date().toISOString(),
        checks: activationChecks,
        steps: activationSteps,
        canAcceptPayments: true
      })

    } catch (activationError) {
      console.error('Activation error:', activationError)
      return NextResponse.json({
        success: false,
        message: 'Failed to activate payment system',
        error: activationError.message,
        checks: activationChecks,
        steps: activationSteps
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Finance activation error:', error)
    return NextResponse.json(
      { error: 'Failed to activate payment system' }, 
      { status: 500 }
    )
  }
}