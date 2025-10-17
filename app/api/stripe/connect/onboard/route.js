import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/services/stripe-connect-service';

/**
 * Complete Stripe Connect Onboarding Flow
 * 
 * POST /api/stripe/connect/onboard
 * - Creates Stripe Connect account if needed
 * - Generates onboarding link
 * - Updates database with account details
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
      barberId,
      barbershopId,
      returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/financial/success`,
      refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/financial/refresh`
    } = body;

    // Get barber details
    const { data: barberProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', barberId)
      .single();

    if (!barberProfile) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    // Check existing financial arrangement
    const { data: arrangement } = await supabase
      .from('financial_arrangements')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .single();

    let accountId = arrangement?.barber_stripe_account_id;
    
    // Create Stripe account if doesn't exist
    if (!accountId) {
      const nameParts = barberProfile.full_name?.split(' ') || ['', ''];
      const createResult = await stripeConnectService.createConnectAccount({
        barberId,
        barbershopId,
        email: barberProfile.email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || ''
      });

      accountId = createResult.accountId;

      // Create or update financial arrangement
      if (!arrangement) {
        await supabase
          .from('financial_arrangements')
          .insert({
            barbershop_id: barbershopId,
            barber_id: barberId,
            arrangement_type: 'commission',
            commission_rate: 70, // Default 70% to barber
            barber_stripe_account_id: accountId,
            barber_stripe_onboarded: false,
            active: true
          });
      } else {
        await supabase
          .from('financial_arrangements')
          .update({
            barber_stripe_account_id: accountId,
            updated_at: new Date().toISOString()
          })
          .eq('id', arrangement.id);
      }
    }

    // Check if already onboarded
    const status = await stripeConnectService.getAccountStatus(accountId);
    
    if (status.isOnboarded) {
      return NextResponse.json({
        success: true,
        onboarded: true,
        message: 'Account already onboarded',
        accountId
      });
    }

    // Generate onboarding link
    const onboardingLink = await stripeConnectService.createOnboardingLink(
      accountId,
      returnUrl,
      refreshUrl
    );

    return NextResponse.json({
      success: true,
      onboarded: false,
      onboardingUrl: onboardingLink.url,
      expiresAt: onboardingLink.expiresAt,
      accountId
    });

  } catch (error) {
    console.error('Stripe onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start onboarding' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/connect/onboard
 * Check onboarding status
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get('barberId');
    const barbershopId = searchParams.get('barbershopId');

    if (!barberId || !barbershopId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get financial arrangement
    const { data: arrangement } = await supabase
      .from('financial_arrangements')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .single();

    if (!arrangement?.barber_stripe_account_id) {
      return NextResponse.json({
        success: true,
        hasAccount: false,
        onboarded: false
      });
    }

    // Get account status from Stripe
    const status = await stripeConnectService.getAccountStatus(
      arrangement.barber_stripe_account_id
    );

    // Update database if status changed
    if (status.isOnboarded !== arrangement.barber_stripe_onboarded) {
      await supabase
        .from('financial_arrangements')
        .update({
          barber_stripe_onboarded: status.isOnboarded,
          stripe_charges_enabled: status.chargesEnabled,
          stripe_payouts_enabled: status.payoutsEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', arrangement.id);
    }

    return NextResponse.json({
      success: true,
      hasAccount: true,
      onboarded: status.isOnboarded,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      requirements: status.requirements,
      accountId: arrangement.barber_stripe_account_id
    });

  } catch (error) {
    console.error('Check onboarding status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}