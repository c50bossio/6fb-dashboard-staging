import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const barberId = searchParams.get('barberId');

    if (!accountId && !barberId) {
      return NextResponse.json({ error: 'Account ID or Barber ID required' }, { status: 400 });
    }

    // Verify authentication
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let stripeAccountId = accountId;

    // If barberId provided, look up the Stripe account ID
    if (!accountId && barberId) {
      const { data: arrangement } = await supabase
        .from('financial_arrangements')
        .select('barber_stripe_account_id, barbershop_id')
        .eq('barber_id', barberId)
        .single();

      if (!arrangement?.barber_stripe_account_id) {
        return NextResponse.json({ 
          success: true,
          hasAccount: false,
          message: 'No Stripe account found for this barber'
        });
      }

      stripeAccountId = arrangement.barber_stripe_account_id;
    }

    // Retrieve account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    // Check if onboarding is complete
    const onboardingComplete = account.details_submitted && account.charges_enabled;

    // Update database if onboarding status changed
    if (onboardingComplete) {
      await supabase
        .from('financial_arrangements')
        .update({
          barber_stripe_onboarded: true,
          updated_at: new Date().toISOString()
        })
        .eq('barber_stripe_account_id', stripeAccountId);
    }

    // Prepare response with account status
    const response = {
      success: true,
      hasAccount: true,
      accountId: account.id,
      onboardingComplete: onboardingComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        errors: account.requirements?.errors || []
      },
      capabilities: account.capabilities,
      businessType: account.business_type,
      country: account.country,
      created: account.created,
      defaultCurrency: account.default_currency
    };

    // Add payout schedule if available
    if (account.settings?.payouts) {
      response.payoutSchedule = {
        interval: account.settings.payouts.schedule?.interval,
        delayDays: account.settings.payouts.schedule?.delay_days
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get account status error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError' && error.code === 'account_invalid') {
      return NextResponse.json({
        success: false,
        hasAccount: false,
        error: 'Invalid or deleted Stripe account'
      }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to get account status' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // This endpoint updates the account status in the database
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, barberId, onboardingComplete } = body;

    if (!accountId || barberId === undefined || onboardingComplete === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the financial arrangement
    const { data, error } = await supabase
      .from('financial_arrangements')
      .update({
        barber_stripe_onboarded: onboardingComplete,
        updated_at: new Date().toISOString()
      })
      .eq('barber_id', barberId)
      .eq('barber_stripe_account_id', accountId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Account status updated successfully'
    });

  } catch (error) {
    console.error('Update account status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update account status' },
      { status: 500 }
    );
  }
}