import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

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
    const { barberId, barbershopId, email, businessType = 'individual', capabilities } = body;

    // Verify the requesting user has permission (shop owner or admin)
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', barbershopId)
      .single();

    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - not shop owner' }, { status: 403 });
    }

    // Check if barber already has a Stripe account
    const { data: existingArrangement } = await supabase
      .from('financial_arrangements')
      .select('barber_stripe_account_id')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .single();

    if (existingArrangement?.barber_stripe_account_id) {
      return NextResponse.json({ 
        success: true, 
        accountId: existingArrangement.barber_stripe_account_id,
        message: 'Stripe account already exists'
      });
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express', // Express accounts for simplified onboarding
      country: 'US',
      email: email,
      capabilities: capabilities || {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: businessType,
      settings: {
        payouts: {
          schedule: {
            interval: 'daily' // Daily payouts for barbers
          }
        }
      },
      metadata: {
        barberId: barberId,
        barbershopId: barbershopId,
        platform: 'bookedbarber'
      }
    });

    // Save Stripe account ID to financial_arrangements
    const { error: updateError } = await supabase
      .from('financial_arrangements')
      .update({
        barber_stripe_account_id: account.id,
        barber_stripe_onboarded: false,
        updated_at: new Date().toISOString()
      })
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId);

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError);
      // Don't fail the request - account was created successfully
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: 'Stripe Connect account created successfully'
    });

  } catch (error) {
    console.error('Create Stripe Connect account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Stripe account' },
      { status: 500 }
    );
  }
}