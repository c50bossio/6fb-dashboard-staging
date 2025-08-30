import { NextResponse } from 'next/server'

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

/**
 * POST /api/no-show/charge-fee
 * Charge a no-show fee using Stripe
 */
export async function POST(request) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { 
      incident_id,
      client_id,
      amount,
      description = 'No-show fee',
      charge_method = 'card_on_file' // 'card_on_file', 'manual_payment', 'recovery_deposit'
    } = await request.json()
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const barberbarbershopId = profile.barbershop_id

    // Get barbershop's Stripe account
    const { data: stripeAccount, error: stripeError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('onboarding_completed', true)
      .single()
    
    if (stripeError || !stripeAccount) {
      return NextResponse.json({ 
        error: 'Stripe account not configured for this barbershop' 
      }, { status: 400 })
    }

    // Get client's payment method
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', client_id)
      .single()
    
    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    let stripeCustomerId = customer.stripe_customer_id
    
    if (!stripeCustomerId) {
      // Create Stripe customer if doesn't exist
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: {
          barberbarbershop_id: barberbarbershopId,
          customer_id: client_id
        }
      }, {
        stripeAccount: stripeAccount.account_id
      })
      
      stripeCustomerId = stripeCustomer.id
      
      // Update customer record with Stripe ID
      await supabase
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', client_id)
    }

    let chargeResult = null
    let feeStatus = 'pending'
    let errorMessage = null

    if (charge_method === 'card_on_file') {
      // Get customer's default payment method
      const stripeCustomer = await stripe.customers.retrieve(
        stripeCustomerId,
        { stripeAccount: stripeAccount.account_id }
      )
      
      if (!stripeCustomer.default_source && !stripeCustomer.invoice_settings?.default_payment_method) {
        return NextResponse.json({ 
          error: 'No payment method on file for this customer',
          requires_payment_method: true
        }, { status: 400 })
      }

      // Create and immediately confirm payment intent
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          customer: stripeCustomerId,
          description: `${description} - Incident #${incident_id}`,
          confirm: true,
          off_session: true,
          metadata: {
            incident_id,
            client_id,
            barberbarbershop_id: barberbarbershopId,
            type: 'no_show_fee'
          },
          // Use default payment method
          payment_method: stripeCustomer.invoice_settings?.default_payment_method || undefined,
          // Application fee for platform (optional - 5% platform fee)
          application_fee_amount: Math.round(amount * 100 * 0.05)
        }, {
          stripeAccount: stripeAccount.account_id
        })
        
        chargeResult = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100
        }
        
        feeStatus = paymentIntent.status === 'succeeded' ? 'charged' : 'failed'
        
      } catch (stripeError) {
        console.error('Stripe charge error:', stripeError)
        errorMessage = stripeError.message
        feeStatus = 'failed'
        
        // Handle specific error cases
        if (stripeError.code === 'authentication_required') {
          return NextResponse.json({ 
            error: 'Payment requires authentication',
            requires_authentication: true,
            payment_intent_client_secret: stripeError.payment_intent?.client_secret
          }, { status: 400 })
        }
      }
      
    } else if (charge_method === 'manual_payment') {
      // Create payment intent for manual collection
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        description: `${description} - Incident #${incident_id}`,
        metadata: {
          incident_id,
          client_id,
          barberbarbershop_id: barberbarbershopId,
          type: 'no_show_fee'
        },
        application_fee_amount: Math.round(amount * 100 * 0.05)
      }, {
        stripeAccount: stripeAccount.account_id
      })
      
      chargeResult = {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: 'requires_payment_method'
      }
      
      feeStatus = 'pending'
      
    } else if (charge_method === 'recovery_deposit') {
      // Handle deposit collection for recovery
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        description: `Recovery deposit for account reactivation`,
        metadata: {
          incident_id,
          client_id,
          barberbarbershop_id: barberbarbershopId,
          type: 'recovery_deposit'
        },
        application_fee_amount: Math.round(amount * 100 * 0.05)
      }, {
        stripeAccount: stripeAccount.account_id
      })
      
      chargeResult = {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: 'requires_payment_method'
      }
      
      feeStatus = 'pending'
    }

    // Update incident with charge details
    if (incident_id) {
      await supabase
        .from('no_show_incidents')
        .update({
          fee_charged: charge_method === 'card_on_file' && feeStatus === 'charged',
          fee_status: feeStatus,
          fee_charge_date: feeStatus === 'charged' ? new Date().toISOString() : null,
          stripe_payment_intent_id: chargeResult?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', incident_id)
    }

    // Update strike history if payment successful
    if (feeStatus === 'charged') {
      const { data: strikeHistory } = await supabase
        .from('client_strike_history')
        .select('outstanding_balance')
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('client_id', client_id)
        .single()
      
      if (strikeHistory) {
        const newBalance = Math.max(0, (strikeHistory.outstanding_balance || 0) - amount)
        
        await supabase
          .from('client_strike_history')
          .update({
            outstanding_balance: newBalance,
            last_fee_paid_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('barberbarbershop_id', barberbarbershopId)
          .eq('client_id', client_id)
      }
    }

    // Log the transaction
    await supabase
      .from('payment_logs')
      .insert({
        barberbarbershop_id: barberbarbershopId,
        client_id,
        amount,
        type: 'no_show_fee',
        status: feeStatus,
        stripe_payment_intent_id: chargeResult?.id,
        incident_id,
        error_message: errorMessage,
        created_by: session.user.id
      })

    return NextResponse.json({
      success: feeStatus === 'charged',
      charge: chargeResult,
      status: feeStatus,
      error: errorMessage,
      message: feeStatus === 'charged' 
        ? 'Fee charged successfully' 
        : feeStatus === 'pending'
        ? 'Payment intent created, awaiting payment'
        : 'Fee charge failed'
    })
    
  } catch (error) {
    console.error('Error charging no-show fee:', error)
    return NextResponse.json(
      { error: 'Failed to process fee charge' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/no-show/charge-fee
 * Update payment status after manual collection
 */
export async function PUT(request) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { 
      payment_intent_id,
      incident_id,
      status // 'succeeded', 'failed', 'cancelled'
    } = await request.json()
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Update incident status
    const updateData = {
      fee_status: status === 'succeeded' ? 'charged' : status,
      updated_at: new Date().toISOString()
    }
    
    if (status === 'succeeded') {
      updateData.fee_charged = true
      updateData.fee_charge_date = new Date().toISOString()
    }
    
    await supabase
      .from('no_show_incidents')
      .update(updateData)
      .eq('id', incident_id)
      .eq('stripe_payment_intent_id', payment_intent_id)

    return NextResponse.json({ 
      success: true,
      message: `Payment status updated to ${status}`
    })
    
  } catch (error) {
    console.error('Error updating payment status:', error)
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    )
  }
}