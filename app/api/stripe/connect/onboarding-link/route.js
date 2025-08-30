import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    // Verify authentication
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, barberId, barberbarbershopId } = body;

    // Verify the requesting user has permission
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', barberbarbershopId)
      .single();

    // Allow shop owner or the barber themselves to get onboarding link
    const isOwner = barbershop?.owner_id === user.id;
    const isBarber = barberId === user.id;
    
    if (!isOwner && !isBarber) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/settings/staff/onboarding?account=${accountId}&status=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/settings/staff/onboarding?account=${accountId}&status=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      expiresAt: accountLink.expires_at
    });

  } catch (error) {
    console.error('Create onboarding link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // This endpoint can be used to refresh an expired onboarding link
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify authentication
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the financial arrangement to verify permissions
    const { data: arrangement } = await supabase
      .from('financial_arrangements')
      .select('barberbarbershop_id, barber_id')
      .eq('barber_stripe_account_id', accountId)
      .single();

    if (!arrangement) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify permission
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', arrangement.barberbarbershop_id)
      .single();

    const isOwner = barbershop?.owner_id === user.id;
    const isBarber = arrangement.barber_id === user.id;
    
    if (!isOwner && !isBarber) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create new account link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/settings/staff/onboarding?account=${accountId}&status=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/settings/staff/onboarding?account=${accountId}&status=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      expiresAt: accountLink.expires_at
    });

  } catch (error) {
    console.error('Refresh onboarding link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh onboarding link' },
      { status: 500 }
    );
  }
}