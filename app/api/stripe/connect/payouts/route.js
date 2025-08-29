import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripeConnectService } from '@/services/stripe-connect-service';

/**
 * Stripe Connect Payout Management
 * 
 * GET /api/stripe/connect/payouts - List payouts
 * POST /api/stripe/connect/payouts - Create manual payout
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
    const barbershopId = searchParams.get('barbershopId');
    const barberId = searchParams.get('barberId') || user.id;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get financial arrangement
    const { data: arrangement } = await supabase
      .from('financial_arrangements')
      .select('barber_stripe_account_id')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .single();

    if (!arrangement?.barber_stripe_account_id) {
      return NextResponse.json({ 
        error: 'No Stripe account found' 
      }, { status: 404 });
    }

    // Get account balance
    const balance = await stripeConnectService.getAccountBalance(
      arrangement.barber_stripe_account_id
    );

    // Get recent transactions
    const transactions = await stripeConnectService.listTransactions(
      arrangement.barber_stripe_account_id,
      limit
    );

    return NextResponse.json({
      success: true,
      balance: {
        available: balance.available.map(b => ({
          amount: b.amount / 100, // Convert cents to dollars
          currency: b.currency
        })),
        pending: balance.pending.map(p => ({
          amount: p.amount / 100,
          currency: p.currency
        }))
      },
      transactions: transactions.transactions.map(t => ({
        id: t.id,
        amount: t.amount / 100,
        currency: t.currency,
        type: t.type,
        description: t.description,
        created: new Date(t.created * 1000).toISOString(),
        available_on: new Date(t.available_on * 1000).toISOString(),
        fee: t.fee / 100,
        net: t.net / 100
      })),
      hasMore: transactions.hasMore
    });

  } catch (error) {
    console.error('List payouts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list payouts' },
      { status: 500 }
    );
  }
}

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
      barbershopId,
      barberId = user.id,
      amount, // in dollars
      description = 'Manual payout request'
    } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid payout amount' 
      }, { status: 400 });
    }

    // Get financial arrangement
    const { data: arrangement } = await supabase
      .from('financial_arrangements')
      .select('barber_stripe_account_id, barber_stripe_onboarded')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .single();

    if (!arrangement?.barber_stripe_account_id) {
      return NextResponse.json({ 
        error: 'No Stripe account found' 
      }, { status: 404 });
    }

    if (!arrangement.barber_stripe_onboarded) {
      return NextResponse.json({ 
        error: 'Stripe account not fully onboarded' 
      }, { status: 400 });
    }

    // Check available balance
    const balance = await stripeConnectService.getAccountBalance(
      arrangement.barber_stripe_account_id
    );

    const availableUSD = balance.available.find(b => b.currency === 'usd');
    const availableAmount = availableUSD ? availableUSD.amount / 100 : 0;

    if (availableAmount < amount) {
      return NextResponse.json({ 
        error: `Insufficient balance. Available: $${availableAmount.toFixed(2)}` 
      }, { status: 400 });
    }

    // Create payout
    const payout = await stripeConnectService.createPayout({
      accountId: arrangement.barber_stripe_account_id,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      description,
      metadata: {
        barberId,
        barbershopId,
        requested_by: user.id,
        requested_at: new Date().toISOString()
      }
    });

    // Record payout in database
    await supabase
      .from('payout_history')
      .insert({
        barbershop_id: barbershopId,
        barber_id: barberId,
        stripe_payout_id: payout.payout.id,
        amount: amount,
        currency: 'usd',
        status: payout.payout.status,
        description,
        created_by: user.id
      });

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.payout.id,
        amount: payout.payout.amount / 100,
        currency: payout.payout.currency,
        status: payout.payout.status,
        arrival_date: new Date(payout.payout.arrival_date * 1000).toISOString(),
        method: payout.payout.method
      }
    });

  } catch (error) {
    console.error('Create payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payout' },
      { status: 500 }
    );
  }
}