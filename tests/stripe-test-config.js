/**
 * Stripe Test Configuration
 * 
 * Complete test configuration for Stripe payment testing including
 * test card numbers, expected behaviors, and webhook event verification.
 * 
 * Usage:
 *   const StripeTestConfig = require('./tests/stripe-test-config.js')
 *   StripeTestConfig.getTestCard('success')
 *   StripeTestConfig.validateWebhookEvent('checkout.session.completed')
 */

/**
 * Stripe Test Card Numbers and Expected Behaviors
 * Source: https://stripe.com/docs/testing#cards
 */
const TEST_CARDS = {
  // Success Cases
  success: {
    visa: {
      number: '4242424242424242',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment succeeds',
      use_case: 'Standard successful payment'
    },
    visa_debit: {
      number: '4000056655665556',
      brand: 'Visa',
      funding: 'debit',
      expected: 'Payment succeeds',
      use_case: 'Debit card payment'
    },
    mastercard: {
      number: '5555555555554444',
      brand: 'Mastercard',
      funding: 'credit',
      expected: 'Payment succeeds',
      use_case: 'Mastercard payment'
    },
    american_express: {
      number: '378282246310005',
      brand: 'American Express',
      funding: 'credit',
      expected: 'Payment succeeds',
      use_case: 'American Express payment'
    },
    discover: {
      number: '6011111111111117',
      brand: 'Discover',
      funding: 'credit',
      expected: 'Payment succeeds',
      use_case: 'Discover card payment'
    }
  },

  // Decline Cases
  decline: {
    generic_decline: {
      number: '4000000000000002',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment declined (generic_decline)',
      error_code: 'card_declined',
      use_case: 'Test general decline handling'
    },
    insufficient_funds: {
      number: '4000000000009995',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment declined (insufficient_funds)',
      error_code: 'card_declined',
      decline_code: 'insufficient_funds',
      use_case: 'Test insufficient funds error'
    },
    lost_card: {
      number: '4000000000009987',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment declined (lost_card)',
      error_code: 'card_declined',
      decline_code: 'lost_card',
      use_case: 'Test lost card handling'
    },
    stolen_card: {
      number: '4000000000009979',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment declined (stolen_card)',
      error_code: 'card_declined',
      decline_code: 'stolen_card',
      use_case: 'Test stolen card handling'
    }
  },

  // Error Cases
  errors: {
    expired_card: {
      number: '4000000000000069',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment fails (expired_card)',
      error_code: 'expired_card',
      use_case: 'Test expired card validation'
    },
    incorrect_cvc: {
      number: '4000000000000127',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment fails (incorrect_cvc)',
      error_code: 'incorrect_cvc',
      use_case: 'Test CVC validation'
    },
    processing_error: {
      number: '4000000000000119',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Payment fails (processing_error)',
      error_code: 'processing_error',
      use_case: 'Test processing error handling'
    }
  },

  // Special Behavior Cards
  special: {
    always_authenticate: {
      number: '4000002760003184',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Requires 3D Secure authentication',
      use_case: 'Test 3D Secure flow'
    },
    offline_pin: {
      number: '4000002500003155',
      brand: 'Visa',
      funding: 'credit',
      expected: 'Requires offline PIN',
      use_case: 'Test offline PIN requirement'
    }
  }
}

/**
 * Test Customer Data for Stripe Checkout
 */
const TEST_CUSTOMER_DATA = {
  standard: {
    email: 'test@bookedbarber.test',
    name: 'Test Customer',
    address: {
      line1: '123 Test Street',
      city: 'Test City',
      state: 'TC',
      postal_code: '10001',
      country: 'US'
    }
  },
  international: {
    email: 'test-intl@bookedbarber.test',
    name: 'International Customer',
    address: {
      line1: '456 International Ave',
      city: 'Toronto',
      state: 'ON',
      postal_code: 'M5V 3A8',
      country: 'CA'
    }
  }
}

/**
 * Expected Webhook Events for Payment Flow
 */
