
class MockStripeService {
  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || 'mock-stripe-secret'
    this.publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'mock-stripe-public'
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
      amount,
      currency,
      metadata
    })

    await new Promise(resolve => setTimeout(resolve, 200))

    return {
      id: `pi_mock_${Date.now()}`,
      object: 'payment_intent',
      amount,
      currency,
      status: 'requires_payment_method',
      client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      metadata,
      created: Math.floor(Date.now() / 1000)
    }
  }

  async chargeCampaign(accountId, amount, description) {
      accountId,
      amount,
      description
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    return {
      success: true,
      chargeId: `ch_mock_${Date.now()}`,
      paymentIntentId: `pi_mock_${Date.now()}`,
      amount,
      currency: 'usd',
      status: 'succeeded',
      receipt_url: `https://dashboard.stripe.com/test/receipts/mock_${Date.now()}`,
      invoice: `inv_mock_${Date.now()}`,
      description,
      metadata: {
        accountId,
        type: 'campaign_billing'
      },
      created: new Date().toISOString()
    }
  }

  async createCustomer(email, name, metadata = {}) {
      email,
      name
    })

    return {
      id: `cus_mock_${Date.now()}`,
      object: 'customer',
      email,
      name,
      metadata,
      created: Math.floor(Date.now() / 1000)
    }
  }

  async attachPaymentMethod(customerId, paymentMethodId) {
      customerId,
      paymentMethodId
    })

    return {
      id: paymentMethodId || `pm_mock_${Date.now()}`,
      object: 'payment_method',
      customer: customerId,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2026
      },
      created: Math.floor(Date.now() / 1000)
    }
  }

  async createSubscription(customerId, priceId, metadata = {}) {
      customerId,
      priceId,
      metadata
    })

    return {
      id: `sub_mock_${Date.now()}`,
      object: 'subscription',
      customer: customerId,
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      items: {
        data: [{
          id: `si_mock_${Date.now()}`,
          price: priceId,
          quantity: 1
        }]
      },
      metadata,
      created: Math.floor(Date.now() / 1000)
    }
  }

  async createInvoice(customerId, items, metadata = {}) {
      customerId,
      items: items.length,
      metadata
    })

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const tax = Math.round(subtotal * 0.08) // 8% tax
    const total = subtotal + tax

    return {
      id: `inv_mock_${Date.now()}`,
      object: 'invoice',
      customer: customerId,
      status: 'paid',
      subtotal,
      tax,
      total,
      currency: 'usd',
      lines: {
        data: items.map(item => ({
          id: `il_mock_${Date.now()}_${Math.random()}`,
          amount: item.amount,
          description: item.description,
          quantity: item.quantity || 1
        }))
      },
      metadata,
      hosted_invoice_url: `https://invoice.stripe.com/i/mock_${Date.now()}`,
      invoice_pdf: `https://invoice.stripe.com/i/mock_${Date.now()}/pdf`,
      created: Math.floor(Date.now() / 1000)
    }
  }

  async createRefund(chargeId, amount, reason = 'requested_by_customer') {
      chargeId,
      amount,
      reason
    })

    return {
      id: `re_mock_${Date.now()}`,
      object: 'refund',
      charge: chargeId,
      amount,
      currency: 'usd',
      status: 'succeeded',
      reason,
      created: Math.floor(Date.now() / 1000)
    }
  }

  async getBalanceTransaction(transactionId) {
      transactionId
    })

    return {
      id: transactionId || `txn_mock_${Date.now()}`,
      object: 'balance_transaction',
      amount: 2000, // $20.00
      currency: 'usd',
      fee: 88, // $0.88 (2.9% + $0.30)
      net: 1912, // $19.12
      status: 'available',
      type: 'charge',
      created: Math.floor(Date.now() / 1000)
    }
  }

  async createCheckoutSession(customerId, mode = 'setup', successUrl, cancelUrl) {
      customerId,
      mode
    })

    return {
      id: `cs_mock_${Date.now()}`,
      object: 'checkout.session',
      customer: customerId,
      mode,
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      url: `https://checkout.stripe.com/pay/cs_mock_${Date.now()}`,
      created: Math.floor(Date.now() / 1000)
    }
  }

  verifyWebhookSignature(payload, signature) {
    
    return true
  }

  async getBillingHistory(customerId, limit = 10) {
      customerId,
      limit
    })

    const history = []
    const now = Date.now()

    for (let i = 0; i < limit; i++) {
      const daysAgo = i * 5
      const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000)
      
      history.push({
        id: `ch_mock_${now - i}`,
        amount: Math.floor(Math.random() * 5000) + 1000, // $10-$60
        currency: 'usd',
        description: `Campaign billing - ${date.toLocaleDateString()}`,
        status: 'succeeded',
        created: Math.floor(date.getTime() / 1000),
        receipt_url: `https://dashboard.stripe.com/test/receipts/mock_${now - i}`
      })
    }

    return {
      data: history,
      has_more: false,
      object: 'list'
    }
  }
}

const mockStripeService = new MockStripeService()

module.exports = {
  stripeService: mockStripeService,
  MockStripeService
}