import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PLAN_CONFIGS = {
  barber: {
    monthly: { priceId: process.env.STRIPE_BARBER_PRICE_ID, amount: 3500 },
    yearly: { priceId: process.env.STRIPE_BARBER_PRICE_ID_YEARLY, amount: 35000 }
  },
  shop: {
    monthly: { priceId: process.env.STRIPE_SHOP_PRICE_ID, amount: 9900 },
    yearly: { priceId: process.env.STRIPE_SHOP_PRICE_ID_YEARLY, amount: 99000 }
  },
  enterprise: {
    monthly: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, amount: 24900 },
    yearly: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID_YEARLY, amount: 249000 }
  }
}

async function getOrCreateTestPrice(plan, billing, amount, stripe) {
  const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
  
  if (!isTestMode) {
    return PLAN_CONFIGS[plan][billing].priceId
  }
  
  try {
    const planName = plan.charAt(0).toUpperCase() + plan.slice(1)
    const billingLabel = billing === 'monthly' ? 'Monthly' : 'Yearly'
    
    console.log('🔧 Creating test mode product and price for:', planName, billingLabel)
    
    const product = await stripe.products.create({
      name: `${planName} Plan - ${billingLabel} (Test)`,
      description: `Test mode ${planName} subscription - ${billingLabel.toLowerCase()} billing`
    })
    
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: 'usd',
      recurring: {
        interval: billing === 'monthly' ? 'month' : 'year'
      },
      product: product.id
    })
    
    console.log('✅ Created test price:', price.id)
    return price.id
    
  } catch (error) {
    console.error('❌ Error creating test price:', error.message)
    return PLAN_CONFIGS[plan][billing].priceId
  }
}

export async function GET(request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const plan = searchParams.get('plan') || 'shop'
    const billing = searchParams.get('billing') || 'monthly'
    
    console.log('💳 Creating Stripe checkout:', { plan, billing })
    console.log('🌐 Request origin:', origin)
    
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.redirect(new URL('/pricing?error=auth_required', request.url))
    }
    
    console.log('✅ User authenticated for checkout:', user.email)
    
    if (process.env.DEVELOPMENT_MODE === 'true') {
      console.log('🧪 DEVELOPMENT MODE: Simulating successful checkout')
      
      const mockSessionId = 'cs_dev_' + Math.random().toString(36).substring(2, 15)
      
      const successUrl = new URL('/success', origin)
      successUrl.searchParams.set('session_id', mockSessionId)
      successUrl.searchParams.set('plan', plan)
      successUrl.searchParams.set('billing', billing)
      
      console.log('✅ Development mode: Redirecting to success page')
      return NextResponse.redirect(successUrl.toString())
    }
    
    const planConfig = PLAN_CONFIGS[plan]?.[billing]
    if (!planConfig) {
      return NextResponse.redirect(new URL('/pricing?error=invalid_plan', request.url))
    }
    
    console.log('📦 Plan config:', planConfig)
    
    const priceId = await getOrCreateTestPrice(plan, billing, planConfig.amount, stripe)
    console.log('💰 Using price ID:', priceId)
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        userId: user.id,
        plan,
        billing
      },
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
          billing
        }
      }
    })
    
    console.log('✅ Stripe session created:', session.id)
    
    return NextResponse.redirect(session.url)
    
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.redirect(
      new URL('/pricing?error=checkout_failed', request.url)
    )
  }
}