const WEBHOOK_EVENTS = {
  subscription_flow: [
    {
      type: 'checkout.session.completed',
      description: 'Checkout session completed successfully',
      timing: 'Immediately after payment',
      required_data: ['customer', 'subscription', 'metadata'],
      verification: {
        mode: 'subscription',
        payment_status: 'paid',
        metadata: ['supabase_user_id', 'subscription_tier']
      }
    },
    {
      type: 'customer.subscription.created',
      description: 'Subscription created in Stripe',
      timing: 'After checkout completion',
      required_data: ['id', 'customer', 'status', 'current_period_start', 'current_period_end'],
      verification: {
        status: 'active',
        metadata: ['supabase_user_id', 'subscription_tier']
      }
    },
    {
      type: 'invoice.payment_succeeded',
      description: 'Initial payment successful',
      timing: 'After subscription creation',
      required_data: ['subscription', 'customer', 'amount_paid'],
      verification: {
        paid: true,
        attempt_count: 1
      }
    }
  ],
  
  subscription_update: [
    {
      type: 'customer.subscription.updated',
      description: 'Subscription modified (plan change, cancellation)',
      timing: 'When subscription changes',
      required_data: ['id', 'status', 'cancel_at_period_end'],
      verification: {
        status: ['active', 'canceled', 'trialing']
      }
    }
  ],
  
  payment_failure: [
    {
      type: 'invoice.payment_failed',
      description: 'Payment attempt failed',
      timing: 'When payment fails',
      required_data: ['subscription', 'attempt_count', 'next_payment_attempt'],
      verification: {
        paid: false,
        attempt_count: (count) => count >= 1
      }
    }
  ]
}

/**
 * Pricing Configuration for Tests
 */
const PRICING_CONFIG = {
  barber: {
    name: 'Individual Barber',
    monthly: { price: 3500, interval: 'month' }, // $35.00
    yearly: { price: 33600, interval: 'year' }   // $336.00 (20% discount)
  },
  shop: {
    name: 'Barbershop',
    monthly: { price: 9900, interval: 'month' }, // $99.00
    yearly: { price: 95040, interval: 'year' }   // $950.40 (20% discount)
  },
  enterprise: {
    name: 'Multi-Location Enterprise',
    monthly: { price: 24900, interval: 'month' }, // $249.00
    yearly: { price: 239040, interval: 'year' }   // $2,390.40 (20% discount)
  }
}

/**
 * Test Mode Verification
 */
const TEST_MODE_VERIFICATION = {
  stripe_keys: {
    publishable_key_prefix: 'pk_test_',
    secret_key_prefix: 'sk_test_',
    webhook_endpoint_prefix: 'whsec_'
  },
  checkout_urls: {
    test_domain: 'checkout.stripe.com',
    test_mode_indicator: 'TEST MODE'
  },
  payment_methods: {
    allowed_in_test: ['card'],
    test_tokens: ['tok_visa', 'tok_mastercard', 'tok_amex']
  }
}

/**
 * Utility Functions
 */
class StripeTestConfig {
  /**
   * Get a test card configuration
   */
  static getTestCard(category, type = null) {
    if (!TEST_CARDS[category]) {
      throw new Error(`Unknown card category: ${category}`)
    }
    
    if (type) {
      if (!TEST_CARDS[category][type]) {
        throw new Error(`Unknown card type: ${type} in category: ${category}`)
      }
      return TEST_CARDS[category][type]
    }
    
    // Return first card in category if no type specified
    const firstType = Object.keys(TEST_CARDS[category])[0]
    return TEST_CARDS[category][firstType]
  }
  
  /**
   * Get all test cards for a category
   */
  static getTestCardsForCategory(category) {
    if (!TEST_CARDS[category]) {
      throw new Error(`Unknown card category: ${category}`)
    }
    return TEST_CARDS[category]
  }
  
  /**
   * Get customer data for testing
   */
  static getTestCustomer(type = 'standard') {
    if (!TEST_CUSTOMER_DATA[type]) {
      throw new Error(`Unknown customer type: ${type}`)
    }
    return TEST_CUSTOMER_DATA[type]
  }
  
  /**
   * Get expected webhook events for a flow
   */
  static getWebhookEvents(flow) {
    if (!WEBHOOK_EVENTS[flow]) {
      throw new Error(`Unknown webhook flow: ${flow}`)
    }
    return WEBHOOK_EVENTS[flow]
  }
  
