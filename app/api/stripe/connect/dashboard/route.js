import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/services/stripe-connect-service';

/**
 * Generate Stripe Express Dashboard login link
 * 
 * POST /api/stripe/connect/dashboard
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
    const { barberId, barbershopId } = body;

    // Get financial arrangement
    const { data: arrangement } = await supabase
      .from('financial_arrangements')
      .select('barber_stripe_account_id, barber_stripe_onboarded')
      .eq('barber_id', barberId || user.id)
      .eq('barbershop_id', barbershopId)
      .single();

    if (!arrangement?.barber_stripe_account_id) {
      return NextResponse.json({ 
        error: 'No Stripe account found. Please complete onboarding first.' 
      }, { status: 404 });
    }

    if (!arrangement.barber_stripe_onboarded) {
      return NextResponse.json({ 
        error: 'Stripe account onboarding not completed.' 
      }, { status: 400 });
    }

    // Generate login link
    const loginLink = await stripeConnectService.createLoginLink(
      arrangement.barber_stripe_account_id
    );

    return NextResponse.json({
      success: true,
      dashboardUrl: loginLink.url
    });

  } catch (error) {
    console.error('Generate dashboard link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate dashboard link' },
      { status: 500 }
    );
  }
}