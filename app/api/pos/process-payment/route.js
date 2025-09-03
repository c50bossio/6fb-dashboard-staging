import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      barbershop_id, 
      staff_id, 
      customer_id, 
      items, 
      subtotal, 
      tip_amount, 
      total, 
      payment_method 
    } = body;

    if (!barbershop_id || !staff_id || !items || items.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Verify staff has access to this barbershop
    const { data: staffAccess, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('user_id', staff_id)
      .eq('is_active', true)
      .single();

    if (staffError && staffError.code !== 'PGRST116') {
      console.error('Staff access check error:', staffError);
      return NextResponse.json({ 
        error: 'Failed to verify staff access' 
      }, { status: 500 });
    }

    if (!staffAccess) {
      return NextResponse.json({ 
        error: 'Staff does not have access to this barbershop' 
      }, { status: 403 });
    }

    // Create customer if needed (walk-in customer)
    let finalCustomerId = customer_id;
    if (!customer_id) {
      const { data: walkInCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          barbershop_id: barbershop_id,
          name: 'Walk-in Customer',
          email: null,
          phone: null,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('Failed to create walk-in customer:', customerError);
      } else {
        finalCustomerId = walkInCustomer.id;
      }
    }

    // Process payment based on method
    let paymentIntentId = null;
    let transactionId = null;

    if (payment_method === 'card') {
      // For MVP, we'll create a payment intent for card processing
      // In production, this would handle actual card processing
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100), // Convert to cents
          currency: 'usd',
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            barbershop_id: barbershop_id.toString(),
            staff_id: staff_id.toString(),
            customer_id: finalCustomerId?.toString() || 'walk_in',
          },
        });

        paymentIntentId = paymentIntent.id;
        
        // For MVP, we'll mark it as succeeded immediately
        // In production, this would be handled by webhooks
        await stripe.paymentIntents.confirm(paymentIntent.id, {
          payment_method: 'pm_card_visa', // Test payment method
        });
        
      } catch (stripeError) {
        console.error('Stripe payment error:', stripeError);
        return NextResponse.json({ 
          error: 'Payment processing failed' 
        }, { status: 500 });
      }
    }

    // Create appointments for each service
    const appointmentPromises = items.map(async (item) => {
      const appointmentData = {
        barbershop_id: barbershop_id,
        customer_id: finalCustomerId,
        service_id: item.id,
        staff_id: staff_id,
        date: new Date().toISOString().split('T')[0], // Today's date
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + (item.duration_minutes || 30) * 60000).toISOString(),
        status: 'completed', // POS transactions are immediate completions
        price: parseFloat(item.price),
        quantity: item.quantity,
        notes: `POS Transaction - ${payment_method.toUpperCase()}`,
        created_at: new Date().toISOString()
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select('id')
        .single();

      if (appointmentError) {
        console.error('Failed to create appointment:', appointmentError);
        throw appointmentError;
      }

      return appointment;
    });

    const appointments = await Promise.all(appointmentPromises);

    // Create payment record
    const paymentData = {
      barbershop_id: barbershop_id,
      customer_id: finalCustomerId,
      staff_id: staff_id,
      amount: parseFloat(subtotal),
      tip_amount: parseFloat(tip_amount || 0),
      total_amount: parseFloat(total),
      payment_method: payment_method,
      stripe_payment_intent_id: paymentIntentId,
      transaction_id: transactionId,
      status: 'completed',
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      metadata: {
        pos_transaction: true,
        items: items,
        appointment_ids: appointments.map(a => a.id)
      }
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select('*')
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      return NextResponse.json({ 
        error: 'Failed to record payment' 
      }, { status: 500 });
    }

    // Update appointment records with payment information
    const appointmentIds = appointments.map(a => a.id);
    if (appointmentIds.length > 0) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ payment_id: payment.id })
        .in('id', appointmentIds);

      if (updateError) {
        console.error('Failed to link appointments to payment:', updateError);
      }
    }

    // Calculate commission for staff (using existing commission logic)
    try {
      // Get staff commission rate
      const { data: staffData, error: staffDataError } = await supabase
        .from('barbershop_staff')
        .select('commission_rate')
        .eq('barbershop_id', barbershop_id)
        .eq('user_id', staff_id)
        .single();

      const commissionRate = staffData?.commission_rate || 0.20; // Default 20%
      const commissionAmount = subtotal * commissionRate;

      if (commissionAmount > 0) {
        const commissionData = {
          staff_id: staff_id,
          barbershop_id: barbershop_id,
          payment_id: payment.id,
          amount: commissionAmount,
          rate: commissionRate,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        await supabase
          .from('staff_commissions')
          .insert(commissionData);
      }
    } catch (commissionError) {
      console.error('Commission calculation error:', commissionError);
      // Don't fail the transaction for commission errors
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      transaction_id: payment.transaction_id,
      stripe_payment_intent_id: paymentIntentId,
      total: total,
      receipt_data: {
        payment_id: payment.id,
        items: items,
        subtotal: subtotal,
        tip_amount: tip_amount,
        total: total,
        payment_method: payment_method,
        timestamp: payment.created_at
      }
    });

  } catch (error) {
    console.error('POS payment processing error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}