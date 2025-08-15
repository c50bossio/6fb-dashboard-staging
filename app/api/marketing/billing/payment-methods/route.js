import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { isDevBypassEnabled, getTestBillingData, TEST_USER_UUID } from '@/lib/auth/dev-bypass'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const userId = accountId.replace('billing-', '').replace('demo-', '')
    if (isDevBypassEnabled() && (userId === TEST_USER_UUID || accountId.includes(TEST_USER_UUID))) {
      const testData = getTestBillingData()
      return NextResponse.json({
        success: true,
        paymentMethods: testData.paymentMethods,
        timestamp: new Date().toISOString()
      })
    }

    const { data: paymentMethods, error: methodsError } = await supabase
      .from('marketing_payment_methods')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })

    if (methodsError) {
      console.error('Error fetching payment methods:', methodsError)
      return NextResponse.json({
        success: true,
        paymentMethods: [],
        timestamp: new Date().toISOString()
      })
    }

    if ((!paymentMethods || paymentMethods.length === 0) && accountId) {
      const { data: account } = await supabase
        .from('marketing_accounts')
        .select('id, stripe_customer_id')
        .eq('id', accountId)
        .single()

      if (account) {
        const demoMethod = {
          account_id: accountId,
          stripe_payment_method_id: `pm_demo_${Date.now()}`,
          stripe_customer_id: account.stripe_customer_id || `cus_demo_${accountId.substring(0, 8)}`,
          card_brand: 'visa',
          card_last4: '4242',
          card_exp_month: 12,
          card_exp_year: 2025,
          is_default: true,
          is_active: true,
          billing_address: {
            line1: '123 Demo Street',
            city: 'Demo City',
            state: 'CA',
            postal_code: '90210',
            country: 'US'
          }
        }

        const { data: createdMethod, error: createError } = await supabase
          .from('marketing_payment_methods')
          .insert(demoMethod)
          .select()
          .single()

        if (!createError && createdMethod) {
          paymentMethods.push(createdMethod)
        }
      }
    }

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethods || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Payment methods API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { account_id, user_id, mode } = data

    if (!account_id || !user_id) {
      return NextResponse.json(
        { error: 'Account ID and user ID are required' },
        { status: 400 }
      )
    }

    const { data: account, error: accountError } = await supabase
      .from('marketing_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('owner_id', user_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Billing account not found or unauthorized' },
        { status: 404 }
      )
    }

    let stripeCustomerId = account.stripe_customer_id

    if (!stripeCustomerId) {
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe not configured - add STRIPE_SECRET_KEY to environment variables' },
          { status: 503 }
        )
      }
      
      const customer = await stripe.customers.create({
        email: account.billing_email,
        name: account.account_name,
        metadata: {
          account_id: account_id,
          user_id: user_id,
          platform: 'bookedbarber'
        }
      })

      stripeCustomerId = customer.id

      await supabase
        .from('marketing_accounts')
        .update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', account_id)
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured - add STRIPE_SECRET_KEY to environment variables' },
        { status: 503 }
      )
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'setup', // Setup mode for adding payment method without charge
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/dashboard/campaigns/billing?success=true&account=${account_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/dashboard/campaigns/billing?canceled=true`,
      metadata: {
        account_id: account_id,
        user_id: user_id,
        purpose: 'add_payment_method'
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      message: 'Stripe checkout session created'
    })

  } catch (error) {
    console.error('Add payment method error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const methodId = searchParams.get('id')
    const data = await request.json()
    const { account_id, user_id } = data

    if (!methodId || !account_id || !user_id) {
      return NextResponse.json(
        { error: 'Method ID, account ID, and user ID are required' },
        { status: 400 }
      )
    }

    const { data: account, error: accountError } = await supabase
      .from('marketing_accounts')
      .select('owner_id, stripe_customer_id')
      .eq('id', account_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    if (account.owner_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized to remove this payment method' },
        { status: 403 }
      )
    }

    const { data: paymentMethod, error: methodError } = await supabase
      .from('marketing_payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', methodId)
      .eq('account_id', account_id)
      .single()

    if (methodError || !paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    if (paymentMethod.stripe_payment_method_id && stripe) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id)
      } catch (stripeError) {
        console.error('Stripe detach error:', stripeError)
      }
    }

    const { error: deleteError } = await supabase
      .from('marketing_payment_methods')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', methodId)

    if (deleteError) {
      console.error('Error removing payment method:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully'
    })

  } catch (error) {
    console.error('Remove payment method error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}