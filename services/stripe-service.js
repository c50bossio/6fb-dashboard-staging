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

  // ==========================================
  // Stripe Connect Methods
  // ==========================================

  async createConnectedAccount(options = {}) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const {
      email,
      country = 'US',
      type = 'express',
      businessType = 'individual',
      businessName,
      metadata = {}
    } = options;

    try {
      const accountParams = {
        type,
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: businessType,
        metadata
      };

      if (businessName) {
        accountParams.company = { name: businessName };
      }

      const account = await this.stripe.accounts.create(accountParams);

      return {
        success: true,
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      };
    } catch (error) {
      console.error('Stripe Connect account creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createAccountLink(accountId, refreshUrl, returnUrl) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return {
        success: true,
        url: accountLink.url,
        expiresAt: accountLink.expires_at
      };
    } catch (error) {
      console.error('Stripe account link creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async retrieveAccount(accountId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return {
        success: true,
        account: {
          id: account.id,
          email: account.email,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements,
          capabilities: account.capabilities,
          payoutSchedule: account.settings?.payouts?.schedule
        }
      };
    } catch (error) {
      console.error('Stripe account retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createBankAccount(accountId, bankAccountToken) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const bankAccount = await this.stripe.accounts.createExternalAccount(accountId, {
        external_account: bankAccountToken,
        default_for_currency: true
      });

      return {
        success: true,
        bankAccountId: bankAccount.id,
        last4: bankAccount.last4,
        bankName: bankAccount.bank_name
      };
    } catch (error) {
      console.error('Stripe bank account creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updatePayoutSchedule(accountId, schedule = 'daily', delayDays = 2) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const scheduleParams = {
        interval: schedule,
        ...(schedule === 'daily' && { delay_days: delayDays })
      };

      const account = await this.stripe.accounts.update(accountId, {
        settings: {
          payouts: {
            schedule: scheduleParams
          }
        }
      });

      return {
        success: true,
        payoutSchedule: account.settings?.payouts?.schedule
      };
    } catch (error) {
      console.error('Stripe payout schedule update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createPayout(accountId, amount, currency = 'usd', description = null) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const payout = await this.stripe.payouts.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description,
        method: 'standard'
      }, {
        stripeAccount: accountId
      });

      return {
        success: true,
        payoutId: payout.id,
        amount: payout.amount / 100,
        arrivalDate: new Date(payout.arrival_date * 1000),
        status: payout.status
      };
    } catch (error) {
      console.error('Stripe payout creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createLoginLink(accountId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const loginLink = await this.stripe.accounts.createLoginLink(accountId);

      return {
        success: true,
        url: loginLink.url
      };
    } catch (error) {
      console.error('Stripe login link creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // Refund Methods
  // ==========================================

  async createRefund(paymentIntentId, options = {}) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const {
      amount = null, // null for full refund
      reason = 'requested_by_customer',
      metadata = {}
    } = options;

    try {
      const refundParams = {
        payment_intent: paymentIntentId,
        reason: reason,
        metadata: {
          refund_requested_at: new Date().toISOString(),
          ...metadata
        }
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      };
    } catch (error) {
      console.error('Stripe refund creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getRefund(refundId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const refund = await this.stripe.refunds.retrieve(refundId);

      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          created: new Date(refund.created * 1000),
          paymentIntentId: refund.payment_intent
        }
      };
    } catch (error) {
      console.error('Stripe refund retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listRefunds(paymentIntentId, limit = 10) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const refunds = await this.stripe.refunds.list({
        payment_intent: paymentIntentId,
        limit: limit
      });

      return {
        success: true,
        refunds: refunds.data.map(refund => ({
          id: refund.id,
          amount: refund.amount / 100,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          created: new Date(refund.created * 1000)
        }))
      };
    } catch (error) {
      console.error('Stripe refunds list error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelRefund(refundId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const refund = await this.stripe.refunds.cancel(refundId);

      return {
        success: true,
        refundId: refund.id,
        status: refund.status
      };
    } catch (error) {
      console.error('Stripe refund cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // Payment Intent Methods for Booking Refunds
  // ==========================================

  async getPaymentIntent(paymentIntentId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          created: new Date(paymentIntent.created * 1000),
          metadata: paymentIntent.metadata
        }
      };
    } catch (error) {
      console.error('Stripe payment intent retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processBookingRefund(bookingId, paymentIntentId, refundAmount, reason = 'requested_by_customer') {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      // First, get the payment intent to validate
      const paymentIntentResult = await this.getPaymentIntent(paymentIntentId);
      if (!paymentIntentResult.success) {
        throw new Error(`Unable to retrieve payment intent: ${paymentIntentResult.error}`);
      }

      const paymentIntent = paymentIntentResult.paymentIntent;

      // Validate refund amount
      if (refundAmount > paymentIntent.amount) {
        throw new Error(`Refund amount ($${refundAmount}) cannot exceed original payment ($${paymentIntent.amount})`);
      }

      // Create the refund
      const refundResult = await this.createRefund(paymentIntentId, {
        amount: refundAmount,
        reason: reason,
        metadata: {
          booking_id: bookingId,
          refund_type: 'booking_cancellation'
        }
      });

      if (!refundResult.success) {
        throw new Error(`Refund failed: ${refundResult.error}`);
      }

      return {
        success: true,
        refund: refundResult,
        originalPayment: paymentIntent,
        message: `Successfully processed refund of $${refundAmount} for booking ${bookingId}`
      };

    } catch (error) {
      console.error('Booking refund processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const stripeService = new StripeService();

module.exports = {
  stripeService,
  StripeService
};