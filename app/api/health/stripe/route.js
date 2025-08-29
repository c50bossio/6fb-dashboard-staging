import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe with error handling
let stripe = null
let stripeError = null

try {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (stripeKey && stripeKey !== 'your_stripe_secret_key_here') {
    stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16'
    })
  } else {
    stripeError = 'Stripe API key not configured'
  }
} catch (error) {
  stripeError = `Stripe initialization error: ${error.message}`
}

export async function GET() {
  try {
    // Check if Stripe is properly configured
    if (!stripe) {
      return NextResponse.json({
        status: 'unconfigured',
        message: stripeError || 'Stripe is not configured',
        timestamp: new Date().toISOString(),
        details: {
          configured: false,
          hasApiKey: !!process.env.STRIPE_SECRET_KEY,
          error: stripeError
        }
      }, { status: 503 })
    }

    // Test Stripe connection by fetching account info
    try {
      // Try to retrieve account balance as a simple health check
      const balance = await stripe.balance.retrieve()
      
      // If we get here, Stripe is working
      return NextResponse.json({
        status: 'healthy',
        message: 'Stripe connection is active',
        timestamp: new Date().toISOString(),
        details: {
          configured: true,
          hasApiKey: true,
          connectionTest: 'success',
          currency: balance.available?.[0]?.currency || 'usd',
          livemode: balance.livemode || false
        }
      })
    } catch (stripeApiError) {
      // Handle specific Stripe API errors
      if (stripeApiError.type === 'StripeAuthenticationError') {
        return NextResponse.json({
          status: 'error',
          message: 'Invalid Stripe API key',
          timestamp: new Date().toISOString(),
          details: {
            configured: true,
            hasApiKey: true,
            connectionTest: 'failed',
            error: 'Authentication failed - check your API key'
          }
        }, { status: 401 })
      }
      
      if (stripeApiError.type === 'StripeConnectionError') {
        return NextResponse.json({
          status: 'error',
          message: 'Cannot connect to Stripe API',
          timestamp: new Date().toISOString(),
          details: {
            configured: true,
            hasApiKey: true,
            connectionTest: 'failed',
            error: 'Network error - cannot reach Stripe servers'
          }
        }, { status: 503 })
      }

      // Other Stripe errors
      return NextResponse.json({
        status: 'error',
        message: 'Stripe API error',
        timestamp: new Date().toISOString(),
        details: {
          configured: true,
          hasApiKey: true,
          connectionTest: 'failed',
          error: stripeApiError.message || 'Unknown Stripe error',
          type: stripeApiError.type
        }
      }, { status: 500 })
    }
  } catch (error) {
    // Unexpected errors
    console.error('Stripe health check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      details: {
        configured: !!stripe,
        hasApiKey: !!process.env.STRIPE_SECRET_KEY,
        error: error.message || 'Unknown error'
      }
    }, { status: 500 })
  }
}

// POST endpoint for testing Stripe with a test charge (optional)
export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json({
        error: 'Stripe is not configured',
        details: stripeError
      }, { status: 503 })
    }

    const body = await request.json()
    const { test_mode } = body

    if (test_mode) {
      // Create a test payment intent to verify full functionality
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 100, // $1.00 in cents
          currency: 'usd',
          metadata: {
            test: 'true',
            health_check: 'true'
          }
        })

        // Immediately cancel it since this is just a test
        await stripe.paymentIntents.cancel(paymentIntent.id)

        return NextResponse.json({
          status: 'healthy',
          message: 'Stripe full functionality test passed',
          timestamp: new Date().toISOString(),
          test: {
            payment_intent_created: true,
            payment_intent_cancelled: true,
            test_id: paymentIntent.id
          }
        })
      } catch (testError) {
        return NextResponse.json({
          status: 'error',
          message: 'Stripe functionality test failed',
          timestamp: new Date().toISOString(),
          error: testError.message
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Stripe is configured',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Stripe health check POST error:', error)
    return NextResponse.json({
      error: 'Health check failed',
      details: error.message
    }, { status: 500 })
  }
}