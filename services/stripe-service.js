/**
 * Real Stripe Service
 * Production Stripe API integration
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  constructor() {
    this.stripe = stripe;
    this.initialized = !!process.env.STRIPE_SECRET_KEY;
    
    if (!this.initialized) {
      console.warn('⚠️ Stripe service: No API key provided');
    }
  }

  async createCheckoutSession(options = {}) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const {
      amount,
      currency = 'usd',
      description = 'Payment',
      successUrl,
      cancelUrl,
      metadata = {}
    } = options;

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency,
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('Stripe checkout session error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifySession(sessionId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        success: true,
        status: session.payment_status,
        amount: session.amount_total / 100, // Convert from cents
        currency: session.currency,
        metadata: session.metadata
      };
    } catch (error) {
      console.error('Stripe session verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  constructEvent(body, signature) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      throw error;
    }
  }

  async createSubscription(options = {}) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const {
      customerId,
      priceId,
      metadata = {}
    } = options;

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      };
    } catch (error) {
      console.error('Stripe subscription creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSubscription(subscriptionId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      return {
        success: true,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Stripe subscription retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'not_configured',
        message: 'Stripe API key not provided'
      };
    }

    try {
      await this.stripe.products.list({ limit: 1 });
      
      return {
        status: 'healthy',
        message: 'Stripe API connection successful'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Stripe API error: ${error.message}`
      };
    }
  }
}

const stripeService = new StripeService();

module.exports = {
  stripeService,
  StripeService
};