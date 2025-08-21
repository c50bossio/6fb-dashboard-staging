import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has payment methods configured
    const { data: paymentMethods } = await supabase
      .from('business_payment_methods')
      .select('method_type, enabled')
      .eq('user_id', user.id)
      .eq('enabled', true)

    // Check if user has Stripe Connect account set up
    const { data: stripeAccount } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check if user has financial arrangements
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    let hasArrangements = false
    if (shop) {
      const { data: arrangements } = await supabase
        .from('financial_arrangements')
        .select('id')
        .eq('barbershop_id', shop.id)
        .eq('is_active', true)
        .limit(1)
      
      hasArrangements = arrangements && arrangements.length > 0
    }

    // Determine integration status
    const hasPaymentMethods = paymentMethods && paymentMethods.length > 0
    const hasCardPayments = paymentMethods?.some(pm => pm.method_type === 'card')
    const hasStripeSetup = stripeAccount && stripeAccount.onboarding_completed && stripeAccount.charges_enabled
    const commissionsAutomated = hasCardPayments && hasStripeSetup && hasArrangements

    return NextResponse.json({
      connected: hasPaymentMethods,
      processing_enabled: hasStripeSetup,
      commissions_automated: commissionsAutomated,
      details: {
        has_payment_methods: hasPaymentMethods,
        has_card_payments: hasCardPayments,
        has_stripe_setup: hasStripeSetup,
        has_arrangements: hasArrangements,
        payment_method_count: paymentMethods?.length || 0,
        stripe_status: stripeAccount?.verification_status || 'not_setup'
      }
    })

  } catch (error) {
    console.error('Error checking integration status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}