import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '../../../../lib/supabase/server'

// Safe Stripe initialization
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
    return null
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
  })
}

// Payment methods configuration
const PAYMENT_METHODS = {
  card: {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, American Express',
    icon: 'credit-card',
    processing_fee: 0.029, // 2.9%
    enabled: true,
    setup_future_usage: 'on_session'
  },
  apple_pay: {
    id: 'apple_pay',
    name: 'Apple Pay',
    description: 'Pay with Touch ID or Face ID',
    icon: 'apple-pay',
    processing_fee: 0.029,
    enabled: true,
    request_apple_pay_domain_verification: true
  },
  google_pay: {
    id: 'google_pay',
    name: 'Google Pay',
    description: 'Pay with your Google account',
    icon: 'google-pay',
    processing_fee: 0.029,
    enabled: true
  },
  link: {
    id: 'link',
    name: 'Link',
    description: 'Pay with Link by Stripe',
    icon: 'link',
    processing_fee: 0.029,
    enabled: true,
    setup_future_usage: 'off_session'
  },
  klarna: {
    id: 'klarna',
    name: 'Klarna',
    description: 'Buy now, pay later in 4 installments',
    icon: 'klarna',
    processing_fee: 0.059, // 5.9% for BNPL
    enabled: true,
    minimum_amount: 10.00,
    maximum_amount: 1000.00,
    supported_currencies: ['usd']
  },
  affirm: {
    id: 'affirm',
    name: 'Affirm',
    description: 'Monthly payments as low as 0% APR',
    icon: 'affirm',
    processing_fee: 0.059,
    enabled: true,
    minimum_amount: 50.00,
    maximum_amount: 30000.00,
    supported_currencies: ['usd']
  },
  afterpay_clearpay: {
    id: 'afterpay_clearpay',
    name: 'Afterpay',
    description: 'Pay in 4 interest-free installments',
    icon: 'afterpay',
    processing_fee: 0.059,
    enabled: true,
    minimum_amount: 1.00,
    maximum_amount: 2000.00,
    supported_currencies: ['usd']
  },
  cash_app: {
    id: 'cashapp',
    name: 'Cash App Pay',
    description: 'Pay with Cash App',
    icon: 'cashapp',
    processing_fee: 0.029,
    enabled: true
  },
  venmo: {
    id: 'venmo',
    name: 'Venmo',
    description: 'Pay with Venmo',
    icon: 'venmo',
    processing_fee: 0.029,
    enabled: true,
    supported_regions: ['US']
  }
}

// GET endpoint for available payment methods
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const amount = parseFloat(searchParams.get('amount') || '0')
    const currency = searchParams.get('currency') || 'usd'
    const customer_id = searchParams.get('customer_id')
    const shop_id = searchParams.get('shop_id')
    const payment_type = searchParams.get('payment_type') || 'full_payment'

    const supabase = createClient()

    // Get shop-specific payment method configuration if shop_id provided
    let shopConfig = null
    if (shop_id) {
      const { data: shopSettings } = await supabase
        .from('shop_payment_settings')
        .select('*')
        .eq('shop_id', shop_id)
        .single()

      if (shopSettings) {
        shopConfig = shopSettings
      }
    }

    // Filter available payment methods based on amount, currency, and shop settings
    const availableMethods = Object.values(PAYMENT_METHODS).filter(method => {
      // Check if method is globally enabled
      if (!method.enabled) return false

      // Check shop-specific settings
      if (shopConfig && shopConfig.disabled_methods?.includes(method.id)) {
        return false
      }

      // Check currency support
      if (method.supported_currencies && !method.supported_currencies.includes(currency)) {
        return false
      }

      // Check amount limits for BNPL methods
      if (method.minimum_amount && amount < method.minimum_amount) {
        return false
      }
      if (method.maximum_amount && amount > method.maximum_amount) {
        return false
      }

      // Check regional restrictions
      if (method.supported_regions) {
        // Would check user's location - for now assume US
        const userRegion = 'US'
        if (!method.supported_regions.includes(userRegion)) {
          return false
        }
      }

      return true
    })

    // Get customer's saved payment methods if customer_id provided
    let savedMethods = []
    if (customer_id) {
      try {
        const stripe = getStripeInstance()
        if (stripe) {
          // Get customer's Stripe ID
          const { data: customer } = await supabase
            .from('users')
            .select('stripe_customer_id')
            .eq('id', customer_id)
            .single()

          if (customer?.stripe_customer_id) {
            const paymentMethods = await stripe.paymentMethods.list({
              customer: customer.stripe_customer_id,
              type: 'card'
            })

            savedMethods = paymentMethods.data.map(pm => ({
              id: pm.id,
              type: 'saved_card',
              name: `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}`,
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
              is_default: false // TODO: Track default payment method
            }))
          }
        }
      } catch (error) {
        console.warn('Failed to fetch saved payment methods:', error)
      }
    }

    // Calculate processing fees for each method
    const methodsWithFees = availableMethods.map(method => ({
      ...method,
      processing_fee_amount: amount * method.processing_fee,
      total_amount_with_fee: amount + (amount * method.processing_fee),
      supports_installments: ['klarna', 'affirm', 'afterpay_clearpay'].includes(method.id)
    }))

    // Get payment method priorities (for ordering)
    const methodPriorities = shopConfig?.method_priorities || {
      card: 1,
      apple_pay: 2,
      google_pay: 3,
      link: 4,
      klarna: 5,
      affirm: 6,
      afterpay_clearpay: 7,
      cash_app: 8,
      venmo: 9
    }

    // Sort methods by priority
    methodsWithFees.sort((a, b) => {
      const priorityA = methodPriorities[a.id] || 999
      const priorityB = methodPriorities[b.id] || 999
      return priorityA - priorityB
    })

    return NextResponse.json({
      success: true,
      available_methods: methodsWithFees,
      saved_methods: savedMethods,
      payment_context: {
        amount,
        currency,
        payment_type,
        shop_id: shop_id || null
      },
      recommendations: {
        fastest: methodsWithFees.find(m => ['apple_pay', 'google_pay', 'link'].includes(m.id)),
        lowest_fee: methodsWithFees.reduce((prev, current) => 
          prev.processing_fee < current.processing_fee ? prev : current
        ),
        buy_now_pay_later: methodsWithFees.filter(m => 
          ['klarna', 'affirm', 'afterpay_clearpay'].includes(m.id)
        )
      }
    })

  } catch (error) {
    console.error('Payment methods retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve payment methods'
    }, { status: 500 })
  }
}

