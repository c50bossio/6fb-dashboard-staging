import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { 
  PaymentResponseFormatters,
  formatPaymentStatusResponse,
  handlePOSError,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createNotFoundErrorResponse
} from '@/lib/unified-pos-response-handler'
import { stripeConnectService } from '@/services/stripe-connect-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * POST: Process Terminal payment
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      barbershopId,
      barberId,
      customerId,
      readerId,
      cartItems,
      paymentMethodId,
      customerEmail,
      customerPhone,
      subtotal,
      processingFee
    } = body

    // Validate required fields
    if (!barbershopId || !readerId || !cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: barbershopId, readerId, cartItems' },
        { status: 400 }
      )
    }

    // Verify access to barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id, name')
      .eq('id', barbershopId)
      .single()

    // Allow access if:
    // 1. User's profile is associated with this barbershop
    // 2. User is the owner of this barbershop
    // 3. User has admin/owner privileges
    // 4. User is a BARBER (needs terminal access for POS)
    const allowedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'BARBER']
    const hasAccess = profile?.barbershop_id === barbershopId ||
                     barbershop?.owner_id === user.id ||
                     allowedRoles.includes(profile?.role)

    if (!hasAccess) {
      console.error('Access denied - Profile:', profile, 'Barbershop:', barbershop)
      return NextResponse.json(
        { error: 'Access denied to this barbershop' },
        { status: 403 }
      )
    }

    // Get reader details
    const { data: reader, error: readerError } = await supabase
      .from('terminal_readers')
      .select('*')
      .eq('id', readerId)
      .eq('barbershop_id', barbershopId)
      .single()

    if (readerError || !reader) {
      return NextResponse.json(
        { error: 'Terminal reader not found' },
        { status: 404 }
      )
    }

    if (reader.status !== 'online') {
      return NextResponse.json(
        { error: `Terminal reader is ${reader.status}. Please ensure it is online.` },
        { status: 409 }
      )
    }

    // Calculate totals
    // If subtotal and processingFee are provided from frontend, use them
    // Otherwise fallback to calculating from cart items (backward compatibility)
    const calculatedSubtotal = subtotal || cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const calculatedProcessingFee = processingFee || 0
    const tax = cartItems.reduce((sum, item) => {
      const itemTax = (item.price * item.quantity * (item.tax_rate || 0)) / 100
      return sum + itemTax
    }, 0)

    // Total includes subtotal + processing fee + tax
    const totalAmount = Math.round((calculatedSubtotal + calculatedProcessingFee + tax) * 100) // Convert to cents

    // Get barber's Stripe Connect account if specified
    let connectedAccountId = null
    if (barberId) {
      const { data: financialArrangement } = await supabase
        .from('financial_arrangements')
        .select('barber_stripe_account_id, barber_stripe_onboarded')
        .eq('barber_id', barberId)
        .single()

      if (financialArrangement?.barber_stripe_onboarded && financialArrangement?.barber_stripe_account_id) {
        connectedAccountId = financialArrangement.barber_stripe_account_id
      }
    }

    // Create payment intent for Terminal
    const paymentIntentData = {
      amount: totalAmount,
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      description: `POS Sale - ${barbershop.name}`,
      metadata: {
        barbershop_id: barbershopId,
        barbershop_name: barbershop.name,
        barber_id: barberId || '',
        customer_id: customerId || '',
        reader_id: readerId,
        platform: 'bookedbarber',
        payment_type: 'terminal',
        items_count: cartItems.length.toString(),
        subtotal_cents: Math.round(calculatedSubtotal * 100).toString(),
        processing_fee_cents: Math.round(calculatedProcessingFee * 100).toString(),
        tax_cents: Math.round(tax * 100).toString(),
        stripe_fee_rate: '0.027',
        platform_fee_cents: connectedAccountId ? (Math.round(calculatedProcessingFee * 100) - Math.round(totalAmount * 0.027)).toString() : '0'
      }
    }

    // Add Connect account handling if available
    if (connectedAccountId) {
      // Calculate platform margin from processing fee
      // Customer pays: Subtotal + Processing Fee (2.9% + 30¢)
      // Stripe charges barber's account: 2.7% of total
      // Platform keeps: Processing Fee - Actual Stripe Fee

      const processingFeeCents = Math.round(calculatedProcessingFee * 100)
      const actualStripeFee = Math.round(totalAmount * 0.027) // 2.7% Terminal rate

      // Application fee is your profit: what customer paid for processing minus what Stripe actually charges
      const platformFee = processingFeeCents - actualStripeFee

      // Only set application fee if positive (should always be positive with 2.9% rate)
      if (platformFee > 0) {
        paymentIntentData.application_fee_amount = platformFee
        paymentIntentData.transfer_data = {
          destination: connectedAccountId
        }
      }
    }

    // Add customer information if available
    if (customerEmail || customerPhone) {
      paymentIntentData.receipt_email = customerEmail || undefined
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    // Store payment intent in database
    const { data: dbPaymentIntent, error: piError } = await supabase
      .from('terminal_payment_intents')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        barbershop_id: barbershopId,
        barber_id: barberId,
        customer_id: customerId,
        reader_id: readerId,
        amount_cents: totalAmount,
        currency: 'usd',
        status: paymentIntent.status,
        payment_method_types: paymentIntent.payment_method_types,
        metadata: {
          cart_items: cartItems,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          connected_account_id: connectedAccountId,
          subtotal_cents: Math.round(calculatedSubtotal * 100),
          processing_fee_cents: Math.round(calculatedProcessingFee * 100),
          actual_stripe_fee_cents: connectedAccountId ? Math.round(totalAmount * 0.027) : 0,
          platform_fee_cents: connectedAccountId ? (Math.round(calculatedProcessingFee * 100) - Math.round(totalAmount * 0.027)) : 0,
          // Legacy field for backward compatibility
          platform_fee: connectedAccountId ? (Math.round(calculatedProcessingFee * 100) - Math.round(totalAmount * 0.027)) : 0
        }
      })
      .select()
      .single()

    if (piError) {
      console.error('Database error storing payment intent:', piError)
      // Continue with Stripe operation, but log the error
    }

    // Update reader status to busy
    await supabase
      .from('terminal_readers')
      .update({ status: 'busy', last_seen_at: new Date() })
      .eq('id', readerId)

    // Return standardized terminal payment response
    const responseData = PaymentResponseFormatters.terminalPayment({
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: totalAmount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      },
      reader: {
        id: reader.id,
        stripe_reader_id: reader.stripe_reader_id,
        status: 'busy'
      },
      barbershop_id: barbershopId,
      barber_id: barberId,
      customer_id: customerId,
      metadata: {
        subtotal: calculatedSubtotal,
        processing_fee: calculatedProcessingFee,
        tax: tax,
        total: totalAmount / 100,
        items_count: cartItems.length,
        connected_account: !!connectedAccountId,
        platform_margin: connectedAccountId ? ((calculatedProcessingFee * 100) - (totalAmount * 0.027)) / 100 : 0
      }
    })

    return NextResponse.json(responseData)

  } catch (error) {
    const errorResponse = handlePOSError(error, {
      operation: 'terminal_payment_processing',
      barbershopId: barbershopId,
      readerId: readerId
    })
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * PUT: Update payment intent status (webhook or manual update)
 */
export async function PUT(request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paymentIntentId, status, readerId } = body

    if (!paymentIntentId || !status) {
      return NextResponse.json(
        { error: 'Payment intent ID and status are required' },
        { status: 400 }
      )
    }

    // Update payment intent status
    const { data: updatedPaymentIntent, error: updateError } = await supabase
      .from('terminal_payment_intents')
      .update({ 
        status,
        updated_at: new Date()
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error updating payment intent:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment intent' },
        { status: 500 }
      )
    }

    // Update reader status back to online if payment completed/failed
    if (readerId && (status === 'succeeded' || status === 'canceled' || status === 'payment_failed')) {
      await supabase
        .from('terminal_readers')
        .update({ 
          status: 'online',
          last_seen_at: new Date()
        })
        .eq('id', readerId)
    }

    // If payment succeeded, process inventory updates
    if (status === 'succeeded') {
      try {
        await processInventoryUpdates(supabase, updatedPaymentIntent)
      } catch (inventoryError) {
        console.error('Inventory update error:', inventoryError)
        // Don't fail the payment update for inventory errors
      }
    }

    const statusResponse = formatPaymentStatusResponse({
      ...updatedPaymentIntent,
      stripe_payment_intent_id: updatedPaymentIntent.stripe_payment_intent_id,
      amount: updatedPaymentIntent.amount_cents,
      currency: updatedPaymentIntent.currency,
      status: updatedPaymentIntent.status,
      barbershop_id: updatedPaymentIntent.barbershop_id,
      barber_id: updatedPaymentIntent.barber_id,
      customer_id: updatedPaymentIntent.customer_id,
      reader_id: updatedPaymentIntent.reader_id,
      charges: updatedPaymentIntent.charges
    }, 'terminal')

    return NextResponse.json(statusResponse)

  } catch (error) {
    const errorResponse = handlePOSError(error, {
      operation: 'terminal_payment_update',
      paymentIntentId: paymentIntentId
    })
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

/**
 * Process inventory updates after successful payment
 */
async function processInventoryUpdates(supabase, paymentIntent) {
  const cartItems = paymentIntent.metadata?.cart_items || []
  
  if (cartItems.length === 0) {
    return
  }

  for (const item of cartItems) {
    // Update product stock
    await supabase
      .from('products')
      .update({
        current_stock: item.current_stock - item.quantity
      })
      .eq('id', item.id)

    // Record sale
    await supabase
      .from('pos_sales')
      .insert({
        barbershop_id: paymentIntent.barbershop_id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        barber_id: paymentIntent.barber_id,
        customer_id: paymentIntent.customer_id,
        payment_method: 'terminal',
        payment_intent_id: paymentIntent.stripe_payment_intent_id,
        receipt_number: `TRM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      })
  }

  // Record inventory movement
  for (const item of cartItems) {
    await supabase
      .from('inventory_movements')
      .insert({
        barbershop_id: paymentIntent.barbershop_id,
        product_id: item.id,
        movement_type: 'sale',
        quantity: -item.quantity, // Negative for sale
        unit_price: item.price,
        reference_type: 'terminal_sale',
        reference_id: paymentIntent.id,
        notes: `Terminal sale - Reader ID: ${paymentIntent.reader_id}`
      })
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}