  /**
   * Validate webhook event structure
   */
  static validateWebhookEvent(eventType, eventData) {
    const allEvents = Object.values(WEBHOOK_EVENTS).flat()
    const expectedEvent = allEvents.find(event => event.type === eventType)
    
    if (!expectedEvent) {
      return {
        valid: false,
        error: `Unknown event type: ${eventType}`
      }
    }
    
    // Check required data fields
    const missingFields = expectedEvent.required_data.filter(field => 
      !eventData.hasOwnProperty(field)
    )
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }
    }
    
    // Check verification criteria
    if (expectedEvent.verification) {
      for (const [key, expectedValue] of Object.entries(expectedEvent.verification)) {
        if (Array.isArray(expectedValue)) {
          if (!expectedValue.includes(eventData[key])) {
            return {
              valid: false,
              error: `${key} should be one of [${expectedValue.join(', ')}], got: ${eventData[key]}`
            }
          }
        } else if (typeof expectedValue === 'function') {
          if (!expectedValue(eventData[key])) {
            return {
              valid: false,
              error: `${key} validation failed for value: ${eventData[key]}`
            }
          }
        } else if (eventData[key] !== expectedValue) {
          return {
            valid: false,
            error: `${key} should be ${expectedValue}, got: ${eventData[key]}`
          }
        }
      }
    }
    
    return {
      valid: true,
      event: expectedEvent
    }
  }
  
  /**
   * Get pricing for a specific tier and billing period
   */
  static getPricing(tier, billingPeriod = 'monthly') {
    if (!PRICING_CONFIG[tier]) {
      throw new Error(`Unknown pricing tier: ${tier}`)
    }
    
    return PRICING_CONFIG[tier][billingPeriod]
  }
  
  /**
   * Verify test mode configuration
   */
  static verifyTestMode(apiKeys) {
    const errors = []
    
    if (!apiKeys.publishableKey?.startsWith(TEST_MODE_VERIFICATION.stripe_keys.publishable_key_prefix)) {
      errors.push('Publishable key is not in test mode (should start with pk_test_)')
    }
    
    if (!apiKeys.secretKey?.startsWith(TEST_MODE_VERIFICATION.stripe_keys.secret_key_prefix)) {
      errors.push('Secret key is not in test mode (should start with sk_test_)')
    }
    
    if (apiKeys.webhookSecret && !apiKeys.webhookSecret.startsWith(TEST_MODE_VERIFICATION.stripe_keys.webhook_endpoint_prefix)) {
      errors.push('Webhook secret is not in test mode (should start with whsec_)')
    }
    
    return {
      isTestMode: errors.length === 0,
      errors
    }
  }
  
  /**
   * Generate test scenario checklist
   */
  static generateTestChecklist() {
    return {
      setup: [
        'Verify Stripe is in test mode',
        'Create test user accounts',
        'Clear previous test data',
        'Verify webhook endpoint is configured'
      ],
      success_scenarios: [
        'Test with Visa (4242424242424242)',
        'Test with Mastercard (5555555555554444)',
        'Test with American Express (378282246310005)',
        'Test monthly billing',
        'Test yearly billing',
        'Test all subscription tiers'
      ],
      failure_scenarios: [
        'Test generic decline (4000000000000002)',
        'Test insufficient funds (4000000000009995)',
        'Test expired card (4000000000000069)',
        'Test incorrect CVC (4000000000000127)',
        'Test network interruption',
        'Test session timeout'
      ],
      edge_cases: [
        'Test 3D Secure authentication (4000002760003184)',
        'Test international cards',
        'Test mobile payment flow',
        'Test payment method updates',
        'Test subscription cancellation'
      ],
      webhook_verification: [
        'Verify checkout.session.completed',
        'Verify customer.subscription.created',
        'Verify invoice.payment_succeeded',
        'Verify payment failure events',
        'Check webhook retry behavior'
      ]
    }
  }
}

module.exports = {
  StripeTestConfig,
  TEST_CARDS,
  TEST_CUSTOMER_DATA,
  WEBHOOK_EVENTS,
  PRICING_CONFIG,
  TEST_MODE_VERIFICATION
}