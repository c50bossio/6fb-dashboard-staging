import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/**
 * POST /api/stripe/unified/onboarding-link
 * 
 * Unified endpoint for generating Stripe Connect onboarding links
 * Consolidates onboarding link generation from multiple components
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { account_id, return_url } = body

    if (!account_id) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the Connect account exists and user has access
    const { data: connectAccount, error: accountError } = await supabase
      .from('stripe_accounts')
      .select(`
        *,
        barbershops(owner_id, name)
      `)
      .eq('account_id', account_id)
      .single()

    if (accountError || !connectAccount) {
      return NextResponse.json(
        { error: 'Connect account not found' },
        { status: 404 }
      )
    }

    // Check user permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, barbershop_id, barbershop_id, role')
      .eq('id', session.user.id)
      .single()

    const hasPermission = profile?.barbershop_id === connectAccount.barbershop_id || 
                         profile?.barbershop_id === connectAccount.barbershop_id ||
                         profile?.role === 'SUPER_ADMIN' ||
                         connectAccount.barbershops?.owner_id === session.user.id

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get current account status from Stripe
    let stripeAccount
    try {
      stripeAccount = await stripe.accounts.retrieve(account_id)
    } catch (stripeError) {
      console.error('Error retrieving Stripe account:', stripeError)
      return NextResponse.json(
        { error: 'Failed to retrieve Stripe account status' },
        { status: 400 }
      )
    }

    // If account is already fully onboarded, return dashboard link instead
    if (stripeAccount.details_submitted && 
        stripeAccount.charges_enabled && 
        stripeAccount.payouts_enabled) {
      
      const loginLink = await stripe.accounts.createLoginLink(account_id)
      
      return NextResponse.json({
        success: true,
        url: loginLink.url,
        type: 'dashboard_link',
        message: 'Account is fully onboarded, returning dashboard link'
      })
    }

    // Create onboarding link
    const defaultReturnUrl = `${request.nextUrl.origin}/shop/settings/payment-setup?onboarding=complete`
    const refreshUrl = `${request.nextUrl.origin}/shop/settings/payment-setup?refresh=true`
    
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: refreshUrl,
      return_url: return_url || defaultReturnUrl,
      type: 'account_onboarding'
    })

    // Update onboarding tracking in database
    const { error: updateError } = await supabase
      .from('stripe_accounts')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('account_id', account_id)

    if (updateError) {
      console.error('Error updating onboarding tracking:', updateError)
    }

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      type: 'onboarding_link',
      expires_at: accountLink.expires_at,
      account_id: account_id,
      message: 'Onboarding link created successfully'
    })

  } catch (error) {
    console.error('Error creating onboarding link:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create onboarding link',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}