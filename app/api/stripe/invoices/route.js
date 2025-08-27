import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Invoice Management
 * 
 * GET /api/stripe/invoices - List invoices
 * POST /api/stripe/invoices - Create invoice
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // 'draft', 'open', 'paid', 'void'

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        invoices: []
      });
    }

    // List invoices from Stripe
    const params = {
      customer: profile.stripe_customer_id,
      limit
    };

    if (status) {
      params.status = status;
    }

    const invoices = await stripe.invoices.list(params);

    return NextResponse.json({
      success: true,
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_due: invoice.amount_due / 100,
        amount_paid: invoice.amount_paid / 100,
        currency: invoice.currency,
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        created: new Date(invoice.created * 1000).toISOString(),
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        description: invoice.description,
        paid: invoice.paid
      })),
      has_more: invoices.has_more
    });

  } catch (error) {
    console.error('List invoices error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list invoices' },
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
      customerId, // Optional - if creating invoice for another customer
      items, // Array of { description, amount, quantity }
      description,
      dueDate, // Optional - days from now
      metadata = {},
      sendImmediately = false
    } = body;

    // Determine target customer
    let targetCustomerId = customerId;
    
    if (!targetCustomerId) {
      // Get user's own Stripe customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, email, full_name')
        .eq('id', user.id)
        .single();

      if (!profile?.stripe_customer_id) {
        // Create Stripe customer if doesn't exist
        const customer = await stripe.customers.create({
          email: profile.email,
          name: profile.full_name,
          metadata: {
            user_id: user.id
          }
        });
        
        targetCustomerId = customer.id;

        // Save customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: targetCustomerId })
          .eq('id', user.id);
      } else {
        targetCustomerId = profile.stripe_customer_id;
      }
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: targetCustomerId,
      description,
      due_date: dueDate ? Math.floor(Date.now() / 1000) + (dueDate * 86400) : undefined,
      metadata: {
        ...metadata,
        created_by: user.id,
        platform: 'bookedbarber'
      },
      auto_advance: sendImmediately, // Automatically finalize if true
      collection_method: 'send_invoice'
    });

    // Add line items to invoice
    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: targetCustomerId,
        invoice: invoice.id,
        description: item.description,
        amount: Math.round(item.amount * 100), // Convert to cents
        quantity: item.quantity || 1,
        currency: 'usd'
      });
    }

    // Finalize and send if requested
    let finalizedInvoice = invoice;
    if (sendImmediately) {
      finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      await stripe.invoices.sendInvoice(invoice.id);
    }

    // Record invoice in database
    await supabase
      .from('invoice_history')
      .insert({
        stripe_invoice_id: finalizedInvoice.id,
        customer_id: targetCustomerId,
        amount: finalizedInvoice.total / 100,
        currency: finalizedInvoice.currency,
        status: finalizedInvoice.status,
        description,
        created_by: user.id
      });

    return NextResponse.json({
      success: true,
      invoice: {
        id: finalizedInvoice.id,
        number: finalizedInvoice.number,
        status: finalizedInvoice.status,
        amount_due: finalizedInvoice.amount_due / 100,
        currency: finalizedInvoice.currency,
        hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
        invoice_pdf: finalizedInvoice.invoice_pdf,
        sent: sendImmediately
      }
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stripe/invoices
 * Update invoice (send, void, mark paid)
 */
export async function PUT(request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, action } = body; // action: 'send', 'void', 'mark_paid', 'finalize'

    if (!invoiceId || !action) {
      return NextResponse.json({ 
        error: 'Invoice ID and action are required' 
      }, { status: 400 });
    }

    let updatedInvoice;

    switch (action) {
      case 'send':
        updatedInvoice = await stripe.invoices.sendInvoice(invoiceId);
        break;
      
      case 'void':
        updatedInvoice = await stripe.invoices.voidInvoice(invoiceId);
        break;
      
      case 'mark_paid':
        updatedInvoice = await stripe.invoices.pay(invoiceId);
        break;
      
      case 'finalize':
        updatedInvoice = await stripe.invoices.finalizeInvoice(invoiceId);
        break;
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

    // Update database record
    await supabase
      .from('invoice_history')
      .update({
        status: updatedInvoice.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_invoice_id', invoiceId);

    return NextResponse.json({
      success: true,
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        amount_due: updatedInvoice.amount_due / 100,
        hosted_invoice_url: updatedInvoice.hosted_invoice_url
      }
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice' },
      { status: 500 }
    );
  }
}