// POST endpoint for setting up payment methods
export async function POST(request) {
  try {
    const {
      action, // 'setup', 'save', 'delete', 'set_default'
      customer_id,
      payment_method_id,
      payment_method_type,
      setup_intent_data = {}
    } = await request.json()

    if (!action || !customer_id) {
      return NextResponse.json({
        success: false,
        error: 'action and customer_id are required'
      }, { status: 400 })
    }

    const stripe = getStripeInstance()
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Payment processing not configured',
        mock_response: {
          setup_intent_id: 'seti_mock_' + Date.now(),
          client_secret: 'seti_mock_' + Date.now() + '_secret_mock',
          status: 'requires_payment_method',
          note: 'Configure Stripe for real payment method setup'
        }
      }, { status: 200 })
    }

    const supabase = createClient()

    if (action === 'setup') {
      // Create setup intent for saving payment methods
      const { data: customer } = await supabase
        .from('users')
        .select('stripe_customer_id, email, name')
        .eq('id', customer_id)
        .single()

      if (!customer) {
        return NextResponse.json({
          success: false,
          error: 'Customer not found'
        }, { status: 404 })
      }

      let stripeCustomerId = customer.stripe_customer_id

      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: customer.name,
          metadata: {
            user_id: customer_id
          }
        })

        stripeCustomerId = stripeCustomer.id

        // Update user record
        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', customer_id)
      }

      // Create setup intent
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: payment_method_type ? [payment_method_type] : ['card'],
        usage: 'on_session',
        metadata: {
          customer_id,
          ...setup_intent_data
        }
      })

      return NextResponse.json({
        success: true,
        setup_intent: {
          id: setupIntent.id,
          client_secret: setupIntent.client_secret,
          status: setupIntent.status
        }
      })
    }

    if (action === 'save' && payment_method_id) {
      // Attach payment method to customer
      const { data: customer } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', customer_id)
        .single()

      if (!customer?.stripe_customer_id) {
        return NextResponse.json({
          success: false,
          error: 'Customer not found or not configured'
        }, { status: 404 })
      }

      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customer.stripe_customer_id
      })

      return NextResponse.json({
        success: true,
        message: 'Payment method saved successfully'
      })
    }

    if (action === 'delete' && payment_method_id) {
      // Detach payment method
      await stripe.paymentMethods.detach(payment_method_id)

      return NextResponse.json({
        success: true,
        message: 'Payment method deleted successfully'
      })
    }

    if (action === 'set_default' && payment_method_id) {
      // Set as default payment method
      const { data: customer } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', customer_id)
        .single()

      if (!customer?.stripe_customer_id) {
        return NextResponse.json({
          success: false,
          error: 'Customer not found'
        }, { status: 404 })
      }

      await stripe.customers.update(customer.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Default payment method updated'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    }, { status: 400 })

  } catch (error) {
    console.error('Payment method management error:', error)
    
    let errorMessage = 'Failed to manage payment method'
    let statusCode = 500
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment method request'
      statusCode = 400
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      error_type: error.type || 'unknown'
    }, { status: statusCode })
  }
}

// PUT endpoint for updating payment method settings
export async function PUT(request) {
  try {
    const {
      shop_id,
      method_settings = {},
      disabled_methods = [],
      method_priorities = {},
      bnpl_settings = {}
    } = await request.json()

    if (!shop_id) {
      return NextResponse.json({
        success: false,
        error: 'shop_id is required'
      }, { status: 400 })
    }

    const supabase = createClient()

    // Update shop payment method settings
    const { data: updatedSettings, error } = await supabase
      .from('shop_payment_settings')
      .upsert({
        shop_id,
        method_settings,
        disabled_methods,
        method_priorities,
        bnpl_settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method settings updated',
      settings: updatedSettings
    })

  } catch (error) {
    console.error('Payment method settings update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update payment method settings'
    }, { status: 500 })
  }
}