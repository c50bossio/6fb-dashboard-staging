import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { 
  PaymentResponseFormatters,
  handlePOSError,
  extractPOSParams,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createServiceUnavailableResponse
} from '@/lib/unified-pos-response-handler'

export const runtime = 'nodejs'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    
    // Get session and user
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      barbershopId,
      barberId,
      cartItems,
      customerContact,
      contactMethod = 'sms',
      expiresInHours = 24
    } = body

    // Validate required fields
    if (!barbershopId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: barbershopId, cartItems' },
        { status: 400 }
      )
    }

    if (!customerContact || !customerContact.trim()) {
      return NextResponse.json(
        { error: 'Customer contact information is required' },
        { status: 400 }
      )
    }

    if (!['sms', 'email'].includes(contactMethod)) {
      return NextResponse.json(
        { error: 'Contact method must be sms or email' },
        { status: 400 }
      )
    }

    // Validate user has access to this barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, barbershop_staff!inner(*)')
      .eq('id', session.user.id)
      .single()

    const userShopId = profile?.shop_id || 
      (profile?.barbershop_staff && profile.barbershop_staff.length > 0 
        ? profile.barbershop_staff[0].barbershop_id 
        : null)

    if (userShopId !== barbershopId) {
      return NextResponse.json(
        { error: 'Unauthorized: No access to this barbershop' },
        { status: 403 }
      )
    }

    // Get barbershop's Stripe Connect account
    const { data: stripeAccount } = await supabase
      .from('stripe_connected_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('barbershop_id', barbershopId)
      .eq('onboarding_completed', true)
      .single()

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      return NextResponse.json(
        { error: 'Stripe Connect account not properly configured for this barbershop' },
        { status: 400 }
      )
    }

    // Calculate totals
    let subtotal = 0
    const lineItems = cartItems.map(item => {
      const itemTotal = item.price * item.quantity
      subtotal += itemTotal

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description || undefined,
            images: item.image_url ? [item.image_url] : undefined,
            metadata: {
              product_id: item.id,
              sku: item.sku || undefined
            }
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      }
    })

    const tax = cartItems.reduce((sum, item) => {
      const itemTax = (item.price * item.quantity * (item.tax_rate || 0)) / 100
      return sum + itemTax
    }, 0)

    const totalAmount = subtotal + tax

    // Create expiration date
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        },
      },
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      custom_fields: [
        {
          key: 'phone_number',
          label: {
            type: 'custom',
            custom: 'Phone Number'
          },
          type: 'text',
          optional: false
        }
      ],
      metadata: {
        barbershop_id: barbershopId,
        barber_id: barberId || null,
        customer_contact: customerContact,
        contact_method: contactMethod,
        source: 'pos_system',
        cart_item_count: cartItems.length.toString()
      }
    }, {
      stripeAccount: stripeAccount.stripe_account_id
    })

    // Store payment link in database
    const { data: paymentLinkRecord, error: insertError } = await supabase
      .from('pos_payment_links')
      .insert({
        barbershop_id: barbershopId,
        barber_id: barberId,
        cart_data: {
          items: cartItems,
          subtotal: subtotal,
          tax: tax,
          total: totalAmount,
          currency: 'usd',
          created_by: session.user.id
        },
        payment_link_url: paymentLink.url,
        customer_contact: customerContact.trim(),
        contact_method: contactMethod,
        stripe_session_id: null, // Will be set when customer clicks the link
        amount: totalAmount,
        expires_at: expiresAt.toISOString(),
        metadata: {
          stripe_payment_link_id: paymentLink.id,
          stripe_account_id: stripeAccount.stripe_account_id,
          line_items_count: lineItems.length,
          created_by_user: session.user.email
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing payment link:', insertError)
      
      // Clean up Stripe payment link if database insert failed
      try {
        await stripe.paymentLinks.update(paymentLink.id, {
          active: false
        }, {
          stripeAccount: stripeAccount.stripe_account_id
        })
      } catch (cleanupError) {
        console.error('Error cleaning up Stripe payment link:', cleanupError)
      }

      return NextResponse.json(
        { error: 'Failed to store payment link' },
        { status: 500 }
      )
    }

    // Send the payment link via SMS or Email
    let sendResult = { success: false, message: 'Not sent' }
    
    try {
      if (contactMethod === 'sms') {
        sendResult = await sendPaymentLinkSMS(customerContact, paymentLink.url, {
          barbershopName: profile?.shop_name || 'Barbershop',
          total: totalAmount
        })
      } else if (contactMethod === 'email') {
        sendResult = await sendPaymentLinkEmail(customerContact, paymentLink.url, {
          barbershopName: profile?.shop_name || 'Barbershop',
          total: totalAmount,
          cartItems: cartItems
        })
      }

      // Update the payment link record with send status
      await supabase
        .from('pos_payment_links')
        .update({
          metadata: {
            ...paymentLinkRecord.metadata,
            send_result: sendResult,
            sent_at: new Date().toISOString()
          }
        })
        .eq('id', paymentLinkRecord.id)

    } catch (sendError) {
      console.error('Error sending payment link:', sendError)
      // Don't fail the entire request if sending fails
      sendResult = {
        success: false,
        message: sendError.message || 'Failed to send payment link'
      }
    }

    const responseData = PaymentResponseFormatters.paymentLink({
      id: paymentLinkRecord.id,
      url: paymentLink.url,
      expiresAt: expiresAt,
      amount: totalAmount,
      customer_contact: customerContact,
      contact_method: contactMethod,
      send_result: sendResult,
      barbershop_id: barbershopId,
      barber_id: barberId,
      created_at: paymentLinkRecord.created_at,
      currency: 'usd',
      status: 'pending'
    })

    return NextResponse.json(responseData)

  } catch (error) {
    const errorResponse = handlePOSError(error, {
      operation: 'payment_link_creation',
      barbershopId: body.barbershopId
    })
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

// Helper function to send payment link via SMS
async function sendPaymentLinkSMS(phoneNumber, paymentUrl, context) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, message: 'Twilio not configured' }
    }

    const twilio = require('twilio')(accountSid, authToken)

    const message = `Hi! Your order from ${context.barbershopName} is ready. Total: $${context.total.toFixed(2)}. Complete your payment here: ${paymentUrl}`

    const result = await twilio.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber
    })

    return {
      success: true,
      message: 'SMS sent successfully',
      message_sid: result.sid
    }
  } catch (error) {
    console.error('SMS sending error:', error)
    return {
      success: false,
      message: error.message || 'Failed to send SMS'
    }
  }
}

