import { stripe, PRICING_PLANS } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { captureException } from '@/lib/sentry'

export async function POST(req) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get request body
    const { planId, successUrl, cancelUrl } = await req.json()

    // Validate plan
    const plan = PRICING_PLANS[planId]
    if (!plan || !plan.stripePriceId) {
      return new Response('Invalid plan selected', { status: 400 })
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/dashboard/billing?success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          plan_id: planId,
          user_id: user.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return Response.json({ 
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    captureException(error, { context: 'Stripe checkout session creation' })
    
    if (error.type === 'StripeCardError') {
      return new Response(error.message, { status: 400 })
    }
    
    return new Response('Internal Server Error', { status: 500 })
  }
}