import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLATFORM_FEES = {
  email: 0.20, // 20% markup on email campaigns
  sms: 0.25    // 25% markup on SMS campaigns
}

const BASE_COSTS = {
  email: 0.002,  // $0.002 per email (SendGrid pricing)
  sms: 0.01      // $0.01 per SMS (Twilio pricing)
}

export async function POST(request) {
  try {
    const data = await request.json()
    const {
      campaign_id,
      billing_account_id,
      campaign_type,
      recipients_count,
      user_id,
      immediate_charge = false
    } = data

    if (!campaign_id || !billing_account_id || !campaign_type || !recipients_count) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: account, error: accountError } = await supabase
      .from('marketing_accounts')
      .select('*')
      .eq('id', billing_account_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Billing account not found' },
        { status: 404 }
      )
    }

    const baseCost = BASE_COSTS[campaign_type] || 0.01
    const serviceCost = baseCost * recipients_count
    const platformFee = serviceCost * PLATFORM_FEES[campaign_type]
    const totalAmount = serviceCost + platformFee

    if (account.monthly_spend_limit && account.total_spent + totalAmount > account.monthly_spend_limit) {
      return NextResponse.json(
        { 
          error: 'Monthly spending limit would be exceeded',
          currentSpent: account.total_spent,
          limit: account.monthly_spend_limit,
          attemptedCharge: totalAmount
        },
        { status: 400 }
      )
    }

    const { data: paymentMethod, error: methodError } = await supabase
      .from('marketing_payment_methods')
      .select('*')
      .eq('account_id', billing_account_id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (methodError || !paymentMethod) {
      return NextResponse.json(
        { error: 'No default payment method found for this account' },
        { status: 400 }
      )
    }

    let paymentIntentId = null
    let chargeId = null
    let paymentStatus = 'pending'

    if (immediate_charge && account.stripe_customer_id && paymentMethod.stripe_payment_method_id) {
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe not configured - add STRIPE_SECRET_KEY to environment variables' },
          { status: 503 }
        )
      }
      
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: 'usd',
          customer: account.stripe_customer_id,
          payment_method: paymentMethod.stripe_payment_method_id,
          confirm: true,
          automatic_payment_methods: {
            enabled: false,
          },
          description: `Campaign #${campaign_id} - ${campaign_type.toUpperCase()} to ${recipients_count} recipients`,
          metadata: {
            campaign_id,
            billing_account_id,
            campaign_type,
            recipients_count: recipients_count.toString(),
            service_cost: serviceCost.toFixed(4),
            platform_fee: platformFee.toFixed(4)
          }
        })

        paymentIntentId = paymentIntent.id
        chargeId = paymentIntent.latest_charge
        paymentStatus = paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed'

      } catch (stripeError) {
        console.error('Stripe payment error:', stripeError)
        return NextResponse.json(
          { 
            error: 'Payment processing failed',
            details: stripeError.message
          },
          { status: 400 }
        )
      }
    }

    const { data: billingRecord, error: billingError } = await supabase
      .from('marketing_billing_records')
      .insert({
        campaign_id,
        billing_account_id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: chargeId,
        payment_status: paymentStatus,
        amount_charged: totalAmount,
        platform_fee: platformFee,
        service_cost: serviceCost,
        recipients_count,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        billing_period: new Date().toISOString().substring(0, 7), // YYYY-MM format
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (billingError) {
      console.error('Error creating billing record:', billingError)
      
      if (paymentIntentId && paymentStatus === 'succeeded') {
        try {
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer'
          })
        } catch (refundError) {
          console.error('Failed to refund after billing record error:', refundError)
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create billing record' },
        { status: 500 }
      )
    }

    if (paymentStatus === 'succeeded' || !immediate_charge) {
      await supabase
        .from('marketing_accounts')
        .update({
          total_campaigns_sent: account.total_campaigns_sent + 1,
          total_emails_sent: campaign_type === 'email' ? account.total_emails_sent + recipients_count : account.total_emails_sent,
          total_sms_sent: campaign_type === 'sms' ? account.total_sms_sent + recipients_count : account.total_sms_sent,
          total_spent: account.total_spent + totalAmount,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', billing_account_id)
    }

    return NextResponse.json({
      success: true,
      billingRecord,
      costs: {
        serviceCost,
        platformFee,
        totalAmount,
        perUnitCost: baseCost,
        recipients: recipients_count
      },
      payment: {
        status: paymentStatus,
        paymentIntentId,
        chargeId
      },
      message: immediate_charge 
        ? (paymentStatus === 'succeeded' ? 'Campaign charged successfully' : 'Payment failed')
        : 'Billing record created (payment will be processed later)'
    })

  } catch (error) {
    console.error('Campaign charge error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}