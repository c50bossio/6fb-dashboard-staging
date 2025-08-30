import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Subscription Management for BookedBarber Platform
 * 
 * POST /api/stripe/subscriptions/create
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      planType, // 'starter', 'professional', 'enterprise'
      billingInterval = 'month', // 'month' or 'year'
      barberbarbershopId
    } = body;

    // Define price IDs (these should be created in Stripe Dashboard)
    const priceIds = {
      starter: {
        month: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
        year: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly'
      },
      professional: {
        month: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
        year: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly'
      },
      enterprise: {
        month: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
        year: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly'
      }
    };

    const priceId = priceIds[planType]?.[billingInterval];
    if (!priceId) {
      return NextResponse.json({ 
        error: 'Invalid plan type or billing interval' 
      }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: {
          user_id: user.id,
          barberbarbershop_id: barberbarbershopId
        }
      });
      
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ 
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    // Check for existing subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active'
    });

    if (existingSubscriptions.data.length > 0) {
      // Update existing subscription instead of creating new one
      const subscription = await stripe.subscriptions.update(
        existingSubscriptions.data[0].id,
        {
          items: [{
            id: existingSubscriptions.data[0].items.data[0].id,
            price: priceId
          }],
          proration_behavior: 'create_prorations'
        }
      );

      return NextResponse.json({
        success: true,
        subscription,
        message: 'Subscription plan updated'
      });
    }

    // Create checkout session for new subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        barberbarbershop_id: barberbarbershopId,
        plan_type: planType,
        billing_interval: billingInterval
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          barberbarbershop_id: barberbarbershopId,
          plan_type: planType
        },
        trial_period_days: planType === 'starter' ? 14 : 7
      },
      allow_promotion_codes: true
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/subscriptions/create
 * Get current subscription status
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        hasSubscription: false,
        subscription: null
      });
    }

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        success: true,
        hasSubscription: false,
        subscription: null
      });
    }

    const subscription = subscriptions.data[0];
    const product = await stripe.products.retrieve(
      subscription.items.data[0].price.product
    );

    return NextResponse.json({
      success: true,
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        plan: {
          name: product.name,
          amount: subscription.items.data[0].price.unit_amount / 100,
          currency: subscription.items.data[0].price.currency,
          interval: subscription.items.data[0].price.recurring.interval
        },
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
      }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription' },
      { status: 500 }
    );
  }
}