// Helper function to send payment link via Email
async function sendPaymentLinkEmail(email, paymentUrl, context) {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    if (!process.env.SENDGRID_API_KEY) {
      return { success: false, message: 'SendGrid not configured' }
    }

    const itemsList = context.cartItems
      .map(item => `• ${item.name} (${item.quantity}x) - $${(item.price * item.quantity).toFixed(2)}`)
      .join('\n')

    const emailContent = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
      subject: `Your order from ${context.barbershopName} is ready!`,
      text: `
Hi!

Your order from ${context.barbershopName} is ready for payment.

Items:
${itemsList}

Total: $${context.total.toFixed(2)}

Click here to complete your payment:
${paymentUrl}

Thank you for your business!

${context.barbershopName}
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your order is ready!</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px 0; }
        .items { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .total { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Your order is ready!</h1>
        <p>From ${context.barbershopName}</p>
    </div>
    
    <div class="content">
        <p>Hi!</p>
        <p>Your order from ${context.barbershopName} is ready for payment.</p>
        
        <div class="items">
            <h3>Order Summary:</h3>
            ${context.cartItems.map(item => `
                <p>• ${item.name} (${item.quantity}x) - $${(item.price * item.quantity).toFixed(2)}</p>
            `).join('')}
        </div>
        
        <div class="total">Total: $${context.total.toFixed(2)}</div>
        
        <div style="text-align: center;">
            <a href="${paymentUrl}" class="button">Complete Payment</a>
        </div>
        
        <p>Thank you for your business!</p>
        <p><strong>${context.barbershopName}</strong></p>
    </div>
    
    <div class="footer">
        <p>This payment link will expire in 24 hours.</p>
    </div>
</body>
</html>
      `
    }

    const result = await sgMail.send(emailContent)

    return {
      success: true,
      message: 'Email sent successfully',
      message_id: result[0].headers['x-message-id']
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      message: error.message || 'Failed to send email'
    }
  }
}